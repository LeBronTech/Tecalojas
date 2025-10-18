import React, { useState, useContext, useEffect } from 'react';
import { Product, Variation, WaterResistanceLevel } from '../types';
import { ThemeContext } from '../App';
import { WATER_RESISTANCE_INFO, BRAND_LOGOS } from '../constants';

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
    const { theme } = useContext(ThemeContext);
    const [variationIndex, setVariationIndex] = useState(0);
    const [displayImageUrl, setDisplayImageUrl] = useState(product.baseImageUrl);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        // Reset main image and rotation when product changes
        setDisplayImageUrl(product.baseImageUrl);
        setRotation(0);
        setVariationIndex(0);
    }, [product]);

    const isDark = theme === 'dark';
    const currentVariation: Variation | undefined = product.variations[variationIndex];
    const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];
    
    const galleryImages = [
        { url: product.baseImageUrl, label: 'Principal' },
        ...(product.backgroundImages?.sala ? [{ url: product.backgroundImages.sala, label: 'Sala' }] : []),
        ...(product.backgroundImages?.quarto ? [{ url: product.backgroundImages.quarto, label: 'Quarto' }] : []),
        ...(product.backgroundImages?.varanda ? [{ url: product.backgroundImages.varanda, label: 'Varanda' }] : []),
    ].filter(image => image.url); // Ensure no empty URLs


    const handlePrevVariation = () => {
        setVariationIndex(prev => (prev === 0 ? product.variations.length - 1 : prev - 1));
    };

    const handleNextVariation = () => {
        setVariationIndex(prev => (prev === product.variations.length - 1 ? 0 : prev + 1));
    };
    
    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const carouselBtnClasses = isDark ? "bg-black/30 hover:bg-black/60 text-white" : "bg-white/50 hover:bg-white/90 text-gray-800";
    const priceBoxClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-100 border-gray-200";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                
                <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-20 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="flex-grow overflow-y-auto no-scrollbar">
                    {/* Main Image and Gallery */}
                    <div className="mb-4">
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3">
                            <img 
                                src={displayImageUrl || 'https://i.imgur.com/gA0Wxkm.png'} 
                                alt="Visualização do produto" 
                                className="w-full h-full object-cover transition-transform duration-300"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            />
                            <button
                                onClick={handleRotate}
                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full z-10 bg-transparent hover:bg-black/10 flex items-center justify-center transition-colors"
                                aria-label="Girar imagem"
                            >
                                <img src="https://i.postimg.cc/QMgBhNLq/Gemini-Generated-Image-2csq4y2csq4y2csq.png" alt="Girar Imagem" className="w-8 h-8" />
                            </button>
                        </div>
                        
                        <div className="flex items-center space-x-2 overflow-x-auto pb-2 -ml-2 pl-2">
                           {galleryImages.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setDisplayImageUrl(image.url);
                                        setRotation(0);
                                    }}
                                    className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${displayImageUrl === image.url ? 'border-fuchsia-500' : (isDark ? 'border-white/10' : 'border-gray-200')}`}
                                >
                                    <img src={image.url} alt={image.label} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                                        {image.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                
                    <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>{product.category}</span>
                    <h2 className={`text-2xl font-bold mt-1 mb-2 ${titleClasses}`}>{product.name}</h2>
                    
                    <div className="my-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-y-3">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${subtitleClasses}`}>Tecido:</span>
                                <span className={`px-2 py-1 text-xs font-bold rounded ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
                                    {product.fabricType} {waterResistanceDetails && waterResistanceDetails.shortLabel}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${subtitleClasses}`}>Marca:</span>
                                <div className="flex items-center gap-1.5">
                                    <img src={BRAND_LOGOS[product.brand]} alt={`Logo ${product.brand}`} className="w-5 h-5 rounded-full object-contain bg-white p-0.5" />
                                    <span className={`text-sm font-semibold ${titleClasses}`}>{product.brand}</span>
                                </div>
                            </div>
                        </div>
                         {waterResistanceDetails && (
                            <div className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                <img src={waterResistanceDetails.icon} alt={`Ícone ${waterResistanceDetails.label}`} className="w-10 h-10 rounded-md object-cover"/>
                                <p className={`text-xs ${subtitleClasses}`}>{waterResistanceDetails.description}</p>
                            </div>
                        )}
                        <p className={`text-sm ${subtitleClasses}`}>{product.description}</p>
                    </div>

                    {/* Variations Carousel */}
                    <div className="mt-6">
                        <h3 className={`font-bold mb-2 ${titleClasses}`}>Variações Disponíveis</h3>
                        <div className="relative">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                                {product.variations.map((variation, index) => (
                                    <img
                                        key={variation.size}
                                        src={variation.imageUrl || product.baseImageUrl || 'https://i.imgur.com/gA0Wxkm.png'}
                                        alt={`Variação ${variation.size}`}
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${index === variationIndex ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                ))}
                            </div>
                            {product.variations.length > 1 && (
                                <>
                                    <button onClick={handlePrevVariation} className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${carouselBtnClasses}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={handleNextVariation} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${carouselBtnClasses}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                        {currentVariation && (
                            <div className={`border rounded-xl p-4 mt-3 transition-all duration-300 ${priceBoxClasses}`}>
                                <h3 className={`font-bold text-lg mb-2 text-center ${isDark ? 'text-cyan-300': 'text-blue-700'}`}>{currentVariation.size}</h3>
                                <div className="flex justify-around">
                                    <div className="text-center">
                                        <p className={`text-sm ${subtitleClasses}`}>Capa</p>
                                        <p className={`text-xl font-bold ${titleClasses}`}>R${currentVariation.priceCover.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-sm ${subtitleClasses}`}>Cheia</p>
                                        <p className={`text-xl font-bold ${titleClasses}`}>R${currentVariation.priceFull.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;