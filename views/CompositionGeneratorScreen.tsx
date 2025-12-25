
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { Product, View, SavedComposition, CushionSize, ThemeContext, CompositionItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';
import { PREDEFINED_SOFA_COLORS, SIZE_SCALES, SOFA_FABRICS, STORE_IMAGE_URLS } from '../constants';

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
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const sofaRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleAddProducts = (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;
        
        const newItems: CompositionItem[] = [];
        selectedIds.forEach((id, index) => {
            const product = products.find(p => p.id === id);
            if (product) {
                newItems.push({
                    id: `item-${Date.now()}-${index}`,
                    product,
                    size: CushionSize.SQUARE_45,
                    x: 30 + (compItems.length * 5) + (index * 5),
                    y: 35 + (index * 2),
                    zIndex: compItems.length + index + 1
                });
            }
        });

        setCompItems(prev => [...prev, ...newItems]);
        setIsProductSelectOpen(false);
    };

    const handleStartDrag = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        setSelectedId(id);
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
        if (selectedId === id) setSelectedId(null);
    };

    const getItemDisplayName = (item: CompositionItem) => {
        const sameProductItems = compItems.filter(i => i.product.id === item.product.id);
        if (sameProductItems.length <= 1) return item.product.name;
        
        const index = sameProductItems.findIndex(i => i.id === item.id);
        return index === 0 ? item.product.name : `${item.product.name} ${index + 1}`;
    };

    const handleShareCurrentDesign = async () => {
        if (compItems.length === 0 || !canvasRef.current) return;
        
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Canvas expandido para caber a lista de nomes embaixo
            const W = 1200; 
            const SOFA_H = 800;
            const LIST_H = 100 + (compItems.length * 45);
            const H = SOFA_H + LIST_H;
            
            canvas.width = W; 
            canvas.height = H;

            // Fundo Branco Geral
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);

            // Fundo do Sofá
            ctx.fillStyle = selectedSofaColor.hex;
            ctx.fillRect(0, 0, W, SOFA_H);
            
            // Título
            ctx.fillStyle = isDark ? '#FFFFFF' : '#4A044E';
            ctx.font = 'bold 45px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("MEU SOFÁ VIRTUAL - LOJAS TÊCA", W/2, 80);

            // Desenhar almofadas no sofá
            for (const item of [...compItems].sort((a,b) => a.zIndex - b.zIndex)) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = item.product.baseImageUrl;
                await new Promise(res => img.onload = res);

                const baseSize = 280;
                let drawW = baseSize; let drawH = baseSize;

                if (item.size === CushionSize.SQUARE_40) { drawW = 240; drawH = 240; }
                else if (item.size === CushionSize.SQUARE_50) { drawW = 320; drawH = 320; }
                else if (item.size === CushionSize.SQUARE_60) { drawW = 380; drawH = 380; }
                else if (item.size === CushionSize.LUMBAR) { drawW = 340; drawH = 200; }

                const posX = (item.x / 100) * W;
                const posY = 150 + (item.y / 100) * (SOFA_H - 450);

                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 15;
                ctx.drawImage(img, posX, posY, drawW, drawH);
                
                // Marca d'água de tamanho na imagem compartilhada
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(posX + 10, posY + 10, 80, 30);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(item.size, posX + 50, posY + 31);
                ctx.restore();
            }

            // Área da Lista de Almofadas (Rodapé)
            let currentY = SOFA_H + 70;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText("ALMOFADAS ESCOLHIDAS:", 60, currentY);
            
            currentY += 60;
            compItems.forEach((item, idx) => {
                const displayName = getItemDisplayName(item);
                ctx.fillStyle = '#A21CAF';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText(`${idx + 1}. ${displayName.toUpperCase()}`, 70, currentY);
                
                ctx.fillStyle = '#6B7280';
                ctx.font = 'medium 20px sans-serif';
                ctx.fillText(`- Tamanho: ${item.size}`, 700, currentY);
                currentY += 45;
            });

            // Footer institucional
            ctx.fillStyle = '#FDF4FF';
            ctx.fillRect(0, H - 80, W, 80);
            ctx.fillStyle = '#4A044E';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("tecalojas.vercel.app | @tecadecoracoestorredetv", W/2, H - 35);

            canvas.toBlob(async (blob) => {
                if (blob && navigator.share) {
                    const file = new File([blob], 'meu-sofa-virtual.png', { type: 'image/png' });
                    await navigator.share({
                        title: 'Meu Design de Almofadas',
                        text: 'Olha como ficou minha composição no Sofá Virtual das Lojas Têca!',
                        files: [file]
                    });
                }
            }, 'image/png', 0.95);
        } catch (e) {
            alert("Erro ao preparar imagem de compartilhamento.");
        }
    };

    const handleGenerate = async () => {
        if (compItems.length === 0) return;
        setIsGenerating(true);
        try {
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
            <canvas ref={canvasRef} className="hidden"></canvas>
            <main className="flex-grow overflow-y-auto px-4 pt-20 pb-52 no-scrollbar z-10" onClick={() => setSelectedId(null)}>
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center">
                        <h1 className={`text-4xl font-black uppercase tracking-tighter ${titleClasses}`}>Sofá Virtual</h1>
                        <p className={`${textClasses} text-sm font-medium uppercase tracking-widest`}>Arranjo Livre & Catálogo no Zap</p>
                    </div>

                    {/* 1. Controles do Sofá no Topo */}
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

                    {/* 2. Botões de Ação logo abaixo dos controles */}
                    <div className="flex gap-3">
                        <button onClick={() => setIsProductSelectOpen(true)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                            Adicionar Almofadas
                        </button>
                        <button onClick={handleShareCurrentDesign} disabled={compItems.length === 0} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Compartilhar no Whats
                        </button>
                    </div>

                    {/* 3. Área do Sofá Virtual */}
                    <div className={`relative p-2 rounded-[2.5rem] border ${cardClasses} overflow-hidden shadow-2xl`}>
                        <div 
                            ref={sofaRef}
                            className="relative min-h-[450px] rounded-[2rem] transition-all duration-500 overflow-hidden"
                            style={{ 
                                backgroundColor: selectedSofaColor.hex,
                                backgroundImage: selectedSofaFabric.pattern,
                                backgroundBlendMode: 'overlay',
                                boxShadow: 'inset 0 20px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                            {compItems.map((item) => {
                                const isSelected = selectedId === item.id;
                                const displayName = getItemDisplayName(item);
                                
                                return (
                                    <div
                                        key={item.id}
                                        onPointerDown={(e) => handleStartDrag(e, item.id)}
                                        className={`absolute cursor-move select-none touch-none transition-shadow ${isSelected ? 'ring-4 ring-fuchsia-500 rounded-xl' : ''}`}
                                        style={{ 
                                            left: `${item.x}%`, 
                                            top: `${item.y}%`, 
                                            zIndex: item.zIndex,
                                            width: SIZE_SCALES[item.size].w,
                                            height: SIZE_SCALES[item.size].h,
                                            transition: draggingId === item.id ? 'none' : 'all 0.2s ease-out'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="relative w-full h-full shadow-2xl rounded-xl overflow-hidden border-2 border-white/20 group">
                                            <img src={item.product.baseImageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                                            
                                            {/* Marca d'água de tamanho (Superior Esquerdo) */}
                                            <div className="absolute top-1 left-1 bg-black/40 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter pointer-events-none border border-white/10">
                                                {item.size}
                                            </div>

                                            {/* Nome com número (Badge Inferior) */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <p className="text-[7px] text-white font-black truncate text-center uppercase tracking-tighter">{displayName}</p>
                                            </div>
                                        </div>

                                        {/* Botão de Excluir Externo */}
                                        {isSelected && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} 
                                                className="absolute -top-4 -right-4 w-9 h-9 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-[60] transition-transform active:scale-75 hover:bg-red-700"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={4}/></svg>
                                            </button>
                                        )}
                                        
                                        {/* Seletor de Tamanho Flutuante */}
                                        {isSelected && (
                                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md p-1.5 rounded-xl flex gap-1 shadow-2xl animate-fade-in border border-white/10">
                                                {Object.values(CushionSize).map(s => (
                                                    <button 
                                                        key={s} 
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => updateItemSize(item.id, s)}
                                                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${item.size === s ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {compItems.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 uppercase tracking-widest font-black text-center p-8">
                                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeWidth={2}/></svg>
                                    Use os botões acima para<br/>montar seu sofá virtual
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-black/5">
                            <button onClick={handleGenerate} disabled={isGenerating || compItems.length === 0} className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Renderizar Vitrine Realista com IA'}
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
                            <button onClick={() => setIsSaveModalOpen(true)} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-green-700 transition-all">Salvar na Minha Galeria</button>
                        </div>
                    )}
                </div>
            </main>

            {isProductSelectOpen && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsProductSelectOpen(false)} 
                    onConfirm={handleAddProducts} 
                    initialSelectedIds={[]}
                    maxSelection={10}
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
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s forwards; }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default CompositionGeneratorScreen;
