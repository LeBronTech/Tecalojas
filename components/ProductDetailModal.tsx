import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, Variation, WaterResistanceLevel, SavedComposition, ThemeContext, View, StoreName, CushionSize, CartItem } from '../types';
import { WATER_RESISTANCE_INFO, BRAND_LOGOS, PREDEFINED_COLORS } from '../constants';
import { GoogleGenAI } from '@google/genai';

interface ProductDetailModalProps {
    product: Product;
    products: Product[];
    onClose: () => void;
    canManageStock: boolean;
    onEditProduct: (product: Product) => void;
    onSwitchProduct: (product: Product) => void;
    apiKey: string | null;
    onRequestApiKey: () => void;
    savedCompositions: SavedComposition[];
    onViewComposition: (compositions: SavedComposition[], startIndex: number) => void;
    onAddToCart: (product: Product, variation: Variation, quantity: number, itemType: 'cover' | 'full', price: number, isPreOrder?: boolean) => void;
    onNavigate: (view: View) => void;
    sofaColors: { name: string; hex: string }[];
    cart: CartItem[];
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const InstagramIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M17.5 6.51L17.51 6.49889" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FacebookIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const WhatsAppIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

interface FurnitureColorPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
    colors: { name: string; hex: string }[];
}

const FurnitureColorPopover: React.FC<FurnitureColorPopoverProps> = ({ isOpen, onClose, onSelectColor, colors }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className={`p-6 rounded-2xl shadow-lg border animate-fade-in-scale w-full max-w-xs ${isDark ? 'bg-[#2D1F49] border-white/10' : 'bg-white border-gray-200'}`}
                onClick={(e) => e.stopPropagation()}
            >
                 <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards; }
                `}</style>
                <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Trocar cor do sofá e cama</h3>
                <div className="flex flex-wrap justify-center gap-3">
                    {colors.map(color => (
                        <button
                            key={color.name}
                            onClick={() => onSelectColor(color.name)}
                            className={`flex flex-col items-center gap-2 p-2 rounded-md ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        >
                            <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border border-black/20"></div>
                            <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{color.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, products, onClose, canManageStock, onEditProduct, onSwitchProduct, onAddToCart, onNavigate, sofaColors, cart }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const cartSnapshot = useMemo(() => {
        const snapshot: Record<string, number> = {};
        product.variations.forEach(v => {
            snapshot[v.size] = cart
                .filter(item => item.productId === product.id && item.variationSize === v.size && !item.isPreOrder)
                .reduce((sum, item) => sum + item.quantity, 0);
        });
        return snapshot;
    }, [product.id, cart]);

    const [variationQuantities, setVariationQuantities] = useState<Record<string, { cover: number, full: number }>>({});
    const [addStatus, setAddStatus] = useState<Record<string, 'idle' | 'added' | 'goToCart'>>({});
    
    const getProductFamilyKey = useCallback((p: Product) => {
        if (p.variationGroupId) return p.variationGroupId;
        let baseName = p.name.toLowerCase();
        const sortedColors = [...PREDEFINED_COLORS].sort((a, b) => b.name.length - a.name.length);
        sortedColors.forEach(c => {
            const regex = new RegExp(`\\b${c.name.toLowerCase()}\\b|\\(${c.name.toLowerCase()}\\)`, 'g');
            baseName = baseName.replace(regex, '');
        });
        baseName = baseName.replace(/capa|almofada|cheia|vazia|enchimento|kit|lombar/g, '');
        const cleanBase = baseName.replace(/\s\s+/g, ' ').replace(/[()]/g, '').trim();
        return `${p.brand}|${p.category}|${cleanBase}`;
    }, []);

    const familyProducts = useMemo(() => {
        const currentKey = getProductFamilyKey(product);
        return products.filter(p => p.id !== product.id && getProductFamilyKey(p) === currentKey);
    }, [products, product, getProductFamilyKey]);
    
    const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];

    useEffect(() => {
        setVariationQuantities({});
        setAddStatus({});
    }, [product.id]);

    const handleQuantityChange = (variationSize: CushionSize, type: 'cover' | 'full', change: number) => {
        const currentCover = variationQuantities[variationSize]?.cover || 0;
        const currentFull = variationQuantities[variationSize]?.full || 0;
        let newCover = currentCover;
        let newFull = currentFull;
        if (type === 'cover') newCover = Math.max(0, currentCover + change);
        else newFull = Math.max(0, currentFull + change);
        setVariationQuantities(prev => ({
            ...prev,
            [variationSize]: { cover: newCover, full: newFull },
        }));
        setAddStatus(prev => ({ ...prev, [variationSize]: 'idle' }));
    };

    const handleAddVariationToCart = (variation: Variation) => {
        const coverQty = variationQuantities[variation.size]?.cover || 0;
        const fullQty = variationQuantities[variation.size]?.full || 0;
        const physicalStock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
        const inCartCount = cartSnapshot[variation.size] || 0;
        const availableNow = Math.max(0, physicalStock - inCartCount);
        const processItem = (qty: number, type: 'cover' | 'full', price: number) => {
            if (qty <= 0) return;
            if (availableNow > 0) {
                const canTakeFromStock = Math.min(qty, availableNow);
                const overflow = qty - canTakeFromStock;
                onAddToCart(product, variation, canTakeFromStock, type, price, false);
                if (overflow > 0) onAddToCart(product, variation, overflow, type, price, true);
            } else {
                onAddToCart(product, variation, qty, type, price, true);
            }
        };
        processItem(coverQty, 'cover', variation.priceCover);
        processItem(fullQty, 'full', variation.priceFull);
        setAddStatus(prev => ({ ...prev, [variation.size]: 'added' }));
        setTimeout(() => {
            if (isMounted.current) setAddStatus(prev => ({ ...prev, [variation.size]: 'goToCart' }));
        }, 800);
    };
    
    const [activeEnvIndex, setActiveEnvIndex] = useState(0);
    const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
    const [activeSofaColor, setActiveSofaColor] = useState('Bege');
    const [activeBedColor, setActiveBedColor] = useState('Bege');
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const envKeys = useMemo(() => Object.keys(product.backgroundImages || {}).filter(key => {
        const value = product.backgroundImages![key as keyof typeof product.backgroundImages];
        return typeof value === 'string' || (typeof value === 'object' && value !== null && Object.keys(value).length > 0);
    }), [product.backgroundImages]);

    const activeEnvKey = envKeys[activeEnvIndex] as 'sala' | 'quarto' | 'varanda' | 'piscina' | undefined;

    const currentImageUrl = useMemo(() => {
        if (!activeEnvKey) return product.baseImageUrl;
        const bgData = product.backgroundImages?.[activeEnvKey];
        if (typeof bgData === 'string') return bgData;
        if (typeof bgData === 'object' && bgData !== null) {
            const color = activeEnvKey === 'sala' ? activeSofaColor : activeBedColor;
            return bgData[color] || bgData['Bege'] || Object.values(bgData)[0];
        }
        return product.baseImageUrl;
    }, [activeEnvKey, activeSofaColor, activeBedColor, product]);
    
    const envDisplayNames: Record<string, string> = { sala: 'Sala', quarto: 'Quarto', varanda: 'Varanda', piscina: 'Piscina' };
    const availableSalaColors = product.backgroundImages?.sala;
    const availableQuartoColors = product.backgroundImages?.quarto;
    const showSalaColorButton = typeof availableSalaColors === 'object' && availableSalaColors !== null && Object.keys(availableSalaColors).length > 1;
    const showQuartoColorButton = typeof availableQuartoColors === 'object' && availableQuartoColors !== null && Object.keys(availableQuartoColors).length > 1;

    // --- Share Functions ---
    const generateShareText = (isSocial: boolean) => {
        const minPrice = Math.min(...product.variations.map(v => v.priceFull));
        const colorNames = product.colors.map(c => c.name).join(', ');
        const url = window.location.href;

        if (isSocial) {
            return `✨ *${product.name}* ✨\n\n🎨 Cor: ${colorNames}\n🧵 Tecido: ${product.fabricType}\n📏 Tamanhos: ${product.variations.map(v => v.size).join(', ')}\n💰 A partir de R$ ${minPrice.toFixed(2)}\n\n🛍️ Veja mais no nosso catálogo:\n${url}`;
        }
        return `Olá! Veja esta linda almofada das Lojas Têca:\n\n*${product.name}*\nTecido: ${product.fabricType}\nPreço: R$ ${minPrice.toFixed(2)}\n\nImagem: ${product.baseImageUrl}\n\nConsulte estoque pelo app: ${url}`;
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(generateShareText(false));
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleShareFacebook = () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    };

    const handleCopyForSocial = async () => {
        const text = generateShareText(true);
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback("Texto pronto para Stories/Legenda!");
            setTimeout(() => setCopyFeedback(null), 3000);
        } catch (e) {
            alert("Erro ao copiar.");
        }
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-0 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
                style={{ height: '90vh' }}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards; }
                `}</style>
                
                <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-20 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                 {canManageStock && (
                    <button onClick={() => onEditProduct(product)} className={`absolute top-4 left-4 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 z-20 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        Editar
                    </button>
                )}

                <div className="flex-grow overflow-y-auto no-scrollbar pt-6">
                     {envKeys.length > 0 && activeEnvKey && (
                        <div className="px-6 mb-4">
                             <h3 className={`font-bold mb-2 ${titleClasses}`}>{envDisplayNames[activeEnvKey] || 'Veja em Ambientes'}</h3>
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2">
                                <img src={currentImageUrl} alt={activeEnvKey} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2 flex items-center gap-2">
                                {(activeEnvKey === 'sala' && showSalaColorButton) && (
                                    <button 
                                        onClick={() => setIsColorPopoverOpen(true)} 
                                        className="bg-black/40 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm"
                                    >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.887.817 3.556 2.093 4.63.26.173.41.46.41.77v3.27a.75.75 0 001.5 0V14a.75.75 0 00-.03-.223A5.98 5.98 0 0016 8a6 6 0 00-6-6zM3.654 9.324A4.5 4.5 0 0110 3.5a4.5 4.5 0 015.42 7.237.75.75 0 00.58.263h.001c.414 0 .75.336.75.75v.5c0 .414-.336.75-.75.75h-2.14a.75.75 0 00-.737.649A3.5 3.5 0 0110 14.5a3.5 3.5 0 01-3.354-2.851.75.75 0 00-.737-.649H3.75a.75.75 0 01-.75-.75v-.5a.75.75 0 01.654-.726z" /></svg>
                                        Cor do Sofá
                                    </button>
                                )}
                                {(activeEnvKey === 'quarto' && showQuartoColorButton) && (
                                     <button 
                                        onClick={() => setIsColorPopoverOpen(true)} 
                                        className="bg-black/40 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm"
                                    >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.887.817 3.556 2.093 4.63.26.173.41.46.41.77v3.27a.75.75 0 001.5 0V14a.75.75 0 00-.03-.223A5.98 5.98 0 0016 8a6 6 0 00-6-6zM3.654 9.324A4.5 4.5 0 0110 3.5a4.5 4.5 0 015.42 7.237.75.75 0 00.58.263h.001c.414 0 .75.336.75.75v.5c0 .414-.336.75-.75.75h-2.14a.75.75 0 00-.737.649A3.5 3.5 0 0110 14.5a3.5 3.5 0 01-3.354-2.851.75.75 0 00-.737-.649H3.75a.75.75 0 01-.75-.75v-.5a.75.75 0 01.654-.726z" /></svg>
                                        Cor da Cama
                                    </button>
                                )}
                                </div>
                            </div>
                             <div className="flex items-center justify-center gap-2">
                                {envKeys.map((key, index) => {
                                    const bgData = product.backgroundImages?.[key as keyof typeof product.backgroundImages];
                                    const thumbUrl = typeof bgData === 'string' ? bgData : (bgData?.['Bege'] || Object.values(bgData || {})[0]);
                                    if (!thumbUrl) return null;
                                    return (
                                    <button key={key} onClick={() => setActiveEnvIndex(index)} className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${activeEnvIndex === index ? 'border-fuchsia-500' : 'border-transparent'}`}>
                                        <img src={thumbUrl} alt={key} className="w-full h-full object-cover" />
                                    </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                
                    <div className="px-6 mt-4">
                        <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>{product.category}</span>
                        <h2 className={`text-2xl font-bold mt-1 mb-2 ${titleClasses}`}>{product.name}</h2>
                    </div>

                    <div className="px-6 mt-4 space-y-4">
                        {/* --- NEW: Share Section --- */}
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 text-center ${subtitleClasses}`}>Vincular e Compartilhar</p>
                            <div className="flex justify-around items-center">
                                <button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-1 group">
                                    <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg transform group-active:scale-90 transition-transform">
                                        <WhatsAppIcon />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500">Zap</span>
                                </button>
                                <button onClick={handleCopyForSocial} className="flex flex-col items-center gap-1 group">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center shadow-lg transform group-active:scale-90 transition-transform">
                                        <InstagramIcon />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500">Instagram</span>
                                </button>
                                <button onClick={handleShareFacebook} className="flex flex-col items-center gap-1 group">
                                    <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg transform group-active:scale-90 transition-transform">
                                        <FacebookIcon />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500">Facebook</span>
                                </button>
                            </div>
                            {copyFeedback && (
                                <p className="text-[10px] text-center font-bold text-fuchsia-500 mt-2 animate-pulse">{copyFeedback}</p>
                            )}
                        </div>

                        <div>
                            <p className={`font-bold text-sm mb-1 ${subtitleClasses}`}>Tecido</p>
                            <p className={`font-bold ${titleClasses}`}>{product.fabricType}</p>
                            <p className={`text-sm mt-1 ${subtitleClasses}`}>{product.description}</p>
                        </div>

                        {waterResistanceDetails && (
                            <div className={`p-5 my-4 rounded-xl bg-purple-500/10`}>
                                <p className={`font-bold text-sm mb-2 ${subtitleClasses}`}>Proteção</p>
                                <div className="flex items-center gap-3">
                                    <img src={waterResistanceDetails.icon} alt={waterResistanceDetails.label} className="w-8 h-8"/>
                                    <div>
                                        <p className={`font-bold ${titleClasses}`}>{waterResistanceDetails.label}</p>
                                        <p className={`text-sm mt-1 ${subtitleClasses}`}>{waterResistanceDetails.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <p className={`font-bold text-sm mb-1 ${subtitleClasses}`}>Cor</p>
                            <div className="flex items-center gap-2">
                                <div style={{backgroundColor: product.colors[0]?.hex}} className="w-6 h-6 rounded-full border border-black/10"></div>
                                <p className={`font-bold ${titleClasses}`}>{product.colors[0]?.name}</p>
                            </div>
                        </div>
                        
                        {familyProducts.length > 0 && (
                             <div>
                                <p className={`font-bold text-sm mb-2 ${subtitleClasses}`}>Almofadas da mesma família</p>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {familyProducts.map(p => (
                                        <button key={p.id} onClick={() => onSwitchProduct(p)} className="flex-shrink-0 flex flex-col items-center text-center w-20">
                                            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-fuchsia-500 transition-all">
                                                <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover"/>
                                            </div>
                                            <p className={`text-xs mt-1 ${subtitleClasses}`}>{p.colors[0]?.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="px-6 mt-6 pb-4">
                        <h3 className={`font-bold mb-3 ${titleClasses}`}>Adicionar ao Carrinho</h3>
                         <div className="grid grid-cols-1 gap-4">
                            {product.variations.map((variation) => {
                                const coverQty = variationQuantities[variation.size]?.cover || 0;
                                const fullQty = variationQuantities[variation.size]?.full || 0;
                                const totalSelected = coverQty + fullQty;

                                const physicalStock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
                                const inCartCount = cartSnapshot[variation.size] || 0;
                                const availableAtOpen = Math.max(0, physicalStock - inCartCount);
                                
                                const isPreOrderMode = availableAtOpen <= 0;
                                const hasOverflow = totalSelected > availableAtOpen && availableAtOpen > 0;

                                const status = addStatus[variation.size] || 'idle';
                                let buttonText = isPreOrderMode ? 'Pedir por Encomenda' : 'Adicionar ao Carrinho';
                                let buttonClasses = isPreOrderMode 
                                    ? 'bg-amber-600 hover:bg-amber-700' 
                                    : 'bg-fuchsia-600 disabled:bg-gray-500 hover:bg-fuchsia-700';
                                let buttonAction: () => void = () => handleAddVariationToCart(variation);

                                if (status === 'added') {
                                    buttonText = 'Adicionado ✓';
                                    buttonClasses = 'bg-green-500';
                                } else if (status === 'goToCart') {
                                    buttonText = 'Ir para o Carrinho';
                                    buttonClasses = 'bg-purple-600 hover:bg-purple-700';
                                    buttonAction = () => {
                                        onClose();
                                        onNavigate(View.CART);
                                    };
                                }

                                return (
                                <div key={variation.size} className={`p-3 rounded-xl border flex flex-col items-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                                        <img src={variation.imageUrl || product.baseImageUrl} alt={variation.size} className="w-full h-full object-cover" />
                                    </div>
                                    <p className={`font-bold text-sm ${titleClasses}`}>{variation.size}</p>
                                    <p className={`text-xs font-bold ${isPreOrderMode ? 'text-amber-500' : subtitleClasses}`}>
                                        {isPreOrderMode ? 'Sem estoque físico' : `${availableAtOpen} disponível (físico)`}
                                    </p>

                                    <div className="w-full mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-sm">Capa</p>
                                                <p className="font-bold text-sm text-fuchsia-400">R${variation.priceCover.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleQuantityChange(variation.size, 'cover', -1)} className="w-8 h-8 rounded bg-black/20 text-white font-bold text-lg">-</button>
                                                <span className="w-8 text-center font-bold text-xl text-fuchsia-500">{coverQty}</span>
                                                <button onClick={() => handleQuantityChange(variation.size, 'cover', 1)} className="w-8 h-8 rounded bg-black/20 text-white font-bold text-lg">+</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-sm">Cheia</p>
                                                <p className="font-bold text-sm text-fuchsia-400">R${variation.priceFull.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleQuantityChange(variation.size, 'full', -1)} className="w-8 h-8 rounded bg-black/20 text-white font-bold text-lg">-</button>
                                                <span className="w-8 text-center font-bold text-xl text-fuchsia-500">{fullQty}</span>
                                                <button onClick={() => handleQuantityChange(variation.size, 'full', 1)} className="w-8 h-8 rounded bg-black/20 text-white font-bold text-lg">+</button>
                                            </div>
                                        </div>
                                    </div>

                                    {hasOverflow && (
                                        <p className="text-[10px] text-center text-amber-500 font-bold mt-2 leading-tight animate-pulse">
                                            Temos apenas {availableAtOpen} em estoque. As outras {totalSelected - availableAtOpen} serão encomendas.
                                        </p>
                                    )}
                                    {isPreOrderMode && (
                                        <p className="text-[10px] text-center text-amber-500 font-bold mt-2 leading-tight">
                                            Sem estoque físico. Adicionando como encomenda.
                                        </p>
                                    )}
                                    
                                    <div className="w-full mt-3">
                                        <button
                                            onClick={buttonAction}
                                            disabled={coverQty === 0 && fullQty === 0 && status === 'idle'}
                                            className={`w-full py-2.5 rounded-lg text-white font-bold text-sm flex items-center justify-center transition-colors ${buttonClasses}`}
                                        >
                                            {buttonText}
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <FurnitureColorPopover
                    isOpen={isColorPopoverOpen}
                    onClose={() => setIsColorPopoverOpen(false)}
                    onSelectColor={(color) => {
                        if (activeEnvKey === 'sala') setActiveSofaColor(color);
                        if (activeEnvKey === 'quarto') setActiveBedColor(color);
                        setIsColorPopoverOpen(false);
                    }}
                    colors={Object.keys(product.backgroundImages?.[activeEnvKey as 'sala'|'quarto'] || {}).map(name => sofaColors.find(c => c.name === name)).filter((c): c is { name: string; hex: string } => !!c)}
                />
            </div>
        </div>
    );
};

export default ProductDetailModal;