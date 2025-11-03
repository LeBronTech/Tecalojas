import React, { useState, useContext, useEffect, useRef } from 'react';
import { SavedComposition, Product, CompositionViewerModalProps } from '../types';
import { ThemeContext, useAi } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import { STORE_IMAGE_URLS } from '../constants';

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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

// FIX: Export the component to make it available for other modules.
export const CompositionViewerModal: React.FC<CompositionViewerModalProps> = ({ compositions, startIndex, onClose, onViewProduct, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const { apiKey, openApiKeyModal, timeLeft, checkAndRegisterAiCall, triggerAiCooldown, isAiBusy, tryAcquireAiLock, releaseAiLock } = useAi();
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const cooldownMessage = timeLeft > 0 ? `Aguarde ${timeLeft}s` : null;

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

    if (!compositions || compositions.length === 0) {
        return null;
    }
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
    
    const handleGenerateEnvironment = async () => {
        if (!apiKey) {
            openApiKeyModal();
            return;
        }
        if (!tryAcquireAiLock()) {
            setError("Outra operação de IA já está em andamento. Aguarde.");
            return;
        }
    
        const check = checkAndRegisterAiCall();
        if (!check.allowed) {
            setError(check.message);
            releaseAiLock();
            return;
        }
    
        setError(null);
        onSaveComposition({ ...currentComposition, imageUrl: '', isGenerating: true });
    
        try {
            const imageParts = await Promise.all(
                currentComposition.products.map(p => getBase64FromImageUrl(p.baseImageUrl || '').then(img => ({inlineData: img})))
            );
            const ai = new GoogleGenAI({ apiKey });
            
            const promptText = `Arrume estas almofadas de forma natural e esteticamente agradável em um sofá moderno de cor bege, em uma sala de estar elegante e bem iluminada. A imagem final deve conter exatamente ${currentComposition.products.length} almofadas.`;
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
                onSaveComposition({ ...currentComposition, imageUrl: newImageUrl, isGenerating: false });
            } else {
                throw new Error("A IA não retornou uma imagem.");
            }
        } catch (e: any) {
            const errorMessage = e.toString();
            let displayError = "Erro ao gerar imagem.";
            if (errorMessage.includes('429')) {
                displayError = "Cota da API excedida. Se a chave for nova, pode ser necessário habilitar o faturamento no seu projeto Google Cloud.";
                triggerAiCooldown();
            } else if (errorMessage.includes('API key not valid')) {
                displayError = "Chave de API da Gemini inválida.";
            } else if (e.message) {
                displayError = e.message;
            }
            setError(displayError);
            onSaveComposition({ ...currentComposition, imageUrl: '', isGenerating: false }); // Reset generating state
        } finally {
            releaseAiLock();
        }
    };

    const handleShare = async () => {
        if (isSharing || !canvasRef.current) return;
        setIsSharing(true);
        setError(null);
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Canvas context is unavailable.");
    
            const PADDING = 60; const IMG_SIZE = 250; const IMG_SPACING = 20; const TEXT_HEIGHT = 80; const WATERMARK_HEIGHT = 80;
            const hasAiImage = !!currentComposition.imageUrl;

            const productImages = await Promise.all(
                currentComposition.products.map(p => new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = p.baseImageUrl;
                    img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Failed to load image for ${p.name}`));
                }))
            );
    
            const totalImageWidth = currentComposition.products.length * IMG_SIZE + (currentComposition.products.length - 1) * IMG_SPACING;
            
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
                    const ratio = img.width / img.height;
                    let sx, sy, sWidth, sHeight;
                    if (ratio > 1) { sHeight = img.height; sWidth = sHeight; sx = (img.width - sWidth) / 2; sy = 0; } 
                    else { sWidth = img.width; sHeight = sWidth; sy = (img.height - sHeight) / 2; sx = 0; }
                    ctx.drawImage(img, sx, sy, sWidth, sHeight, currentX, PADDING, IMG_SIZE, IMG_SIZE);
                    
                     const productName = currentComposition.products[index].name;
                     ctx.fillText(productName, currentX + IMG_SIZE / 2, PADDING + IMG_SIZE + 30, IMG_SIZE - 10);
                     currentX += IMG_SIZE + IMG_SPACING;
                 });
            }

            const shareFinalCanvas = async () => {
                await drawWatermark();
                canvas.toBlob(async (blob) => {
                    if (blob && navigator.share) {
                        const file = new File([blob], `${currentComposition.name}.png`, { type: 'image/png' });
                        await navigator.share({ title: `Composição: ${currentComposition.name}`, files: [file] });
                    } else { throw new Error("Não foi possível criar a imagem para compartilhamento ou o navegador não suporta a função."); }
                }, 'image/png', 0.95);
            };

            if (hasAiImage) {
                const aiImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image(); img.crossOrigin = 'Anonymous'; img.src = currentComposition.imageUrl!;
                    img.onload = () => resolve(img); img.onerror = () => reject(new Error("Failed to load AI image"));
                });
                
                const aiImageHeight = (totalImageWidth * aiImage.height) / aiImage.width;
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + aiImageHeight + PADDING + WATERMARK_HEIGHT;

                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
                const topSectionHeight = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING;
                ctx.drawImage(aiImage, PADDING, topSectionHeight, totalImageWidth, aiImageHeight);
                await shareFinalCanvas();

            } else {
                canvas.width = totalImageWidth + 2 * PADDING;
                canvas.height = PADDING + IMG_SIZE + TEXT_HEIGHT + PADDING + WATERMARK_HEIGHT;
                ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawTopPart();
                await shareFinalCanvas();
            }
    
        } catch (err: any) {
            console.error("Share failed:", err);
            if (err.name !== 'AbortError') {
              setError("Falha ao compartilhar: " + err.message);
            }
        } finally {
            setIsSharing(false);
        }
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";

    return (
        <>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
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
                         <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-black/10 flex items-center justify-center">
                            {currentComposition.isGenerating ? (
                                <div className="text-center">
                                    <ButtonSpinner/>
                                    <p className={`mt-2 text-sm ${subtitleClasses}`}>Gerando imagem...</p>
                                </div>
                            ) : currentComposition.imageUrl ? (
                                <img src={currentComposition.imageUrl} alt={currentComposition.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                                    {currentComposition.products.slice(0, 4).map(p => (
                                        <img key={p.id} src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover" />
                                    ))}
                                </div>
                            )}
                        </div>
                        <h2 className={`text-xl font-bold text-center mb-2 ${titleClasses}`}>{currentComposition.name}</h2>
                        <p className={`text-sm text-center mb-4 ${subtitleClasses}`}>{currentComposition.products.length} almofadas</p>

                        <div className="flex flex-wrap justify-center items-start gap-3 p-2 rounded-lg bg-black/10">
                            {currentComposition.products.map((p) => (
                                <div key={p.id} className="flex flex-col items-center w-16">
                                    <button onClick={() => onViewProduct(p)} className="w-16 h-16 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                                        <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 space-y-2">
                            <button
                                onClick={handleGenerateEnvironment}
                                disabled={isAiBusy || currentComposition.isGenerating || timeLeft > 0}
                                className={`w-full font-bold py-3 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50
                                    ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}
                            >
                                {isAiBusy || currentComposition.isGenerating ? <ButtonSpinner /> : (cooldownMessage ? cooldownMessage : 'Gerar Imagem (IA)')}
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={isSharing}
                                className={`w-full font-bold py-3 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2
                                    ${isDark ? 'bg-purple-