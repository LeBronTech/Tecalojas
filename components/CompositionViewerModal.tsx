import React, { useState, useContext, useEffect, useRef } from 'react';
import { SavedComposition, Product, CompositionViewerModalProps } from '../types';
import { ThemeContext } from '../types';
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

const CompositionViewerModal: React.FC<CompositionViewerModalProps> = ({ compositions, startIndex, onClose, apiKey, onRequestApiKey, onViewProduct, onSaveComposition, aiCooldownUntil, checkAndRegisterAiCall, triggerAiCooldown }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const cooldownActive = aiCooldownUntil && Date.now() < aiCooldownUntil;
    const cooldownTimeLeft = cooldownActive ? Math.ceil((aiCooldownUntil! - Date.now()) / 1000) : 0;

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
    
    const shareCanvas = async () => {
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
                    if (error instanceof DOMException && error.name !== 'AbortError') {
                        setError('Falha ao compartilhar a imagem.');
                    }
                }
            } else {
                setError('Compartilhamento não suportado ou falha ao criar imagem.');
            }
        }, 'image/png', 0.95);
    };

    const handleGenerateEnvironment = async () => {
        if (!apiKey) {
            onRequestApiKey();
            return;
        }
    
        const check = checkAndRegisterAiCall();
        if (!check.allowed) {
            setError(check.message);
            return;
        }
    
        setIsGenerating(true);
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
                displayError = "Cota da API excedida. Aguarde 60s.";
                triggerAiCooldown();
            } else if (errorMessage.includes('API key not valid')) {
                displayError = "Chave de API da Gemini inválida.";
            } else if (e.message) {
                displayError = e.message;
            }
            setError(displayError);
            onSaveComposition({ ...currentComposition, imageUrl: '', isGenerating: false }); // Reset generating state
        } finally {
            setIsGenerating(false);
        }
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
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
                                disabled={isGenerating || currentComposition.isGenerating || cooldownActive}
                                className={`w-full font-bold py-3 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50
                                    ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}
                            >
                                {isGenerating || currentComposition.isGenerating ? <ButtonSpinner /> : (cooldownActive ? `Aguarde ${cooldownTimeLeft}s` : 'Gerar Imagem (IA)')}
                            </button>
                            <button
                                onClick={shareCanvas}
                                className={`w-full font-bold py-3 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2
                                    ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                            >
                                Compartilhar
                            </button>
                            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                        </div>

                    </div>
                </div>

                {compositions.length > 1 && (
                    <>
                        <button onClick={goToPrevious} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-3 rounded-full z-30 ${isDark ? 'bg-black/30 hover:bg-black/60 text-white' : 'bg-white/50 hover:bg-white/90 text-gray-800'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={goToNext} className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 p-3 rounded-full z-30 ${isDark ? 'bg-black/30 hover:bg-black/60 text-white' : 'bg-white/50 hover:bg-white/90 text-gray-800'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </>
                )}
            </div>
        </>
    );
};

export { CompositionViewerModal };
