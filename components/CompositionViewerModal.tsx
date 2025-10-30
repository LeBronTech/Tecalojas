import React, { useState, useContext, useEffect, useRef } from 'react';
import { SavedComposition } from '../types';
import { ThemeContext } from '../App';

interface CompositionViewerModalProps {
  compositions: SavedComposition[];
  startIndex: number;
  onClose: () => void;
}

const CompositionViewerModal: React.FC<CompositionViewerModalProps> = ({ compositions, startIndex, onClose }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
    
    const handleShare = async () => {
        if (!currentComposition || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const PADDING = 60, IMG_SIZE = 250, IMG_SPACING = 20;
        const totalImageWidth = currentComposition.products.length * IMG_SIZE + (currentComposition.products.length - 1) * IMG_SPACING;
        const hasAiImage = !!currentComposition.imageUrl;
    
        canvas.width = totalImageWidth + 2 * PADDING;
        canvas.height = PADDING + IMG_SIZE + PADDING + (hasAiImage ? IMG_SIZE + PADDING : 0);
    
        ctx.fillStyle = isDark ? '#1A1129' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        const productImages = await Promise.all(
            currentComposition.products.map(p => new Promise<HTMLImageElement>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = p.baseImageUrl;
                img.onload = () => resolve(img);
                img.onerror = () => {
                    const placeholder = new Image();
                    placeholder.src = 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
                    placeholder.onload = () => resolve(placeholder);
                };
            }))
        );
    
        let currentX = PADDING;
        productImages.forEach(img => {
            ctx.drawImage(img, currentX, PADDING, IMG_SIZE, IMG_SIZE);
            currentX += IMG_SIZE + IMG_SPACING;
        });
    
        if (hasAiImage) {
            const aiImage = new Image();
            aiImage.crossOrigin = 'Anonymous';
            aiImage.src = currentComposition.imageUrl!;
            aiImage.onload = () => {
                const aspectRatio = aiImage.width / aiImage.height;
                const drawWidth = canvas.width - 2 * PADDING;
                const drawHeight = drawWidth / aspectRatio;
                ctx.drawImage(aiImage, PADDING, PADDING + IMG_SIZE + PADDING, drawWidth, drawHeight);
                shareCanvas();
            };
        } else {
            shareCanvas();
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
        }, 'image/png');
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
                            <div className="flex justify-center items-center -space-x-8">
                                {currentComposition.products.map((p, index) => (
                                    <div key={p.id} className="w-32 h-32 rounded-lg shadow-lg" style={{ zIndex: index }}>
                                        <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-3 mt-auto">
                            <button onClick={handleShare} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                                Compartilhar
                            </button>
                             <button className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
                                Ações
                            </button>
                        </div>
                    </div>

                    {/* Bottom Square - AI Image */}
                    <div className={`w-full aspect-square rounded-xl border flex items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                        {currentComposition.imageUrl ? (
                            <img src={currentComposition.imageUrl} alt={`Imagem IA de ${currentComposition.name}`} className="w-full h-full object-contain" />
                        ) : (
                            <p className={textClasses}>Sem imagem gerada por IA.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompositionViewerModal;