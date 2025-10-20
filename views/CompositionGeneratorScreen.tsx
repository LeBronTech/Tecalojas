import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Product, View } from '../types';
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


const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, apiKey, onRequestApiKey }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [startProducts, setStartProducts] = useState<Product[]>([]);
    const [compositionSize, setCompositionSize] = useState(4);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [compositionsBySize, setCompositionsBySize] = useState<Record<number, Product[]>>({});
    
    const currentComposition = useMemo(() => compositionsBySize[compositionSize] || null, [compositionsBySize, compositionSize]);

    // Clear results and error if the starting point changes
    useEffect(() => {
        setCompositionsBySize({});
        setError(null);
    }, [startProducts]);

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

    const getPromptForSize = (size: number): string => {
        const initialCushions = startProducts.map(p => ({ id: p.id, name: p.name, color: p.mainColor?.name, category: p.category }));
        const availableCushions = products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            color: p.mainColor?.name,
            colorHex: p.mainColor?.hex,
        }));
    
        let rules = '';
        switch (size) {
            case 4:
                rules = `A composição DEVE ter exatamente 4 almofadas. Regras estritas: 1. Inclua UM par de almofadas estampadas IDÊNTICAS. 2. As outras duas almofadas devem ser DIFERENTES uma da outra e do par estampado. 3. Não pode haver outras repetições. 4. As 4 almofadas NUNCA devem ser todas da mesma categoria.`;
                break;
            case 5:
                rules = `A composição DEVE ter exatamente 5 almofadas e seguir uma estrutura simétrica espelhada (A, B, C, B, A). Regras estritas: 1. Use DOIS pares de almofadas idênticas (par A e par B). 2. A almofada central (C) deve ser ÚNICA e de uma categoria diferente dos pares. 3. O resultado final DEVE estar na ordem A, B, C, B, A.`;
                break;
            case 6:
                rules = `A composição DEVE ter exatamente 6 almofadas. Regras estritas: 1. NUNCA gere seis almofadas diferentes. 2. A composição deve ser formada por pares (ex: A,A,B,B,C,C) ou por trios (ex: A,A,A,B,B,B).`;
                break;
            default: // Covers 2, 3
                rules = `Complete a composição para um total de ${size} almofadas. As almofadas adicionais não podem ser repetidas.`;
                break;
        }
    
        return `Você é um designer de interiores especialista em combinar almofadas. Sua tarefa é criar uma composição harmoniosa de ${size} almofadas. A composição DEVE incluir as seguintes almofadas iniciais: ${JSON.stringify(initialCushions)}. ${rules} A lista de almofadas disponíveis é: ${JSON.stringify(availableCushions)}. Sua resposta DEVE ser um objeto JSON válido com uma única chave "productIds", que é um array de strings contendo os IDs EXATOS de ${size} almofadas selecionadas, seguindo a ordem e as regras especificadas.`;
    };
    

    const handleGenerate = async () => {
        if (startProducts.length === 0) {
            setError("Por favor, selecione pelo menos uma almofada inicial.");
            return;
        }
        if (!apiKey) {
            onRequestApiKey();
            return;
        }
        
        setIsLoading(true);
        setError(null);
        // Clear previous result for this size to show loading state
        setCompositionsBySize(prev => ({ ...prev, [compositionSize]: undefined as any }));
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = getPromptForSize(compositionSize);
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const resultText = response.text.trim();
            const resultJson = JSON.parse(resultText);

            if (!resultJson.productIds || !Array.isArray(resultJson.productIds)) {
                throw new Error("A IA retornou um formato de dados inesperado.");
            }

            const compositionProducts = resultJson.productIds
                .map((id: string) => products.find(p => p.id === id))
                .filter((p: Product | undefined): p is Product => p !== undefined);
            
            if (compositionProducts.length !== compositionSize) {
                 throw new Error(`A IA retornou ${compositionProducts.length} produtos em vez dos ${compositionSize} esperados.`);
            }

            setCompositionsBySize(prev => ({ ...prev, [compositionSize]: compositionProducts }));
        } catch (e: any) {
            console.error("AI Composition Failed:", e);
            setError("A IA não conseguiu gerar uma composição. Tente novamente ou com outras almofadas.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
    const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";

    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-12 no-scrollbar z-10 flex flex-col">
                    <div className="flex items-center mb-8">
                        <button onClick={() => onNavigate(View.SHOWCASE)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${titleClasses}`}>Gerador de Composição</h1>
                    </div>
                    
                    {/* --- Configuration Area --- */}
                    <div className={`p-6 rounded-2xl border ${cardClasses} mb-8`}>
                         <div className="mb-4">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>1. Ponto de Partida</h3>
                            <p className={`text-sm mb-3 ${subtitleClasses}`}>Escolha uma ou duas almofadas para iniciar a composição.</p>
                            <div className="flex items-center gap-3">
                                {startProducts.map(p => (
                                    <img key={p.id} src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />
                                ))}
                                <button onClick={() => setIsModalOpen(true)} className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${isDark ? 'border-gray-600 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>2. Tamanho da Composição</h3>
                            <p className={`text-sm mb-3 ${subtitleClasses}`}>Quantas almofadas no total?</p>
                            <div className="flex gap-2">
                                {[2, 3, 4, 5, 6].map(size => (
                                    <button key={size} onClick={() => setCompositionSize(size)} className={`flex-1 py-3 font-bold rounded-lg transition-colors text-center ${compositionSize === size ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}>{size}</button>
                                ))}
                            </div>
                        </div>
                        
                        <button onClick={handleGenerate} disabled={isLoading || startProducts.length === 0} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-500">
                           {isLoading ? <ButtonSpinner /> : 'Gerar Composição'}
                        </button>
                    </div>

                    {/* --- Result Area --- */}
                    <div className="flex-grow flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={`text-xl font-bold ${titleClasses}`}>Resultado</h2>
                             {currentComposition && (
                                <button onClick={handleOrder} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                    Ordenar
                                </button>
                            )}
                        </div>

                        <div className={`flex-grow p-4 rounded-2xl border flex items-center justify-center ${cardClasses}`}>
                            {isLoading && <ButtonSpinner />}
                            {error && <p className="text-center text-red-500">{error}</p>}
                            {currentComposition && (
                                <div className="w-full">
                                    <div className="flex justify-center items-center -space-x-8 mb-4 h-40">
                                        {currentComposition.map((p, index) => (
                                            <div key={`${p.id}-${index}`} className="w-32 h-32 rounded-lg shadow-lg" style={{ zIndex: index, transform: `rotate(${Math.random() * 10 - 5}deg)` }}>
                                                <img src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-center space-y-1">
                                         {currentComposition.map((p, index) => (
                                             <p key={`${p.id}-${index}`} className={`text-sm font-semibold ${subtitleClasses}`}>{p.name}</p>
                                         ))}
                                    </div>
                                </div>
                            )}
                            {!isLoading && !error && !currentComposition && (
                                <p className={`text-center ${subtitleClasses}`}>Sua composição aparecerá aqui.</p>
                            )}
                        </div>
                    </div>

                </main>
            </div>
            {isModalOpen && (
                <ProductSelectModal
                    products={products}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleConfirmSelection}
                    initialSelectedIds={startProducts.map(p => p.id)}
                />
            )}
        </>
    );
};

export default CompositionGeneratorScreen;