import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { Product, View, SavedComposition, CushionSize } from '../types';
// FIX: ThemeContext is exported from 'types.ts', not 'App.tsx'.
import { ThemeContext } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';
import { STORE_IMAGE_URLS } from '../constants';

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

const getDominantColor = (products: Product[]): string => {
    if (!products || products.length === 0) return 'Composição';

    const colorCounts: { [key: string]: number } = {};
    const allColors = products.flatMap(p => p.colors.map(c => c.name));
    
    if (allColors.length === 0) return 'Composição Mista';

    for (const color of allColors) {
        const normalizedColor = color.toLowerCase(); 
        colorCounts[normalizedColor] = (colorCounts[normalizedColor] || 0) + 1;
    }

    let dominantColor = '';
    let maxCount = 0;

    for (const color in colorCounts) {
        if (colorCounts[color] > maxCount) {
            maxCount = colorCounts[color];
            dominantColor = color;
        }
    }
    
    return `Composição ${dominantColor.charAt(0).toUpperCase() + dominantColor.slice(1)}`;
};


const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        if (!mimeTypePart || !parts[1]) {
            throw new Error('URL de dados da imagem base inválida.');
        }
        return { mimeType: mimeTypePart[1], data: parts[1] };
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
        return { mimeType: blob.type, data: base64Data };
    }
};

const loadLogos = (): Promise<[HTMLImageElement, HTMLImageElement]> => {
    const tecaPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = STORE_IMAGE_URLS.teca;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
    const ionePromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = STORE_IMAGE_URLS.ione;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
    return Promise.all([tecaPromise, ionePromise]);
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
    
    // AI Generation Options
    const [selectedSizes, setSelectedSizes] = useState<CushionSize[]>([]);
    const [sofaColor, setSofaColor] = useState('Bege');
    const sofaColors = ['Bege', 'Cinza', 'Branco', 'Marrom Escuro', 'Azul Marinho'];


    useEffect(() => {
        setSelectedProducts([]);
        setCurrentComposition(null);
        setGeneratedImageUrl(null);
        setError(null);
    }, [compositionSize]);

    const handleConfirmSelection = (selectedIds: string[]) => {
        const newlySelected = products.filter(p => selectedIds.includes(p.id));
        setSelectedProducts(newlySelected);
        setIsSelectModalOpen(false);
    };

    const handleVisualize = () => {
        setError(null);
        setCurrentComposition(selectedProducts);
    }
    
    const handleSave = () => {
        if (!currentComposition) return;
        setIsSaveModalOpen(true);
    };

    const confirmSave = (name: string) => {
        if (!currentComposition) return;
        
        onSaveComposition({
            name,
            products: currentComposition,
            size: currentComposition.length,
            imageUrl: generatedImageUrl || undefined,
            isGenerating: false,
        });
        setIsSaveModalOpen(false);
    };

    const handleGenerateEnvironment = async () => {
        if (!currentComposition) return;
        if (!apiKey) {
            onRequestApiKey();
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const imageParts = await Promise.all(
                currentComposition.map(p => getBase64FromImageUrl(p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png').then(img => ({inlineData: img})))
            );
            const ai = new GoogleGenAI({ apiKey });
            
            let promptText = `Arrume estas ${currentComposition.length} almofadas de forma natural e esteticamente agradável em um sofá moderno de cor ${sofaColor}, em uma sala de estar elegante e bem iluminada. A composição deve parecer realista e atraente para um catálogo de produtos.`;
            if (selectedSizes.length > 0) {
                promptText += ` A composição deve incluir os seguintes formatos de almofada: ${selectedSizes.join(', ')}.`;
            }
            const textPart = { text: promptText };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, textPart] },
                config: { responseModalities: [Modality.IMAGE] }
            });

            const candidate = response.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY' || response.promptFeedback?.blockReason) {
                throw new Error('Geração bloqueada por políticas de segurança.');
            }
            const generatedImagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (generatedImagePart?.inlineData) {
                const newImageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
                setGeneratedImageUrl(newImageUrl);
            } else {
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (e: any) {
            console.error("Failed to generate composition image:", e);
            window.alert("Aconteceu um erro! Mas não se preocupe, tente novamente agora");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleShare = async () => {
        if (!currentComposition || isSharing || !canvasRef.current) return;
        setIsSharing(true);
        setError(null);
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Canvas context is unavailable.");
    
            const PADDING = 60; const IMG_SIZE = 250; const IMG_SPACING = 20; const TEXT_HEIGHT = 80; const WATERMARK_HEIGHT = 80;
            const hasAiImage = !!generatedImageUrl;

            const productImages = await Promise.all(
                currentComposition.map(p => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = p.baseImageUrl;
                    img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Failed to load image for ${p.name}`));
                }))
            );
    
            const totalImageWidth = currentComposition.length * IMG_SIZE + (currentComposition.length - 1) * IMG_SPACING;
            
            const drawWatermark = async () => {
                const [tecaLogo, ioneLogo] = await loadLogos();
                const watermarkY = canvas.height - WATERMARK_HEIGHT;
                
                ctx.fillStyle = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
                ctx.fillRect(0, watermarkY, canvas.width, WATERMARK_HEIGHT);
                
                ctx.font = '22px sans-serif';
                ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const text = "composição de Têca Lojas";
                const textMetrics = ctx.measureText(text);
                const textX = canvas.width / 2;
                const textY = watermarkY + WATERMARK_HEIGHT / 2;
                
                const logoSize = 40;
                const logoPadding = 15;
                
                const tecaLogoX = textX - textMetrics.width / 2 - logoSize - logoPadding;
                const ioneLogoX = textX + textMetrics.width / 2 + logoPadding;
                
                ctx.fillText(text, textX, textY);
                ctx.drawImage(tecaLogo, tecaLogoX, textY - logoSize / 2, logoSize, logoSize);
                ctx.drawImage(ioneLogo, ioneLogoX, textY - logoSize / 2, logoSize, logoSize);
            };

            const drawTopPart = () => {
                 let currentX = PADDING;
                 ctx.font = 'bold 24px sans-serif';
                 ctx.fillStyle = isDark ? '#E9D5FF' : '#4A044E';
                 ctx.textAlign = 'center';

                 productImages.forEach((img, index) => {
                    const aspectRatio = img.width / img.height;
                    let drawWidth = IMG_SIZE; let drawHeight = IMG_SIZE;
                    if (aspectRatio > 1) { drawHeight = IMG_SIZE / aspectRatio; } else { drawWidth = IMG_SIZE * aspectRatio; }
                    const xOffset = currentX + (IMG_SIZE - drawWidth) / 2;
                    const yOffset = PADDING + (IMG_SIZE - drawHeight) / 2;
                    ctx.drawImage(img, xOffset, yOffset, drawWidth, drawHeight);

                     const productName = currentComposition[index].name;
                     ctx.fillText(productName, currentX + IMG_SIZE / 2, PADDING + IMG_SIZE + 30, IMG_SIZE - 10);
                     currentX += IMG_SIZE + IMG_SPACING;
                 });
            }

            const shareCanvas = async () => {
                await drawWatermark();
                canvas.toBlob(async (blob) => {
                    if (blob && navigator.share) {
                        const file = new File([blob], 'composicao.png', { type: 'image/png' });
                        await navigator.share({ title: 'Minha Composição de Almofadas', files: [file] });
                    } else { throw new Error("Não foi possível criar a imagem para compartilhamento ou o navegador não suporta a função."); }
                }, 'image/png', 0.95);
            };

            if (hasAiImage) {
                const aiImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = generatedImageUrl!;
                    img.onload = () => resolve(img); img.onerror = () => reject(new Error("Failed to load AI image"));
                });
                
                const aiImageHeight = (totalImageWidth * aiImage.height) / aiImage.width;
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + aiImageHeight + PADDING + WATERMARK_HEIGHT;

                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
                const topSectionHeight = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING; // Y start for AI image
                ctx.drawImage(aiImage, PADDING, topSectionHeight, totalImageWidth, aiImageHeight);
                await shareCanvas();

            } else {
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + WATERMARK_HEIGHT;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
                await shareCanvas();
            }
    
        } catch (err: any) {
            console.error("Share failed:", err);
            setError("Falha ao compartilhar: " + err.message);
        } finally {
            setIsSharing(false);
        }
    };
    
    const handleShuffle = () => {
        if (currentComposition) {
            setCurrentComposition(prev => [...prev!].sort(() => Math.random() - 0.5));
        }
    };
    
    const resetAll = () => {
        setCompositionSize(null);
        setSelectedProducts([]);
        setCurrentComposition(null);
        setGeneratedImageUrl(null);
        setError(null);
    }

    const toggleSize = (size: CushionSize) => {
        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
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
                            {/* Step 1: Size */}
                            <div className="mb-6">
                                <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>1. Tamanho da Composição</h3>
                                <p className={`text-sm mb-3 ${subtitleClasses}`}>Quantas almofadas você quer na sua composição?</p>
                                <div className="grid grid-cols-5 gap-2">{[2, 3, 4, 5, 6].map(size => (<button key={size} onClick={() => setCompositionSize(size)} className={`py-3 font-bold rounded-lg transition-colors text-center ${compositionSize === size ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}>{size}</button>))}</div>
                            </div>
                            
                             {/* Step 1.5: AI Options */}
                            {compositionSize !== null && (
                                <div className="border-t pt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>1.5 Detalhes para IA (Opcional)</h3>
                                    <div className="mb-4">
                                        <p className={`text-sm mb-3 ${subtitleClasses}`}>Selecione os tamanhos para incluir na imagem:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.values(CushionSize).map(size => {
                                                const isSelected = selectedSizes.includes(size);
                                                return <button key={size} onClick={() => toggleSize(size)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${isSelected ? 'bg-cyan-600 text-white' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}>{size}</button>;
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <p className={`text-sm mb-3 ${subtitleClasses}`}>Cor do sofá no ambiente:</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {sofaColors.map(color => {
                                                const isSelected = sofaColor === color;
                                                return <button key={color} onClick={() => setSofaColor(color)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${isSelected ? 'bg-cyan-600 text-white' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}>{color}</button>;
                                            })}
                                            <input type="text" value={sofaColor} onChange={e => setSofaColor(e.target.value)} placeholder="Cor customizada" className={`text-xs p-1.5 rounded-md w-28 ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300'}`} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Selection */}
                            {compositionSize !== null && (
                                <div className="border-t pt-6 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>2. Escolha suas Almofadas</h3>
                                    <p className={`text-sm mb-3 ${subtitleClasses}`}>Selecione até {compositionSize} almofadas que você gosta.</p>
                                    <div className="flex items-center gap-3 p-2 rounded-lg min-h-[88px]" style={{backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}}>
                                        {selectedProducts.map(p => (<img key={p.id} src={p.baseImageUrl} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />))}
                                        {selectedProducts.length < compositionSize && (
                                             <button onClick={() => setIsSelectModalOpen(true)} className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${isDark ? 'border-gray-600 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                                        )}
                                    </div>
                                </div>
                            )}

                             {/* Step 3: Generate */}
                            {selectedProducts.length > 0 && (
                                <div className="border-t pt-6 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                                    <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>3. Visualizar Composição</h3>
                                    <p className={`text-sm mb-3 ${subtitleClasses}`}>Tudo pronto! Clique abaixo para ver a composição com as almofadas que você selecionou.</p>
                                    <button onClick={handleVisualize} className="w-full bg-cyan-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">Visualizar Composição</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // RESULT VIEW
                        <div className="flex-grow flex flex-col items-center gap-4">
                            <div className={`w-full aspect-square rounded-xl border p-4 flex flex-col ${cardClasses}`}>
                                <div className="flex-grow flex items-center justify-center">
                                    <div className="flex flex-wrap justify-center items-start gap-2">
                                        {currentComposition.map((p) => (
                                            <div key={p.id} className="flex flex-col items-center w-24">
                                                <button onClick={() => setViewingProduct(p)} className="w-24 h-24 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                                                    <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                                </button>
                                                <p className={`text-xs mt-1 text-center ${subtitleClasses} h-8`}>{p.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-3 mt-auto">
                                    <button onClick={handleShuffle} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Ordem</button>
                                    <button onClick={handleShare} disabled={isSharing} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>{isSharing ? <ButtonSpinner/> : "Compartilhar"}</button>
                                    <button onClick={handleSave} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Salvar</button>
                                </div>
                            </div>
                            <div className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center p-4 ${cardClasses}`}>
                                <div className="flex-grow w-full h-full flex items-center justify-center">
                                    {isGenerating ? <ButtonSpinner /> : generatedImageUrl ? <img src={generatedImageUrl} alt="Composição Gerada por IA" className="max-w-full max-h-full object-contain rounded-lg" /> : <p className={subtitleClasses}>Gere uma imagem com IA.</p>}
                                </div>
                                 <button onClick={handleGenerateEnvironment} disabled={isGenerating} className="mt-4 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-500">{isGenerating ? <ButtonSpinner /> : 'Gerar Ambiente (IA)'}</button>
                            </div>
                             {error && <p className="text-center text-red-500 mt-2">{error}</p>}
                            <button onClick={resetAll} className="w-full max-w-sm mt-4 bg-fuchsia-600 text-white font-bold py-3 rounded-lg">Criar Nova Composição</button>
                        </div>
                    )}
                </main>
            </div>
            {isSelectModalOpen && compositionSize && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsSelectModalOpen(false)} 
                    onConfirm={handleConfirmSelection} 
                    initialSelectedIds={selectedProducts.map(p => p.id)}
                    maxSelection={compositionSize}
                />
            )}
            {isSaveModalOpen && currentComposition && (
                 <SaveCompositionModal 
                    isOpen={isSaveModalOpen}
                    onClose={() => setIsSaveModalOpen(false)} 
                    onConfirm={confirmSave} 
                    predefinedName={getDominantColor(currentComposition)}
                />
            )}
            {viewingProduct && (
                <ProductDetailModal
                    product={viewingProduct}
                    products={products}
                    onClose={() => setViewingProduct(null)}
                    canManageStock={false}
                    onEditProduct={() => {}}
                    onSwitchProduct={setViewingProduct}
                    apiKey={apiKey}
                    onRequestApiKey={onRequestApiKey}
                    savedCompositions={[]}
                    onViewComposition={() => {}}
                />
            )}
        </>
    );
};

export default CompositionGeneratorScreen;