
import React, { useState, useContext, useEffect, useRef } from 'react';
import { SavedComposition, Product, CushionSize } from '../types';
import { ThemeContext } from '../types';
import { GoogleGenAI } from '@google/genai';
// FIX: Imported missing constants to resolve "Cannot find name" errors in the JSX and canvas drawing logic
import { STORE_IMAGE_URLS, PREDEFINED_SOFA_COLORS, SOFA_FABRICS, SIZE_SCALES } from '../constants';

interface CompositionViewerModalProps {
  compositions: SavedComposition[];
  startIndex: number;
  onClose: () => void;
  onViewProduct: (product: Product) => void;
  onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
}

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

const CompositionViewerModal: React.FC<CompositionViewerModalProps> = ({ compositions, startIndex, onClose, onViewProduct, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isGenerating, setIsGenerating] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => { setCurrentIndex(startIndex); }, [startIndex]);
    
    const currentComposition = compositions[currentIndex];

    const drawAndShare = async () => {
        try {
            if (!currentComposition || !canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const CANVAS_WIDTH = 1200;
            const SOFA_HEIGHT = 600;
            const INFO_HEIGHT = 400;
            const FOOTER_HEIGHT = 120;
            
            canvas.width = CANVAS_WIDTH;
            canvas.height = SOFA_HEIGHT + INFO_HEIGHT + FOOTER_HEIGHT;

            // 1. Desenhar Fundo do Sofá (Representando o arranjo livre)
            ctx.fillStyle = '#F3F4F6';
            ctx.fillRect(0, 0, CANVAS_WIDTH, SOFA_HEIGHT);
            
            // Título no topo
            ctx.fillStyle = '#4A044E';
            ctx.font = 'black 50px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(currentComposition.name.toUpperCase(), CANVAS_WIDTH / 2, 80);

            // 2. Desenhar as almofadas na posição exata do arranjo livre
            if (currentComposition.items) {
                for (const item of [...currentComposition.items].sort((a,b) => a.zIndex - b.zIndex)) {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = item.product.baseImageUrl;
                    await new Promise(r => img.onload = r);
                    
                    const drawW = 250; // Base width
                    const drawH = item.size === CushionSize.LUMBAR ? 150 : 250;
                    
                    const posX = (item.x / 100) * CANVAS_WIDTH;
                    const posY = 150 + (item.y / 100) * (SOFA_HEIGHT - 350);

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 40;
                    ctx.shadowOffsetY = 20;
                    ctx.drawImage(img, posX, posY, drawW, drawH);
                    ctx.restore();
                }
            }

            // 3. Área de Detalhes (Nomes e Tamanhos)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, SOFA_HEIGHT, CANVAS_WIDTH, INFO_HEIGHT);
            
            let currentY = SOFA_HEIGHT + 80;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 30px sans-serif';
            ctx.fillText("ITENS DA COMPOSIÇÃO:", 100, currentY);
            
            currentY += 60;
            currentComposition.products.forEach((p, idx) => {
                const size = currentComposition.productSizes?.[idx] || '45x45';
                ctx.fillStyle = '#A21CAF';
                ctx.font = 'black 28px sans-serif';
                ctx.fillText(`• ${p.name.toUpperCase()}`, 100, currentY);
                ctx.fillStyle = '#6B7280';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText(`  Tamanho: ${size} | Tecido: ${p.fabricType}`, 130, currentY + 35);
                currentY += 90;
            });

            // 4. Rodapé e Logos
            const [tecaLogo, ioneLogo] = await loadLogos();
            ctx.fillStyle = '#FDF4FF';
            ctx.fillRect(0, canvas.height - FOOTER_HEIGHT, CANVAS_WIDTH, FOOTER_HEIGHT);
            
            ctx.drawImage(tecaLogo, 100, canvas.height - 90, 60, 60);
            ctx.drawImage(ioneLogo, CANVAS_WIDTH - 160, canvas.height - 90, 60, 60);
            
            ctx.fillStyle = '#4A044E';
            ctx.textAlign = 'center';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText("tecalojas.vercel.app | @tecadecoracoestorredetv", CANVAS_WIDTH / 2, canvas.height - 50);

            // Compartilhar
            canvas.toBlob(async (blob) => {
                if (blob && navigator.share) {
                    const file = new File([blob], 'vitrine.png', { type: 'image/png' });
                    await navigator.share({
                        title: `Vitrine: ${currentComposition.name}`,
                        text: `Olha que linda essa composição que montei nas Lojas Têca!`,
                        files: [file]
                    });
                }
            });

        } catch (e) {
            console.error("Share Image Generation Error:", e);
            alert("Erro ao gerar imagem de compartilhamento.");
        }
    };

    if (!currentComposition) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className={`relative w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border overflow-hidden flex flex-col ${isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200"}`} onClick={e => e.stopPropagation()}>
                <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
                    <div className="text-center">
                        <h2 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentComposition.name}</h2>
                        <p className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest">{currentComposition.size} Itens na Vitrine</p>
                    </div>

                    {/* Preview do Arranjo Livre */}
                    <div 
                        className="aspect-video w-full rounded-3xl relative border-2 border-dashed border-gray-300 dark:border-white/10 overflow-hidden shadow-inner"
                        style={{ 
                            backgroundColor: PREDEFINED_SOFA_COLORS.find(c => c.name === currentComposition.sofaColor)?.hex || '#ccc',
                            backgroundImage: SOFA_FABRICS.find(f => f.name === currentComposition.sofaFabric)?.pattern || 'none',
                            backgroundBlendMode: 'overlay'
                        }}
                    >
                        {currentComposition.items?.map(item => (
                            <img 
                                key={item.id} 
                                src={item.product.baseImageUrl} 
                                alt=""
                                className="absolute shadow-2xl rounded-lg border border-white/10"
                                style={{ 
                                    left: `${item.x}%`, 
                                    top: `${item.y}%`, 
                                    width: `calc(${SIZE_SCALES[item.size].w} * 1.2)`, 
                                    zIndex: item.zIndex 
                                }}
                            />
                        ))}
                    </div>

                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="space-y-3 mb-6">
                            {currentComposition.products.map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={p.baseImageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                                        <p className="text-[10px] font-bold text-fuchsia-500 uppercase">{currentComposition.productSizes?.[i]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={drawAndShare} className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Compartilhar no WhatsApp
                        </button>
                    </div>

                    <button onClick={onClose} className={`w-full py-3 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Fechar Visualização</button>
                </div>
            </div>
        </div>
    );
};

export default CompositionViewerModal;
