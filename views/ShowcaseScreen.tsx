
import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { Product, View, DynamicBrand, SavedComposition, ThemeContext, Variation, CushionSize, CartItem } from '../types';
import ProductDetailModal from '../components/ProductDetailModal';
import { BRAND_LOGOS, WATER_RESISTANCE_INFO, PREDEFINED_COLORS } from '../constants';
import CompositionViewerModal from '../components/CompositionViewerModal';

type ProductGroup = Product[];

const FireIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.828 6.065c.348-.348.348-.913 0-1.261a.89.89 0 0 0-1.261 0c-1.121 1.121-1.859 2.62-1.859 4.289 0 .548.152 1.07.42 1.536l-.805 1.209a.89.89 0 0 0 1.503 1.002l.805-1.209c.466.268.988.42 1.536.42 1.668 0 3.167-.738 4.288-1.86a.89.89 0 0 0 0-1.26c-.347-.348-.912-.348-1.26 0l-1.06 1.06c-.495-.713-.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l1.06 1.061Z" clipRule="evenodd" />
        <path d="M4.172 13.935c-.348.348-.348.913 0 1.261a.89.89 0 0 0 1.261 0c1.121-1.121 1.859-2.62-1.859-4.289 0-.548-.152-1.07-.42-1.536l.805-1.209a.89.89 0 0 0-1.503-1.002l-.805 1.209c-.466-.268-.988-.42-1.536-.42-1.668 0-3.167.738-4.288 1.86a.89.89 0 0 0 0 1.26c.347.348.912-.348 1.26 0l1.06-1.06c.495.713.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l-1.06 1.061Z" />
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
        }, 3000);

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
            className={`rounded-3xl p-3 shadow-lg flex flex-col items-center justify-between text-center border transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${cardClasses} ${isDark ? 'focus:ring-offset-black' : 'focus:ring-offset-white'}`}
            style={{ animation: 'float-in 0.5s ease-out forwards', animationDelay: `${index * 50}ms`, opacity: 0 }}
        >
            <div className="w-full">
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
            </div>
            <span className="text-md font-bold text-fuchsia-500 mt-2">{group.length} cores</span>
        </button>
    );
};

const WhatsAppButton = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsExpanded(true), 1500);
        const collapseTimer = setTimeout(() => setIsExpanded(false), 4500); 
        return () => {
            clearTimeout(timer);
            clearTimeout(collapseTimer);
        }
    }, []);

    const whatsappUrl = `https://wa.me/5561991434805?text=${encodeURIComponent("Olá, vi o site das Lojas Têca e gostaria de fazer uma encomenda.")}`;

    return (
        <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`fixed bottom-28 right-6 z-[60] flex items-center bg-[#25D366] text-white rounded-full shadow-2xl transition-all duration-700 ease-in-out h-14 ${isExpanded ? 'px-5 py-3 w-auto' : 'w-14 p-0 justify-center overflow-hidden'}`}
        >
            <div className={`flex items-center justify-center ${isExpanded ? '' : 'w-full h-full'}`}>
                <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            </div>
            <span className={`ml-2 whitespace-nowrap font-black text-sm uppercase tracking-wider transition-all duration-500 overflow-hidden ${isExpanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'}`}>
                Faça sua encomenda!
            </span>
        </a>
    );
};


interface ShowcaseScreenProps {
  products: Product[];
  hasFetchError: boolean;
  canManageStock: boolean;
  onEditProduct: (product: Product) => void;
  brands: DynamicBrand[];
  apiKey: string | null;
  onRequestApiKey: () => void;
  onNavigate: (view: View) => void;
  savedCompositions: SavedComposition[];
  onAddToCart: (product: Product, variation: Variation, quantity: number, itemType: 'cover' | 'full', price: number, isPreOrder?: boolean) => void;
  sofaColors: { name: string; hex: string }[];
  cart: CartItem[];
}

const ShowcaseScreen: React.FC<ShowcaseScreenProps> = ({ products, hasFetchError, canManageStock, onEditProduct, brands, apiKey, onRequestApiKey, onNavigate, savedCompositions, onAddToCart, sofaColors, cart }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedFabric, setSelectedFabric] = useState<string>('Todos os Tecidos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [compositionToView, setCompositionToView] = useState<{ compositions: SavedComposition[], startIndex: number } | null>(null);


  const categories = useMemo(() => {
    const allCategoryValues = products.flatMap(p => [p.category, p.subCategory]).filter((c): c is string => !!c && c.trim() !== '');
    const uniqueCategories = [...new Set(allCategoryValues)];
    return ['Todas', ...uniqueCategories.sort((a, b) => String(a).localeCompare(String(b)))];
  }, [products]);

  const availableFabrics = useMemo(() => {
    if (selectedCategory === 'Todas') {
      return [];
    }
    const fabricsInCategory = products
      .filter(p => p.category === selectedCategory || p.subCategory === selectedCategory)
      .map(p => p.fabricType);
    
    // Sort fabrics alphabetically
    const uniqueFabrics = [...new Set(fabricsInCategory)].sort((a, b) => String(a).localeCompare(String(b)));
    return ['Todos os Tecidos', ...uniqueFabrics];
  }, [selectedCategory, products]);

  // --- Função Robusta de Chave de Família ---
  const getProductFamilyKey = useCallback((p: Product) => {
    if (p.variationGroupId) return p.variationGroupId;

    let baseName = p.name.toLowerCase();
    
    // Remove TODAS as cores conhecidas do nome para sobrar apenas a "Coleção"
    const sortedColors = [...PREDEFINED_COLORS].sort((a, b) => b.name.length - a.name.length);
    sortedColors.forEach(c => {
        const regex = new RegExp(`\\b${c.name.toLowerCase()}\\b|\\(${c.name.toLowerCase()}\\)`, 'g');
        baseName = baseName.replace(regex, '');
    });

    // Remove termos redundantes
    baseName = baseName.replace(/capa|almofada|cheia|vazia|enchimento|kit|lombar/g, '');
    const cleanBase = baseName.replace(/\s\s+/g, ' ').replace(/[()]/g, '').trim();

    return `${p.brand}|${p.category}|${cleanBase}`;
  }, []);

  const displayedProducts = useMemo(() => {
    // 1. Filtrar
    let filtered = products.filter(p => {
        const categoryMatch = selectedCategory === 'Todas' || p.category === selectedCategory || p.subCategory === selectedCategory;
        const fabricMatch = selectedFabric === 'Todos os Tecidos' || p.fabricType === selectedFabric;
        return categoryMatch && fabricMatch;
    });

    // 2. Agrupar (Condicional)
    const grouped: (Product | ProductGroup)[] = [];

    // SE um tecido específico for selecionado, mostre os produtos separadamente (não agrupe).
    // SE estiver em "Todos os Tecidos" (ou visualização padrão), agrupe por família.
    if (selectedFabric !== 'Todos os Tecidos') {
         grouped.push(...filtered);
    } else {
        const familyMap = new Map<string, ProductGroup>();
        filtered.forEach(p => {
            const familyKey = getProductFamilyKey(p);
            if (!familyMap.has(familyKey)) familyMap.set(familyKey, []);
            familyMap.get(familyKey)!.push(p);
        });

        familyMap.forEach(group => {
            if (group.length > 1) grouped.push(group);
            else grouped.push(group[0]);
        });
    }

    // 3. Ordenar
    return grouped.sort((a, b) => {
        const itemA = Array.isArray(a) ? a[0] : a;
        const itemB = Array.isArray(b) ? b[0] : b;

        if (sortOrder === 'alpha') {
            const nameA = String(itemA?.name || '');
            const nameB = String(itemB?.name || '');
            return nameA.localeCompare(nameB);
        } else { // 'recent'
            const timeA = parseInt(itemA.id.split('-')[0], 10) || 0;
            const timeB = parseInt(itemB.id.split('-')[0], 10) || 0;
            return timeB - timeA;
        }
    });
  }, [products, selectedCategory, selectedFabric, sortOrder, getProductFamilyKey]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(null); 
    onEditProduct(product);
  };

  const handleSwitchProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleViewComposition = (compositions: SavedComposition[], startIndex: number) => {
      setCompositionToView({ compositions, startIndex });
      setSelectedProduct(null);
  }

  const searchInputClasses = isDark 
    ? "bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400"
    : "bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm";
  
  const headerTextClasses = isDark ? "text-purple-300/80" : "text-purple-600/80";
  const titleTextClasses = isDark ? "text-white" : "text-gray-900";
  
  const isCategorySelected = selectedCategory !== 'Todas';

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
                           <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                           <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
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
              
              <div className="flex flex-wrap gap-3 mb-4 transition-all duration-300">
                  {/* Back Button - Only visible when a category is selected */}
                  {isCategorySelected && (
                      <button
                          onClick={() => {
                              setSelectedCategory('Todas');
                              setSelectedFabric('Todos os Tecidos');
                          }}
                          className={`px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-md transform hover:scale-105 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                          Voltar
                      </button>
                  )}

                  {categories.map(category => {
                      // Logic: If a category is selected, HIDE all other categories.
                      // If 'Todas' is selected, show all (except 'Todas' itself if desired, but your array includes it).
                      if (isCategorySelected && category !== selectedCategory) return null;

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
                        ? <ProductGroupCard key={`group-${index}`} group={item} index={index} onClick={setSelectedProduct} />
                        : <ProductCard key={(item as Product).id} product={item as Product} index={index} onClick={() => setSelectedProduct(item as Product)} />
                  ))}
              </div>
          </main>
      </div>
      <WhatsAppButton />
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
              onAddToCart={onAddToCart}
              onNavigate={onNavigate}
              sofaColors={sofaColors}
              cart={cart}
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
