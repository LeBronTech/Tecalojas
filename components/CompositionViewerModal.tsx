import React, { useState, useContext, useEffect, useRef } from 'react';
import { SavedComposition, Product } from '../types';
import { ThemeContext } from '../App';
import { GoogleGenAI, Modality } from '@google/genai';

interface CompositionViewerModalProps {
  compositions: SavedComposition[];
  startIndex: number;
  onClose: () => void;
  apiKey: string | null;
  onRequestApiKey: () => void;
  onViewProduct: (product: Product) => void;
  onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CompositionViewerModal: React.FC<CompositionViewerModalProps> = ({ compositions, startIndex, onClose, apiKey, onRequestApiKey, onViewProduct, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        setCurrentIndex(startIndex); // Ensure index resets if component is re-rendered with new start index
    }, [startIndex]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') goToNext();
            else if (event.key === 'ArrowLeft') goToPrevious();
            else if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, compositions.length]);

    const goToPrevious = () => setCurrentIndex(prev => (prev === 0 ? compositions.length - 1 : prev - 1));
    const goToNext = () => setCurrentIndex(prev => (prev === compositions.length - 1 ? 0 : prev + 1));

    const currentComposition = compositions[currentIndex];
    
    const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
        if (imageUrl.startsWith('data:')) {
            const parts = imageUrl.split(',');
            const mimeTypePart = parts[0].match(/:(.*?);/);
            if (!mimeTypePart || !parts[1]) throw new Error('URL de dados da imagem base inválida.');
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
    
    const shareCanvas = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob(async (blob) => {
            if (blob && navigator.share) {
                const file = new File([blob], `${currentComposition.name}.png`, { type: 'image/png' });
                try {
                    await navigator.share({
                        title: `Composição: ${currentComposition.name}`,
                        files: [file],
                    });
                } catch (error) {
                    console.error('Error sharing:', error);
                }
            }
        }, 'image/png', 0.95);
    };

    const drawAndShare = async () => {
        try {
            if (!currentComposition || !canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Canvas context is unavailable.");
            
            const PADDING = 60; const IMG_SIZE = 250; const IMG_SPACING = 20; const TEXT_HEIGHT = 40;
            const hasAiImage = !!currentComposition.imageUrl;

            const productImages = await Promise.all(
                currentComposition.products.map(p => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = p.baseImageUrl;
                    img.onload = () => resolve(img); img.onerror = (e) => reject(new Error(`Could not load image: ${p.baseImageUrl}`));
                }))
            );

            const totalImageWidth = currentComposition.products.length * IMG_SIZE + (currentComposition.products.length - 1) * IMG_SPACING;

            const drawTopPart = () => {
                let currentX = PADDING;
                ctx.font = 'bold 24px sans-serif';
                ctx.fillStyle = isDark ? '#E9D5FF' : '#4A044E';
                ctx.textAlign = 'center';
                productImages.forEach((img, index) => {
                    const aspectRatio = img.width / img.height;
                    let drawWidth = IMG_SIZE;
                    let drawHeight = IMG_SIZE;
                    if (aspectRatio > 1) { // Landscape
                        drawHeight = IMG_SIZE / aspectRatio;
                    } else { // Portrait or square
                        drawWidth = IMG_SIZE * aspectRatio;
                    }
                    const xOffset = currentX + (IMG_SIZE - drawWidth) / 2;
                    const yOffset = PADDING + (IMG_SIZE - drawHeight) / 2;
                    ctx.drawImage(img, xOffset, yOffset, drawWidth, drawHeight);

                    ctx.fillText(currentComposition.products[index].name, currentX + IMG_SIZE / 2, PADDING + IMG_SIZE + 30, IMG_SIZE - 10);
                    currentX += IMG_SIZE + IMG_SPACING;
                });
            };

            if (hasAiImage) {
                const aiImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = currentComposition.imageUrl!;
                    img.onload = () => resolve(img); img.onerror = () => reject(new Error('Could not load AI image.'));
                });
                const aiImageHeight = (totalImageWidth * aiImage.height) / aiImage.width;
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + aiImageHeight + PADDING;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
                ctx.drawImage(aiImage, PADDING, PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING, totalImageWidth, aiImageHeight);
            } else {
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
            }
            shareCanvas();
        } catch (e: any) {
            alert(`Error preparing share image: ${e.message}`);
        }
    };

    const handleGenerateEnvironment = async () => {
        if (!currentComposition || !apiKey) { onRequestApiKey(); return; }
        setIsGenerating(true); setError(null);
        try {
            const imageParts = await Promise.all(currentComposition.products.map(p => getBase64FromImageUrl(p.baseImageUrl).then(img => ({inlineData: img}))));
            const ai = new GoogleGenAI({ apiKey });
            const textPart = { text: `Arrume estas ${currentComposition.products.length} almofadas de forma natural e esteticamente agradável em um sofá moderno de cor neutra, em uma sala de estar elegante e bem iluminada.` };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [...imageParts, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
            const generatedImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!generatedImagePart?.inlineData) throw new Error("A IA não retornou uma imagem.");
            
            const newImageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
            onSaveComposition({ ...currentComposition, imageUrl: newImageUrl });
        } catch (e: any) {
            setError(`Falha ao gerar a imagem: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!currentComposition) return null;

    const modalBgClasses = isDark ? "bg-[#1A1129]/90 backdrop-blur-md border-white/10" : "bg-white/90 backdrop-blur-md border-gray-200";
    const navBtnClasses = isDark ? "bg-black/30 hover:bg-black/60 text-white" : "bg-white/50 hover:bg-white/90 text-gray-800";
    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
             <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s forwards; }
            `}</style>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className={`relative w-full max-w-xl max-h-full rounded-2xl border ${modalBgClasses}`} onClick={e => e.stopPropagation()}>
                <div className="absolute top-4 right-4 z-20">
                     <button onClick={onClose} className={`rounded-full p-2 transition-colors ${isDark ? 'text-gray-300 bg-black/20 hover:text-white' : 'text-gray-600 bg-white/50 hover:text-gray-900'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {compositions.length > 1 && (
                    <>
                        <button onClick={goToPrevious} className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-md z-20 ${navBtnClasses}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={goToNext} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-md z-20 ${navBtnClasses}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </>
                )}
                <div className="p-6 overflow-y-auto max-h-[90vh]">
                     <h2 className={`text-2xl font-bold mb-1 text-center ${titleClasses}`}>{currentComposition.name}</h2>
                     <p className={`text-sm mb-4 text-center ${textClasses}`}>
                        Composição de {currentComposition.size} almofada{currentComposition.size > 1 ? 's' : ''}.
                    </p>
                    
                    {/* Top Square - Products */}
                    <div className={`w-full aspect-square rounded-xl border p-4 mb-4 flex flex-col ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                        <div className="flex-grow flex items-center justify-center">
                            <div className="flex flex-wrap justify-center items-start gap-2">
                                {currentComposition.products.map((p) => (
                                    <button key={p.id} onClick={() => onViewProduct(p)} className="flex flex-col items-center w-24 group focus:outline-none">
                                        <div className="w-24 h-24 rounded-lg shadow-lg overflow-hidden relative group-hover:ring-2 group-focus:ring-2 ring-fuchsia-500 transition-all">
                                             <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </div>
                                        </div>
                                        <p className={`text-xs mt-1 text-center ${textClasses} h-8`}>{p.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-3 mt-auto">
                            <button onClick={drawAndShare} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                                Compartilhar
                            </button>
                        </div>
                    </div>

                    {/* Bottom Square - AI Image */}
                    <div className={`w-full aspect-square rounded-xl border p-4 flex flex-col items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                         <div className="flex-grow w-full flex items-center justify-center">
                             {currentComposition.imageUrl ? (
                                <img src={currentComposition.imageUrl} alt={`Imagem IA de ${currentComposition.name}`} className="max-w-full max-h-full object-contain rounded-lg" />
                            ) : (
                                <p className={textClasses}>{isGenerating ? 'Gerando...' : 'Sem imagem gerada por IA.'}</p>
                            )}
                        </div>
                         <button onClick={handleGenerateEnvironment} disabled={isGenerating} className={`mt-4 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}>
                             {isGenerating ? <ButtonSpinner /> : "Gerar Ambiente (IA)"}
                         </button>
                    </div>
                     {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default CompositionViewerModal;