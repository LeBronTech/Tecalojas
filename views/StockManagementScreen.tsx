
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Product, StoreName, View, Brand, CushionSize, DynamicBrand, ThemeContext } from '../types';
import { BRAND_LOGOS, PREDEFINED_COLORS } from '../constants';

const MultiColorCircle: React.FC<{ colors: { hex: string }[], size?: number }> = ({ colors, size = 4 }) => {
    const className = `w-${size} h-${size}`;
    const gradient = useMemo(() => {
        if (!colors || colors.length === 0) return 'transparent';
        if (colors.length === 1) return colors[0].hex;
        const step = 100 / colors.length;
        const stops = colors.map((color, i) => `${color.hex} ${i * step}% ${(i + 1) * step}%`).join(', ');
        return `conic-gradient(${stops})`;
    }, [colors]);

    return (
        <div
            className={`${className} rounded-full border border-black/20 flex-shrink-0`}
            style={{ background: gradient }}
        />
    );
};

const StockControl: React.FC<{
    store: StoreName;
    stock: number;
    onUpdate: (change: number) => void;
    disabled: boolean;
}> = ({ store, stock, onUpdate, disabled }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const buttonClasses = isDark ? "bg-gray-700/50 text-gray-200 hover:bg-purple-900/50" : "bg-gray-200 text-gray-700 hover:bg-gray-300";
    const disabledButtonClasses = isDark ? "bg-gray-800/50 text-gray-500 cursor-not-allowed" : "bg-gray-200/50 text-gray-400 cursor-not-allowed";
    const stockTextClasses = isDark ? "text-fuchsia-400" : "text-fuchsia-600";
    
    return (
         <div className="flex items-center space-x-2">
            <span className={`font-semibold text-xs w-11 text-right ${isDark ? 'text-purple-300/80' : 'text-gray-500'}`}>{store.substring(0, 4)}:</span>
            <button
                onClick={(e) => { e.stopPropagation(); onUpdate(-1); }}
                disabled={disabled || stock <= 0}
                className={`w-11 h-11 rounded-lg font-bold text-xl flex items-center justify-center transition-colors ${disabled || stock <= 0 ? disabledButtonClasses : buttonClasses}`}
                aria-label={`Diminuir estoque de ${store}`}
            >
                -
            </button>
            <span className={`font-bold w-8 text-center text-lg ${stockTextClasses}`}>{stock}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onUpdate(1); }}
                disabled={disabled}
                className={`w-11 h-11 rounded-lg font-bold text-xl flex items-center justify-center transition-colors ${disabled ? disabledButtonClasses : buttonClasses}`}
                aria-label={`Aumentar estoque de ${store}`}
            >
                +
            </button>
        </div>
    );
}

interface StockItemProps {
    product: Product;
    index: number;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onUpdateStock: (productId: string, variationSize: CushionSize, store: StoreName, change: number) => void;
    canManageStock: boolean;
    selectedVariation: CushionSize;
    onSelectVariation: (productId: string, size: CushionSize) => void;
    isHighlighted?: boolean;
}

const StockItem: React.FC<StockItemProps> = ({ product, index, onEdit, onDelete, onUpdateStock, canManageStock, selectedVariation, onSelectVariation, isHighlighted }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [showBack, setShowBack] = useState(false);

    useEffect(() => {
        if (!product.backImageUrl) return;
        
        const interval = setInterval(() => {
            setShowBack(prev => !prev);
        }, 3000);
        
        return () => clearInterval(interval);
    }, [product.backImageUrl]);

    const currentVariation = product.variations.find(v => v.size === selectedVariation);

    const tecaStock = currentVariation?.stock[StoreName.TECA] ?? 0;
    const ioneStock = currentVariation?.stock[StoreName.IONE] ?? 0;
    const totalStock = tecaStock + ioneStock;

    const cardClasses = isDark
        ? "bg-black/20 backdrop-blur-2xl border-white/10 hover:bg-black/30"
        : "bg-white border-gray-200/80 hover:bg-gray-50/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const textMetaClasses = isDark ? "text-purple-300/80" : "text-gray-500";
    const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
    const actionBtnClasses = isDark
        ? "text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10"
        : "text-gray-500 hover:text-blue-600 hover:bg-blue-500/10";
    const deleteBtnClasses = isDark
        ? "text-gray-300 hover:text-red-500 hover:bg-red-500/10"
        : "text-gray-500 hover:text-red-600 hover:bg-red-500/10";
    const disabledBtnClasses = isDark ? "text-gray-500 opacity-50 cursor-not-allowed" : "text-gray-400 opacity-50 cursor-not-allowed";
    const selectClasses = isDark ? "bg-gray-700/50 text-gray-200 border-white/10" : "bg-gray-100 text-gray-700 border-gray-200";


    return (
        <div 
            id={`product-${product.id}`}
            onClick={() => canManageStock && onEdit(product)}
            className={`rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border ${cardClasses} ${canManageStock ? 'cursor-pointer' : ''} ${isHighlighted ? 'ring-4 ring-fuchsia-500 animate-pulse-pink' : ''}`}
            style={{ 
                animation: isHighlighted ? 'none' : 'float-in 0.3s ease-out forwards',
                animationDelay: `${index * 50}ms`,
                opacity: isHighlighted ? 1 : 0
            }}
        >
            <div className="flex items-start gap-4 pr-16 relative">
                <div className={`w-20 h-20 ${imageBgClasses} rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md relative`}>
                    {product.baseImageUrl ? (
                        <>
                            <img 
                                src={product.baseImageUrl} 
                                alt={product.name} 
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${product.backImageUrl && showBack ? 'opacity-0' : 'opacity-100'}`} 
                            />
                            {product.backImageUrl && (
                                <img 
                                    src={product.backImageUrl} 
                                    alt={`${product.name} verso`} 
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${showBack ? 'opacity-100' : 'opacity-0'}`} 
                                />
                            )}
                        </>
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
                <div className="flex-grow min-w-0">
                     <h4 className={`font-bold text-lg leading-tight ${textNameClasses}`}>{product.name}</h4>
                     
                     <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
                            <span className={`text-xs font-semibold ${textMetaClasses}`}>{product.brand}</span>
                        </div>
                        <MultiColorCircle colors={product.colors} size={4} />
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                            {product.fabricType}
                        </span>
                     </div>
                </div>

                <div className="absolute top-0 right-0 flex flex-col items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                        disabled={!canManageStock}
                        className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${canManageStock ? actionBtnClasses : disabledBtnClasses}`}
                        aria-label={`Editar ${product.name}`}
                    >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                        disabled={!canManageStock}
                        className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${canManageStock ? deleteBtnClasses : disabledBtnClasses}`}
                        aria-label={`Excluir ${product.name}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    
                    <div className="flex items-center justify-center mt-1">
                        <span className={`text-xl font-black ${totalStock <= 1 ? (isDark ? 'text-red-400' : 'text-red-600') : 'text-fuchsia-500'}`}>{totalStock}</span>
                        {totalStock <= 1 && <div className="w-2 h-2 bg-red-500 rounded-full blinking-dot ml-1"></div>}
                        {totalStock === 2 && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse ml-1"></div>}
                    </div>
                </div>
            </div>
            
            <div className={`mt-4 pt-4 flex flex-row items-start justify-center gap-1 border-t ${isDark ? 'border-white/10' : 'border-gray-200/80'}`}>
                {/* Size Selection Buttons on the Left */}
                <div className="flex flex-col gap-2 w-auto min-w-[110px] flex-shrink-0">
                    <p className={`text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tamanhos</p>
                    <div className="grid grid-cols-2 gap-2">
                        {product.variations.map(v => (
                            <button
                                key={v.size}
                                onClick={(e) => { e.stopPropagation(); onSelectVariation(product.id, v.size); }}
                                className={`px-1 py-1 rounded-lg text-[10px] font-bold transition-all border text-center flex items-center justify-center h-11 ${
                                    selectedVariation === v.size
                                        ? (isDark ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-purple-600 border-purple-500 text-white')
                                        : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200')
                                } ${v.size.toLowerCase().includes('lombar') || v.size.length > 5 ? 'col-span-2' : ''}`}
                            >
                                {v.size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stock Controls on the Right */}
                <div className={`flex flex-col items-start justify-center gap-2 pl-2 border-l ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    <p className={`text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Estoque: {selectedVariation}</p>
                    <div className="flex flex-col gap-2">
                        <StockControl 
                            store={StoreName.TECA} 
                            stock={tecaStock} 
                            onUpdate={(change) => onUpdateStock(product.id, selectedVariation, StoreName.TECA, change)} 
                            disabled={!canManageStock || !currentVariation}
                        />
                        <StockControl 
                            store={StoreName.IONE} 
                            stock={ioneStock} 
                            onUpdate={(change) => onUpdateStock(product.id, selectedVariation, StoreName.IONE, change)} 
                            disabled={!canManageStock || !currentVariation}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


interface StockManagementScreenProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
  onUpdateStock: (productId: string, variationSize: CushionSize, store: StoreName, change: number) => void;
  onMenuClick: () => void;
  canManageStock: boolean;
  hasFetchError: boolean;
  brands: DynamicBrand[];
  highlightProductId?: string | null;
}

const StockManagementScreen: React.FC<StockManagementScreenProps> = ({ products, onEditProduct, onDeleteProduct, onAddProduct, onUpdateStock, onMenuClick, canManageStock, hasFetchError, brands, highlightProductId }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [selectedVariations, setSelectedVariations] = useState<Record<string, CushionSize>>({});
  const [showWarning, setShowWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [isFilterHeaderOpen, setIsFilterHeaderOpen] = useState(false);
  const [isColorHeaderOpen, setIsColorHeaderOpen] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const currentScrollY = scrollContainerRef.current.scrollTop;

        if (currentScrollY > 100) {
            if (currentScrollY > lastScrollY.current) {
                if (isHeaderVisible) setIsHeaderVisible(false);
                // Removed automatic closing of filter header to avoid conflict
            } else {
                if (!isHeaderVisible) setIsHeaderVisible(true);
            }
        } else {
            if (!isHeaderVisible) setIsHeaderVisible(true);
        }
        
        lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
    }
  };

  useEffect(() => {
    if (highlightProductId && scrollContainerRef.current) {
        const element = document.getElementById(`product-${highlightProductId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [highlightProductId]);
  
  useEffect(() => {
    if (hasFetchError) {
      setShowWarning(true);
    }
  }, [hasFetchError]);


    useEffect(() => {
        setSelectedVariations(prevSelections => {
            const newSelections = { ...prevSelections };
            let hasChanged = false;
    
            products.forEach(p => {
                if (!newSelections[p.id] && p.variations && p.variations.length > 0) {
                    const defaultVar = p.variations.find(v => v.size === CushionSize.SQUARE_40) || p.variations[0];
                    newSelections[p.id] = defaultVar.size;
                    hasChanged = true;
                }
            });
            
            return hasChanged ? newSelections : prevSelections;
        });
    }, [products]);

    const handleSelectVariation = (productId: string, size: CushionSize) => {
        setSelectedVariations(prev => ({ ...prev, [productId]: size }));
    };
    
    const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category)))], [products]);

    const availableColors = useMemo(() => {
        const allProductColors = products.flatMap(p => p.colors);
        const uniqueColors = new Map<string, string>();

        allProductColors.forEach(color => {
            if (!uniqueColors.has(color.name)) {
                uniqueColors.set(color.name, color.hex);
            }
        });

        PREDEFINED_COLORS.forEach(color => {
            if (!uniqueColors.has(color.name)) {
                uniqueColors.set(color.name, color.hex);
            }
        });

        return Array.from(uniqueColors, ([name, hex]) => ({ name, hex }))
                    .sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);
    
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const categoryMatch = selectedCategory === 'Todas' || product.category === selectedCategory;
            
            let colorMatch = true;
            if (selectedColors.length > 0) {
                const productColors = product.colors.map(c => c.name);
                colorMatch = selectedColors.some(color => productColors.includes(color));
            }

            return nameMatch && categoryMatch && colorMatch;
        });
    }, [products, searchQuery, selectedCategory, selectedColors]);

    const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);

    useEffect(() => {
        setOrderedProducts(prev => {
            const currentIds = new Set(filteredProducts.map(p => p.id));
            const prevIds = new Set(prev.map(p => p.id));
            
            // Verifica se a lista mudou estruturalmente (adição/remoção/filtro)
            const hasListChanged = prev.length !== filteredProducts.length || !filteredProducts.every(p => prevIds.has(p.id));
            
            if (hasListChanged) {
                 // Reordena completamente
                 return [...filteredProducts].sort((a, b) => {
                    if (sortOrder === 'alpha') {
                        return a.name.localeCompare(b.name);
                    } else { 
                        const getTime = (p: Product) => {
                            if (p.updatedAt) return p.updatedAt;
                            const idTime = parseInt(p.id.split('-')[0], 10);
                            return isNaN(idTime) ? 0 : idTime;
                        };
                        return getTime(b) - getTime(a);
                    }
                });
            }
            
            // Se a lista é estruturalmente a mesma, apenas atualiza os dados mantendo a ordem visual
            return prev.map(p => filteredProducts.find(fp => fp.id === p.id) || p);
        });
    }, [filteredProducts, sortOrder]);

  return (
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

        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto no-scrollbar">
            <div className="pt-16 pb-2 px-6 text-center">
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Estoque</h1>
                <p className={`text-md ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {searchQuery || selectedCategory !== 'Todas' ? `Mostrando ${orderedProducts.length} de ${products.length} produtos` : `${products.length} produtos cadastrados`}
                </p>
            </div>

            <div className={`sticky top-[5.25rem] z-10 pb-4 transition-transform duration-300 ease-in-out pointer-events-none ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="text-center px-6 pt-2 pointer-events-auto flex items-center justify-center gap-2">
                    <button
                        onClick={() => {
                            setIsFilterHeaderOpen(!isFilterHeaderOpen);
                            if (!isFilterHeaderOpen) setIsColorHeaderOpen(false);
                        }}
                        className={`inline-flex items-center justify-center font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-lg ${isDark ? 'bg-[#1A1129] text-gray-300 hover:bg-black/60 border border-white/10' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                        aria-expanded={isFilterHeaderOpen}
                        aria-controls="filters-panel"
                    >
                        Filtros & Busca
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-2 transition-transform duration-300 ${isFilterHeaderOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => {
                            setIsColorHeaderOpen(!isColorHeaderOpen);
                            if (!isColorHeaderOpen) setIsFilterHeaderOpen(false);
                        }}
                        className={`inline-flex items-center justify-center font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-lg ${isDark ? 'bg-[#1A1129] text-gray-300 hover:bg-black/60 border border-white/10' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                    >
                        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 border border-white/20 mr-2 shadow-sm"></div>
                        Cor
                    </button>
                </div>

                <div id="filters-panel" className={`transition-all duration-500 ease-in-out overflow-hidden pointer-events-auto ${isFilterHeaderOpen ? 'max-h-[500px] opacity-100 pt-4' : 'max-h-0 opacity-0'} ${isDark ? 'bg-[#1A1129]/95 backdrop-blur-md rounded-2xl mx-4 mt-2 shadow-xl border border-white/10' : 'bg-white/95 backdrop-blur-md rounded-2xl mx-4 mt-2 shadow-xl border border-gray-100'}`}>
                    <div className="px-4 flex items-center gap-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full border rounded-full py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow shadow-inner ${isDark ? 'bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400' : 'bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm'}`}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-fuchsia-500 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'recent' ? 'alpha' : 'recent')}
                            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${isDark ? 'bg-black/30 border-white/10 text-white hover:bg-white/10' : 'bg-white border-gray-300/80 text-gray-700 hover:bg-gray-50'}`}
                            title={sortOrder === 'recent' ? "Mudar para Ordem Alfabética" : "Mudar para Mais Recentes"}
                        >
                            {sortOrder === 'recent' ? (
                                <div className="flex items-center gap-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    <div className="flex flex-col leading-none text-[10px] font-black">
                                        <span>A</span>
                                        <span>Z</span>
                                    </div>
                                </div>
                            )}
                        </button>
                    </div>
                    
                    <div className="px-4 flex flex-wrap gap-2 mt-4">
                         <h3 className={`w-full text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Filtros de Categoria</h3>
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
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border transform hover:scale-105 ${
                                        isActive ? activeClasses : inactiveClasses
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Painel de Cores */}
                <div id="colors-panel" className={`transition-all duration-500 ease-in-out overflow-hidden pointer-events-auto ${isColorHeaderOpen ? 'max-h-[200px] opacity-100 pt-4' : 'max-h-0 opacity-0'} ${isDark ? 'bg-[#1A1129]/95 backdrop-blur-md rounded-2xl mx-4 mt-2 shadow-xl border border-white/10' : 'bg-white/95 backdrop-blur-md rounded-2xl mx-4 mt-2 shadow-xl border border-gray-100'}`}>
                    <div className="px-4 pb-4">
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1 justify-center">
                            {availableColors.map(color => {
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
                                        className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all transform hover:scale-110 ${isSelected ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/50 scale-110' : 'border-transparent hover:border-gray-300'}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mx-auto ${['Branco', 'Bege', 'Amarelo'].includes(color.name) ? 'text-black' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            <main className="px-4 space-y-3 pb-60 md:pb-60 z-0">
                {canManageStock && showWarning && (
                    <div className={`relative border-l-4 p-4 rounded-lg shadow-md ${isDark ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-red-100 border-red-500 text-red-800'}`}>
                        <button 
                            onClick={() => setShowWarning(false)}
                            className={`absolute top-2 right-2 p-1 rounded-full ${isDark ? 'text-red-300 hover:bg-red-800/60' : 'text-red-800 hover:bg-red-200'}`}
                            aria-label="Fechar aviso"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <p className="font-bold">Ação Necessária: Configuração de Permissões</p>
                        <p className="text-sm mt-1">
                            A vitrine para visitantes está mostrando dados de demonstração porque as regras de segurança do seu banco de dados estão bloqueando o acesso público.
                        </p>
                        <a 
                            href="https://console.firebase.google.com/project/meu-estoque-b1fbe/firestore/rules" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`inline-block mt-2 text-sm font-bold underline ${isDark ? 'text-red-100 hover:text-red-300' : 'text-red-900 hover:text-red-700'}`}
                        >
                            Clique aqui para corrigir as regras do Firebase e exibir a vitrine real.
                        </a>
                    </div>
                )}

                {orderedProducts.map((product, index) => (
                <StockItem 
                    key={product.id} 
                    product={product} 
                    index={index} 
                    onEdit={onEditProduct} 
                    onDelete={onDeleteProduct} 
                    onUpdateStock={onUpdateStock}
                    canManageStock={canManageStock}
                    selectedVariation={selectedVariations[product.id]}
                    onSelectVariation={handleSelectVariation}
                    isHighlighted={highlightProductId === product.id}
                />
                ))}
            </main>
        </div>

       <div 
         className="absolute bottom-28 left-0 right-0 p-6 z-20 pointer-events-none" 
       >
        {canManageStock ? (
            <div className="flex justify-end pointer-events-auto">
                <button 
                    onClick={onAddProduct} 
                    className="w-14 h-14 bg-fuchsia-600 text-white rounded-full shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
                    aria-label="Adicionar novo item"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
            </div>
        ) : (
            <div className={`text-center p-4 rounded-2xl ${isDark ? 'bg-black/20 text-gray-400' : 'bg-yellow-100 text-yellow-800'}`}>
                <p className="font-semibold">Modo somente leitura</p>
                <p className="text-sm">Você não tem permissão para gerenciar o estoque.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StockManagementScreen;
