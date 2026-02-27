
import React, { useState, useContext, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ThemeContext } from '../types';
import { SavedComposition, View, Product } from '../types';
import CompositionViewerModal from '../components/CompositionViewerModal';
import ProductDetailModal from '../components/ProductDetailModal';
import ColorSelector from '../components/ColorSelector';
import { PREDEFINED_COLORS } from '../constants';

interface CompositionsScreenProps {
  savedCompositions: SavedComposition[];
  setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
  onNavigate: (view: View) => void;
  products: Product[];
  onEditProduct: (product: Product) => void;
  onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
}

const CompositionsScreen: React.FC<CompositionsScreenProps> = ({ 
  savedCompositions, setSavedCompositions, onNavigate, products, onEditProduct, onSaveComposition 
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [viewerState, setViewerState] = useState<{ open: boolean; startIndex: number }>({ open: false, startIndex: 0 });
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedProductsForGeneration, setSelectedProductsForGeneration] = useState<{[compositionId: string]: string[]}>({});

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

  const handleGenerate = async (compositionId: string) => {
    const composition = savedCompositions.find(c => c.id === compositionId);
    const selectedProductIds = selectedProductsForGeneration[compositionId] || [];
    if (!composition || selectedProductIds.length === 0) return;

    setSavedCompositions(prev => prev.map(c => c.id === compositionId ? { ...c, isGenerating: true } : c));

    try {
        const productsToGenerate = composition.products.filter(p => selectedProductIds.includes(p.id));
        const imageParts = await Promise.all(productsToGenerate.map(p => getBase64FromImageUrl(p.baseImageUrl).then(img => ({inlineData: img}))));
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const promptText = `Crie uma simulação profissional de designer de interiores. Arrume estas ${productsToGenerate.length} almofadas de forma elegante e luxuosa em um sofá moderno de cor neutra. Foco total na iluminação de estúdio e texturas.`;
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [...imageParts, { text: promptText }] } 
        });
        
        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
        if (!imagePart?.inlineData) throw new Error("IA não retornou imagem.");
        
        const newImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        
        setSavedCompositions(prev => prev.map(c => c.id === compositionId ? { ...c, imageUrl: newImageUrl, isGenerating: false } : c));
        setSelectedProductsForGeneration(prev => ({ ...prev, [compositionId]: [] }));

    } catch (e) {
        console.error("Erro ao gerar imagem com IA:", e);
        alert("A IA está instável no momento. Por favor, tente novamente mais tarde.");
        setSavedCompositions(prev => prev.map(c => c.id === compositionId ? { ...c, isGenerating: false } : c));
    }
  };

  const filteredCompositions = useMemo(() => {
    return savedCompositions.filter(comp => {
        const nameMatch = comp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const colorMatch = selectedColors.length === 0 || comp.products.some(prod => 
            prod.colors.some(c => selectedColors.includes(c.name))
        );
        return nameMatch && colorMatch;
    });
  }, [savedCompositions, searchQuery, selectedColors]);

  const handleDelete = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    setSavedCompositions(prev => prev.filter(c => c.id !== idToDelete));
  };

  const openViewer = (index: number) => {
    const originalIndex = savedCompositions.findIndex(c => c.id === filteredCompositions[index].id);
    setViewerState({ open: true, startIndex: originalIndex });
  };
  
  const handleViewProduct = (product: Product) => {
      setViewerState({ open: false, startIndex: 0 });
      setTimeout(() => {
          setViewingProduct(product);
      }, 150);
  };

  const titleClasses = isDark ? "text-white" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";
  const inputClasses = isDark ? "bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400" : "bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm";

  return (
    <>
      <div className="h-full w-full flex flex-col relative overflow-hidden">
        <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-3xl font-bold ${titleClasses}`}>Composições Salvas</h1>
             <button
                onClick={() => onNavigate(View.COMPOSITION_GENERATOR)}
                className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                Criar Nova
            </button>
          </div>
            
            <div className="relative mb-6">
                 <input
                    type="text"
                    placeholder="Buscar por nome da composição..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full border rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow shadow-inner ${inputClasses}`}
                />
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <div className="mb-6">
                <h3 className={`text-sm font-bold -mt-3 mb-1 ${subtitleClasses}`}>Filtrar por Cor</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                    {PREDEFINED_COLORS.map(color => {
                        const isSelected = selectedColors.includes(color.name);
                        return (
                            <button
                                key={color.name}
                                onClick={() => {
                                    setSelectedColors(prev => 
                                        prev.includes(color.name) 
                                            ? prev.filter(c => c !== color.name) 
                                            : [...prev, color.name]
                                    );
                                }}
                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/50 scale-110' : 'border-transparent hover:border-gray-300'}`}
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                            >
                                {isSelected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mx-auto ${['Branco', 'Bege', 'Amarelo'].includes(color.name) ? 'text-black' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
          
          {savedCompositions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredCompositions.map((comp, index) => (
                <div key={comp.id} className={`col-span-1 rounded-3xl p-3 shadow-lg flex flex-col text-center border ${cardClasses}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-fuchsia-600 dark:text-fuchsia-400 text-left">{comp.name}</h3>
                        <button 
                            onClick={() => openViewer(index)}
                            className={`text-xs font-bold py-1 px-3 rounded-full transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                            Ver Detalhes
                        </button>
                    </div>
                    {comp.imageUrl ? (
                        <div className="aspect-video w-full rounded-lg overflow-hidden">
                            <img src={comp.imageUrl} alt={comp.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {comp.products.slice(0, 4).map(product => (
                                <div key={product.id} className="relative flex flex-col items-center">
                                    <img src={product.baseImageUrl} alt={product.name} className="w-24 h-24 object-cover rounded-lg mb-1" />
                                    <input 
                                        type="checkbox"
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full text-fuchsia-500 bg-white/50 border-fuchsia-500 focus:ring-fuchsia-500/50 checked:ring-2 checked:ring-offset-2 checked:ring-offset-black/20"
                                        checked={selectedProductsForGeneration[comp.id]?.includes(product.id) || false}
                                        onChange={() => {
                                            setSelectedProductsForGeneration(prev => {
                                                const currentSelected = prev[comp.id] || [];
                                                const newSelected = currentSelected.includes(product.id)
                                                    ? currentSelected.filter(id => id !== product.id)
                                                    : [...currentSelected, product.id];
                                                return { ...prev, [comp.id]: newSelected };
                                            });
                                        }}
                                    />
                                    <span className={`text-xs ${isDark ? 'text-purple-200' : 'text-gray-800'}`}>{product.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-4">
                        <button 
                            onClick={() => handleGenerate(comp.id)}
                            disabled={!selectedProductsForGeneration[comp.id] || selectedProductsForGeneration[comp.id].length === 0 || comp.isGenerating}
                            className={`text-xs font-bold py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}>
                            {comp.isGenerating ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : 'Gerar Visualização com IA'}
                        </button>
                        <button onClick={(e) => handleDelete(e, comp.id)} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className={`text-lg font-semibold ${titleClasses}`}>Nenhuma composição salva</p>
            </div>
          )}
        </main>
      </div>
      {viewerState.open && (
        <CompositionViewerModal
            compositions={savedCompositions}
            startIndex={viewerState.startIndex}
            onClose={() => setViewerState({ open: false, startIndex: 0 })}
            onViewProduct={handleViewProduct}
            onSaveComposition={onSaveComposition}
        />
      )}
      {viewingProduct && (
          <ProductDetailModal
              product={viewingProduct}
              products={products}
              onClose={() => setViewingProduct(null)}
              canManageStock={false}
              onEditProduct={(productToEdit) => {
                  setViewingProduct(null);
                  onEditProduct(productToEdit);
              }}
              onSwitchProduct={setViewingProduct}
              savedCompositions={savedCompositions}
              onViewComposition={(compositions, startIndex) => {
                  const compositionToView = compositions[startIndex];
                  if (!compositionToView) return;
                  const originalIndex = savedCompositions.findIndex(c => c.id === compositionToView.id);
                  if (originalIndex > -1) {
                      setViewingProduct(null);
                      setViewerState({ open: true, startIndex: originalIndex });
                  }
              }}
              onAddToCart={() => {}}
              onNavigate={onNavigate}
              sofaColors={[]}
              cart={[]}
          />
      )}
    </>
  );
};

export default CompositionsScreen;
