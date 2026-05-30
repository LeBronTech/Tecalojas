
import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, View, DynamicBrand, SavedComposition, ThemeContext, Variation, CushionSize, CartItem, ProductFamily, WaterResistanceLevel, StoreName, Banner } from '../types';
import ProductDetailModal from '../components/ProductDetailModal';
import { BRAND_LOGOS, WATER_RESISTANCE_INFO, PREDEFINED_COLORS } from '../constants';
import CompositionViewerModal from '../components/CompositionViewerModal';
import SearchBar from '../components/SearchBar';

type ShowcaseItem = {
    type: 'single';
    product: Product;
} | {
    type: 'group';
    products: Product[];
    familyId?: string;
    familyName?: string;
} | {
    type: 'collection';
    products: Product[];
    familyId: string;
    familyName: string;
    color: { name: string; hex: string };
};

const FireIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.828 6.065c.348-.348.348-.913 0-1.261a.89.89 0 0 0-1.261 0c-1.121 1.121-1.859 2.62-1.859 4.289 0 .548.152 1.07.42 1.536l-.805 1.209a.89.89 0 0 0 1.503 1.002l.805-1.209c.466.268.988.42 1.536.42 1.668 0 3.167-.738 4.288-1.86a.89.89 0 0 0 0-1.26c-.347-.348-.912-.348-1.26 0l-1.06 1.06c-.495-.713-.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l1.06 1.061Z" clipRule="evenodd" />
        <path d="M4.172 13.935c-.348.348-.348.913 0 1.261a.89.89 0 0 0 1.261 0c1.121-1.121 1.859-2.62-1.859-4.289 0-.548-.152-1.07-.42-1.536l.805-1.209a.89.89 0 0 0-1.503-1.002l-.805 1.209c-.466-.268-.988-.42-1.536-.42-1.668 0-3.167.738-4.288 1.86a.89.89 0 0 0 0 1.26c.347.348.912-.348 1.26 0l1.06-1.06c.495.713.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l-1.06 1.061Z" />
    </svg>
);

const formatCollectionName = (name: string): string => {
    if (!name) return "Coleção";
    let cleanName = name.trim();
    
    // Suprime "pretas" de "jacquard pretas preto"
    cleanName = cleanName.replace(/jacquard pretas preto/gi, "Jacquard Preto");
    cleanName = cleanName.replace(/jacquard pretas/gi, "Jacquard Preto");
    cleanName = cleanName.replace(/pretas preto/gi, "Preto");
    cleanName = cleanName.replace(/pretas/gi, "Preto"); // caso isolado em minúsculas/maiúsculas

    let withoutPrefix = cleanName;
    if (withoutPrefix.toLowerCase().startsWith("coleção")) {
        withoutPrefix = withoutPrefix.substring(7).trim();
    } else if (withoutPrefix.toLowerCase().startsWith("composição")) {
        withoutPrefix = withoutPrefix.substring(10).trim();
    } else if (withoutPrefix.toLowerCase().startsWith("colecao")) {
        withoutPrefix = withoutPrefix.substring(7).trim();
    }
    return withoutPrefix ? `Coleção ${withoutPrefix}` : "Coleção";
};

const formatCompositionName = formatCollectionName; // backward compatibility fallback if any file references it

const splitCollectionName = (familyName: string, colorName: string): { main: string; sub: string } => {
    let main = formatCollectionName(familyName);
    let sub = colorName || '';

    // Se já temos a cor explícita e ela não está no nome da coleção
    if (sub && sub !== 'Mix' && !main.toLowerCase().includes(sub.toLowerCase())) {
        return { main, sub };
    }

    const lowerMain = main.toLowerCase();
    
    // Primeiro tenta remover sub se ele estiver no fim de main
    if (sub && sub !== 'Mix') {
        const subLower = sub.toLowerCase();
        if (lowerMain.endsWith(subLower)) {
            const idx = lowerMain.lastIndexOf(subLower);
            if (idx > 0) {
                const prefix = main.substring(0, idx).trim();
                if (prefix.toLowerCase() !== 'coleção' && prefix.toLowerCase() !== 'composição') {
                    return { main: prefix, sub: main.substring(idx).trim() };
                }
            }
        }
    }

    // Se não batia com sub exatamente, mas termina com alguma cor comum
    const COMMON_COLOR_SAMPLES = [
        'preto', 'pretas', 'preta', 'pretos',
        'vinho', 'vinhos',
        'azul', 'azuis',
        'marrom', 'marrons',
        'verde', 'verdes',
        'rosa', 'rosas',
        'bege', 'beges',
        'ocre', 'ocres',
        'amarelo', 'amarelos',
        'cinza', 'cinzas',
        'branco', 'brancos',
        'mostarda', 'mostardas',
        'terracota', 'terracotas',
        'tiffany',
        'marsala',
        'rose', 'rosê',
        'laranja', 'laranjas'
    ];

    const words = main.split(/\s+/);
    if (words.length > 2) {
        const lastWord = words[words.length - 1];
        const lastWordLower = lastWord.toLowerCase();
        if (COMMON_COLOR_SAMPLES.includes(lastWordLower)) {
            const index = main.lastIndexOf(lastWord);
            if (index > 0) {
                const prefix = main.substring(0, index).trim();
                if (prefix.toLowerCase() !== 'coleção' && prefix.toLowerCase() !== 'composição') {
                    return { main: prefix, sub: lastWord };
                }
            }
        }
    }

    return { main, sub: sub === 'Mix' ? '' : sub };
};

const getFullNameWithColor = (familyName: string, colorName: string): string => {
    const { main, sub } = splitCollectionName(familyName, colorName);
    if (sub) {
        return `${main} ${sub}`;
    }
    return main;
};

const renderCollectionNameWithSubname = (familyName: string, colorName: string, textClasses: string) => {
    const { main, sub } = splitCollectionName(familyName, colorName);
    
    if (!sub) {
        return (
            <h3 className={`font-bold text-xs leading-tight h-9 flex flex-col justify-center items-center ${textClasses}`}>
                <span>{main}</span>
            </h3>
        );
    }
    
    return (
        <h3 className={`leading-tight h-9 flex flex-col justify-center items-center ${textClasses}`}>
            <span className="font-bold text-xs">{main}</span>
            <span className="text-[10px] text-gray-500 font-semibold dark:text-gray-400 mt-0.5">{sub}</span>
        </h3>
    );
};

const splitProductName = (name: string): { main: string; sub: string } => {
    if (!name) return { main: '', sub: '' };
    
    const COMMON_COLOR_SAMPLES = [
        'preto', 'pretas', 'preta', 'pretos',
        'vinho', 'vinhos',
        'azul', 'azuis',
        'marrom', 'marrons',
        'verde', 'verdes',
        'rosa', 'rosas',
        'bege', 'beges',
        'ocre', 'ocres',
        'amarelo', 'amarelos',
        'cinza', 'cinzas',
        'branco', 'brancos',
        'mostarda', 'mostardas',
        'terracota', 'terracotas',
        'tiffany',
        'marsala',
        'rose', 'rosê',
        'laranja', 'laranjas'
    ];

    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
        const lastWord = words[words.length - 1];
        const lastWordLower = lastWord.toLowerCase();
        if (COMMON_COLOR_SAMPLES.includes(lastWordLower)) {
            const index = name.lastIndexOf(lastWord);
            if (index > 0) {
                const prefix = name.substring(0, index).trim();
                return { main: prefix, sub: lastWord };
            }
        }
    }
    return { main: name, sub: '' };
};

const renderProductNameWithSubname = (name: string, textClasses: string) => {
    const { main, sub } = splitProductName(name);
    
    if (!sub) {
        return (
            <h3 className={`font-bold text-xs leading-tight h-9 flex items-center justify-center text-center ${textClasses}`}>
                <span>{main}</span>
            </h3>
        );
    }
    
    return (
        <h3 className={`leading-tight h-9 flex flex-col justify-center items-center text-center ${textClasses}`}>
            <span className="font-bold text-xs">{main}</span>
            <span className="text-[10px] text-gray-500 font-semibold dark:text-gray-400 mt-0.5">{sub}</span>
        </h3>
    );
};

const SkeletonCard = () => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-white/5' : 'bg-gray-200';
    
    return (
        <div className={`rounded-3xl p-3 shadow-sm border flex flex-col items-center ${isDark ? 'border-white/5' : 'border-gray-100'} animate-pulse`}>
            <div className={`w-full h-32 ${bgClass} rounded-2xl mb-3`}></div>
            <div className={`h-4 w-3/4 ${bgClass} rounded mb-2`}></div>
            <div className={`h-3 w-1/2 ${bgClass} rounded mb-4`}></div>
            <div className={`h-4 w-1/3 ${bgClass} rounded`}></div>
        </div>
    );
};

const getCardBgAndBorderStyle = (
    colors: { name: string; hex: string }[],
    isDark: boolean,
    isExpanded: boolean = false
) => {
    const bgOpacity = isExpanded
        ? (isDark ? '33' : '22')
        : (isDark ? '1c' : '10');
    const borderOpacity = isDark ? '44' : '26';

    const hexWithOpacity = (hex: string, op: string) => {
        let cleanHex = hex.trim();
        if (cleanHex.startsWith('#')) {
            cleanHex = cleanHex.substring(1);
        }
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(x => x + x).join('');
        }
        return `#${cleanHex}${op}`;
    };

    // Filter out 'Mix' or generic colors for gradient/single purposes if possible
    const validColors = colors.filter(c => c.name && c.hex && c.name !== 'Mix');
    const finalColors = validColors.length > 0 ? validColors : colors.filter(c => c.hex);

    if (finalColors.length === 0) {
        return {
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            borderWidth: '1px',
            borderStyle: 'solid' as const,
        };
    }

    if (finalColors.length === 2) {
        // Gradient between the 2 colors
        const col1 = hexWithOpacity(finalColors[0].hex, bgOpacity);
        const col2 = hexWithOpacity(finalColors[1].hex, bgOpacity);
        const borderCol = hexWithOpacity(finalColors[0].hex, borderOpacity);

        return {
            background: `linear-gradient(135deg, ${col1}, ${col2})`,
            borderColor: borderCol,
            borderWidth: '1px',
            borderStyle: 'solid' as const,
        };
    }

    // Single color, or more than 2 colors
    const primaryColor = finalColors[0];
    const col = hexWithOpacity(primaryColor.hex, bgOpacity);
    const borderCol = hexWithOpacity(primaryColor.hex, borderOpacity);

    return {
        background: col,
        borderColor: borderCol,
        borderWidth: '1px',
        borderStyle: 'solid' as const,
    };
};

const ProductCard: React.FC<{ product: Product, index: number, onClick: () => void, sofaColors: { name: string; hex: string }[] }> = ({ product, index, onClick, sofaColors }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [showBack, setShowBack] = useState(false);
  const [selectedSofaColor, setSelectedSofaColor] = useState<string | null>(null);

  useEffect(() => {
    if (!product.backImageUrl) return;
    
    const interval = setInterval(() => {
      setShowBack(prev => !prev);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [product.backImageUrl]);

  const cardClasses = isDark 
    ? "bg-black/20 backdrop-blur-xl border-white/10" 
    : "bg-white border-gray-200/80 shadow-md";
  
  const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
  const textMetaClasses = isDark ? "text-purple-300" : "text-gray-500";
  const imageBgClasses = isDark ? "bg-black/10" : "bg-gray-100/10";
  
  const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];
  
  const prices = product.variations.map(v => v.priceFull);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const isRange = minPrice !== maxPrice;

  const getPriceRange = () => {
    if (!product.variations || product.variations.length === 0) {
        return 'R$0,00';
    }

    if (!isRange) {
        return `R$${minPrice.toFixed(2).replace('.', ',')}`;
    }
    return `R$${minPrice.toFixed(2).replace('.', ',')} - R$${maxPrice.toFixed(2).replace('.', ',')}`;
  };

  // Optimization: Only animate the first few items to prevent staggered delay on scroll
  const shouldAnimate = index < 4;

  const availableSofaColors = product.backgroundImages?.sala;
  const hasSofaColors = typeof availableSofaColors === 'object' && availableSofaColors !== null && Object.keys(availableSofaColors).length > 0;

  const displayedImage = useMemo(() => {
    return product.backImageUrl && showBack ? product.backImageUrl : (product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png");
  }, [showBack, product]);

  const cardStyle = useMemo(() => {
    return getCardBgAndBorderStyle(product.colors, isDark, false);
  }, [product.colors, isDark]);

  return (
    <div 
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        className={`flex flex-col items-center text-center transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 rounded-3xl overflow-visible cursor-pointer ${isDark ? 'focus:ring-offset-black' : 'focus:ring-offset-white'}`}
        style={{
            ...cardStyle,
            ...shouldAnimate ? { 
                 animation: 'float-in 0.5s ease-out forwards',
                 animationDelay: `${index * 50}ms`,
                 opacity: 0 
              } : {}
        }}
    >
        <div className={`w-full aspect-square ${imageBgClasses} rounded-3xl flex items-center justify-center overflow-hidden relative shadow-xl z-20`}>
             {(product.fabricImageUrl || product.baseImageUrl) ? (
                <>
                     <img 
                        src={displayedImage} 
                        alt={product.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-100"
                        loading="lazy"
                        decoding="async"
                    />
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
             {/* Sombreamento inferior na imagem para efeito de profundidade sobre a info com tom cinza claro */}
             <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-gray-400/10 to-transparent z-20 pointer-events-none" />

             {waterResistanceDetails?.showcaseIndicator && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    {waterResistanceDetails.showcaseIndicator}
                </div>
             )}
             {(product.isLimited || product.fabricType === 'Macramê') && (
                <div className="absolute top-2 left-2 bg-fuchsia-600/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-sm">
                    Limitado
                </div>
             )}

             {/* Sofa Color Selectors Overlay on Card */}
             {hasSofaColors && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full z-30" onClick={e => e.stopPropagation()}>
                    <span className="text-[9px] text-white font-bold mr-0.5">Sofá:</span>
                    {Object.keys(availableSofaColors).map(colorName => {
                        const colorObj = sofaColors.find(c => c.name.toLowerCase() === colorName.toLowerCase());
                        if (!colorObj) return null;
                        const isSelected = selectedSofaColor === colorName || (!selectedSofaColor && colorName === 'Cinza');
                        return (
                            <button
                                key={colorName}
                                title={colorName}
                                onClick={() => setSelectedSofaColor(colorName)}
                                className={`w-2.5 h-2.5 rounded-full border transition-all ${isSelected ? 'border-fuchsia-500 scale-110' : 'border-white/40'}`}
                                style={{ backgroundColor: colorObj.hex }}
                            />
                        );
                    })}
                </div>
             )}
        </div>
        <div className={`w-full flex-grow flex flex-col items-center justify-center p-3 pb-5 -mt-5 pt-8 rounded-b-3xl shadow-xl z-10 ${isDark ? 'bg-black/20 border-t border-white/5 shadow-black/40' : 'bg-white/20 border-t border-fuchsia-100/40 shadow-gray-200/20'}`}>
            {renderProductNameWithSubname(product.name, textNameClasses)}
            <div className={`flex items-center justify-center flex-wrap gap-x-2 gap-y-1.5 text-[10px] mt-2`}>
                {product.unitsSold >= 5 && (
                    <div className={`flex items-center space-x-0.5 ${textMetaClasses}`}>
                        <FireIcon className="w-3.5 h-3.5 text-orange-400" />
                        <span>{product.unitsSold} vendidos</span>
                    </div>
                )}
                <div className={`flex items-center gap-1 ${textMetaClasses}`}>
                    <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-3.5 h-3.5 rounded-full object-contain bg-white p-px shadow-sm" />
                    <span className="font-semibold">{product.brand === 'Marca Própia' ? 'Têca' : product.brand}</span>
                </div>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full whitespace-nowrap ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                    {product.fabricType}
                </span>
            </div>
            <span className="font-bold text-fuchsia-500 mt-1.5 text-xs">{getPriceRange()}</span>
        </div>
    </div>
  );
};

// Novo componente CollectionCard
const CollectionCard: React.FC<{ 
    item: ShowcaseItem & { type: 'collection' }, 
    index: number, 
    onClick: (product: Product) => void,
    sofaColors: { name: string; hex: string }[]
}> = ({ item, index, onClick, sofaColors }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [startSlide, setStartSlide] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [selectedSofaColor, setSelectedSofaColor] = useState<string | null>(null);

    const { products: collectionProducts, familyId, familyName, color } = item;

    useEffect(() => {
        if (isExpanded && cardRef.current) {
            const timer = setTimeout(() => {
                const scrollContainer = cardRef.current?.closest('main');
                if (scrollContainer) {
                    const offset = cardRef.current.offsetTop - 80; // 85px para compensar o header fixo
                    scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
                }
            }, 80); 
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const handleExpand = () => {
        setIsExpanded(true);
    };

    // Filtra produtos que têm imagens
    const validProducts = useMemo(() => collectionProducts.filter(p => !!p.baseImageUrl), [collectionProducts]);
    const validImages = useMemo(() => validProducts.map(p => p.baseImageUrl!), [validProducts]);

    const getProductImage = (prod: Product) => {
        return prod.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png";
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setStartSlide(true);
        }, 3500); 
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!startSlide || validImages.length <= 1) return;

        const timer = setInterval(() => {
            setActiveImageIndex(prev => (prev + 1) % validImages.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [validImages.length, startSlide]);

    const cardClasses = isDark ? "bg-black/20 backdrop-blur-xl border-white/10" : "bg-white border-gray-200/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const imageBgClasses = isDark ? "bg-black/10" : "bg-gray-100/10";
    
    // Optimization: Only animate the first few items
    const shouldAnimate = index < 4;

    const collectionUniqueColors = useMemo(() => {
        const seen = new Set<string>();
        const list: { name: string; hex: string }[] = [];
        collectionProducts.forEach(p => {
            p.colors.forEach(c => {
                const key = c.name.toLowerCase();
                if (c.name && c.hex && !seen.has(key)) {
                    seen.add(key);
                    list.push(c);
                }
            });
        });
        return list.length > 0 ? list : [color];
    }, [collectionProducts, color]);

    const distinctColorNames = useMemo(() => {
        const names = collectionProducts.flatMap(p => p.colors.map(c => c.name));
        return Array.from(new Set(names)).filter(Boolean);
    }, [collectionProducts]);

    const allHaveSameColor = useMemo(() => {
        return distinctColorNames.length === 1 && distinctColorNames[0] !== 'Mix';
    }, [distinctColorNames]);

    const displayedColorSubname = allHaveSameColor ? distinctColorNames[0] : '';

    const cardBgStyle = useMemo(() => {
        return getCardBgAndBorderStyle(collectionUniqueColors, isDark, isExpanded);
    }, [collectionUniqueColors, isDark, isExpanded]);

    return (
        <motion.div 
            ref={cardRef}
            layout
            layoutId={`collection-${familyId}-${color.name}-${index}`}
            transition={{ type: "spring", stiffness: 800, damping: 52, mass: 1 }}
            className={`flex flex-col overflow-visible scroll-mt-20 ${isExpanded ? `col-span-2 row-span-2 z-40 backdrop-blur-md rounded-3xl p-4 shadow-2xl` : 'rounded-3xl'}`}
            style={{
                ...cardBgStyle,
                ...shouldAnimate && !isExpanded ? { animation: 'float-in 0.5s ease-out forwards', animationDelay: `${index * 50}ms` } : {}
            }}
        >
            <AnimatePresence mode="wait" initial={false}>
            {isExpanded ? (
                <motion.div
                    key="expanded"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.1 }}
                    className="w-full h-full"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <div 
                                className="w-4 h-4 rounded-full border shadow-sm"
                                style={{ backgroundColor: color.hex }}
                            />
                            {getFullNameWithColor(familyName, displayedColorSubname)}
                        </h3>
                        <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-fuchsia-500 p-1 rounded-full transition-colors focus:outline-none">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                             </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {collectionProducts.map(product => {
                            const prices = product.variations.map(v => v.priceFull);
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            const isRange = minPrice !== maxPrice;
                            const displayPrice = isRange 
                                ? `R$${minPrice.toFixed(2).replace('.', ',')}` 
                                : `R$${minPrice.toFixed(2).replace('.', ',')}`;

                            return (
                                <button key={product.id} onClick={() => onClick(product)} className="w-full flex flex-col items-center transition-transform hover:scale-105 group/item">
                                    <div className={`w-full aspect-square ${imageBgClasses} rounded-2xl flex items-center justify-center overflow-hidden relative shadow-md z-10`}>
                                        <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/10 to-transparent z-20 pointer-events-none" />
                                    </div>
                                    <div className={`w-full p-2 -mt-4 pt-6 rounded-b-2xl shadow-xl z-0 ${isDark ? 'bg-fuchsia-950/40 border-t border-white/5 shadow-black/40' : 'bg-fuchsia-5/95 border-t border-fuchsia-100 shadow-fuchsia-200/50'}`}>
                                        <div className="h-9 flex flex-col justify-center items-center text-center px-1 overflow-hidden">
                                            {(() => {
                                                const { main, sub } = splitProductName(product.name);
                                                if (!sub) {
                                                    return <span className={`text-[10px] font-bold ${textNameClasses} truncate block w-full text-center`}>{main}</span>;
                                                }
                                                return (
                                                    <>
                                                        <span className={`text-[10px] font-bold ${textNameClasses} truncate block w-full text-center`}>{main}</span>
                                                        <span className="text-[8.5px] text-gray-500 font-semibold dark:text-gray-400 block text-center line-clamp-1 mt-0.5">{sub}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className={`flex items-center justify-center gap-1 mt-1 ${isDark ? 'text-purple-300' : 'text-gray-500'}`}>
                                            <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-3 h-3 rounded-full object-contain bg-white p-px shadow-sm" />
                                            <span className="text-[9px] font-semibold">{product.brand === 'Marca Própia' ? 'Têca' : product.brand}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-fuchsia-600 block mt-1 text-center">
                                            {displayPrice}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="collapsed"
                    initial={{ opacity: 0, scale: 1.01 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.01 }}
                    transition={{ duration: 0.1 }}
                    className="w-full h-full"
                >
                    <div 
                        role="button"
                        tabIndex={0}
                        onClick={handleExpand}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpand(); } }}
                        className="w-full h-full flex flex-col items-center justify-between text-center focus:outline-none transition-transform transform hover:scale-105 cursor-pointer"
                    >
                        <div className="w-full h-full flex flex-col items-center overflow-visible">
                            <div className={`w-full aspect-square ${imageBgClasses} rounded-3xl flex items-center justify-center overflow-hidden relative shadow-xl z-20`}>
                                {validProducts.length > 0 ? (
                                    <>
                                        <img 
                                            src={getProductImage(validProducts[0])} 
                                            alt={`${formatCollectionName(familyName)} main`}
                                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeImageIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        {startSlide && validProducts.slice(1).map((prod, idx) => (
                                             <img 
                                                key={idx + 1}
                                                src={getProductImage(prod)} 
                                                alt={`${formatCollectionName(familyName)} variation`}
                                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${(idx + 1) === activeImageIndex ? 'opacity-100' : 'opacity-0'}`}
                                                loading="lazy"
                                                decoding="async"
                                             />
                                        ))}
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
                                {/* Sombreamento inferior na imagem para efeito de profundidade sobre a info com tom cinza claro */}
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-400/15 to-transparent z-30 pointer-events-none" />
                            </div>
                            <div className={`w-full flex-grow pt-8 pb-5 px-3 -mt-5 flex flex-col items-center justify-center rounded-b-3xl shadow-xl z-10 ${isDark ? 'bg-black/20 border-t border-white/5 shadow-black/40' : 'bg-white/20 border-t border-fuchsia-100/50 shadow-gray-300/20'}`}>
                                {renderCollectionNameWithSubname(familyName, displayedColorSubname, textNameClasses)}
                                <div className="text-[9px] text-fuchsia-500 font-medium pb-1.5">
                                    Clique e veja
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-1.5 px-2">
                                    {collectionUniqueColors.map((col, colIdx) => (
                                        <div 
                                            key={colIdx}
                                            className={`w-2.5 h-2.5 rounded-full border shadow-sm ${isDark ? 'border-white/20' : 'border-black/10'}`}
                                            style={{ backgroundColor: col.hex }}
                                            title={col.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    );
};

const ProductGroupCard: React.FC<{ 
    item: ShowcaseItem & { type: 'group' }, 
    index: number, 
    onClick: (product: Product) => void, 
    productFamilies: ProductFamily[],
    sofaColors: { name: string; hex: string }[]
}> = ({ item, index, onClick, productFamilies, sofaColors }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [startSlide, setStartSlide] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [selectedSofaColor, setSelectedSofaColor] = useState<string | null>(null);

    const { products: group, familyId, familyName: explicitName } = item;

    useEffect(() => {
        if (isExpanded && cardRef.current) {
            const timer = setTimeout(() => {
                const scrollContainer = cardRef.current?.closest('main');
                if (scrollContainer) {
                    const offset = cardRef.current.offsetTop - 80; // 80px para compensar o header fixo de h-20
                    scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
                }
            }, 80); 
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const handleExpand = () => {
        setIsExpanded(true);
    };

    const representativeProduct = group[0];
    
    // Filter products that have images to ensure sync between image index and product
    const validProducts = useMemo(() => group.filter(p => !!p.baseImageUrl), [group]);
    const validImages = useMemo(() => validProducts.map(p => p.baseImageUrl!), [validProducts]);

    const getProductImage = (prod: Product) => {
        return prod.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png";
    };

    const familyName = useMemo(() => {
        if (explicitName) return explicitName;
        if (familyId) {
            const family = productFamilies.find(f => f.id === familyId);
            if (family) return family.name;
        }
        return `${representativeProduct.category} ${representativeProduct.subCategory ? `(${representativeProduct.subCategory})` : ''}`;
    }, [representativeProduct, productFamilies, familyId, explicitName]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setStartSlide(true);
        }, 3500); 
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!startSlide || validImages.length <= 1) return;

        const timer = setInterval(() => {
            setActiveImageIndex(prev => (prev + 1) % validImages.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [validImages.length, startSlide]);

    const cardClasses = isDark ? "bg-black/20 backdrop-blur-xl border-white/10" : "bg-white border-gray-200/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const imageBgClasses = isDark ? "bg-black/10" : "bg-gray-100/10";
    
    // Optimization: Only animate the first few items
    const shouldAnimate = index < 4;

    const groupUniqueColors = useMemo(() => {
        const seen = new Set<string>();
        const list: { name: string; hex: string }[] = [];
        group.forEach(p => {
            p.colors.forEach(c => {
                const key = c.name.toLowerCase();
                if (c.name && c.hex && !seen.has(key)) {
                    seen.add(key);
                    list.push(c);
                }
            });
        });
        return list;
    }, [group]);

    const cardBgStyle = useMemo(() => {
        return getCardBgAndBorderStyle(groupUniqueColors, isDark, isExpanded);
    }, [groupUniqueColors, isDark, isExpanded]);

    return (
        <motion.div 
            ref={cardRef}
            layout
            layoutId={familyId}
            transition={{ type: "spring", stiffness: 800, damping: 52, mass: 1 }}
            className={`flex flex-col overflow-visible scroll-mt-20 ${isExpanded ? `col-span-2 row-span-2 z-40 backdrop-blur-md rounded-3xl p-4 shadow-2xl` : 'rounded-3xl'}`}
            style={{
                ...cardBgStyle,
                ...shouldAnimate && !isExpanded ? { animation: 'float-in 0.5s ease-out forwards', animationDelay: `${index * 50}ms` } : {}
            }}
        >
            <AnimatePresence mode="wait" initial={false}>
            {isExpanded ? (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        transition={{ duration: 0.1 }}
                        className="w-full h-full"
                    >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`font-bold text-sm sm:text-base ${textNameClasses}`}>{(familyId || explicitName) ? formatCollectionName(familyName) : familyName}</h3>
                        <button onClick={() => setIsExpanded(false)} className="text-gray-500 hover:text-fuchsia-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {group.map(product => {
                            const productCardStyle = getCardBgAndBorderStyle(product.colors, isDark, false);
                            return (
                                <button 
                                    key={product.id} 
                                    onClick={() => onClick(product)} 
                                    className="w-full flex flex-col items-center transition-transform hover:scale-105 group/item rounded-3xl"
                                    style={productCardStyle}
                                >
                                    <div className={`w-full aspect-square ${imageBgClasses} rounded-2xl flex items-center justify-center overflow-hidden relative shadow-md z-10`}>
                                        <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/10 to-transparent z-20 pointer-events-none" />
                                    </div>
                                    <div className={`w-full p-2 -mt-4 pt-6 rounded-b-2xl shadow-xl z-0 ${isDark ? 'bg-black/25 border-t border-white/5 shadow-black/40' : 'bg-white/25 border-t border-fuchsia-100/50 shadow-fuchsia-200/20'}`}>
                                        <div className="h-9 flex flex-col justify-center items-center text-center px-1 overflow-hidden">
                                            {(() => {
                                                const { main, sub } = splitProductName(product.name);
                                                if (!sub) {
                                                    return <span className={`text-[10px] font-bold ${textNameClasses} truncate block w-full text-center`}>{main}</span>;
                                                }
                                                return (
                                                    <>
                                                        <span className={`text-[10px] font-bold ${textNameClasses} truncate block w-full text-center`}>{main}</span>
                                                        <span className="text-[8.5px] text-gray-500 font-semibold dark:text-gray-400 block text-center line-clamp-1 mt-0.5">{sub}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className={`flex items-center justify-center gap-1 mt-1 ${isDark ? 'text-purple-300' : 'text-gray-500'}`}>
                                            <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-3 h-3 rounded-full object-contain bg-white p-px shadow-sm" />
                                            <span className="text-[9px] font-semibold">{product.brand === 'Marca Própia' ? 'Têca' : product.brand}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-fuchsia-600 block mt-1 text-center">
                                            {(product.variations[0]?.priceFull || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            ) : (
                <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, scale: 1.01 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.01 }}
                        transition={{ duration: 0.1 }}
                        className="w-full h-full"
                >
                <div 
                    role="button"
                    tabIndex={0}
                    onClick={handleExpand}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpand(); } }}
                    className="w-full h-full flex flex-col items-center justify-between text-center focus:outline-none transition-transform transform hover:scale-105 cursor-pointer"
                >
                    <div className="w-full h-full flex flex-col items-center overflow-visible">
                        <div className={`w-full aspect-square ${imageBgClasses} rounded-3xl flex items-center justify-center overflow-hidden relative shadow-xl z-20`}>
                            {validProducts.length > 0 ? (
                                <>
                                    <img 
                                        src={getProductImage(validProducts[0])} 
                                        alt={`${representativeProduct.name} main`}
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${activeImageIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    {startSlide && validProducts.slice(1).map((prod, idx) => (
                                         <img 
                                            key={idx + 1}
                                            src={getProductImage(prod)} 
                                            alt={`${representativeProduct.name} variation`}
                                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${(idx + 1) === activeImageIndex ? 'opacity-100' : 'opacity-0'}`}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ))}
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
                            {/* Sombreamento inferior na imagem para efeito de profundidade sobre a info com tom cinza claro */}
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-400/15 to-transparent z-30 pointer-events-none" />
                        </div>
                    </div>
                        <div className={`w-full flex-grow pt-8 pb-5 px-3 -mt-5 flex flex-col items-center justify-center rounded-b-3xl shadow-xl z-10 ${isDark ? 'bg-black/20 border-t border-white/5 shadow-black/40' : 'bg-white/20 border-t border-fuchsia-100/50 shadow-gray-300/20'}`}>
                            <h3 className={`font-bold text-xs leading-tight h-9 flex items-center justify-center ${textNameClasses}`}>{(familyId || explicitName) ? formatCollectionName(familyName) : familyName}</h3>
                            <div className="text-[9px] text-fuchsia-500 font-medium pb-1.5">
                                Clique e veja
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1 px-2">
                                {group.slice(0, 7).map((p, idx) => (
                                    <div 
                                        key={idx}
                                        className={`w-2 h-2 rounded-full border shadow-xs ${isDark ? 'border-white/20' : 'border-black/10'}`}
                                        style={{ backgroundColor: p.colors?.[0]?.hex || '#ccc' }}
                                        title={p.colors?.[0]?.name}
                                    />
                                ))}
                                {group.length > 7 && (
                                    <span className={`text-[9px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{`+${group.length - 7}`}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    );
};

const FloatingActionButtons = ({ onNavigate, isSearchOpen, scrollTop }: { onNavigate: (view: View) => void; isSearchOpen: boolean; scrollTop: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isWhatsAppDimmed, setIsWhatsAppDimmed] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsExpanded(true), 1500);
        const collapseTimer = setTimeout(() => setIsExpanded(false), 4500); 
        
        // Add 80% opacity to WhatsApp button after 5 seconds
        const dimTimer = setTimeout(() => {
            setIsWhatsAppDimmed(true);
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(collapseTimer);
            clearTimeout(dimTimer);
        }
    }, []);

    const whatsappUrl = `https://wa.me/5561991434805?text=${encodeURIComponent("Olá, vi o site das Lojas Têca e gostaria de fazer uma encomenda.")}`;

    // Calculate dynamic opacity for the composition button (fades out completely by 400px scrolled down)
    const compScrollOpacity = Math.max(0, Math.min(1, 1 - scrollTop / 400));
    
    // Total visibility determines if the buttons should be fully opaque or not
    const baseCompOpacity = isExpanded ? 1.0 : 0.25;
    const finalCompOpacity = baseCompOpacity * compScrollOpacity;

    return (
        <div className={`fixed bottom-32 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 ${isSearchOpen ? 'opacity-0 scale-90 select-none' : 'opacity-100 scale-100'}`}>
            {/* Composition Creator Button */}
            {compScrollOpacity > 0 && (
                <button 
                    onClick={() => onNavigate(View.COMPOSITION_GENERATOR)}
                    style={{ 
                        opacity: isSearchOpen ? 0 : finalCompOpacity,
                        pointerEvents: (compScrollOpacity > 0.05 && !isSearchOpen) ? 'auto' : 'none',
                        transform: `scale(${compScrollOpacity === 0 ? 0.85 : 1})`
                    }}
                    className={`flex items-center bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-full shadow-2xl transition-all duration-500 ease-in-out h-10 pointer-events-auto ${isExpanded ? 'px-4 py-2 w-auto' : 'w-10 p-0 justify-center overflow-hidden'}`}
                >
                    <div className={`flex items-center justify-center ${isExpanded ? '' : 'w-full h-full'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                    </div>
                    <span className={`ml-2 whitespace-nowrap font-black text-xs uppercase tracking-wider transition-all duration-500 overflow-hidden ${isExpanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'}`}>
                        Criar Composição
                    </span>
                </button>
            )}

            {/* WhatsApp Button */}
            <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    opacity: isSearchOpen ? 0 : undefined,
                    pointerEvents: isSearchOpen ? 'none' : 'auto'
                }}
                className={`flex items-center bg-[#25D366] text-white rounded-full shadow-2xl transition-all duration-500 ease-in-out h-10 pointer-events-auto ${isExpanded ? 'px-4 py-2 w-auto' : 'w-10 p-0 justify-center overflow-hidden'} ${isWhatsAppDimmed ? 'opacity-80 hover:opacity-100' : 'opacity-100'}`}
            >
                <div className={`flex items-center justify-center ${isExpanded ? '' : 'w-full h-full'}`}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                </div>
                <span className={`ml-2 whitespace-nowrap font-black text-xs uppercase tracking-wider transition-all duration-500 overflow-hidden ${isExpanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'}`}>
                    WhatsApp
                </span>
            </a>
        </div>
    );
};


const customBannerSlides = [
  {
    id: 'slide-jacquard-vinho',
    title: 'Coleção Jacquard Vinho',
    subtitle: 'Toque clássico e aconchegante em tons carmim',
    emoji: '🛋️',
    url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=1200',
    badge: 'Jacquard Vinho',
    colorKey: 'Vinho',
    fabricKey: 'Jacquard',
    items: [
      {
        id: 'mock-vinho-1',
        name: 'Almofada Jacquard Vinho Tradicional',
        fabric: 'Jacquard',
        color: 'Vinho',
        priceCover: 35.00,
        priceFull: 45.00,
        imgUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'mock-vinho-2',
        name: 'Almofada Linho Vinho Liso',
        fabric: 'Linho',
        color: 'Vinho',
        priceCover: 40.00,
        priceFull: 50.00,
        imgUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'mock-vinho-3',
        name: 'Almofada Lombar Jacquard Vinho',
        fabric: 'Jacquard',
        color: 'Vinho',
        priceCover: 20.00,
        priceFull: 25.00,
        imgUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=400'
      }
    ]
  },
  {
    id: 'slide-jacquard-preto',
    title: 'Coleção Jacquard',
    subtitle: 'Minimalismo requintado em contrastes profundos',
    emoji: '✨',
    url: 'https://images.unsplash.com/photo-1544030288-e6e6108867f8?auto=format&fit=crop&q=80&w=1200',
    badge: 'Jacquard',
    colorKey: 'Preto',
    fabricKey: 'Jacquard',
    items: [
      {
        id: 'mock-preto-1',
        name: 'Almofada Jacquard Preto Geométrico',
        fabric: 'Jacquard',
        color: 'Preto',
        priceCover: 35.00,
        priceFull: 45.00,
        imgUrl: 'https://images.unsplash.com/photo-1544030288-e6e6108867f8?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'mock-preto-2',
        name: 'Almofada Linho Preto Encorpado',
        fabric: 'Linho',
        color: 'Preto',
        priceCover: 40.00,
        priceFull: 50.00,
        imgUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=400'
      }
    ]
  },
  {
    id: 'slide-costela-tranca',
    title: 'Coleção Costela de Adão & Trança Bege',
    subtitle: 'Harmonia botânica e moderna com trança acolhedora',
    emoji: '🎨',
    url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200',
    badge: 'Costela & Trança',
    colorKey: 'Bege',
    fabricKey: 'Linho',
    items: [
      {
        id: 'mock-botanica-1',
        name: 'Almofada Costela de Adão Estampada',
        fabric: 'Linho',
        color: 'Verde',
        priceCover: 35.00,
        priceFull: 45.00,
        imgUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'mock-botanica-2',
        name: 'Almofada Trança Bege Lisa Premium',
        fabric: 'Linho',
        color: 'Bege',
        priceCover: 40.00,
        priceFull: 50.00,
        imgUrl: 'https://images.unsplash.com/photo-1629079448391-ee446aef5a4b?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'mock-botanica-3',
        name: 'Almofada Verde Oliva Algodão Rústico',
        fabric: 'Algodão',
        color: 'Verde',
        priceCover: 20.00,
        priceFull: 25.00,
        imgUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=400'
      }
    ]
  }
];

interface ShowcaseScreenProps {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSearchIconOpacity: (opacity: number) => void;
  products: Product[];
  initialProductId?: string; // Deep link support
  hasFetchError: boolean;
  canManageStock: boolean;
  onEditProduct: (product: Product) => void;
  brands: DynamicBrand[];
  onNavigate: (view: View) => void;
  savedCompositions: SavedComposition[];
  setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
  onAddToCart: (product: Product, variation: Variation, quantity: number, itemType: 'cover' | 'full', price: number, isPreOrder?: boolean) => void;
  sofaColors: { name: string; hex: string }[];
  cart: CartItem[];
  isLoading?: boolean;
  productFamilies: ProductFamily[];
  banners?: Banner[];
}

const isBelizeOrWaterblock = (slide: any) => {
  if (!slide) return false;
  const titleLower = (slide.title || '').toLowerCase();
  
  const hasBelize = titleLower.includes('belize') || titleLower.includes('verde') || titleLower.includes('bélize') || titleLower.includes('waterblock') || slide.items?.some((it: any) => {
    const fLower = (it.fabric || '').toLowerCase();
    const nLower = (it.name || '').toLowerCase();
    return fLower.includes('belize') || nLower.includes('belize') || fLower.includes('bélize') || nLower.includes('bélize') || fLower.includes('waterblock') || nLower.includes('waterblock') || fLower.includes('impermea') || nLower.includes('impermea');
  });

  return hasBelize;
};

const getCompositionDescription = (slide: any) => {
  if (!slide) return '';
  const titleLower = (slide.title || '').toLowerCase();
  
  if (isBelizeOrWaterblock(slide)) {
    return 'Confeccionada no legítimo Tecido Belize (Döhler), com tratamento de proteção contra água, sujeira e manchas, ideal para áreas de destaque.';
  }
  
  if (titleLower.includes('vinho') || titleLower.includes('jacquard')) {
    return 'Composição em tecido Jacquard e Linho com toque ricamente texturizado e acabamento de alto padrão, ideal para salas de estar elegantes.';
  }
  
  if (titleLower.includes('costela') || titleLower.includes('trança') || titleLower.includes('bege')) {
    return 'Harmonia com folhagens e detalhes em trança de algodão sobre linho rústico encorpado, criando um clima fresco, aconchegante e natural.';
  }
  
  if (slide.items && slide.items.length > 0) {
    const fabrics = Array.from(new Set(slide.items.map((it: any) => it.fabric || 'Tecido')));
    return `Composição de alto padrão desenvolvida pela Lojas Têca, elaborada com tecidos premium de alta gramatura (${fabrics.join(' e ')}).`;
  }
  
  return 'Desenvolvida por Lojas Têca com tecidos de alta qualidade e design planejado para harmonizar seu ambiente.';
};

const getBrandForSlide = (slide: any) => {
  if (!slide) return null;
  
  if (isBelizeOrWaterblock(slide)) {
    return {
      name: 'Döhler',
      logo: 'https://i.postimg.cc/G3k2G58y/image.png'
    };
  }
  
  return null;
};

const ShowcaseScreen: React.FC<ShowcaseScreenProps> = ({ 
    isSearchOpen, 
    setIsSearchOpen,
    searchQuery, 
    setSearchQuery, 
    setSearchIconOpacity,
    products, 
    initialProductId, 
    hasFetchError, 
    canManageStock, 
    onEditProduct, 
    brands, 
    onNavigate, 
    savedCompositions, 
    setSavedCompositions, 
    onAddToCart, 
    sofaColors, 
    cart, 
    isLoading = false, 
    productFamilies,
    banners = []
}) => {
  // WORKAROUND: Força a família "Linhons Vinho" a ser uma coleção para testes.
  const modifiedProductFamilies = useMemo(() => {
    return productFamilies.map(family => {
        if (family.name.toLowerCase() === 'linhons vinho') {
            return { ...family, isCollection: true };
        }
        return family;
    });
  }, [productFamilies]);

  const [selectedCategory, setSelectedCategory] = useState<string>(() => localStorage.getItem('showcase_category') || 'Todas');
  const [selectedBrand, setSelectedBrand] = useState<string>(() => localStorage.getItem('showcase_brand') || 'Todas');
  const [selectedFabric, setSelectedFabric] = useState<string>(() => localStorage.getItem('showcase_fabric') || 'Todos os Tecidos');
  const [subFilterWaterblock, setSubFilterWaterblock] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedFabric.toLowerCase().includes('belize')) {
      setSubFilterWaterblock(false);
    }
  }, [selectedFabric]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  // --- BANNER DE AMBIENTES GERADOS POR IA ---
  const [selectedSofaColorFilter, setSelectedSofaColorFilter] = useState<string>(() => {
    return localStorage.getItem('global_sofa_color') || 'Todos';
  });

  useEffect(() => {
    localStorage.setItem('global_sofa_color', selectedSofaColorFilter);
  }, [selectedSofaColorFilter]);

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const environmentImages = useMemo(() => {
    const list: {
      id: string;
      productId: string;
      productName: string;
      url: string;
      color: string;
      envType: string;
    }[] = [];

    products.forEach(p => {
      if (p.backgroundImages) {
        console.log(`Product ${p.name} has backgroundImages:`, p.backgroundImages);
        // Sala
        if (p.backgroundImages.sala && typeof p.backgroundImages.sala === 'object') {
          Object.entries(p.backgroundImages.sala).forEach(([color, url]) => {
            if (url) {
              list.push({
                id: `${p.id}-sala-${color}`,
                productId: p.id,
                productName: p.name,
                url,
                color,
                envType: 'Sala de Estar',
              });
            }
          });
        }
        // Quarto
        if (p.backgroundImages.quarto && typeof p.backgroundImages.quarto === 'object') {
          Object.entries(p.backgroundImages.quarto).forEach(([color, url]) => {
            if (url) {
              list.push({
                id: `${p.id}-quarto-${color}`,
                productId: p.id,
                productName: p.name,
                url,
                color,
                envType: 'Quarto principal',
              });
            }
          });
        }
        // Varanda
        if (p.backgroundImages.varanda) {
          list.push({
            id: `${p.id}-varanda`,
            productId: p.id,
            productName: p.name,
            url: p.backgroundImages.varanda,
            color: 'Padrão',
            envType: 'Varanda Decorada',
          });
        }
        // Piscina
        if (p.backgroundImages.piscina) {
          list.push({
            id: `${p.id}-piscina`,
            productId: p.id,
            productName: p.name,
            url: p.backgroundImages.piscina,
            color: 'Padrão',
            envType: 'Piscina de Lazer',
          });
        }
      }
      
      // Adicionar almofadas aleatórias da vitrine conforme solicitado pelo usuário
      if (p.baseImageUrl) {
        list.push({
          id: `${p.id}-almofada-premium`,
          productId: p.id,
          productName: p.name,
          url: p.baseImageUrl,
          color: 'Padrão',
          envType: 'Almofada de Destaque',
        });
      }
    });

    // Remove duplicates based on URL
    const seen = new Set<string>();
    const filteredList = list.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    // TEST FALLBACK
    if (filteredList.length === 0) {
      console.log('Adding fallback image for banner testing');
      filteredList.push({
        id: 'test-fallback-image',
        productId: 'none',
        productName: 'Têca Decorações',
        url: 'https://images.unsplash.com/photo-1616466723930-f21571253459?q=80&w=1000&auto=format&fit=crop',
        color: 'Padrão',
        envType: 'Ambiente de Teste',
      });
    }

    console.log('Final environmentImages list:', filteredList);
    return filteredList;
  }, [products]);

  const distinctGeneratedSofaColors = useMemo(() => {
    const colors = new Set<string>();
    environmentImages.forEach(img => {
      if (img.color && img.color !== 'Padrão') {
        colors.add(img.color);
      }
    });
    return Array.from(colors);
  }, [environmentImages]);

  const filteredBannerImages = useMemo(() => {
    if (!selectedSofaColorFilter || selectedSofaColorFilter === 'Todos') {
      return environmentImages;
    }
    const filtered = environmentImages.filter(img => img.color === selectedSofaColorFilter || img.color === 'Padrão');
    if (filtered.length === 0) return environmentImages; // fallback if no images for selected color
    return filtered;
  }, [environmentImages, selectedSofaColorFilter]);

  const activeBanners = useMemo(() => {
    if (!banners || banners.length === 0) {
      return customBannerSlides;
    }
    return banners.map((b) => {
      // Garantir o uso de IDs únicos desduplicando cushionProductIds
      const uniqueProductIds = Array.from(new Set(b.cushionProductIds || []));
      const mappedProducts = uniqueProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
      return {
        id: b.id,
        title: b.name,
        subtitle: 'Composição personalizada',
        emoji: '✨',
        url: b.imageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png",
        badge: 'Banner',
        objectPositionX: b.objectPositionX,
        objectPositionY: b.objectPositionY,
        zoomScale: b.zoomScale,
        items: mappedProducts.map(p => ({
          id: p.id,
          name: p.name,
          fabric: p.fabricType || 'Tecido',
          color: p.colors?.[0]?.name || 'Padrão',
          priceCover: p.variations?.[0]?.priceCover || 35.00,
          priceFull: p.variations?.[0]?.priceFull || 45.00,
          imgUrl: p.baseImageUrl
        }))
      };
    });
  }, [banners, products]);

  // Auto rotate banner effect
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Adjust active index if it exceeds list size on color change
  useEffect(() => {
    if (activeBannerIndex >= activeBanners.length) {
      setActiveBannerIndex(0);
    }
  }, [activeBannerIndex, activeBanners.length]);

  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [compositionToView, setCompositionToView] = useState<{ compositions: SavedComposition[], startIndex: number } | null>(null);
  const [selectedBannerComposition, setSelectedBannerComposition] = useState<any | null>(null);

  const getRealOrMockProduct = useCallback((mockId: string, searchColor: string, searchFabric: string, fallbackName: string, fallbackImgUrl: string, priceCover: number, priceFull: number) => {
    // 1. Tenta localizar por ID exato para garantir que as almofadas selecionadas no banner/composição sejam exibidas com precisão absoluta
    let realProduct = products.find(p => p.id === mockId);
    if (realProduct) return realProduct;

    // 2. Tenta localizar pelo nome exato como alternativa secundária
    realProduct = products.find(p => p.name.trim().toLowerCase() === fallbackName.trim().toLowerCase());
    if (realProduct) return realProduct;

    // 3. Fallback legado por cor e tecido (apenas se não houver o ID ou nome no banco de dados)
    realProduct = products.find(p => 
      p.fabricType.toLowerCase().includes(searchFabric.toLowerCase()) && 
      p.colors.some(c => c.name.toLowerCase() === searchColor.toLowerCase())
    );
    if (realProduct) return realProduct;
    
    // Custom mock product conforming precisely to Product interface in types.ts
    const mockProduct: Product = {
      id: mockId,
      name: fallbackName,
      baseImageUrl: fallbackImgUrl,
      unitsSold: 42,
      category: 'Almofadas',
      fabricType: searchFabric,
      description: 'Confeccionada sob medida com tecidos de alta gramatura e excelente qualidade, pensada para trazer requinte e sofisticação no design da decoração.',
      waterResistance: WaterResistanceLevel.NONE,
      brand: 'Marca Própria',
      colors: [{ name: searchColor, hex: searchColor === 'Vinho' ? '#722F37' : searchColor === 'Preto' ? '#000000' : '#D2B48C' }],
      variations: [
        {
          size: CushionSize.SQUARE_45,
          imageUrl: fallbackImgUrl,
          priceCover: priceCover,
          priceFull: priceFull,
          stock: {
            [StoreName.TECA]: 15,
            [StoreName.IONE]: 8
          }
        },
        {
          size: CushionSize.SQUARE_50,
          imageUrl: fallbackImgUrl,
          priceCover: priceCover + 5,
          priceFull: priceFull + 5,
          stock: {
            [StoreName.TECA]: 10,
            [StoreName.IONE]: 5
          }
        }
      ]
    };
    return mockProduct;
  }, [products]);
  
  // New State for Filter Expansion
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    const savedColors = localStorage.getItem('showcase_colors');
    return savedColors ? JSON.parse(savedColors) : [];
  });

  // --- SAVE FILTERS TO LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('showcase_category', selectedCategory);
    localStorage.setItem('showcase_brand', selectedBrand);
    localStorage.setItem('showcase_fabric', selectedFabric);
    localStorage.setItem('showcase_colors', JSON.stringify(selectedColors));
  }, [selectedCategory, selectedBrand, selectedFabric, selectedColors]);

  // --- INFINITE SCROLL STATE ---
  const [visibleCount, setVisibleCount] = useState(12); // Match App.tsx initial limit
  const [scrollTop, setScrollTop] = useState(0);
  
  const scrollContainerRef = useRef<HTMLElement>(null);
  useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      
      const handleScroll = () => {
          const currentScrollTop = el.scrollTop;
          
          // Throttling scroll state updates in 15px increments or boundaries
          setScrollTop(prev => {
              if (Math.abs(currentScrollTop - prev) >= 15 || currentScrollTop <= 10 || currentScrollTop >= 400) {
                  return currentScrollTop;
              }
              return prev;
          });
          
          // Smooth but state-sparing search icon opacity transitions
          const opacity = Math.min(currentScrollTop / 200, 1);
          const roundedOpacity = Math.round(opacity * 10) / 10;
          setSearchIconOpacity(roundedOpacity);
      };

      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Deep link handler
  useEffect(() => {
      if (initialProductId && products.length > 0) {
          const product = products.find(p => p.id === initialProductId);
          if (product) {
              setSelectedProduct(product);
          }
      }
  }, [initialProductId, products]);

  // Update URL on product selection/deselection
  const handleProductSelect = useCallback((product: Product | null) => {
      const fullProduct = product ? (products.find(p => p.id === product.id) || product) : null;
      setSelectedProduct(fullProduct);
      try {
          if (fullProduct) {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('product_id', fullProduct.id);
              window.history.pushState({}, '', newUrl.toString());
          } else {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('product_id');
              window.history.pushState({}, '', newUrl.toString());
          }
      } catch (e) {
          console.warn("Could not update URL history:", e);
      }
  }, [products]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product_id');
      if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) setSelectedProduct(product);
      } else {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);


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

  const getProductFamilyKey = useCallback((p: Product) => {
    if (p.variationGroupId) return p.variationGroupId;

    let baseName = p.name.toLowerCase();
    
    // Sort colors by length to replace longer names first
    const sortedColors = [...PREDEFINED_COLORS].sort((a, b) => b.name.length - a.name.length);
    sortedColors.forEach(c => {
        const regex = new RegExp(`\\b${c.name.toLowerCase()}\\b|\\(${c.name.toLowerCase()}\\)`, 'g');
        baseName = baseName.replace(regex, '');
    });

    baseName = baseName.replace(/capa|almofada|cheia|vazia|enchimento|kit|lombar/g, '');
    const cleanBase = baseName.replace(/\s\s+/g, ' ').replace(/[()]/g, '').trim();

    // Include subCategory for more specific grouping: brand|category|subCategory|cleanBaseName
    return `${p.brand}|${p.category}|${p.subCategory || 'default'}|${cleanBase}`;
  }, []);

  const allFilteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
        const searchQueryLower = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(searchQueryLower);
        const categoryMatch = selectedCategory === 'Todas' || p.category === selectedCategory || p.subCategory === selectedCategory;
        let fabricMatch = selectedFabric === 'Todos os Tecidos';
        if (!fabricMatch) {
            if (selectedFabric.toLowerCase().includes('belize')) {
                if (subFilterWaterblock) {
                    fabricMatch = p.waterResistance === WaterResistanceLevel.FULL || 
                                  p.fabricType.toLowerCase().includes('waterblock') || 
                                  p.fabricType.toLowerCase().includes('impermea');
                } else {
                    fabricMatch = p.fabricType.toLowerCase().includes('belize') || 
                                  p.fabricType.toLowerCase().includes('bélize') || 
                                  p.waterResistance === WaterResistanceLevel.FULL || 
                                  p.fabricType.toLowerCase().includes('waterblock') || 
                                  p.fabricType.toLowerCase().includes('impermea');
                }
            } else {
                fabricMatch = p.fabricType === selectedFabric;
            }
        }
        
        let brandMatch = true;
        if (selectedBrand !== 'Todas') {
            const cleanSelected = selectedBrand.toLowerCase().replace('®', '').trim();
            if (cleanSelected === 'döhler' || cleanSelected === 'dohler') {
                const fType = (p.fabricType || '').toLowerCase();
                const pName = (p.name || '').toLowerCase();
                const isDohlerBrand = !!(p.brand && p.brand.toLowerCase().includes('döhler'));
                const isBelizeFabric = fType.includes('belize') || pName.includes('belize') || fType.includes('bélize') || pName.includes('bélize') ||
                                       fType.includes('waterblock') || pName.includes('waterblock') ||
                                       p.waterResistance === WaterResistanceLevel.FULL;
                brandMatch = isDohlerBrand || isBelizeFabric;
            } else {
                brandMatch = !!(p.brand && p.brand.toLowerCase().includes(cleanSelected));
            }
        }

        let colorMatch = true;
        if (selectedColors.length > 0) {
            const productColors = p.colors.map(c => c.name);
            colorMatch = selectedColors.some(color => productColors.includes(color));
        }

        const tagsMatch = p.fabricType.toLowerCase().includes(searchQueryLower) || 
                          p.brand.toLowerCase().includes(searchQueryLower) ||
                          p.category.toLowerCase().includes(searchQueryLower);

        return (nameMatch || tagsMatch) && categoryMatch && fabricMatch && colorMatch && brandMatch;
    });

    const grouped: ShowcaseItem[] = [];

    if (selectedBrand !== 'Todas' || selectedFabric !== 'Todos os Tecidos' || selectedColors.length > 0) {
        if (selectedColors.length > 0) {
            const collections: ShowcaseItem[] = [];
            const nonCollectionProducts: Product[] = [];

            const collectionFamilies = modifiedProductFamilies.filter(f => f.isCollection);

            collectionFamilies.forEach(family => {
                selectedColors.forEach(colorName => {
                    const color = PREDEFINED_COLORS.find(c => c.name === colorName);
                    if (!color) return;

                    const collectionProductsOfColor = filtered.filter(p => 
                        p.familyIds?.includes(family.id) && p.colors.some(c => c.name === colorName)
                    );

                    if (collectionProductsOfColor.length > 0) {
                        const sortedProducts = [...collectionProductsOfColor].sort((a, b) => {
                            if (sortOrder === 'alpha') {
                                return a.name.localeCompare(b.name);
                            }
                            return 0; // Keep original order for 'recent'
                        });

                        collections.push({
                            type: 'collection',
                            products: sortedProducts,
                            familyId: family.id,
                            familyName: family.name,
                            color: color
                        });
                    }
                });
            });

            const collectionProductIds = new Set(collections.flatMap(c => c.type === 'collection' ? c.products.map(p => p.id) : []));

            filtered.forEach(p => {
                if (!collectionProductIds.has(p.id)) {
                    nonCollectionProducts.push(p);
                }
            });

            grouped.push(...collections, ...nonCollectionProducts.map(p => ({ type: 'single' as const, product: p })));
        } else {
            if (selectedFabric.toLowerCase().includes('belize') && !subFilterWaterblock) {
                const waterblockProducts = filtered.filter(p => 
                    p.waterResistance === WaterResistanceLevel.FULL || 
                    p.fabricType.toLowerCase().includes('waterblock') || 
                    p.fabricType.toLowerCase().includes('impermea')
                );
                const otherBelizeProducts = filtered.filter(p => 
                    !(p.waterResistance === WaterResistanceLevel.FULL || 
                      p.fabricType.toLowerCase().includes('waterblock') || 
                      p.fabricType.toLowerCase().includes('impermea'))
                );

                if (waterblockProducts.length > 0) {
                    const sortedWaterblock = [...waterblockProducts].sort((a, b) => {
                        if (sortOrder === 'alpha') {
                            return a.name.localeCompare(b.name);
                        }
                        return 0;
                    });

                    grouped.push({
                        type: 'collection',
                        products: sortedWaterblock,
                        familyId: 'waterblock_collection',
                        familyName: 'Coleção Waterblock',
                        color: { name: 'Azul', hex: '#3B82F6' }
                    });
                }

                grouped.push(...otherBelizeProducts.map(p => ({ type: 'single' as const, product: p })));
            } else {
                grouped.push(...filtered.map(p => ({ type: 'single' as const, product: p })));
            }
        }
    } else {
        const familyMap = new Map<string, Product[]>();
        const processedExplicitProducts = new Set<string>();

        filtered.forEach(p => {
            if (p.familyIds && p.familyIds.length > 0) {
                p.familyIds.forEach(fid => {
                    const key = `explicit_${fid}`;
                    if (!familyMap.has(key)) familyMap.set(key, []);
                    familyMap.get(key)!.push(p);
                });
                processedExplicitProducts.add(p.id);
            }
        });

        // Process products without explicit families
        filtered.forEach(p => {
            if (!processedExplicitProducts.has(p.id)) {
                const key = `guessed_${getProductFamilyKey(p)}`;
                if (!familyMap.has(key)) familyMap.set(key, []);
                familyMap.get(key)!.push(p);
            }
        });

        familyMap.forEach((group, key) => {
            if (key.startsWith('explicit_')) {
                const familyId = key.replace('explicit_', '');
                const family = modifiedProductFamilies.find(f => f.id === familyId);
                const familyName = family ? family.name : `Composição ${familyId}`;
                const repProduct = group[0];
                const productCol = repProduct?.colors?.[0];
                const colorObj = productCol 
                    ? { name: productCol.name, hex: productCol.hex } 
                    : { name: 'Mix', hex: '#a21caf' };

                grouped.push({ 
                    type: 'collection', 
                    products: group, 
                    familyId, 
                    familyName, 
                    color: colorObj 
                });
            } else if (group.length > 1) {
                grouped.push({ type: 'group', products: group });
            } else {
                grouped.push({ type: 'single', product: group[0] });
            }
        });
    }

    return grouped.sort((a, b) => {
        // Prioritize collections to always appear first
        if (a.type === 'collection' && b.type !== 'collection') return -1;
        if (a.type !== 'collection' && b.type === 'collection') return 1;

        const itemA = a.type === 'single' ? a.product : a.products[0];
        const itemB = b.type === 'single' ? b.product : b.products[0];

        if (sortOrder === 'alpha') {
            const nameA = a.type === 'collection' ? a.familyName : String(itemA?.name || '');
            const nameB = b.type === 'collection' ? b.familyName : String(itemB?.name || '');
            return nameA.localeCompare(nameB);
        } else { // 'recent'
            // If both are collections, sort them alphabetically as recency is not applicable
            if (a.type === 'collection' && b.type === 'collection') {
                return a.familyName.localeCompare(b.familyName);
            }
            const getTime = (p: Product) => {
                if (p.updatedAt) return p.updatedAt;
                const idTime = parseInt(p.id.split('-')[0], 10);
                return isNaN(idTime) ? 0 : idTime;
            };
            return getTime(itemB) - getTime(itemA);
        }
    });
  }, [products, selectedCategory, selectedBrand, selectedFabric, selectedColors, sortOrder, getProductFamilyKey, searchQuery, modifiedProductFamilies]);

  // Reset pagination when filters change
  useEffect(() => {
      setVisibleCount(12);
  }, [selectedCategory, selectedBrand, selectedFabric, selectedColors, sortOrder, products.length]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              setVisibleCount(prev => prev + 12);
          }
      }, { rootMargin: '450px' }); // Load when within 450px of bottom

      if (loadMoreRef.current) {
          observer.observe(loadMoreRef.current);
      }

      return () => {
          if (loadMoreRef.current) {
              observer.unobserve(loadMoreRef.current);
          }
      };
  }, [allFilteredProducts.length, visibleCount]);

  const displayedProducts = useMemo(() => {
      return allFilteredProducts.slice(0, visibleCount);
  }, [allFilteredProducts, visibleCount]);


  const handleEdit = (product: Product) => {
    handleProductSelect(null); 
    onEditProduct(product);
  };

  const handleSwitchProduct = (product: Product) => {
    handleProductSelect(product);
  };

  const handleViewComposition = (compositions: SavedComposition[], startIndex: number) => {
      setCompositionToView({ compositions, startIndex });
      handleProductSelect(null);
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
        {/* Balão de Busca Flutuante (Overlay inteligente acionado pelo cabeçalho) */}
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
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          subFilterWaterblock={subFilterWaterblock}
          setSubFilterWaterblock={setSubFilterWaterblock}
        />

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

          <main ref={scrollContainerRef as React.RefObject<HTMLElement>} className="flex-grow overflow-y-auto px-6 pt-20 pb-52 md:pb-52 flex flex-col no-scrollbar z-10">
              {hasFetchError && (
                <div className={`p-4 mb-4 rounded-xl text-center font-semibold border ${isDark ? 'bg-red-900/50 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    <p className="font-bold text-lg">Modo de Demonstração Ativo</p>
                    <p className="text-sm">Você está vendo uma vitrine de exemplo. O conteúdo real não pôde ser carregado.</p>
                </div>
              )}
               <div className="mt-4 mb-6">
                  <h1 className="text-xl sm:text-2xl font-light text-purple-900/85 dark:text-purple-300/85 text-center">
                    Bem vindo a <span className="font-semibold text-purple-700 dark:text-purple-400 whitespace-nowrap">Têca Decorações</span>
                  </h1>
              </div>

              {/* Barra de Busca Fixa (Sempre visível no início da vitrine, mais estreita e elegante) */}
              <SearchBar 
                isFloating={false}
                isSearchOpen={isSearchOpen}
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
                selectedBrand={selectedBrand}
                setSelectedBrand={setSelectedBrand}
                subFilterWaterblock={subFilterWaterblock}
                setSubFilterWaterblock={setSubFilterWaterblock}
              />

              {/* --- PREMIUM IA ENVIRONMENT BANNER CAROUSEL --- */}
              {activeBanners.length > 0 && (
                <div className="relative mt-1 mb-4 w-full h-36 sm:h-44 md:h-52 flex-shrink-0 border border-fuchsia-400/80 dark:border-fuchsia-500/40 rounded-3xl flex flex-col items-center justify-center overflow-hidden bg-fuchsia-500/5 dark:bg-fuchsia-950/5 select-none touch-pan-y shadow-md">
                  
                  {/* Top Elegant Rose Accent Line ("Top Rosado") */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-400 via-fuchsia-500 to-rose-400 z-30 pointer-events-none" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeBannerIndex}
                      drag={activeBanners.length > 1 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={(event, info) => {
                        if (activeBanners.length <= 1) return;
                        const swipeThreshold = 40;
                        if (info.offset.x < -swipeThreshold) {
                          setActiveBannerIndex(prev => (prev === activeBanners.length - 1 ? 0 : prev + 1));
                        } else if (info.offset.x > swipeThreshold) {
                          setActiveBannerIndex(prev => (prev === 0 ? activeBanners.length - 1 : prev - 1));
                        }
                      }}
                      onClick={() => setSelectedBannerComposition(activeBanners[activeBannerIndex])}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                      className="absolute inset-0 w-full h-full cursor-pointer flex flex-col justify-end p-3.5 sm:p-4 items-start transition-all bg-black/10"
                    >
                      {/* Background Slide Image with Cinematic Ken Burns Zoom-Out (Afastamento) */}
                      <motion.img 
                        key={`banner-img-${activeBannerIndex}`}
                        src={activeBanners[activeBannerIndex]?.url}
                        alt={activeBanners[activeBannerIndex]?.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        initial={{
                          scale: (((activeBanners[activeBannerIndex] as any)?.zoomScale !== undefined ? (activeBanners[activeBannerIndex] as any).zoomScale / 100 : 1) * 1.07)
                        }}
                        animate={{
                          scale: ((activeBanners[activeBannerIndex] as any)?.zoomScale !== undefined ? (activeBanners[activeBannerIndex] as any).zoomScale / 100 : 1)
                        }}
                        transition={{
                          duration: 12,
                          ease: [0.25, 0.46, 0.45, 0.94] // Gentler easeOutQuad curve for continuous fluid motion
                        }}
                        style={{
                          objectPosition: `${(activeBanners[activeBannerIndex] as any)?.objectPositionX !== undefined ? (activeBanners[activeBannerIndex] as any).objectPositionX : 50}% ${(activeBanners[activeBannerIndex] as any)?.objectPositionY !== undefined ? (activeBanners[activeBannerIndex] as any).objectPositionY : 50}%`,
                          transformOrigin: 'center'
                        }}
                      />
                      
                      {/* Perfectly smooth, full-bleed corner vignette overlay with zero visible borders */}
                      {(() => {
                        const slide = activeBanners[activeBannerIndex];
                        const isBelizeVerdes = isBelizeOrWaterblock(slide);
                        
                        if (isBelizeVerdes) {
                          // Vinheta radial suave no canto superior direito para Belize Verdes (sem bordas visíveis)
                          return (
                            <div 
                              className="absolute inset-0 pointer-events-none z-10" 
                              style={{
                                background: 'radial-gradient(circle at 100% 0%, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0) 100%)'
                              }}
                            />
                          );
                        } else {
                          // Vinheta radial suave no canto inferior esquerdo para os outros slides (sem bordas visíveis)
                          return (
                            <div 
                              className="absolute inset-0 pointer-events-none z-10" 
                              style={{
                                background: 'radial-gradient(circle at 0% 100%, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 25%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0) 100%)'
                              }}
                            />
                          );
                        }
                      })()}

                      {/* Content - Title and Description */}
                      {(() => {
                        const slide = activeBanners[activeBannerIndex];
                        const isBelizeVerdes = isBelizeOrWaterblock(slide);
                        
                        return (
                          <div className={`absolute z-20 select-none flex flex-col max-w-[76%] sm:max-w-[65%] ${
                            isBelizeVerdes 
                              ? 'top-4 sm:top-5 right-3.5 sm:right-5 items-end text-right' 
                              : 'bottom-3 sm:bottom-4 left-3.5 sm:left-4 items-start text-left'
                          }`}>
                            {(() => {
                              const desc = getCompositionDescription(slide);
                              const brand = getBrandForSlide(slide);
                              return (
                                <>
                                  <div className={`flex items-center gap-1 flex-wrap mb-0.5 ${isBelizeVerdes ? 'flex-row-reverse' : ''}`}>
                                    <h3 className="text-white font-black text-[10px] sm:text-[11.5px] md:text-sm tracking-tight drop-shadow-md">
                                      {slide?.title}
                                    </h3>
                                    {brand && (
                                      <div className="flex items-center gap-0.5 bg-black/45 backdrop-blur-xs border border-white/10 px-1 py-0.5 rounded-full flex-shrink-0">
                                        <img src={brand.logo} alt={brand.name} className="w-2 h-2 rounded-full object-contain bg-white p-px shadow-xs" />
                                        <span className="text-[5.5px] font-extrabold tracking-wider text-rose-300 uppercase leading-none">
                                          {brand.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[7.5px] sm:text-[8.5px] md:text-[9px] text-rose-100/85 font-medium leading-normal max-w-[95%] drop-shadow-sm select-none">
                                    {desc}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>

                  {/* Pagination Dots at bottom */}
                  {activeBanners.length > 1 && (
                    <div className="absolute bottom-2 right-2.5 flex items-center gap-0.5 z-20 bg-rose-950/30 backdrop-blur-md border border-rose-300/10 px-1 py-0.5 rounded-full shadow-lg">
                      {activeBanners.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          onClick={(e) => { e.stopPropagation(); setActiveBannerIndex(dotIdx); }}
                          className={`h-[3px] rounded-full transition-all duration-300 cursor-pointer ${dotIdx === activeBannerIndex ? 'w-2.5 bg-rose-400 shadow-[0_0_3px_rgba(244,63,94,0.5)]' : 'w-[3px] bg-white/45 hover:bg-white/70'}`}
                          aria-label={`Slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}


              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 grid-flow-dense">
                  {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  ) : (
                      <>
                        {displayedProducts.map((item, index) => (
                            item.type === 'group'
                                ? <ProductGroupCard key={`group-${index}`} item={item} index={index} onClick={(p) => handleProductSelect(p)} productFamilies={productFamilies} sofaColors={sofaColors} />
                                : item.type === 'collection'
                                    ? <CollectionCard key={`collection-${index}`} item={item} index={index} onClick={(p) => handleProductSelect(p)} sofaColors={sofaColors} />
                                    : <ProductCard key={item.product.id} product={item.product} index={index} onClick={() => handleProductSelect(item.product)} sofaColors={sofaColors} />
                        ))}
                        {visibleCount < allFilteredProducts.length && (
                            <div ref={loadMoreRef} className="col-span-full py-4 text-center">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            </div>
                        )}
                      </>
                  )}
              </div>
          </main>
      </div>
      {!selectedBannerComposition && (
        <FloatingActionButtons onNavigate={onNavigate} isSearchOpen={isSearchOpen || isSearchFocused || searchQuery.trim() !== ''} scrollTop={scrollTop} />
      )}
      {selectedProduct && (
          <ProductDetailModal
              product={selectedProduct}
              products={products}
              onClose={() => handleProductSelect(null)}
              canManageStock={canManageStock}
              onEditProduct={handleEdit}
              onSwitchProduct={handleSwitchProduct}
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
              onViewProduct={handleProductSelect}
              setSavedCompositions={setSavedCompositions}
          />
      )}
      <AnimatePresence>
        {selectedBannerComposition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
            {/* Backdrop wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBannerComposition(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`relative w-full max-w-xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border flex flex-col ${
                isDark ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-gray-100 text-gray-950'
              }`}
            >
              {/* Header / Environment Image of the Banner at the Top */}
              <div className="relative w-full h-44 sm:h-52 flex-shrink-0 select-none overflow-hidden">
                <img
                  src={selectedBannerComposition.url}
                  alt={selectedBannerComposition.title}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${selectedBannerComposition.objectPositionX !== undefined ? selectedBannerComposition.objectPositionX : 50}% ${selectedBannerComposition.objectPositionY !== undefined ? selectedBannerComposition.objectPositionY : 50}%`,
                    transform: `scale(${selectedBannerComposition.zoomScale !== undefined ? selectedBannerComposition.zoomScale / 100 : 1})`,
                    transformOrigin: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                
                {/* Close Button on the Top Right */}
                <button
                  onClick={() => setSelectedBannerComposition(null)}
                  className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/60 border border-white/20 text-white transition-all cursor-pointer select-none active:scale-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Title Overlay */}
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-white font-black text-lg sm:text-xl drop-shadow">
                    {selectedBannerComposition.title}
                  </h2>
                </div>
              </div>

              {/* List of cushions & Prices below the image */}
              <div className="p-5 overflow-y-auto flex-grow flex flex-col gap-4 no-scrollbar">
                
                {/* Dynamically show the composition fine-print & brand if defined */}
                {(() => {
                  const desc = getCompositionDescription(selectedBannerComposition);
                  const brand = getBrandForSlide(selectedBannerComposition);
                  if (!desc && !brand) return null;
                  return (
                    <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                      isDark ? 'bg-zinc-900/40 border-white/5 text-gray-300' : 'bg-rose-50/40 border-rose-100/30 text-gray-700'
                    }`}>
                      {brand && (
                        <div className="flex items-center gap-2 mb-0.5 select-none">
                          <img src={brand.logo} alt={brand.name} className="w-5 h-5 rounded-full object-contain bg-white p-0.5 border shadow-sm" />
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black tracking-widest text-rose-600 dark:text-rose-400">
                              Tecidos {brand.name}
                            </span>
                            <span className="text-[9px] text-gray-400 font-semibold">Parceiro de Alta Durabilidade</span>
                          </div>
                        </div>
                      )}
                      {desc && (
                        <p className="text-xs font-semibold leading-relaxed italic text-gray-500 dark:text-gray-400">
                          "{desc}"
                        </p>
                      )}
                    </div>
                  );
                })()}

                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Almofadas da Composição (Selecione para ver detalhes):
                </h3>
                
                <div className="flex flex-col gap-3">
                  {selectedBannerComposition.items.map((item: any) => {
                    // Run dynamic finder to get the real product if matching
                    const realProduct = getRealOrMockProduct(
                      item.id,
                      item.color,
                      item.fabric,
                      item.name,
                      item.imgUrl,
                      item.priceCover,
                      item.priceFull
                    );

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedBannerComposition(null);
                          setTimeout(() => {
                            handleProductSelect(realProduct);
                          }, 150);
                        }}
                        className={`flex gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex-row items-center ${
                          isDark 
                            ? 'bg-zinc-900/60 hover:bg-zinc-900 border-white/5 hover:border-fuchsia-500/20' 
                            : 'bg-gray-50 hover:bg-white border-gray-100 hover:border-purple-500/20 hover:shadow-md'
                        }`}
                      >
                        {/* Cushion Thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner border border-black/5 relative">
                          <img
                            src={realProduct.baseImageUrl}
                            alt={realProduct.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info & Prices */}
                        <div className="flex-grow min-w-0">
                          <h4 className={`font-extrabold text-xs sm:text-sm truncate ${isDark ? 'text-purple-100' : 'text-gray-800'}`}>
                            {realProduct.name}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-200/60 text-gray-600'
                            }`}>
                              {realProduct.fabricType}
                            </span>
                            <span className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {realProduct.brand}
                            </span>
                          </div>

                          {/* Brazilian Cushion Prices display */}
                          <div className="flex gap-4 mt-2">
                            <div>
                              <span className="block text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-gray-400">
                                Apenas Capa:
                              </span>
                              <span className="font-exegesis font-bold text-xs text-fuchsia-500">
                                R$ {realProduct.variations[0].priceCover.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-gray-400">
                                Almofada Cheia:
                              </span>
                              <span className="font-exegesis font-bold text-xs text-emerald-500">
                                R$ {realProduct.variations[0].priceFull.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Click/Chevron Icon Indicator */}
                        <div className="text-gray-400/80 hover:text-fuchsia-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer / Fast Actions */}
              <div className={`p-4 border-t flex justify-end items-center bg-gray-50/5 ${
                isDark ? 'border-white/5 bg-zinc-950/70' : 'border-gray-100 bg-gray-50/30'
              }`}>
                <button
                  onClick={() => setSelectedBannerComposition(null)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
                    isDark ? 'border-white/10 hover:bg-white/5 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShowcaseScreen;
