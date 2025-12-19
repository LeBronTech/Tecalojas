
import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, View, SavedComposition, CushionSize, ThemeContext } from '../types';
import { GoogleGenAI } from '@google/genai';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';

interface CompositionGeneratorScreenProps {
    products: Product[];
    onNavigate: (view: View) => void;
    savedCompositions: SavedComposition[];
    onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
    setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ShuffleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        if (!mimeTypePart || !parts[1]) throw new Error('URL de dados da imagem base inválida.');
        return { mimeType: mimeTypePart[1], data: parts[1] };
    } else {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Falha ao buscar a imagem pela URL.');
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

const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, savedCompositions, onSaveComposition, setSavedCompositions }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedName, setGeneratedName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const selectedProducts = useMemo(() => 
        selectedIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p),
    [selectedIds, products]);

    const handleRandomSelection = () => {
        if (products.length === 0) return;
        const count = Math.floor(Math.random() * 3) + 2; 
        const shuffled = [...products].sort(() => 0.5 - Math.random());
        setSelectedIds(shuffled.slice(0, count).map(p => p.id));
        setGeneratedImage(null);
        setGeneratedName('');
        setError(null);
    };

    const handleGenerate = async () => {
        if (selectedProducts.length === 0) return;
        setIsGenerating(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const namePrompt = `Crie um nome elegante para uma composição de almofadas com estes itens: ${selectedProducts.map(p => p.name).join(', ')}. O nome deve ser curto e inspirador (ex: 'Refúgio Natural', 'Elegância Urbana'). Retorne apenas o nome.`;
            const nameResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: namePrompt
            });
            const newName = nameResponse.text?.trim() || 'Nova Composição';
            if (isMounted.current) setGeneratedName(newName);

            const imageParts = await Promise.all(selectedProducts.map(p => getBase64FromImageUrl(p.baseImageUrl).then(img => ({ inlineData: img }))));
            const imagePrompt = `Crie uma foto de catálogo profissional. Arrume estas ${selectedProducts.length} almofadas de forma realista e harmoniosa em um sofá moderno em uma sala de estar elegante. Luz suave natural vindo de uma janela lateral.`;
            
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, { text: imagePrompt }] }
            });

            const candidate = imageResponse.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY') {
                throw new Error('Geração de imagem bloqueada por segurança.');
            }

            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (!imagePart?.inlineData) throw new Error("IA não retornou imagem.");

            const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            if (isMounted.current) setGeneratedImage(imageUrl);

        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('429')) setError("IA ocupada. Tente em alguns segundos.");
            else setError("Falha na IA. Tente novamente.");
        } finally {
            if (isMounted.current) setIsGenerating(false);
        }
    };

    const handleSave = (name: string) => {
        onSaveComposition({
            name,
            products: selectedProducts,
            imageUrl: generatedImage || undefined,
            size: selectedProducts.length
        });
        setIsSaveModalOpen(false);
        onNavigate(View.COMPOSITIONS);
    };

    const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";
    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center">
                        <h1 className={`text-3xl font-bold ${titleClasses}`}>Gerador de Composições</h1>
                        <p className={textClasses}>Selecione almofadas e deixe a IA criar um ambiente.</p>
                    </div>

                    <div className={`p-6 rounded-3xl border ${cardClasses}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={`font-bold ${titleClasses}`}>Almofadas Selecionadas ({selectedIds.length})</h2>
                            <div className="flex gap-2">
                                <button onClick={handleRandomSelection} className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/40 transition-colors" title="Seleção Aleatória">
                                    <ShuffleIcon />
                                </button>
                                <button onClick={() => setIsProductSelectOpen(true)} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors">
                                    + Adicionar
                                </button>
                            </div>
                        </div>

                        {selectedProducts.length > 0 ? (
                            <div className="flex flex-wrap gap-4 justify-center">
                                {selectedProducts.map(p => (
                                    <div key={p.id} className="w-24 flex flex-col items-center group relative">
                                        <div className="w-24 h-24 rounded-xl overflow-hidden shadow-md border-2 border-transparent group-hover:border-fuchsia-500 transition-all cursor-pointer" onClick={() => setViewingProduct(p)}>
                                            <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                                        </div>
                                        <p className={`text-[10px] mt-1 text-center truncate w-full ${textClasses}`}>{p.name}</p>
                                        <button onClick={() => setSelectedIds(prev => prev.filter(id => id !== p.id))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`py-12 border-2 border-dashed rounded-2xl text-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <p className={textClasses}>Escolha as almofadas que deseja combinar.</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || selectedIds.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        {isGenerating ? <ButtonSpinner /> : <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10a1 1 0 01-1.12.38 1 1 0 01-.694-.864l-.001-5.127H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> Gerar com IA</>}
                    </button>

                    {generatedImage && (
                        <div className={`p-6 rounded-3xl border animate-float-in ${cardClasses}`}>
                            <h2 className={`font-black text-center mb-4 uppercase tracking-tighter text-xl ${titleClasses}`}>{generatedName}</h2>
                            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl mb-6 relative group">
                                <img src={generatedImage} alt="Composição Gerada" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                    <p className="text-white text-center text-sm font-medium">Esta imagem é uma representação artística gerada por Inteligência Artificial.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSaveModalOpen(true)} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 transition-colors">
                                Salvar Composição
                            </button>
                        </div>
                    )}

                    {error && <p className="text-center text-red-500 font-bold animate-pulse">{error}</p>}
                </div>
            </main>

            {isProductSelectOpen && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsProductSelectOpen(false)} 
                    onConfirm={(ids) => { setSelectedIds(ids); setIsProductSelectOpen(false); setGeneratedImage(null); }} 
                    initialSelectedIds={selectedIds}
                    maxSelection={4}
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
            {viewingProduct && (
                <ProductDetailModal
                    product={viewingProduct}
                    products={products}
                    onClose={() => setViewingProduct(null)}
                    canManageStock={false}
                    onEditProduct={() => {}}
                    onSwitchProduct={setViewingProduct}
                    savedCompositions={savedCompositions}
                    onViewComposition={() => {}}
                    onAddToCart={() => {}}
                    onNavigate={onNavigate}
                    sofaColors={[]}
                    cart={[]}
                />
            )}
        </div>
    );
};

export default CompositionGeneratorScreen;
