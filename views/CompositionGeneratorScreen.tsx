import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Product, View, CushionSize } from '../types';
import { ThemeContext } from '../App';
import { GoogleGenAI } from '@google/genai';

interface CompositionGeneratorScreenProps {
    products: Product[];
    onNavigate: (view: View) => void;
    apiKey: string | null;
    onRequestApiKey: () => void;
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- MODALS and SUB-COMPONENTS ---

interface ProductSelectModalProps {
    products: Product[];
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    initialSelectedIds: string[];
}

const ProductSelectModal: React.FC<ProductSelectModalProps> = ({ products, onClose, onConfirm, initialSelectedIds }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [products, search]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pId => pId !== id);
            }
            if (prev.length < 2) {
                return [...prev, id];
            }
            return prev; // Limit to 2 selections
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Selecione 1 ou 2 Almofadas</h2>
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 mb-4 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                    {filteredProducts.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <button key={p.id} onClick={() => toggleSelection(p.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all border-2 ${isSelected ? 'border-fuchsia-500 bg-fuchsia-500/10' : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50')}`}>
                                <img src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{p.name}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-white/10">
                    <button onClick={onClose} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Cancelar</button>
                    <button onClick={() => onConfirm(selectedIds)} className="bg-fuchsia-600 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

interface SaveCompositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
}
const SaveCompositionModal: React.FC<SaveCompositionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Salvar Composição</h2>
                <input
                    type="text"
                    placeholder="Dê um nome à composição"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className={`w-full border-2 rounded-lg px-4 py-3 mb-4 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onClose} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Cancelar</button>
                    <button type="submit" className="bg-fuchsia-600 text-white font-bold py-2 px-6 rounded-lg">Salvar</button>
                </div>
            </form>
        </div>
    );
};


const SIZES_TO_CHECK = [CushionSize.SQUARE_40, CushionSize.SQUARE_60, CushionSize.LUMBAR];


const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, apiKey, onRequestApiKey }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [startProducts, setStartProducts] = useState<Product[]>([]);
    const [compositionSize, setCompositionSize] = useState(4);
    const [selectedSizes, setSelectedSizes] = useState<CushionSize[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sizeWarnings, setSizeWarnings] = useState<string[]>([]);
    const [compositionsBySize, setCompositionsBySize] = useState<Record<number, Product[]>>({});
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [savedCompositions, setSavedCompositions] = useState<{ name: string; products: Product[] }[]>([]);
    
    const currentComposition = useMemo(() => compositionsBySize[compositionSize] || null, [compositionsBySize, compositionSize]);

    useEffect(() => {
        setCompositionsBySize({});
        setError(null);
        setSizeWarnings([]);
    }, [startProducts, compositionSize]);

    const handleConfirmSelection = (selectedIds: string[]) => {
        const selectedProducts = products.filter(p => selectedIds.includes(p.id));
        setStartProducts(selectedProducts);
        setIsModalOpen(false);
    };

    const handleOrder = () => {
        if (!currentComposition) return;
        const shuffled = [...currentComposition];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setCompositionsBySize(prev => ({ ...prev, [compositionSize]: shuffled }));
    };
    
    const handleSave = () => {
        if (!currentComposition) return;
        setIsSaveModalOpen(true);
    };

    const confirmSave = (name: string) => {
        if (!currentComposition) return;
        setSavedCompositions(prev => [...prev, { name, products: currentComposition }]);
        setIsSaveModalOpen(false);
    };

    const handleShare = async () => {
        if (!currentComposition || isSharing) return;
        if (!navigator.share) {
            setError("Seu navegador não suporta a função de compartilhamento.");
            return;
        }
        setIsSharing(true);
        setError(null);
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Não foi possível criar o contexto do canvas.");
            const PADDING = 50, IMG_SIZE = 250, IMG_SPACING = 20, TEXT_HEIGHT = 25, FOOTER_HEIGHT = 40;
            const loadImages = (productsToLoad: Product[]) => Promise.all(
                productsToLoad.map(p => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
                    img.onload = () => resolve(img);
                    img.onerror = () => {
                        const placeholder = new Image();
                        placeholder.src = 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
                        placeholder.onload = () => resolve(placeholder);
                        placeholder.onerror = reject;
                    };
                }))
            );
            const images = await loadImages(currentComposition);
            const totalImageWidth = images.length * IMG_SIZE + (images.length > 1 ? (images.length - 1) * IMG_SPACING : 0);
            canvas.width = totalImageWidth + 2 * PADDING;
            canvas.height = PADDING + IMG_SIZE + PADDING + (TEXT_HEIGHT * images.length) + PADDING + FOOTER_HEIGHT;
            ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            let currentX = PADDING;
            images.forEach(img => { ctx.drawImage(img, currentX, PADDING, IMG_SIZE, IMG_SIZE); currentX += IMG_SIZE + IMG_SPACING; });
            ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            let currentY = PADDING + IMG_SIZE + PADDING / 2 + TEXT_HEIGHT;
            currentComposition.forEach(p => { ctx.fillText(p.name, canvas.width / 2, currentY, canvas.width - (2 * PADDING)); currentY += TEXT_HEIGHT; });
            ctx.fillStyle = isDark ? '#AAAAAA' : '#555555';
            ctx.font = 'italic 16px sans-serif';
            ctx.fillText('Gerado por Têca Lojas & Decorações', canvas.width / 2, canvas.height - (FOOTER_HEIGHT / 2));
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Falha ao criar a imagem para compartilhamento.");
                const file = new File([blob], 'composicao-teca.png', { type: 'image/png' });
                await navigator.share({ title: 'Minha Composição de Almofadas', text: 'Veja esta linda composição que criei com o app Têca Lojas!', files: [file] });
            }, 'image/png');
        } catch (err: any) { console.error("Share failed:", err); setError("Não foi possível compartilhar a imagem. " + (err.message || ''));
        } finally { setIsSharing(false); }
    };

    const getPromptForSize = (size: number): string => {
        const initialCushions = startProducts.map(p => ({ id: p.id, name: p.name, color: p.mainColor?.name, category: p.category }));
        const availableCushions = products.map(p => ({ id: p.id, name: p.name, category: p.category, color: p.mainColor?.name, colorHex: p.mainColor?.hex }));
        let rules = '';
        switch (size) {
            case 4: rules = `A composição DEVE ter exatamente 4 almofadas. Regras estritas: 1. Inclua UM par de almofadas estampadas IDÊNTICAS. 2. As outras duas almofadas devem ser DIFERENTES uma da outra e do par estampado. 3. Não pode haver outras repetições. 4. As 4 almofadas NUNCA devem ser todas da mesma categoria.`; break;
            case 5: rules = `A composição DEVE ter exatamente 5 almofadas e seguir uma estrutura simétrica espelhada (A, B, C, B, A). Regras estritas: 1. Use DOIS pares de almofadas idênticas (par A e par B). 2. A almofada central (C) deve ser ÚNICA e de uma categoria diferente dos pares. 3. O resultado final DEVE estar na ordem A, B, C, B, A.`; break;
            case 6: rules = `A composição DEVE ter exatamente 6 almofadas. Regras estritas: 1. NUNCA gere seis almofadas diferentes. 2. A composição deve ser formada por pares (ex: A,A,B,B,C,C) ou por trios (ex: A,A,A,B,B,B).`; break;
            default: rules = `Complete a composição para um total de ${size} almofadas. As almofadas adicionais não podem ser repetidas.`; break;
        }
        return `Você é um designer de interiores especialista em combinar almofadas. Sua tarefa é criar uma composição harmoniosa de ${size} almofadas. A composição DEVE incluir as seguintes almofadas iniciais: ${JSON.stringify(initialCushions)}. ${rules} A lista de almofadas disponíveis é: ${JSON.stringify(availableCushions)}. Sua resposta DEVE ser um objeto JSON válido com uma única chave "productIds", que é um array de strings contendo os IDs EXATOS de ${size} almofadas selecionadas, seguindo a ordem e as regras especificadas.`;
    };
    
    const checkSizeAvailability = (composition: Product[], requiredSizes: CushionSize[]) => {
        const warnings: string[] = [];
        if (requiredSizes.length === 0) {
            setSizeWarnings([]);
            return;
        }
        composition.forEach(product => {
            requiredSizes.forEach(size => {
                if (!product.variations.some(v => v.size === size)) {
                    warnings.push(`A almofada '${product.name}' não está disponível em ${size}.`);
                }
            });
        });
        setSizeWarnings(warnings);
    };

    const handleGenerate = async () => {
        if (startProducts.length === 0) { setError("Por favor, selecione pelo menos uma almofada inicial."); return; }
        if (!apiKey) { onRequestApiKey(); return; }
        setIsLoading(true);
        setError(null);
        setSizeWarnings([]);
        setCompositionsBySize(prev => ({ ...prev, [compositionSize]: undefined as any }));
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = getPromptForSize(compositionSize);
            const response = await ai.models.generateContent({ model: "gemini-2.5-pro", contents: prompt, config: { responseMimeType: "application/json" } });
            const resultJson = JSON.parse(response.text.trim());
            if (!resultJson.productIds || !Array.isArray(resultJson.productIds)) throw new Error("A IA retornou um formato de dados inesperado.");
            const compositionProducts = resultJson.productIds.map((id: string) => products.find(p => p.id === id)).filter((p: Product | undefined): p is Product => p !== undefined);
            if (compositionProducts.length !== compositionSize) throw new Error(`A IA retornou ${compositionProducts.length} produtos em vez dos ${compositionSize} esperados.`);
            setCompositionsBySize(prev => ({ ...prev, [compositionSize]: compositionProducts }));
            checkSizeAvailability(compositionProducts, selectedSizes);
        } catch (e: any) { console.error("AI Composition Failed:", e); setError("A IA não conseguiu gerar uma composição. Tente novamente ou com outras almofadas.");
        } finally { setIsLoading(false); }
    };

    const handleToggleSize = (size: CushionSize) => {
        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    };
    
    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
    const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";

    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 no-scrollbar z-10 flex flex-col">
                    <div className="flex items-center mb-8">
                        <button onClick={() => onNavigate(View.SHOWCASE)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${titleClasses}`}>Gerador de Composição</h1>
                    </div>
                    
                    <div className={`p-6 rounded-2xl border ${cardClasses} mb-8`}>
                         <div className="mb-4">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>1. Ponto de Partida</h3>
                            <p className={`text-sm mb-3 ${subtitleClasses}`}>Escolha uma ou duas almofadas para iniciar a composição.</p>
                            <div className="flex items-center gap-3">
                                {startProducts.map(p => (<img key={p.id} src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />))}
                                <button onClick={() => setIsModalOpen(true)} className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${isDark ? 'border-gray-600 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                            </div>
                        </div>
                        <div className="mb-4">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>2. Tamanho da Composição</h3>
                            <div className="flex gap-2">{[2, 3, 4, 5, 6].map(size => (<button key={size} onClick={() => setCompositionSize(size)} className={`flex-1 py-3 font-bold rounded-lg transition-colors text-center ${compositionSize === size ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}>{size}</button>))}</div>
                        </div>
                         <div className="mb-4">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>3. Tamanhos Desejados (Opcional)</h3>
                            <p className={`text-sm mb-3 ${subtitleClasses}`}>Verificar se as almofadas geradas existem nestes tamanhos.</p>
                            <div className="flex flex-wrap gap-3">
                                {SIZES_TO_CHECK.map(size => (
                                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => handleToggleSize(size)} className="h-5 w-5 rounded text-fuchsia-600 focus:ring-fuchsia-500" />
                                        <span className={`font-semibold ${subtitleClasses}`}>{size}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || startProducts.length === 0} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-500">{isLoading ? <ButtonSpinner /> : 'Gerar Composição'}</button>
                    </div>

                    <div className="flex-grow flex flex-col">
                        <h2 className={`text-xl font-bold mb-4 ${titleClasses}`}>Resultado</h2>
                        <div className={`flex-grow p-4 rounded-2xl border flex flex-col items-center justify-center ${cardClasses}`}>
                            {isLoading && <ButtonSpinner />}
                            {error && <p className="text-center text-red-500">{error}</p>}
                            {currentComposition && (
                                <div className="w-full text-center">
                                    {sizeWarnings.length > 0 && (
                                        <div className={`p-3 mb-4 rounded-lg text-left text-sm ${isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>
                                            <p className="font-bold mb-1">Aviso de disponibilidade:</p>
                                            <ul className="list-disc list-inside">{sizeWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                                        </div>
                                    )}
                                    <div className="flex justify-center items-center -space-x-8 mb-4 h-40">
                                        {currentComposition.map((p, index) => (<div key={`${p.id}-${index}`} className="w-32 h-32 rounded-lg shadow-lg" style={{ zIndex: index, transform: `rotate(${Math.random() * 10 - 5}deg)` }}><img src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-full h-full object-cover rounded-lg" /></div>))}
                                    </div>
                                    <div className="space-y-1 mb-6">{currentComposition.map((p, index) => (<p key={`${p.id}-${index}`} className={`text-sm font-semibold ${subtitleClasses}`}>{p.name}</p>))}</div>
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <button onClick={handleShare} disabled={isSharing} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isSharing ? <ButtonSpinner/> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>}Compartilhar</button>
                                        <button onClick={handleSave} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>Salvar</button>
                                        <button onClick={handleOrder} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>Ordenar</button>
                                    </div>
                                </div>
                            )}
                            {!isLoading && !error && !currentComposition && (<p className={`text-center ${subtitleClasses}`}>Sua composição aparecerá aqui.</p>)}
                        </div>
                    </div>

                    {savedCompositions.length > 0 && (
                        <div className="mt-8">
                            <h2 className={`text-xl font-bold mb-4 ${titleClasses}`}>Composições Salvas</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedCompositions.map((comp, index) => (
                                    <button key={index} onClick={() => { setCompositionsBySize({ [comp.products.length]: comp.products }); setCompositionSize(comp.products.length); }} className={`p-3 rounded-xl text-left border transition-colors ${isDark ? 'bg-black/20 border-white/10 hover:bg-black/30' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <p className={`font-bold mb-2 ${titleClasses}`}>{comp.name}</p>
                                        <div className="flex items-center -space-x-4">
                                            {comp.products.map(p => (<img key={p.id} src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-12 h-12 object-cover rounded-full border-2 border-white/50" />))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="h-12" />
                </main>
            </div>
            {isModalOpen && (<ProductSelectModal products={products} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmSelection} initialSelectedIds={startProducts.map(p => p.id)} />)}
            <SaveCompositionModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onConfirm={confirmSave} />
        </>
    );
};

export default CompositionGeneratorScreen;