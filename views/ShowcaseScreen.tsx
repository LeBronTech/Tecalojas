import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Product, View, DynamicBrand, SavedComposition, ThemeContext } from '../types';
import ProductDetailModal from '../components/ProductDetailModal';
import { BRAND_LOGOS, WATER_RESISTANCE_INFO } from '../constants';
// FIX: Changed to a named import as CompositionViewerModal does not have a default export.
import { CompositionViewerModal } from '../components/CompositionViewerModal';

type ProductGroup = Product[];

const FireIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.828 6.065c.348-.348.348-.913 0-1.261a.89.89 0 0 0-1.261 0c-1.121 1.121-1.859 2.62-1.859 4.289 0 .548.152 1.07.42 1.536l-.805 1.209a.89.89 0 0 0 1.503 1.002l.805-1.209c.466.268.988.42 1.536.42 1.668 0 3.167-.738 4.288-1.86a.89.89 0 0 0 0-1.26c-.347-.348-.912-.348-1.26 0l-1.06 1.06c-.495-.713-.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l1.06 1.061Z" clipRule="evenodd" />
        <path d="M4.172 13.935c-.348.348-.348.913 0 1.261a.89.89 0 0 0 1.261 0c1.121-1.121 1.859-2.62-1.859-4.289 0-.548-.152-1.07-.42-1.536l.805-1.209a.89.89 0 0 0-1.503-1.002l-.805 1.209c-.466-.268-.988-.42-1.536-.42-1.668 0-3.167.738-4.288 1.86a.89.89 0 0 0 0 1.26c.347.348.912.348 1.26 0l1.06-1.06c.495.713.88 1.52 1.077 2.389-.336-.264-.63.578-.875-.923l-1.06 1.061Z" />
    </svg>
);


const ProductCard: React.FC<{ product: Product, index: number, onClick: () => void }> = ({ product, index, onClick }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const cardClasses = isDark 
    ? "bg-black/20 backdrop-blur-xl border-white/10" 
    : "bg-white border-gray-200/80 shadow-md";
  
  const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
  const textMetaClasses = isDark ? "text-purple-300" : "text-gray-500";
  const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
  
  const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];
  
  const getPriceRange = () => {
    if (!product.variations || product.variations.length === 0) {
        return 'R$0,00';
    }
    const prices = product.variations.map(v => v.priceFull);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
        return `R$${minPrice.toFixed(2).replace('.', ',')}`;
    }
    return `R$${minPrice.toFixed(2).replace('.', ',')} - R$${maxPrice.toFixed(2).replace('.', ',')}`;
  };

  return (
    <button 
        onClick={onClick}
        className={`rounded-3xl p-3 shadow-lg flex flex-col items-center text-center border transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${cardClasses} ${isDark ? 'focus:ring-offset-black' : 'focus:ring-offset-white'}`}
        style={{ 
             animation: 'float-in 0.5s ease-out forwards',
             animationDelay: `${index * 50}ms`,
             opacity: 0 
         }}>
        <div className={`w-full h-32 ${imageBgClasses} rounded-2xl mb-3 flex items-center justify-center overflow-hidden relative`}>
             {product.baseImageUrl ? (
                <img 
                    src={product.baseImageUrl} 
                    alt={product.name} 
                    className="absolute inset-0 w-full h-full object-cover"
                />
             ) : (
                <div className={`w-full h-full flex items-center justify-center relative ${imageBgClasses}`}>
                    <img 
                        src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" 
                        alt="Sem Imagem" 
                        className="w-1/2 h-1/2 object-contain opacity-20" 
                    />
                </div>
             )}
             {waterResistanceDetails?.showcaseIndicator && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    {waterResistanceDetails.showcaseIndicator}
                </div>
             )}
        </div>
        <h3 className={`font-bold text-sm leading-tight h-10 flex items-center justify-center ${textNameClasses}`}>{product.name}</h3>
        <div className={`flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-xs mt-2`}>
            {product.unitsSold >= 5 && (
                <div className={`flex items-center space-x-1 ${textMetaClasses}`}>
                    <FireIcon className="w-4 h-4 text-orange-400" />
                    <span>{product.unitsSold} vendidos</span>
                </div>
            )}
            <div className={`flex items-center gap-1 ${textMetaClasses}`}>
                <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px shadow-sm" />
                <span className="font-semibold">{product.brand}</span>
            </div>
             <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                {product.fabricType}
            </span>
        </div>
        <span className="text-md font-bold text-fuchsia-500 mt-2">{getPriceRange()}</span>
    </button>
  );
};

const ProductGroupCard: React.FC<{ group: ProductGroup, index: number, onClick: (product: Product) => void }> = ({ group, index, onClick }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const validImages = useMemo(() => group.map(p => p.baseImageUrl).filter(Boolean), [group]);

    useEffect(() => {
        if (validImages.length <= 1) return;

        const timer = setInterval(() => {
            setActiveImageIndex(prev => (prev + 1) % validImages.length);
        }, 3000); // Change image every 3 seconds

        return () => clearInterval(timer);
    }, [validImages.length]);

    const cardClasses = isDark ? "bg-black/20 backdrop-blur-xl border-white/10" : "bg-white border-gray-200/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const textMetaClasses = isDark ? "text-purple-300" : "text-gray-500";
    const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
    
    const representativeProduct = group[0];

    return (
        <button 
            onClick={() => onClick(representativeProduct)}
            className={`rounded-3xl p-3 shadow-lg flex flex-col items-center text-center border transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${cardClasses} ${isDark ? 'focus:ring-offset-black' : 'focus:ring-offset-white'}`}
            style={{ animation: 'float-in 0.5s ease-out forwards', animationDelay: `${index * 50}ms`, opacity: 0 }}
        >
            <div className={`w-full h-32 ${imageBgClasses} rounded-2xl mb-3 flex items-center justify-center overflow-hidden relative`}>
                {validImages.length > 0 ? (
                    validImages.map((src, idx) => (
                         <img 
                            key={idx}
                            src={src} 
                            alt={`${representativeProduct.name} variation`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === activeImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        />
                    ))
                ) : (
                     <div className={`w-full h-full flex items-center justify-center relative ${imageBgClasses}`}>
                        <img 
                            src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" 
                            alt="Sem Imagem" 
                            className="w-1/2 h-1/2 object-contain opacity-20" 
                        />
                    </div>
                )}
            </div>
            <h3 className={`font-bold text-sm leading-tight h-10 flex items-center justify-center ${textNameClasses}`}>{representativeProduct.category}</h3>
            <div className={`flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-xs mt-2`}>
                 <div className={`flex items-center gap-1 ${textMetaClasses}`}>
                    <img src={BRAND_LOGOS[representativeProduct.brand]} alt={representativeProduct.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px shadow-sm" />
                    <span className="font-semibold">{representativeProduct.brand}</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                    {representativeProduct.fabricType}
                </span>
            </div>
            <span className="text-md font-bold text-fuchsia-500 mt-2">{group.length} cores</span>
        </button>
    );
};


interface ShowcaseScreenProps {
  products: Product[];
  onMenuClick: () => void;
  hasFetchError: boolean;
  canManageStock: boolean;
  onEditProduct: (product: Product) => void;
  brands: DynamicBrand[];
  apiKey: string | null;
  onRequestApiKey: () => void;
  onNavigate: (view: View) => void;
  savedCompositions: SavedComposition[];
}

const ShowcaseScreen: React.FC<ShowcaseScreenProps> = ({ products, onMenuClick, hasFetchError, canManageStock, onEditProduct, brands, apiKey, onRequestApiKey, onNavigate, savedCompositions }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedFabric, setSelectedFabric] = useState<string>('Todos os Tecidos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [compositionToView, setCompositionToView] = useState<{ compositions: SavedComposition[], startIndex: number } | null>(null);


  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const availableFabrics = useMemo(() => {
    if (selectedCategory === 'Todas') {
      return [];
    }
    const fabricsInCategory = products
      .filter(p => p.category === selectedCategory)
      .map(p => p.fabricType);
    return ['Todos os Tecidos', ...Array.from(new Set(fabricsInCategory))];
  }, [selectedCategory, products]);

  const groupedProducts = useMemo((): (Product | ProductGroup)[] => {
    const familyMap = new Map<string, ProductGroup>();
    products.forEach(p => {
        const familyKey = `${p.category}|${p.fabricType}`;
        if (!familyMap.has(familyKey)) {
            familyMap.set(familyKey, []);
        }
        familyMap.get(familyKey)!.push(p);
    });

    const result: (Product | ProductGroup)[] = [];
    familyMap.forEach(group => {
        if (group.length > 1) {
            result.push(group);
        } else {
            result.push(group[0]);
        }
    });

    return result;
  }, [products]);

  const displayedProducts = useMemo(() => {
    let filtered: (Product | ProductGroup)[] | Product[];
    
    if (selectedCategory === 'Todas') {
      filtered = groupedProducts;
    } else {
      // When a category is selected, we show individual products, not groups.
      let categoryProducts: Product[] = products.filter(p => p.category === selectedCategory);
      if (selectedFabric !== 'Todos os Tecidos') {
          categoryProducts = categoryProducts.filter(p => p.fabricType === selectedFabric);
      }
      filtered = categoryProducts;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
        const itemA = Array.isArray(a) ? a[0] : a;
        const itemB = Array.isArray(b) ? b[0] : b;
        if (!itemA || !itemB) return 0;
        
        if (sortOrder === 'alpha') {
            const nameA = Array.isArray(a) ? itemA.category : itemA.name;
            const nameB = Array.isArray(b) ? itemB.category : itemB.name;
            return nameA.localeCompare(nameB);
        } else { // 'recent'
            const timeA = parseInt(itemA.id.split('-')[0], 10) || 0;
            const timeB = parseInt(itemB.id.split('-')[0], 10) || 0;
            return timeB - timeA;
        }
    });
    
    return sorted;
  }, [selectedCategory, selectedFabric, products, groupedProducts, sortOrder]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(null); // Close detail modal
    onEditProduct(product); // Open edit modal
  };

  const handleSwitchProduct = (product: Product) => {
    setSelectedProduct(product); // Switch to another product variation in the detail modal
  };

  const handleViewComposition = (compositions: SavedComposition[], startIndex: number) => {
      setCompositionToView({ compositions, startIndex });
      setSelectedProduct(null); // Close product detail modal if open
  }

  const searchInputClasses = isDark 
    ? "bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400"
    : "bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm";
  
  const headerTextClasses = isDark ? "text-purple-300/80" : "text-purple-600/80";
  const titleTextClasses = isDark ? "text-white" : "text-gray-900";
  
  return (
    <>
      <div className="h-full w-full flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-80 overflow-hidden">
            {isDark ? (
              <>
                <div className="absolute -top-20 -left-40 w-96 h-96 bg-fuchsia-600/30 rounded-full filter blur-3xl transform rotate-45 opacity-50"></div>
                <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl transform -rotate-45 opacity-40"></div>
                <div className="absolute top-1/2 -right-20 w-72 h-72 bg-cyan-400/20 rounded-full filter blur-2xl opacity-60"></div>
              </>
            ) : (
              <>
                <div className="absolute -top-20 -left-40 w-96 h-96 bg-purple-200/50 rounded-full filter blur-3xl"></div>
                <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-fuchsia-200/50 rounded-full filter blur-3xl"></div>
              </>
            )}
        </div>

          <main className="flex-grow overflow-y-auto px-6 pt-20 pb-36 md:pb-6 flex flex-col no-scrollbar z-10">
              {hasFetchError && (
                <div className={`p-4 mb-4 rounded-xl text-center font-semibold border ${isDark ? 'bg-red-900/50 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    <p className="font-bold text-lg">Modo de Demonstração Ativo</p>
                    <p className="text-sm">Você está vendo uma vitrine de exemplo. O conteúdo real não pôde ser carregado.</p>
                </div>
              )}
               <div className="mb-6">
                  <h2 className={`text-sm font-bold tracking-widest ${headerTextClasses}`}>CATÁLOGO</h2>
                  <h3 className={`text-3xl font-bold ${titleTextClasses}`}>Almofadas</h3>
              </div>

               <div className="mb-6">
                    <button
                        onClick={() => onNavigate(View.COMPOSITION_GENERATOR)}
                        className={`w-full text-center font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 text-md shadow-lg transform hover:scale-105 ${isDark ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-fuchsia-600/20' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-purple-500/20'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.073a1 1 0 01.09.313l.483 1.834a6.953 6.953 0 011.698 1.112l1.72-.69a1 1 0 011.155.44l.44 1.155a1 1 0 01-.44 1.155l-1.72.69a6.953 6.953 0 010 2.224l1.72.69a1 1 0 01.44 1.155l-.44 1.155a1 1 0 01-1.155.44l-1.72-.69a6.953 6.953 0 01-1.698 1.112l-.483 1.834a1 1 0 01-.09.313V18a1 1 0 01-1.4.954l-1.715-.572a.5.5 0 00-.57 0L6.6 18.954A1 1 0 015.2 18v-1.073a1 1 0 01-.09-.313l-.483-1.834a6.953 6.953 0 01-1.698-1.112l-1.72.69a1 1 0 01-1.155-.44l-.44-1.155a1 1 0 01.44-1.155l1.72-.69a6.953 6.953 0 010-2.224l-1.72-.69a1 1 0 01-.44-1.155l.44-1.155a1 1 0 011.155-.44l1.72.69A6.953 6.953 0 018.7 5.234l.483-1.834A1 1 0 019.277 3.09V2a1 1 0 01.7-1.046l1.323-.448zM9 10a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
                        </svg>
                        Criar Composição com IA
                    </button>
                </div>

              <div className="relative mb-6 flex items-center gap-4">
                  <div className="relative flex-grow">
                     <input type="text" placeholder="Buscar por almofadas..." className={`w-full border rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow shadow-inner ${searchInputClasses}`}/>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                  </div>
                   <select
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value as 'recent' | 'alpha')}
                        className={`border rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow appearance-none ${searchInputClasses}`}
                    >
                        <option value="recent">Mais Recentes</option>
                        <option value="alpha">Ordem Alfabética</option>
                    </select>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                  {categories.map(category => {
                      const isActive = selectedCategory === category;
                      const activeClasses = isDark 
                          ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30 border-transparent hover:bg-fuchsia-500' 
                          : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 border-transparent hover:bg-purple-700';
                      const inactiveClasses = isDark 
                          ? 'bg-black/20 backdrop-blur-md text-gray-200 border-white/10 hover:bg-black/40' 
                          : 'bg-white text-gray-700 border-gray-300/80 hover:bg-gray-100 hover:border-gray-400';

                      return (
                          <button
                              key={category}
                              onClick={() => {
                                setSelectedCategory(category);
                                setSelectedFabric('Todos os Tecidos');
                              }}
                              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap border transform hover:scale-105 ${
                                  isActive ? activeClasses : inactiveClasses
                              }`}
                          >
                              {category}
                          </button>
                      );
                  })}
              </div>

              {availableFabrics.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-8 transition-all duration-300" style={{ animation: 'float-in 0.3s forwards', opacity: 0 }}>
                    {availableFabrics.map(fabric => {
                      const isActive = selectedFabric === fabric;
                      const activeClasses = isDark 
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border-transparent hover:bg-cyan-500' 
                          : 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 border-transparent hover:bg-teal-600';
                      const inactiveClasses = isDark 
                          ? 'bg-black/20 backdrop-blur-md text-gray-200 border-white/10 hover:bg-black/40' 
                          : 'bg-white text-gray-700 border-gray-300/80 hover:bg-gray-100 hover:border-gray-400';
                      return (
                         <button
                              key={fabric}
                              onClick={() => setSelectedFabric(fabric)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border transform hover:scale-105 ${
                                  isActive ? activeClasses : inactiveClasses
                              }`}
                          >
                              {fabric}
                          </button>
                      )
                    })}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displayedProducts.map((item, index) => (
                      Array.isArray(item)
                        ? <ProductGroupCard key={`${item[0].category}-${item[0].fabricType}`} group={item} index={index} onClick={setSelectedProduct} />
                        : <ProductCard key={(item as Product).id} product={item as Product} index={index} onClick={() => setSelectedProduct(item as Product)} />
                  ))}
              </div>
          </main>
      </div>
      {selectedProduct && (
          <ProductDetailModal
              product={selectedProduct}
              products={products}
              onClose={() => setSelectedProduct(null)}
              canManageStock={canManageStock}
              onEditProduct={handleEdit}
              onSwitchProduct={handleSwitchProduct}
              apiKey={apiKey}
              onRequestApiKey={onRequestApiKey}
              savedCompositions={savedCompositions}
              onViewComposition={handleViewComposition}
          />
      )}
      {compositionToView && (
          <CompositionViewerModal 
              compositions={compositionToView.compositions}
              startIndex={compositionToView.startIndex}
              onClose={() => setCompositionToView(null)}
              apiKey={apiKey}
              onRequestApiKey={onRequestApiKey}
              onViewProduct={() => {}}
              onSaveComposition={() => {}}
          />
      )}
    </>
  );
};

export default ShowcaseScreen;
