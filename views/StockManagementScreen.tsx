
import React, { useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, StoreName, View, Brand, CushionSize, DynamicBrand, ThemeContext } from '../types';
import { BRAND_LOGOS, PREDEFINED_COLORS } from '../constants';
import SearchBar from '../components/SearchBar';
import { motion, AnimatePresence } from 'framer-motion';

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
    isFlashing?: boolean;
}> = ({ store, stock, onUpdate, disabled, isFlashing }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const buttonClasses = isDark ? "bg-gray-700/50 text-gray-200 hover:bg-purple-900/50" : "bg-gray-200 text-gray-700 hover:bg-gray-300";
    const disabledButtonClasses = isDark ? "bg-gray-800/50 text-gray-500 cursor-not-allowed" : "bg-gray-200/50 text-gray-400 cursor-not-allowed";
    const stockTextClasses = isDark ? "text-fuchsia-400" : "text-fuchsia-600";
    
    return (
         <div className={`flex items-center space-x-2 ${isFlashing ? 'animate-flash-purple' : ''}`}>
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
    selectedVariation: CushionSize | undefined;
    onSelectVariation: (productId: string, size: CushionSize | undefined) => void;
    isHighlighted?: boolean;
}

const StockItemInner: React.FC<StockItemProps> = ({ product, index, onEdit, onDelete, onUpdateStock, canManageStock, selectedVariation, onSelectVariation, isHighlighted }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [showBack, setShowBack] = useState(false);
    const [isSizesExpanded, setIsSizesExpanded] = useState(false);

    useEffect(() => {
        if (!product.backImageUrl) return;
        
        const interval = setInterval(() => {
            setShowBack(prev => !prev);
        }, 3000);
        
        return () => clearInterval(interval);
    }, [product.backImageUrl]);

    const cardClasses = isDark
        ? "bg-black/20 backdrop-blur-2xl border-white/10 hover:bg-black/30"
        : "bg-white border-gray-200/80 hover:bg-gray-50/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const textMetaClasses = isDark ? "text-purple-300/80" : "text-gray-500";
    const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";

    const getStoreLabelClass = (stock: number, store: string) => {
        if (stock === 0) {
            return "text-rose-500/95 dark:text-rose-300/95 font-extrabold";
        }
        if (stock === 1) {
            return "text-amber-500/90 dark:text-amber-400/90 font-extrabold";
        }
        if (stock >= 3) {
            return "text-purple-500 dark:text-purple-350 font-extrabold";
        }
        return store === "teca" 
            ? "text-purple-700/85 dark:text-purple-300/85 font-semibold" 
            : "text-fuchsia-700/85 dark:text-fuchsia-300/85 font-semibold";
    };

    const getButtonClasses = (tStock: number, iStock: number) => {
        if (tStock === 0 && iStock === 0) {
            return isDark
                ? "bg-rose-500/5 border-rose-500/20 text-rose-300 hover:bg-rose-500/10"
                : "bg-rose-50/50 border-rose-100 text-rose-500/90 shadow-sm";
        }
        if (tStock === 1 && iStock === 1) {
            return isDark
                ? "bg-amber-500/5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                : "bg-amber-50/70 border-amber-200 text-amber-800 shadow-sm";
        }
        if (tStock >= 3 && iStock >= 3) {
            return isDark
                ? "bg-purple-500/5 border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                : "bg-purple-50/70 border-purple-200 text-purple-700 shadow-sm";
        }
        return isDark 
            ? "bg-white/5 border-white/10 text-gray-100 hover:bg-white/10 hover:border-purple-500/40" 
            : "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100/85 hover:border-purple-300 shadow-sm";
    };

    return (
        <div 
            id={`product-${product.id}`}
            onClick={() => canManageStock && onEdit(product)}
            className={`rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border ${cardClasses} ${canManageStock ? 'cursor-pointer' : ''} ${isHighlighted ? 'ring-4 ring-fuchsia-500' : ''}`}
            style={{ 
                animation: isHighlighted ? 'none' : 'float-in 0.3s ease-out forwards',
                animationDelay: `${Math.min(index, 6) * 50}ms`,
                opacity: isHighlighted ? 1 : 0
            }}
        >
            <div className="flex items-center gap-4 relative w-full">
                <div className={`w-12 h-12 ${imageBgClasses} rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md relative`}>
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
                <div className="flex-grow min-w-0 pr-2">
                     <h4 className={`font-semibold text-sm leading-tight md:text-base break-words ${textNameClasses}`}>{product.name}</h4>
                     
                     <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
                            <span className={`text-xs font-semibold ${textMetaClasses}`}>{product.brand}</span>
                        </div>
                        <MultiColorCircle colors={product.colors} size={4} />
                     </div>
                </div>
            </div>
            
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200/80'}`}>
                <AnimatePresence mode="wait">
                    {selectedVariation ? (
                        // Expanded state for a single variation
                        (() => {
                            const v = product.variations.find(va => va.size === selectedVariation);
                            if (!v) return null;
                            const tStock = v.stock[StoreName.TECA] ?? 0;
                            const iStock = v.stock[StoreName.IONE] ?? 0;

                            let tecaBarClass = "";
                            if (tStock === 0) {
                                tecaBarClass = isDark
                                    ? "border-rose-500/20 text-rose-300 bg-rose-950/10"
                                    : "border-rose-200 bg-rose-50/65 text-rose-600 shadow-sm";
                            } else if (tStock === 1) {
                                tecaBarClass = isDark
                                    ? "border-amber-500/20 text-amber-300 bg-amber-950/10"
                                    : "border-amber-200 bg-amber-50/65 text-amber-900 shadow-sm";
                            } else if (tStock >= 3) {
                                tecaBarClass = isDark
                                    ? "border-purple-500/20 text-purple-200 bg-purple-950/10"
                                    : "border-purple-200 bg-purple-50/65 text-purple-700 shadow-sm";
                            } else {
                                tecaBarClass = isDark
                                    ? "border-white/5 bg-white/5 text-gray-200"
                                    : "border-gray-200 bg-gray-50/50 text-gray-700 shadow-sm";
                            }

                            let ioneBarClass = "";
                            if (iStock === 0) {
                                ioneBarClass = isDark
                                    ? "border-rose-500/20 text-rose-300 bg-rose-950/10"
                                    : "border-rose-200 bg-rose-50/65 text-rose-600 shadow-sm";
                            } else if (iStock === 1) {
                                ioneBarClass = isDark
                                    ? "border-amber-500/20 text-amber-300 bg-amber-950/10"
                                    : "border-amber-200 bg-amber-50/65 text-amber-900 shadow-sm";
                            } else if (iStock >= 3) {
                                ioneBarClass = isDark
                                    ? "border-purple-500/20 text-purple-200 bg-purple-950/10"
                                    : "border-purple-200 bg-purple-50/65 text-purple-700 shadow-sm";
                            } else {
                                ioneBarClass = isDark
                                    ? "border-white/5 bg-white/5 text-gray-200"
                                    : "border-gray-200 bg-gray-50/50 text-gray-700 shadow-sm";
                            }
                            
                            return (
                                <motion.div 
                                    key="expanded"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-center gap-2 w-full h-[88px]"
                                >
                                    {/* Narrow back size button (width: 42px, height: 88px) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSelectVariation(product.id, undefined); }}
                                        className={`flex flex-col items-center justify-center h-[88px] rounded-2xl border transition-all duration-200 cursor-pointer flex-shrink-0 relative group px-1 ${
                                            isDark 
                                                ? 'bg-fuchsia-600/15 border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-600/25' 
                                                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-sm'
                                        }`}
                                        style={{ width: '42px' }}
                                        title="Clique para voltar"
                                    >
                                        <span className="text-[9px] font-black tracking-tighter leading-none mb-1 text-center whitespace-normal break-all">{v.size.replace(' (25x45)', '')}</span>
                                        <span className="text-[12px] font-black leading-none text-purple-500 dark:text-purple-300">←</span>
                                        <span className="text-[7px] font-bold opacity-75 uppercase tracking-tighter mt-1 text-center">Voltar</span>
                                    </button>

                                    {/* Stock Adjustments: stacked one below the other */}
                                    <div className="flex flex-col gap-1.5 flex-grow" onClick={(e) => e.stopPropagation()}>
                                        {/* Têca stock adjustment row */}
                                        <div className={`flex items-center justify-between h-[40px] px-3 rounded-xl border ${tecaBarClass} transition-all duration-200`}>
                                            <span className="text-[11px] font-black uppercase tracking-wider select-none">Têca</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUpdateStock(product.id, v.size, StoreName.TECA, -1); }}
                                                    disabled={!canManageStock || tStock <= 0}
                                                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-sm transition-all select-none active:scale-95 ${
                                                        isDark 
                                                            ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-25' 
                                                            : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 disabled:opacity-30'
                                                    }`}
                                                >
                                                    -
                                                </button>
                                                <span className="font-extrabold text-sm w-5 text-center">{tStock}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUpdateStock(product.id, v.size, StoreName.TECA, 1); }}
                                                    disabled={!canManageStock}
                                                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-sm transition-all select-none active:scale-95 ${
                                                        isDark 
                                                            ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-25' 
                                                            : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 disabled:opacity-30'
                                                    }`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ione stock adjustment row */}
                                        <div className={`flex items-center justify-between h-[40px] px-3 rounded-xl border ${ioneBarClass} transition-all duration-200`}>
                                            <span className="text-[11px] font-black uppercase tracking-wider select-none">Ione</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUpdateStock(product.id, v.size, StoreName.IONE, -1); }}
                                                    disabled={!canManageStock || iStock <= 0}
                                                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-sm transition-all select-none active:scale-95 ${
                                                        isDark 
                                                            ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-25' 
                                                            : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 disabled:opacity-30'
                                                    }`}
                                                >
                                                    -
                                                </button>
                                                <span className="font-extrabold text-sm w-5 text-center">{iStock}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUpdateStock(product.id, v.size, StoreName.IONE, 1); }}
                                                    disabled={!canManageStock}
                                                    className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-sm transition-all select-none active:scale-95 ${
                                                        isDark 
                                                            ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-25' 
                                                            : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 disabled:opacity-30'
                                                    }`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()
                    ) : (
                        // Collapsed state displaying 2 size buttons side-by-side and bottom expand button
                        (() => {
                            const hasMoreSizes = product.variations.length > 2;
                            const displayedVariations = isSizesExpanded 
                                ? product.variations 
                                : product.variations.slice(0, 2);

                            return (
                                <motion.div 
                                    key="grid"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full flex flex-col"
                                >
                                    <div className={`grid gap-2 w-full ${isSizesExpanded ? 'grid-cols-2 xs:grid-cols-3' : 'grid-cols-2'}`}>
                                        {displayedVariations.map(v => {
                                            const tStock = v.stock[StoreName.TECA] ?? 0;
                                            const iStock = v.stock[StoreName.IONE] ?? 0;
                                            const buttonColClass = getButtonClasses(tStock, iStock);
                                            
                                            return (
                                                <button
                                                    key={v.size}
                                                    onClick={(e) => { e.stopPropagation(); onSelectVariation(product.id, v.size); }}
                                                    className={`flex flex-col items-center justify-between p-2 h-20 rounded-2xl border transition-all duration-200 cursor-pointer text-center relative ${buttonColClass}`}
                                                >
                                                    <span className="text-xs font-black leading-none tracking-tight truncate max-w-full block mb-1">{v.size.replace(' (25x45)', '')}</span>
                                                    
                                                    {/* Side-by-side store labels with readable names */}
                                                    <div className="flex items-center justify-center gap-1.5 w-full text-[9px] font-black leading-none">
                                                        <span className={getStoreLabelClass(tStock, "teca")}>Têca: {tStock}</span>
                                                        <span className="text-gray-300/40 dark:text-white/10 text-[8px]">|</span>
                                                        <span className={getStoreLabelClass(iStock, "ione")}>Ione: {iStock}</span>
                                                    </div>
                                                    
                                                    {/* Total and its number */}
                                                    <div className={`text-[10px] font-black leading-none mt-1 ${isDark ? 'text-purple-300/90' : 'text-purple-700/90'}`}>
                                                        Total: {tStock + iStock}
                                                    </div>
                                                </button>
                                            );
                                         })}
                                    </div>

                                    {/* Toggle expand button in the lower part of the card, occupying all that lower part */}
                                    {hasMoreSizes && (
                                         <button
                                             onClick={(e) => { e.stopPropagation(); setIsSizesExpanded(!isSizesExpanded); }}
                                             className={`w-full mt-2 flex items-center justify-center py-2 px-4 rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                                                 isDark 
                                                     ? 'bg-purple-900/10 border-dashed border-purple-500/30 text-purple-300 hover:bg-purple-900/20' 
                                                     : 'bg-purple-50/50 border-dashed border-purple-200 text-purple-700 hover:bg-purple-100 shadow-sm'
                                             }`}
                                         >
                                             {isSizesExpanded ? (
                                                 <>
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                                                     </svg>
                                                     <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300">Menos tamanhos</span>
                                                 </>
                                             ) : (
                                                 <>
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                     </svg>
                                                     <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300">Ver mais {product.variations.length - 2} tamanhos</span>
                                                 </>
                                             )}
                                         </button>
                                    )}
                                </motion.div>
                            );
                        })()
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const StockItem = React.memo(StockItemInner, (prevProps, nextProps) => {
    return (
        prevProps.product === nextProps.product &&
        prevProps.index === nextProps.index &&
        prevProps.canManageStock === nextProps.canManageStock &&
        prevProps.selectedVariation === nextProps.selectedVariation &&
        prevProps.isHighlighted === nextProps.isHighlighted
    );
});


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
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSearchIconOpacity: (opacity: number) => void;
  onSearchFocusChange?: (focused: boolean) => void;
}

const StockManagementScreen: React.FC<StockManagementScreenProps> = ({ 
  products, 
  onEditProduct, 
  onDeleteProduct, 
  onAddProduct, 
  onUpdateStock, 
  onMenuClick, 
  canManageStock, 
  hasFetchError, 
  brands, 
  highlightProductId,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  setSearchIconOpacity,
  onSearchFocusChange
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [selectedVariations, setSelectedVariations] = useState<Record<string, CushionSize>>({});
  const [showWarning, setShowWarning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedFabric, setSelectedFabric] = useState('Todos os Tecidos');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastPushedOpacityRef = useRef<number>(0);

  useEffect(() => {
    setSearchIconOpacity(0);
    lastPushedOpacityRef.current = 0;
    return () => {
      setSearchIconOpacity(0);
    };
  }, []);

  useEffect(() => {
    onSearchFocusChange?.(isSearchFocused);
  }, [isSearchFocused, onSearchFocusChange]);

   const handleScroll = () => {
    if (!ticking.current) {
        window.requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                const currentScrollY = scrollContainerRef.current.scrollTop;
                
                const opacity = Math.min(currentScrollY / 200, 1);
                // Steps of 0.25: updates at most 5 stages across entire scroll height!
                const roundedOpacity = Math.round(opacity * 4) / 4;
                
                if (lastPushedOpacityRef.current !== roundedOpacity) {
                    lastPushedOpacityRef.current = roundedOpacity;
                    setSearchIconOpacity(roundedOpacity);
                }
                
                lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
            }
            ticking.current = false;
        });
        ticking.current = true;
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


    const handleSelectVariation = useCallback((productId: string, size: CushionSize | undefined) => {
        setSelectedVariations(prev => {
            const next = { ...prev };
            if (size === undefined) {
                delete next[productId];
            } else {
                next[productId] = size;
            }
            return next;
        });
    }, []);
    
    const categories = useMemo(() => {
        const allCategoryValues = products.flatMap(p => [p.category, p.subCategory]).filter((c): c is string => !!c && c.trim() !== '');
        const uniqueCategories = ([...new Set(allCategoryValues)] as string[])
            .filter(cat => !['Waterblock', 'Waterblocks', '(Gorgurão)', 'Gorgurão'].includes(cat));
        return ['Todas', ...uniqueCategories.sort((a, b) => a.localeCompare(b))];
    }, [products]);

    const availableFabrics = useMemo(() => {
        if (selectedCategory === 'Todas') {
            return [];
        }
        const fabricsInCategory = products
            .filter(p => p.category === selectedCategory || p.subCategory === selectedCategory)
            .map(p => p.fabricType);
        
        const uniqueFabrics = ([...new Set(fabricsInCategory)] as string[]).sort((a, b) => a.localeCompare(b));
        return ['Todos os Tecidos', ...uniqueFabrics];
    }, [selectedCategory, products]);

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
            const searchQueryLower = searchQuery.toLowerCase();
            const nameMatch = product.name.toLowerCase().includes(searchQueryLower);
            const categoryMatch = selectedCategory === 'Todas' || product.category === selectedCategory || product.subCategory === selectedCategory;
            const fabricMatch = selectedFabric === 'Todos os Tecidos' || product.fabricType === selectedFabric;
            
            let colorMatch = true;
            if (selectedColors.length > 0) {
                const productColors = product.colors.map(c => c.name);
                colorMatch = selectedColors.some(color => productColors.includes(color));
            }

            const tagsMatch = product.fabricType.toLowerCase().includes(searchQueryLower) || 
                              product.brand.toLowerCase().includes(searchQueryLower) ||
                              product.category.toLowerCase().includes(searchQueryLower);

            return (nameMatch || tagsMatch) && categoryMatch && fabricMatch && colorMatch;
        });
    }, [products, searchQuery, selectedCategory, selectedFabric, selectedColors]);

    const orderedProducts = useMemo(() => {
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
    }, [filteredProducts, sortOrder]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
        {/* Balão de Busca Flutuante (Overlay inteligente acionado pelo cabeçalho no estoque) */}
        <SearchBar 
          isFloating={true}
          isSearchOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDark={isDark}
          onFocusChange={setIsSearchFocused}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          availableFabrics={availableFabrics}
          selectedFabric={selectedFabric}
          setSelectedFabric={setSelectedFabric}
          selectedColors={selectedColors}
          setSelectedColors={setSelectedColors}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isFiltersExpanded={isFiltersExpanded}
          setIsFiltersExpanded={setIsFiltersExpanded}
          isColorFilterOpen={isColorFilterOpen}
          setIsColorFilterOpen={setIsColorFilterOpen}
        />

        <div className="absolute inset-0 z-0 opacity-80 overflow-hidden pointer-events-none">
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

        <div ref={scrollContainerRef} onScroll={handleScroll} className="relative z-10 flex-grow overflow-y-auto no-scrollbar">
            <div className="pt-16 pb-2 px-6 text-center">
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Estoque</h1>
                <p className={`text-md ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {searchQuery || selectedCategory !== 'Todas' ? `Mostrando ${orderedProducts.length} de ${products.length} produtos` : `${products.length} produtos cadastrados`}
                </p>
            </div>

            {/* Barra de Busca Fixa (Sempre visível no início do estoque) */}
            <div className="max-w-md mx-auto mb-6 px-4">
                <SearchBar 
                    isFloating={false}
                    isSearchOpen={false}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isDark={isDark}
                    onFocusChange={setIsSearchFocused}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    availableFabrics={availableFabrics}
                    selectedFabric={selectedFabric}
                    setSelectedFabric={setSelectedFabric}
                    selectedColors={selectedColors}
                    setSelectedColors={setSelectedColors}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    isFiltersExpanded={isFiltersExpanded}
                    setIsFiltersExpanded={setIsFiltersExpanded}
                    isColorFilterOpen={isColorFilterOpen}
                    setIsColorFilterOpen={setIsColorFilterOpen}
                />
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

       {!isSearchFocused && !isSearchOpen && (
         <div 
           className="absolute bottom-28 left-0 right-0 p-6 z-20 pointer-events-none" 
         >
          {canManageStock ? (
              <div className="flex justify-end pointer-events-none">
                  <button 
                      onClick={onAddProduct} 
                      className="w-14 h-14 bg-fuchsia-600 text-white rounded-full shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center pointer-events-auto"
                      aria-label="Adicionar novo item"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                  </button>
              </div>
          ) : (
              <div className={`text-center p-4 rounded-2xl ${isDark ? 'bg-black/20 text-gray-400' : 'bg-yellow-100 text-yellow-800'} pointer-events-auto`}>
                  <p className="font-semibold">Modo somente leitura</p>
                  <p className="text-sm">Você não tem permissão para gerenciar o estoque.</p>
              </div>
          )}
        </div>
       )}
    </div>
  );
};

export default StockManagementScreen;
