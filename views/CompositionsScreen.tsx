
import React, { useState, useContext, useMemo } from 'react';
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
  // New props for AI generation and product details
  apiKey: string | null;
  onRequestApiKey: () => void;
  products: Product[];
  onEditProduct: (product: Product) => void;
  onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
}

const CompositionsScreen: React.FC<CompositionsScreenProps> = ({ 
  savedCompositions, setSavedCompositions, onNavigate, apiKey, onRequestApiKey, products, onEditProduct, onSaveComposition 
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [viewerState, setViewerState] = useState<{ open: boolean; startIndex: number }>({ open: false, startIndex: 0 });
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | null>(null);

  const filteredCompositions = useMemo(() => {
    return savedCompositions.filter(comp => {
        const nameMatch = comp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const colorMatch = !selectedColor || comp.products.some(prod => 
            prod.colors.some(c => c.name === selectedColor.name)
        );
        return nameMatch && colorMatch;
    });
  }, [savedCompositions, searchQuery, selectedColor]);

  const handleDelete = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    setSavedCompositions(prev => prev.filter(c => c.id !== idToDelete));
  };

  const openViewer = (index: number) => {
    // Find the original index in the unfiltered list
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
        <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
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
                <ColorSelector 
                    allColors={PREDEFINED_COLORS}
                    onSelectColor={(color) => setSelectedColor(color)}
                    selectedColor={selectedColor || undefined}
                    layout="horizontal"
                />
                {selectedColor && (
                    <button onClick={() => setSelectedColor(null)} className="mt-3 text-sm text-fuchsia-500 hover:underline">
                        Limpar filtro de cor
                    </button>
                )}
            </div>
          
          {savedCompositions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredCompositions.map((comp, index) => (
                <div key={comp.id} className={`rounded-2xl border ${cardClasses} flex flex-col`}>
                  <button onClick={() => openViewer(index)} className="w-full aspect-square rounded-t-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                    {comp.isGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/10">
                             <svg className="animate-spin h-8 w-8 text-fuchsia-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="text-sm mt-2 text-fuchsia-300">Gerando imagem...</p>
                        </div>
                    ) : comp.imageUrl ? (
                      <img src={comp.imageUrl} alt={comp.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                        {comp.products.slice(0, 4).map(p => (
                            <img key={p.id} src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ))}
                      </div>
                    )}
                  </button>
                  <div className="p-4 flex justify-between items-start">
                    <div>
                        <p className={`font-bold ${titleClasses}`}>{comp.name}</p>
                        <p className={`text-sm ${subtitleClasses}`}>{comp.size} almofadas</p>
                    </div>
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
              <p className={`mt-2 ${subtitleClasses}`}>Use o Gerador de Composições para criar e salvar suas combinações favoritas.</p>
            </div>
          )}
        </main>
      </div>
      {viewerState.open && (
        <CompositionViewerModal
            compositions={savedCompositions}
            startIndex={viewerState.startIndex}
            onClose={() => setViewerState({ open: false, startIndex: 0 })}
            apiKey={apiKey}
            onRequestApiKey={onRequestApiKey}
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
              apiKey={apiKey}
              onRequestApiKey={onRequestApiKey}
              savedCompositions={savedCompositions}
              onViewComposition={(compositions, startIndex) => {
                  const compositionToView = compositions[startIndex];
                  if (!compositionToView) return;

                  const originalIndex = savedCompositions.findIndex(c => c.id === compositionToView.id);
                  if (originalIndex > -1) {
                      setViewingProduct(null); // Close current modal
                      setViewerState({ open: true, startIndex: originalIndex });
                  }
              }}
              // FIX: Added missing properties to satisfy the component's required props.
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
