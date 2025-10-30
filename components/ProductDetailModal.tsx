import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { Product, Variation, WaterResistanceLevel, SavedComposition } from '../types';
import { ThemeContext } from '../App';
import { WATER_RESISTANCE_INFO, BRAND_LOGOS } from '../constants';
import { GoogleGenAI, Modality } from '@google/genai';

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
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface FurnitureColorPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
    colors: { name: string, hex: string }[];
    anchorEl: HTMLElement | null;
}

const FurnitureColorPopover: React.FC<FurnitureColorPopoverProps> = ({ isOpen, onClose, onSelectColor, colors, anchorEl }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    if (!isOpen || !anchorEl) return null;

    const rect = anchorEl.getBoundingClientRect();

    return (
        <div className="fixed inset-0 z-[60]" onClick={onClose}>
            <div 
                className={`absolute w-48 p-2 rounded-xl shadow-lg border transition-all duration-200 ${isDark ? 'bg-[#2D1F49] border-white/10' : 'bg-white border-gray-200'}`}
                style={{ top: rect.bottom + 8, left: '50%', transform: 'translateX(-50%)' }}
                onClick={e => e.stopPropagation()}
            >
                <p className={`text-xs font-bold px-2 pb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Mudar cor do móvel</p>
                <div className="grid grid-cols-3 gap-2">
                    {colors.map(color => (
                        <button 
                            key={color.name}
                            title={color.name}
                            onClick={() => onSelectColor(color.name)}
                            style={{ backgroundColor: color.hex }}
                            className="w-full aspect-square rounded-md border-2 border-transparent hover:border-fuchsia-500"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const MultiColorCircle: React.FC<{ colors: { hex: string }[], size?: number }> = ({ colors, size = 5 }) => {
    const gradient = useMemo(() => {
        if (!colors || colors.length === 0) return 'transparent';
        if (colors.length === 1) return colors[0].hex;
        const step = 100 / colors.length;
        const stops = colors.map((color, i) => `${color.hex} ${i * step}% ${(i + 1) * step}%`).join(', ');
        return `conic-gradient(${stops})`;
    }, [colors]);

    return (
        <div
            className={`w-${size} h-${size} rounded-full border border-black/20`}
            style={{ background: gradient }}
        />
    );
};


const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, products, onClose, canManageStock, onEditProduct, onSwitchProduct, apiKey, onRequestApiKey, savedCompositions, onViewComposition }) => {
    const { theme } = useContext(ThemeContext);
    const [variationIndex, setVariationIndex] = useState(0);
    const [displayImageUrl, setDisplayImageUrl] = useState(product.baseImageUrl);
    const [rotation, setRotation] = useState(0);
    const [tempBackgrounds, setTempBackgrounds] = useState<Partial<Record<'sala' | 'quarto', string>>>({});
    const [popover, setPopover] = useState<{ open: boolean, type: 'sala' | 'quarto', anchorEl: HTMLElement | null }>({ open: false, type: 'sala', anchorEl: null });
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [genError, setGenError] = useState<string | null>(null);
    const colorButtonRef = useRef<HTMLButtonElement>(null);


    useEffect(() => {
        setDisplayImageUrl(product.baseImageUrl);
        setRotation(0);
        setVariationIndex(0);
        setTempBackgrounds({});
        setPopover({ open: false, type: 'sala', anchorEl: null });
    }, [product]);

    const isDark = theme === 'dark';
    const currentVariation: Variation | undefined = product.variations[variationIndex];
    const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];

    const relatedProducts = useMemo(() => {
        if (!product.variationGroupId) return [];
        return products.filter(p => p.variationGroupId === product.variationGroupId && p.id !== product.id);
    }, [products, product]);

    const compositionsWithThisProduct = useMemo(() => {
        return savedCompositions.filter(comp => comp.products.some(p => p.variationGroupId ? p.variationGroupId === product.variationGroupId : p.id === product.id));
    }, [savedCompositions, product]);
    
    const galleryImages = useMemo(() => [
        { url: product.baseImageUrl, label: 'Principal', type: 'principal' },
        ...(product.backgroundImages?.sala || tempBackgrounds.sala ? [{ url: tempBackgrounds.sala || product.backgroundImages!.sala, label: 'Sala', type: 'sala' }] : []),
        ...(product.backgroundImages?.quarto || tempBackgrounds.quarto ? [{ url: tempBackgrounds.quarto || product.backgroundImages!.quarto, label: 'Quarto', type: 'quarto' }] : []),
        ...(product.backgroundImages?.varanda ? [{ url: product.backgroundImages.varanda, label: 'Varanda', type: 'varanda' }] : []),
        ...(product.backgroundImages?.piscina ? [{ url: product.backgroundImages.piscina, label: 'Piscina', type: 'piscina' }] : []),
    ].filter(image => image.url), [product, tempBackgrounds]);

    const currentImageInfo = useMemo(() => galleryImages.find(img => img.url === displayImageUrl), [galleryImages, displayImageUrl]);

    const handlePrevVariation = () => {
        setVariationIndex(prev => (prev === 0 ? product.variations.length - 1 : prev - 1));
    };

    const handleNextVariation = () => {
        setVariationIndex(prev => (prev === product.variations.length - 1 ? 0 : prev + 1));
    };
    
    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>, type: 'sala' | 'quarto') => {
        event.stopPropagation();
        setPopover({ open: true, type, anchorEl: event.currentTarget });
    };
    
    const getAiPrompt = (type: 'sala' | 'quarto', color: string): string => {
        if (type === 'sala') {
            return `Foto de produto estilo catálogo. A almofada está em um sofá ${color} em uma sala de estar moderna e bem iluminada.`;
        }
        return `Foto de produto estilo catálogo. A almofada está sobre uma cama bem arrumada da cor ${color} em um quarto moderno e aconchegante.`;
    };
    
    const getBase64FromImageUrl = async (imageUrl: string): Promise<{ base64Data: string; mimeType: string }> => {
        if (imageUrl.startsWith('data:')) {
            const parts = imageUrl.split(',');
            const mimeTypePart = parts[0].match(/:(.*?);/);
            if (!mimeTypePart || !parts[1]) {
                throw new Error('URL de dados da imagem base inválida.');
            }
            return { mimeType: mimeTypePart[1], base64Data: parts[1] };
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
            return { mimeType: blob.type, base64Data };
        }
    };

    const handleGenerateNewBackground = async (color: string) => {
        const type = popover.type;
        setPopover(p => ({ ...p, open: false }));
        if (!apiKey) { onRequestApiKey(); return; }
        if (!product.baseImageUrl) { setGenError("Produto sem imagem base."); return; }

        setIsGenerating(type);
        setGenError(null);

        try {
            const { base64Data, mimeType } = await getBase64FromImageUrl(product.baseImageUrl);
            
            const ai = new GoogleGenAI({ apiKey });
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            const textPart = { text: getAiPrompt(type, color) };
            
            const aiResponse = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash-image', 
                contents: { parts: [imagePart, textPart] }, 
                config: { responseModalities: [Modality.IMAGE] } 
            });

            const candidate = aiResponse.candidates?.[0];
            if (candidate?.finishReason === 'NO_IMAGE') { throw new Error('A IA não conseguiu gerar uma imagem. Tente usar uma imagem base ou cor diferente.'); }
            if (candidate?.finishReason === 'SAFETY') { throw new Error('Geração bloqueada por políticas de segurança. Tente uma imagem ou cor diferente.'); }
            if (!candidate) {
                const blockReason = aiResponse.promptFeedback?.blockReason;
                if (blockReason) { throw new Error(`Geração bloqueada: ${blockReason}.`); }
                throw new Error('A IA não retornou uma resposta. Tente novamente.');
            }
            if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
                throw new Error(`Geração falhou. Motivo: ${candidate.finishReason}.`);
            }
            const generatedImagePart = candidate.content?.parts?.find(p => p.inlineData);
            if (!generatedImagePart?.inlineData) {
                const textResponse = aiResponse.text?.trim();
                if (textResponse) { throw new Error(`A IA retornou texto em vez de imagem: "${textResponse}"`); }
                throw new Error(`A IA não retornou uma imagem válida.`);
            }

            const newImageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
            setTempBackgrounds(prev => ({ ...prev, [type]: newImageUrl }));
            setDisplayImageUrl(newImageUrl);
        } catch (error: any) {
            console.error("AI image generation failed:", error);
            setGenError(error.message || "Falha ao gerar imagem com IA.");
        } finally {
            setIsGenerating(null);
        }
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const carouselBtnClasses = isDark ? "bg-black/30 hover:bg-black/60 text-white" : "bg-white/50 hover:bg-white/90 text-gray-800";
    const priceBoxClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-100 border-gray-200";

    const ImagePlaceholder: React.FC = () => (
        <div className={`w-full h-full flex items-center justify-center relative ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
            <img 
                src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" 
                alt="Sem Imagem" 
                className="w-1/2 h-1/2 object-contain opacity-20" 
            />
        </div>
    );
    
    const furnitureColors = {
        sala: [
            { name: 'Bege', hex: '#F5F5DC' }, { name: 'Marrom', hex: '#8B4513' },
            { name: 'Vermelho', hex: '#B22222' }, { name: 'Branco', hex: '#FFFFFF' },
            { name: 'Cinza Escuro', hex: '#696969' }, { name: 'Cinza Claro', hex: '#D3D3D3' }
        ],
        quarto: [
            { name: 'Bege', hex: '#F5F5DC' }, { name: 'Marrom', hex: '#8B4513' },
            { name: 'Branco', hex: '#FFFFFF' }, { name: 'Cinza Escuro', hex: '#696969' },
            { name: 'Cinza Claro', hex: '#D3D3D3' }
        ]
    };

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 transition-opacity duration-300" onClick={onClose}>
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
                 {canManageStock && (
                    <button onClick={() => onEditProduct(product)} className={`absolute top-4 left-4 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 z-20 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                        Editar
                    </button>
                )}


                <div className="flex-grow overflow-y-auto no-scrollbar">
                    {/* Main Image and Gallery */}
                    <div className="mb-4">
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3">
                            {displayImageUrl ? (
                                <img 
                                    src={displayImageUrl} 
                                    alt="Visualização do produto" 
                                    className="w-full h-full object-cover transition-transform duration-300"
                                    style={{ transform: `rotate(${rotation}deg)` }}
                                />
                            ) : (
                                <ImagePlaceholder />
                            )}
                            {currentImageInfo?.type === 'principal' && (
                                <button
                                    onClick={handleRotate}
                                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full z-10 bg-black/20 backdrop-blur-sm hover:bg-black/40 flex items-center justify-center transition-colors"
                                    aria-label="Girar imagem"
                                >
                                    <img src="https://i.postimg.cc/C1qXzX3z/20251019-214841-0000.png" alt="Girar Imagem" className="w-8 h-8" />
                                </button>
                            )}
                             {(currentImageInfo?.type === 'sala' || currentImageInfo?.type === 'quarto') && (
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-full px-4">
                                    <button 
                                        ref={colorButtonRef}
                                        onClick={(e) => handleOpenPopover(e, currentImageInfo.type as 'sala'|'quarto')} 
                                        className={`w-full font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 backdrop-blur-sm shadow-lg ${isDark ? 'bg-black/40 text-fuchsia-300 hover:bg-black/60' : 'bg-white/60 text-fuchsia-700 hover:bg-white/80'}`}
                                    >
                                        {isGenerating === currentImageInfo.type ? <ButtonSpinner /> : (
                                            <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                            {currentImageInfo.type === 'sala' ? 'Escolher cor do sofá' : 'Escolher cor da cama'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-2 overflow-x-auto pb-2 -ml-2 pl-2">
                           {galleryImages.map((image) => (
                                <div key={image.url} className="relative">
                                <button
                                    onClick={() => {
                                        setDisplayImageUrl(image.url!);
                                        setRotation(0);
                                    }}
                                    className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${displayImageUrl === image.url ? 'border-fuchsia-500' : (isDark ? 'border-white/10' : 'border-gray-200')}`}
                                >
                                    {isGenerating === image.type ? (
                                        <div className="w-full h-full flex items-center justify-center"><ButtonSpinner/></div>
                                    ) : (
                                        <img src={image.url!} alt={image.label} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                                        {image.label}
                                    </div>
                                </button>
                                </div>
                            ))}
                        </div>
                         {genError && <p className="text-xs text-red-500 mt-2">{genError}</p>}
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

                     {relatedProducts.length > 0 && (
                        <div className="mt-6">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>Outras Cores</h3>
                            <div className="flex items-center space-x-2 overflow-x-auto pb-2 -ml-2 pl-2">
                                {relatedProducts.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => onSwitchProduct(p)}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all border-transparent hover:border-fuchsia-500`}
                                        title={p.name}
                                    >
                                        {p.baseImageUrl ? (
                                            <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full"><ImagePlaceholder /></div>
                                        )}
                                        <div 
                                            className="absolute bottom-1 right-1"
                                        >
                                           <MultiColorCircle colors={p.colors} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {compositionsWithThisProduct.length > 0 && (
                        <div className="mt-6">
                            <h3 className={`font-bold mb-2 ${titleClasses}`}>Composições com esta almofada</h3>
                             <div className="flex items-center space-x-3 overflow-x-auto pb-2 -ml-2 pl-2">
                                {compositionsWithThisProduct.map((comp, index) => (
                                    <button 
                                        key={comp.id}
                                        onClick={() => onViewComposition(compositionsWithThisProduct, index)}
                                        className={`relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all border-transparent hover:border-fuchsia-500 text-left`}
                                        title={comp.name}
                                    >
                                        {comp.imageUrl ? (
                                            <img src={comp.imageUrl} alt={comp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                                                {comp.products.slice(0, 4).map(p => (
                                                     <img key={p.id} src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                                                ))}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                        <p className="absolute bottom-1 left-2 right-2 text-white text-xs font-bold truncate">{comp.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Variations Carousel */}
                    <div className="mt-6">
                        <h3 className={`font-bold mb-2 ${titleClasses}`}>Variações Disponíveis</h3>
                        <div className="relative">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
                                {product.variations.map((variation, index) => (
                                    <div key={variation.size} className={`absolute inset-0 transition-opacity duration-300 ${index === variationIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        {variation.imageUrl || product.baseImageUrl ? (
                                             <img
                                                src={variation.imageUrl || product.baseImageUrl}
                                                alt={`Variação ${variation.size}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlaceholder />
                                        )}
                                    </div>
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
        <FurnitureColorPopover 
            isOpen={popover.open}
            onClose={() => setPopover(p => ({...p, open: false}))}
            onSelectColor={handleGenerateNewBackground}
            colors={furnitureColors[popover.type]}
            anchorEl={colorButtonRef.current}
        />
        </>
    );
};

export default ProductDetailModal;