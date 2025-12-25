
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { Product, View, SavedComposition, CushionSize, ThemeContext, CompositionItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';
// FIX: Imported SIZE_SCALES and SOFA_FABRICS from constants to avoid duplication
import { PREDEFINED_SOFA_COLORS, SIZE_SCALES, SOFA_FABRICS } from '../constants';

interface CompositionGeneratorScreenProps {
    products: Product[];
    onNavigate: (view: View) => void;
    savedCompositions: SavedComposition[];
    onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
    setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
}

const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        if (!mimeTypePart || !parts[1]) throw new Error('URL inválida.');
        return { mimeType: mimeTypePart[1], data: parts[1] };
    } else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return { mimeType: blob.type, data: base64Data };
    }
};

const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, savedCompositions, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const [compItems, setCompItems] = useState<CompositionItem[]>([]);
    const [selectedSofaFabric, setSelectedSofaFabric] = useState(SOFA_FABRICS[0]);
    const [selectedSofaColor, setSelectedSofaColor] = useState(PREDEFINED_SOFA_COLORS[1]); 
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedName, setGeneratedName] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const sofaRef = useRef<HTMLDivElement>(null);

    const handleAddProduct = (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;
        const product = products.find(p => p.id === selectedIds[0]);
        if (product) {
            const newItem: CompositionItem = {
                id: `item-${Date.now()}`,
                product,
                size: CushionSize.SQUARE_45,
                x: 40 + (compItems.length * 5),
                y: 40,
                zIndex: compItems.length + 1
            };
            setCompItems(prev => [...prev, newItem]);
        }
        setIsProductSelectOpen(false);
    };

    const handleStartDrag = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        const item = compItems.find(i => i.id === id);
        if (!item || !sofaRef.current) return;

        const rect = sofaRef.current.getBoundingClientRect();
        const itemX = (item.x / 100) * rect.width;
        const itemY = (item.y / 100) * rect.height;
        
        setDraggingId(id);
        setDragOffset({
            x: e.clientX - rect.left - itemX,
            y: e.clientY - rect.top - itemY
        });
        
        // Trazer para frente ao arrastar
        setCompItems(prev => {
            const maxZ = Math.max(...prev.map(i => i.zIndex), 0);
            return prev.map(i => i.id === id ? { ...i, zIndex: maxZ + 1 } : i);
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId || !sofaRef.current) return;

        const rect = sofaRef.current.getBoundingClientRect();
        let newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        let newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

        // Limites
        newX = Math.max(0, Math.min(90, newX));
        newY = Math.max(0, Math.min(85, newY));

        setCompItems(prev => prev.map(i => i.id === draggingId ? { ...i, x: newX, y: newY } : i));
    };

    const handlePointerUp = () => setDraggingId(null);

    const updateItemSize = (id: string, size: CushionSize) => {
        setCompItems(prev => prev.map(i => i.id === id ? { ...i, size } : i));
    };

    const removeItem = (id: string) => {
        setCompItems(prev => prev.filter(i => i.id !== id));
    };

    const handleGenerate = async () => {
        if (compItems.length === 0) return;
        setIsGenerating(true);
        try {
            // FIX: Always use process.env.API_KEY for GenAI initialization
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const namePrompt = `Crie um nome luxuoso para uma vitrine de almofadas: ${compItems.map(i => i.product.name).join(', ')}. Apenas o nome.`;
            const nameRes = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: namePrompt });
            setGeneratedName(nameRes.text?.trim() || 'Nova Coleção');

            const imageParts = await Promise.all(compItems.map(i => getBase64FromImageUrl(i.product.baseImageUrl).then(img => ({ inlineData: img }))));
            const imagePrompt = `Crie uma foto de revista de decoração. Almofadas organizadas realisticamente em um sofá de ${selectedSofaFabric.name.toLowerCase()} cor ${selectedSofaColor.name.toLowerCase()}. Use estas almofadas: ${compItems.map(i => `${i.product.name} no tamanho ${i.size}`).join(', ')}. Iluminação quente de fim de tarde. Foco na textura do ${selectedSofaFabric.name}.`;
            
            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, { text: imagePrompt }] }
            });

            // FIX: Iterate through response parts to find the image part correctly
            const imagePart = imgRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                setGeneratedImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            }
        } catch (e) {
            console.error("AI Generation Error:", e);
            alert("Erro na IA. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = (name: string) => {
        onSaveComposition({
            name,
            products: compItems.map(i => i.product),
            productSizes: compItems.map(i => i.size),
            items: compItems,
            imageUrl: generatedImage || undefined,
            size: compItems.length,
            sofaFabric: selectedSofaFabric.name,
            sofaColor: selectedSofaColor.name
        });
        setIsSaveModalOpen(false);
        onNavigate(View.COMPOSITIONS);
    };

    const cardClasses = isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200 shadow-xl";
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";
    const titleClasses = isDark ? "text-white" : "text-gray-900";

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            <main className="flex-grow overflow-y-auto px-4 pt-20 pb-52 no-scrollbar z-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center">
                        <h1 className={`text-4xl font-black uppercase tracking-tighter ${titleClasses}`}>Estúdio de Vitrine</h1>
                        <p className={`${textClasses} text-sm font-medium uppercase tracking-widest`}>Design Livre & Proporções Reais</p>
                    </div>

                    {/* Controles do Sofá */}
                    <div className={`p-6 rounded-[2.5rem] border ${cardClasses} grid grid-cols-1 md:grid-cols-2 gap-6`}>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">Tecido do Sofá</label>
                            <div className="flex flex-wrap gap-2">
                                {SOFA_FABRICS.map(f => (
                                    <button 
                                        key={f.name} 
                                        onClick={() => setSelectedSofaFabric(f)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedSofaFabric.name === f.name ? 'bg-fuchsia-600 text-white border-fuchsia-500' : 'bg-black/10 text-gray-500 border-transparent'}`}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">Cor do Sofá</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                {PREDEFINED_SOFA_COLORS.map(c => (
                                    <button 
                                        key={c.name} 
                                        onClick={() => setSelectedSofaColor(c)} 
                                        className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all ${selectedSofaColor.name === c.name ? 'ring-2 ring-fuchsia-500 ring-offset-2 scale-110' : 'border-black/20 opacity-60'}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Área do Sofá Virtual */}
                    <div className={`relative p-2 rounded-[2.5rem] border ${cardClasses} overflow-hidden`}>
                        <div 
                            ref={sofaRef}
                            className="relative min-h-[400px] rounded-[2rem] transition-all duration-500 overflow-hidden"
                            style={{ 
                                backgroundColor: selectedSofaColor.hex,
                                backgroundImage: selectedSofaFabric.pattern,
                                backgroundBlendMode: 'overlay',
                                boxShadow: 'inset 0 20px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            {/* Grid de auxílio visual sutil */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                            {compItems.map((item) => (
                                <div
                                    key={item.id}
                                    onPointerDown={(e) => handleStartDrag(e, item.id)}
                                    className="absolute cursor-move group select-none touch-none"
                                    style={{ 
                                        left: `${item.x}%`, 
                                        top: `${item.y}%`, 
                                        zIndex: item.zIndex,
                                        width: SIZE_SCALES[item.size].w,
                                        height: SIZE_SCALES[item.size].h,
                                        transition: draggingId === item.id ? 'none' : 'all 0.2s ease-out'
                                    }}
                                >
                                    <div className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border-2 border-white/20 group-hover:border-fuchsia-500 transition-colors">
                                        <img src={item.product.baseImageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-1.5 bg-red-600 text-white rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg></button>
                                        </div>
                                    </div>
                                    
                                    {/* Seletor de Tamanho Flutuante */}
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-black/80 backdrop-blur-md p-1 rounded-lg flex gap-1 shadow-xl">
                                        {Object.values(CushionSize).map(s => (
                                            <button 
                                                key={s} 
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={() => updateItemSize(item.id, s)}
                                                className={`px-1.5 py-1 rounded text-[8px] font-black uppercase ${item.size === s ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {compItems.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 uppercase tracking-widest font-black text-center p-8">
                                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeWidth={2}/></svg>
                                    Clique abaixo para adicionar<br/>almofadas ao sofá
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex gap-3">
                            <button onClick={() => setIsProductSelectOpen(true)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                                Adicionar Almofada
                            </button>
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || compItems.length === 0}
                                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Renderizar com IA'}
                            </button>
                        </div>
                    </div>

                    {generatedImage && (
                        <div className={`p-8 rounded-[2.5rem] border animate-fade-in-up ${cardClasses}`}>
                            <h2 className={`text-2xl font-black text-center mb-6 uppercase tracking-tighter ${titleClasses}`}>{generatedName}</h2>
                            <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
                                <img src={generatedImage} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-black uppercase tracking-widest text-xs">Simulação Realista</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsSaveModalOpen(true)} className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-green-700 transition-all">Salvar Composição</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {isProductSelectOpen && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsProductSelectOpen(false)} 
                    onConfirm={handleAddProduct} 
                    initialSelectedIds={[]}
                    maxSelection={1}
                />
            )}
            
            {isSaveModalOpen && (
                <SaveCompositionModal 
                    isOpen={isSaveModalOpen} 
                    onClose={() => setIsSaveModalOpen(false)} 
                    onConfirm={handleSave} 
                    predefinedName={generatedName}
                />
            )}
            
            <style>{`
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default CompositionGeneratorScreen;
