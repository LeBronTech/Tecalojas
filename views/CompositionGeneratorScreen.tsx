import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, View, SavedComposition, CushionSize } from '../types';
import { ThemeContext } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';
import { STORE_IMAGE_URLS, PREDEFINED_COLORS } from '../constants';
import ColorSelector from '../components/ColorSelector';

interface CompositionGeneratorScreenProps {
    products: Product[];
    onNavigate: (view: View) => void;
    apiKey: string | null;
    onRequestApiKey: () => void;
    savedCompositions: SavedComposition[];
    onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
    setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ShuffleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);
const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>);
const SaveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586L7.707 10.293zM3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>);
const StarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>);


const generateCompositionName = (products: Product[]): string => {
    if (!products || products.length === 0) return 'Nova Composição';

    const getBaseName = (product: Product): string => {
        let baseName = product.name.split('(')[0].trim();
        const lowerBaseName = baseName.toLowerCase();
        const isColor = PREDEFINED_COLORS.some(c => c.name.toLowerCase() === lowerBaseName);
        return isColor ? `${baseName} ${product.fabricType}` : baseName;
    };

    const nameCounts = products.reduce((acc, product) => {
        const descriptiveName = getBaseName(product);
        acc[descriptiveName] = (acc[descriptiveName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const parts = Object.entries(nameCounts).map(([name, count]) => {
        if (count > 1) {
            if (name.endsWith('s') || name.endsWith('z')) return `${count} ${name}`;
            else if (name.endsWith('l')) return `${count} ${name.slice(0, -1)}is`;
            else return `${count} ${name}s`;
        }
        return `${count} ${name}`;
    });

    if (parts.length > 1) {
        const lastPart = parts.pop();
        return parts.join(', ') + ' e ' + lastPart;
    }
    return parts[0] || 'Composição';
};


const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        return { mimeType: mimeTypePart ? mimeTypePart[1] : 'image/jpeg', data: parts[1] };
    } else {
        const response = await fetch(imageUrl);
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

const loadLogos = (): Promise<[HTMLImageElement, HTMLImageElement]> => {
    const tecaPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = STORE_IMAGE_URLS.teca;
        img.onload = () => resolve(img); img.onerror = reject;
    });
    const ionePromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = STORE_IMAGE_URLS.ione;
        img.onload = () => resolve(img); img.onerror = reject;
    });
    return Promise.all([tecaPromise, ionePromise]);
};

const getPillowMobileStyle = (index: number, total: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { position: 'absolute', transition: 'transform 0.3s ease-out, z-index 0.3s ease-out' };
    switch (total) {
        case 6: 
            if (index < 2) return { ...baseStyle, zIndex: 1, transform: 'scale(0.8)', top: '12%', left: index === 0 ? '15%' : '55%' };
            if (index < 4) return { ...baseStyle, zIndex: 2, transform: 'scale(0.9)', top: '32%', left: index === 2 ? '5%' : '65%' };
            return { ...baseStyle, zIndex: 3, transform: 'scale(1)', top: '52%', left: index === 4 ? '20%' : '50%' };
        case 5:
            if (index < 2) return { ...baseStyle, zIndex: 1, transform: 'scale(0.8)', top: '12%', left: index === 0 ? '15%' : '55%' };
            if (index < 4) return { ...baseStyle, zIndex: 2, transform: 'scale(0.9)', top: '32%', left: index === 2 ? '5%' : '65%' };
            return { ...baseStyle, zIndex: 3, transform: 'scale(1)', top: '52%', left: '35%' };
        case 4:
            if (index < 2) return { ...baseStyle, zIndex: 1, transform: 'scale(0.9)', top: '20%', left: index === 0 ? '15%' : '55%' };
            return { ...baseStyle, zIndex: 2, transform: 'scale(1)', top: '45%', left: index === 2 ? '5%' : '65%' };
        case 3:
            if (index < 1) return { ...baseStyle, zIndex: 1, transform: 'scale(0.9)', top: '20%', left: '35%' };
            return { ...baseStyle, zIndex: 2, transform: 'scale(1)', top: '45%', left: index === 1 ? '10%' : '60%' };
        case 2:
            return { ...baseStyle, zIndex: 1, transform: 'scale(1)', top: '40%', left: index === 0 ? '10%' : '60%' };
        case 1:
            return { ...baseStyle, zIndex: 1, transform: 'scale(1)', top: '40%', left: '35%' };
        default: return {};
    }
};


const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, apiKey, onRequestApiKey, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [compositionSize, setCompositionSize] = useState<number | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [currentComposition, setCurrentComposition] = useState<Product[] | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [selectedSizes, setSelectedSizes] = useState<CushionSize[]>([]);
    const [assignedPillowSizes, setAssignedPillowSizes] = useState<Record<number, CushionSize>>({});
    const [sofaColor, setSofaColor] = useState('Bege');
    const sofaColors = ['Bege', 'Cinza', 'Branco', 'Marrom Escuro', 'Azul Marinho'];
    
    const [useColorFilter, setUseColorFilter] = useState(false);
    const [selectedFilterColors, setSelectedFilterColors] = useState<{name: string, hex: string}[]>([]);
    const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);


    useEffect(() => {
        setSelectedProducts([]);
        setCurrentComposition(null);
        setGeneratedImageUrl(null);
        setError(null);
        setUseColorFilter(false);
        setSelectedFilterColors([]);
    }, [compositionSize]);
    
    const selectRandomProducts = useCallback((targetSize: number, colors: {name: string, hex: string}[], fuzzyMatch = false): Product[] => {
        if (colors.length === 0 || targetSize === 0) return [];
        const colorNames = colors.map(c => c.name.toLowerCase());
        let allMatchingProducts = products.filter(p => 
            p.colors.some(productColor => 
                colorNames.some(baseColorName => 
                    fuzzyMatch ? productColor.name.toLowerCase().includes(baseColorName) : productColor.name.toLowerCase() === baseColorName
                )
            )
        );
        // FIX: Explicitly typed Map constructor to help TS infer the values as Product[] and avoid 'unknown[]' assignability issues.
        const uniqueMatchingProducts = Array.from(new Map<string, Product>(allMatchingProducts.map(p => [p.id, p])).values());
        return uniqueMatchingProducts.sort(() => 0.5 - Math.random()).slice(0, targetSize);
    }, [products]);


    useEffect(() => {
        if (!useColorFilter || !compositionSize) {
            if(!useColorFilter) setSelectedProducts([]);
            return;
        }
        if (selectedFilterColors.length > 0) {
            setSelectedProducts(selectRandomProducts(compositionSize, selectedFilterColors));
        } else {
            setSelectedProducts([]);
        }
    }, [useColorFilter, selectedFilterColors, compositionSize, selectRandomProducts]);

    const handlePillowClick = (clickedProduct: Product, index: number) => {
        if (useColorFilter && selectedFilterColors.length === 1 && compositionSize) {
            const colorName = selectedFilterColors[0].name.toLowerCase();
            const potentialReplacements = products.filter(p => 
                !selectedProducts.some(sp => sp.id === p.id) &&
                p.colors.some(productColor => productColor.name.toLowerCase().includes(colorName))
            );
            if (potentialReplacements.length > 0) {
                const newProduct = potentialReplacements[Math.floor(Math.random() * potentialReplacements.length)];
                setSelectedProducts(prev => {
                    const newSelection = [...prev];
                    newSelection[index] = newProduct;
                    return newSelection;
                });
            }
        } else {
            setIsSelectModalOpen(true);
        }
    };

    const handleConfirmSelection = (selectedIds: string[]) => {
        setSelectedProducts(products.filter(p => selectedIds.includes(p.id)));
        setIsSelectModalOpen(false);
    };

    const handleVisualize = () => {
        setError(null);
        if (!compositionSize || selectedProducts.length === 0) {
            setCurrentComposition([]);
            return;
        }
        const finalComposition = Array.from({ length: compositionSize }, (_, i) => selectedProducts[i % selectedProducts.length]);
        setCurrentComposition(finalComposition);
        const initialSizes: Record<number, CushionSize> = {};
        const defaultSize = selectedSizes[0] || CushionSize.SQUARE_45;
        finalComposition.forEach((_, index) => { initialSizes[index] = defaultSize; });
        setAssignedPillowSizes(initialSizes);
    };
    
    const handleSave = () => {
        if (!currentComposition) return;
        setIsSaveModalOpen(true);
    };

    const confirmSave = (name: string) => {
        if (!currentComposition) return;
        onSaveComposition({ name, products: currentComposition, size: currentComposition.length, imageUrl: generatedImageUrl || undefined, isGenerating: false });
        setIsSaveModalOpen(false);
    };

    const handleGenerateEnvironment = async () => {
        if (!currentComposition || !apiKey) { onRequestApiKey(); return; }
        setIsGenerating(true); setError(null);
        try {
            const imageParts = await Promise.all(currentComposition.map(p => getBase64FromImageUrl(p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png').then(img => ({inlineData: img}))));
            const ai = new GoogleGenAI({ apiKey });
            let promptText = `Arrume estas almofadas de forma natural e esteticamente agradável em um sofá moderno de cor ${sofaColor}, em uma sala de estar elegante e bem iluminada. Imagem final com exatamente ${currentComposition.length} almofadas. Realista e atraente para catálogo.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [...imageParts, { text: promptText }] }, config: { responseModalities: [Modality.IMAGE] } });
            const candidate = response.candidates?.[0];
            const generatedImagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (generatedImagePart?.inlineData) {
                setGeneratedImageUrl(`data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`);
            } else throw new Error("A IA não retornou uma imagem.");
        } catch (e: any) {
            setError("Falha na IA. Tente novamente.");
        } finally { setIsGenerating(false); }
    };
    
    const drawAndShare = async () => {
        if (!currentComposition || isSharing || !canvasRef.current) return;
        setIsSharing(true); setError(null);
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Canvas context error.");
            const PADDING = 60; const IMG_SIZE = 250; const IMG_SPACING = 20; const TEXT_HEIGHT = 80; const WATERMARK_HEIGHT = 80;
            const productImages = await Promise.all(currentComposition.map(p => new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = p.baseImageUrl;
                img.onload = () => resolve(img); img.onerror = () => reject(new Error('Img load error'));
            })));
            const totalImageWidth = currentComposition.length * IMG_SIZE + (currentComposition.length - 1) * IMG_SPACING;
            const drawWatermark = async () => {
                const [tecaLogo, ioneLogo] = await loadLogos();
                const watermarkY = canvas.height - WATERMARK_HEIGHT;
                ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
                ctx.fillRect(0, watermarkY, canvas.width, WATERMARK_HEIGHT);
                ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = isDark ? '#FFFFFF' : '#111827'; ctx.textBaseline = 'middle';
                const logoSize = 30; const logoPadding = 8; const separator = " | ";
                const text1 = "@ionelourencodecor"; const text2 = "@tecadecoracoestorredetv"; const text3 = "tecalojas.vercel.app";
                const metrics1 = ctx.measureText(text1); const metrics2 = ctx.measureText(text2); const metrics3 = ctx.measureText(text3); const sepMetrics = ctx.measureText(separator);
                const totalW = logoSize*2 + logoPadding*2 + metrics1.width + metrics2.width + metrics3.width + sepMetrics.width*2;
                let cX = (canvas.width - totalW) / 2; const tY = watermarkY + WATERMARK_HEIGHT / 2;
                ctx.drawImage(ioneLogo, cX, tY - 15, 30, 30); cX += 38; ctx.fillText(text1, cX, tY); cX += metrics1.width;
                ctx.fillText(separator, cX, tY); cX += sepMetrics.width;
                ctx.drawImage(tecaLogo, cX, tY - 15, 30, 30); cX += 38; ctx.fillText(text2, cX, tY); cX += metrics2.width;
                ctx.fillText(separator, cX, tY); cX += sepMetrics.width; ctx.fillText(text3, cX, tY);
            };
            const drawTop = () => {
                 let cX = PADDING; ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = isDark ? '#E9D5FF' : '#4A044E'; ctx.textAlign = 'center';
                 productImages.forEach((img, i) => {
                    const ratio = img.width / img.height; let sx, sy, sW, sH;
                    if (ratio > 1) { sH = img.height; sW = sH; sx = (img.width - sW) / 2; sy = 0; }
                    else { sW = img.width; sH = sW; sy = (img.height - sH) / 2; sx = 0; }
                    ctx.drawImage(img, sx, sy, sW, sH, cX, PADDING, IMG_SIZE, IMG_SIZE);
                    ctx.fillText(currentComposition[i].name, cX + IMG_SIZE/2, PADDING + IMG_SIZE + 30, IMG_SIZE-10); cX += IMG_SIZE + IMG_SPACING;
                 });
            };
            if (generatedImageUrl) {
                const aiImg = await new Promise<HTMLImageElement>(r => { const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = generatedImageUrl!; img.onload = () => r(img); });
                const aiH = (totalImageWidth * aiImg.height) / aiImg.width;
                canvas.width = totalImageWidth + 2 * PADDING; canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + aiH + PADDING + WATERMARK_HEIGHT;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTop(); ctx.drawImage(aiImg, PADDING, PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING, totalImageWidth, aiH);
            } else {
                canvas.width = totalImageWidth + 2 * PADDING; canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + WATERMARK_HEIGHT;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTop();
            }
            await drawWatermark();
            canvas.toBlob(async (b) => {
                if (b && navigator.share) await navigator.share({ title: 'Minha Composição', files: [new File([b], 'comp.png', { type: 'image/png' })] });
            }, 'image/png', 0.95);
        } catch (err: any) { setError("Falha ao compartilhar."); } finally { setIsSharing(false); }
    };
    
    const handleShuffle = useCallback(() => setCurrentComposition(prev => prev ? [...prev].sort(() => Math.random() - 0.5) : null), []);
    const handleGenerateNewCombination = useCallback(() => {
        if (!compositionSize || !currentComposition) return;
        const baseColorNames = [...new Set(currentComposition.flatMap(p => p.colors).map(c => c.name.split(' ')[0]))];
        const newSelection = selectRandomProducts(compositionSize, baseColorNames.map(name => ({ name, hex: '' })), true);
        if (newSelection.length > 0) { setCurrentComposition(newSelection); setGeneratedImageUrl(null); }
    }, [compositionSize, currentComposition, selectRandomProducts]);

    // FIX: Implemented handleDragStart for composition reordering.
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    // FIX: Implemented handleDrop for composition reordering and updated assignedPillowSizes to maintain position mapping.
    const handleDrop = (index: number) => {
        if (draggedIndex === null || !currentComposition) return;
        
        const newComposition = [...currentComposition];
        const [reorderedItem] = newComposition.splice(draggedIndex, 1);
        newComposition.splice(index, 0, reorderedItem);
        
        setCurrentComposition(newComposition);
        
        // Update assigned sizes to follow the items
        const newSizes: Record<number, CushionSize> = {};
        newComposition.forEach((_, idx) => {
            newSizes[idx] = assignedPillowSizes[idx] || CushionSize.SQUARE_45;
        });
        setAssignedPillowSizes(newSizes);
        setDraggedIndex(null);
    };

    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
    const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";

    return (
        <>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 no-scrollbar z-10 flex flex-col">
                    <div className="flex items-center mb-8">
                        <button onClick={() => onNavigate(View.SHOWCASE)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${titleClasses}`}>Gerador de Composição</h1>
                    </div>
                    
                    {!currentComposition ? (
                        <div className={`p-6 rounded-2xl border ${cardClasses}`}>
                            <div className="mb-6">
                                <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>1. Tamanho da Composição</h3>
                                <div className="grid grid-cols-5 gap-2">{[2, 3, 4, 5, 6].map(size => (<button key={size} onClick={() => setCompositionSize(size)} className={`py-3 font-bold rounded-lg transition-colors text-center ${compositionSize === size ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')}`}>{size}</button>))}</div>
                            </div>
                            
                            {compositionSize !== null && (
                                <div className="border-t pt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                     <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>2. Detalhes para IA <span className="text-sm font-normal text-purple-400 ml-2">(Opcional)</span></h3>
                                     <div className="mb-4">
                                        <p className={`text-sm mb-3 ${subtitleClasses}`}>Cor do sofá no ambiente:</p>
                                         <div className="flex flex-wrap items-center gap-2">
                                            {sofaColors.map(color => (<button key={color} onClick={() => setSofaColor(color)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${sofaColor === color ? 'bg-cyan-600 text-white' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')}`}>{color}</button>))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {compositionSize !== null && (
                                <div className="border-t pt-6 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>3. Escolher por Cor <span className="text-sm font-normal text-purple-400 ml-2">(Opcional)</span></h3>
                                    <div className="flex items-center mb-3">
                                        <input type="checkbox" id="useColorFilter" checked={useColorFilter} onChange={(e) => { setUseColorFilter(e.target.checked); if (!e.target.checked) setSelectedFilterColors([]); }} className={`h-4 w-4 rounded text-fuchsia-500 focus:ring-fuchsia-500 border-gray-300`} />
                                        <label htmlFor="useColorFilter" className={`ml-2 text-sm ${subtitleClasses}`}>Ativar seleção de almofadas por cor</label>
                                    </div>
                                    {useColorFilter && (
                                        <ColorSelector 
                                            allColors={PREDEFINED_COLORS}
                                            multiSelect
                                            selectedColors={selectedFilterColors}
                                            onToggleColor={(color) => setSelectedFilterColors(prev => prev.some(c => c.name === color.name) ? prev.filter(c => c.name !== color.name) : (prev.length < compositionSize ? [...prev, color] : prev))}
                                            onAddCustomColor={() => {}}
                                        />
                                    )}
                                </div>
                            )}

                            {compositionSize !== null && (
                                <div className="border-t pt-6 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>4. Escolha suas Almofadas</h3>
                                    <div className="flex items-center gap-3 p-2 rounded-lg min-h-[88px]" style={{backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}}>
                                        {selectedProducts.map((p, index) => (<button key={`${p.id}-${index}`} onClick={() => handlePillowClick(p, index)}><img src={p.baseImageUrl} alt={p.name} className="w-16 h-16 rounded-lg object-cover" /></button>))}
                                        {selectedProducts.length < compositionSize && (<button onClick={() => setIsSelectModalOpen(true)} className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? 'border-gray-600' : 'border-gray-300'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>)}
                                    </div>
                                </div>
                            )}

                            {selectedProducts.length > 0 && (
                                <div className="border-t pt-6 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <button onClick={handleVisualize} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg">Visualizar Composição</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center gap-4">
                             <div className={`w-full md:aspect-[4/3] aspect-[3/4] rounded-xl border p-4 flex flex-col ${cardClasses}`}>
                                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                                    <button onClick={handleShuffle} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}><ShuffleIcon /> Ordem</button>
                                    <button onClick={handleGenerateNewCombination} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}><StarIcon /> Gerar Nova</button>
                                    <button onClick={drawAndShare} disabled={isSharing} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>{isSharing ? <ButtonSpinner/> : <ShareIcon />} Compartilhar</button>
                                    <button onClick={handleSave} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}><SaveIcon /> Salvar</button>
                                </div>
                                <div className="flex-grow flex items-center justify-center overflow-hidden relative">
                                    <div className="flex justify-center items-center -space-x-8 md:-space-x-12 p-4">
                                        {currentComposition.map((p, index) => (
                                            <div 
                                                key={`${p.id}-${index}`} 
                                                draggable="true"
                                                onDragStart={() => handleDragStart(index)}
                                                onDrop={() => handleDrop(index)}
                                                onDragOver={(e) => e.preventDefault()}
                                                className={`flex flex-col items-center transition-all duration-300 cursor-grab ${draggedIndex === index ? 'opacity-50' : ''}`}
                                            >
                                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg shadow-lg" onClick={() => setViewingProduct(p)}>
                                                    <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                                </div>
                                                <div className="mt-2 text-[10px] font-bold text-center w-24 truncate">{p.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center p-4 ${cardClasses}`}>
                                <div className="flex-grow w-full flex items-center justify-center">
                                    {isGenerating ? <ButtonSpinner /> : generatedImageUrl ? <img src={generatedImageUrl} alt="Composição IA" className="max-w-full max-h-full object-contain rounded-lg" /> : <p className={subtitleClasses}>Gere uma imagem com IA.</p>}
                                </div>
                                 <button onClick={handleGenerateEnvironment} disabled={isGenerating} className="mt-4 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-400">{isGenerating ? <ButtonSpinner /> : 'Gerar Ambiente (IA)'}</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {isSelectModalOpen && compositionSize && (<ProductSelectModal products={products} onClose={() => setIsSelectModalOpen(false)} onConfirm={handleConfirmSelection} initialSelectedIds={selectedProducts.map(p => p.id)} maxSelection={compositionSize} />)}
            {isSaveModalOpen && currentComposition && (<SaveCompositionModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onConfirm={confirmSave} predefinedName={generateCompositionName(currentComposition)} />)}
            {viewingProduct && (<ProductDetailModal product={viewingProduct} products={products} onClose={() => setViewingProduct(null)} canManageStock={false} onEditProduct={() => {}} onSwitchProduct={setViewingProduct} apiKey={apiKey} onRequestApiKey={onRequestApiKey} savedCompositions={[]} onViewComposition={() => {}} onAddToCart={() => {}} onNavigate={onNavigate} sofaColors={[]} cart={[]} />)}
        </>
    );
};

export default CompositionGeneratorScreen;