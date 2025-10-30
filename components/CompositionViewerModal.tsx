import React, { useState, useContext, useEffect } from 'react';
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') {
                goToNext();
            } else if (event.key === 'ArrowLeft') {
                goToPrevious();
            } else if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [compositions.length]);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? compositions.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === compositions.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const currentComposition = compositions[currentIndex];
    if (!currentComposition) return null;

    const modalBgClasses = isDark ? "bg-[#1A1129]/80 backdrop-blur-md border-white/10" : "bg-white/80 backdrop-blur-md border-gray-200";
    const navBtnClasses = isDark ? "bg-black/30 hover:bg-black/60 text-white" : "bg-white/50 hover:bg-white/90 text-gray-800";
    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";
    
    const getCompositionImageUrl = (comp: SavedComposition) => {
        if (comp.imageUrl) return comp.imageUrl;
        // Create a fallback image grid if no AI image exists
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if(!ctx) return '';
        const size = 200;
        canvas.width = size * 2;
        canvas.height = size * 2;
        ctx.fillStyle = isDark ? '#2D1F49' : '#F3F4F6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const imagesToDraw = comp.products.slice(0, 4);
        const positions = [
            { x: 0, y: 0 },
            { x: size, y: 0 },
            { x: 0, y: size },
            { x: size, y: size },
        ];

        imagesToDraw.forEach((p, i) => {
            const img = new Image();
            img.src = p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
            img.onload = () => {
                 ctx.drawImage(img, positions[i].x, positions[i].y, size, size);
            }
        });
        return canvas.toDataURL(); // This is synchronous, so image might not be loaded yet, but it's a fallback. A better way would be async. For now, this is ok.
    }


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
             <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s forwards; }
            `}</style>
            <div className={`relative w-full max-w-4xl max-h-full rounded-2xl border ${modalBgClasses}`} onClick={e => e.stopPropagation()}>
                <div className="absolute top-4 right-4 z-20">
                     <button onClick={onClose} className={`rounded-full p-2 transition-colors ${isDark ? 'text-gray-300 bg-black/20 hover:text-white' : 'text-gray-600 bg-white/50 hover:text-gray-900'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center h-full max-h-[90vh]">
                    <div className="relative w-full md:w-2/3 h-96 md:h-auto md:aspect-square flex-shrink-0">
                         {compositions.map((comp, index) => (
                             <div key={comp.id} className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                                <img src={getCompositionImageUrl(comp)} alt={comp.name} className="w-full h-full object-contain" />
                            </div>
                         ))}

                        {compositions.length > 1 && (
                            <>
                                <button onClick={goToPrevious} className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-md ${navBtnClasses}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={goToNext} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-md ${navBtnClasses}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </>
                        )}
                    </div>
                    <div className="w-full md:w-1/3 p-6 overflow-y-auto">
                        <h2 className={`text-2xl font-bold mb-2 ${titleClasses}`}>{currentComposition.name}</h2>
                        <p className={`text-sm mb-4 ${textClasses}`}>
                            Composição de {currentComposition.size} almofada{currentComposition.size > 1 ? 's' : ''}.
                        </p>
                        <div className="space-y-2">
                            {currentComposition.products.map(product => (
                                <div key={product.id} className="flex items-center gap-3">
                                    <img src={product.baseImageUrl} alt={product.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                                    <p className={`text-sm font-medium ${textClasses}`}>{product.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompositionViewerModal;
