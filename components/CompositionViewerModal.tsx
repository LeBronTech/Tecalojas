
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

// --- FIX: Added missing ButtonSpinner component ---
const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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
    // --- FIX: Added missing textClasses variable definition ---
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";
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
            const INFO_HEIGHT = 150 + (currentComposition.products.length * 90);
            const AI_RENDER_HEIGHT = currentComposition.imageUrl ? 700 : 0;
            const FOOTER_HEIGHT = 120;
            
            canvas.width = CANVAS_WIDTH;
            canvas.height = SOFA_HEIGHT + INFO_HEIGHT + AI_RENDER_HEIGHT + FOOTER_HEIGHT;

            // --- 1. Fundo Geral ---
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, CANVAS_WIDTH, canvas.height);

            // --- 2. Desenhar Preview do Sofá Virtual ---
            const sofaHex = PREDEFINED_SOFA_COLORS.find(c => c.name === currentComposition.sofaColor)?.hex || '#F3F4F6';
            ctx.fillStyle = sofaHex;
            ctx.fillRect(0, 0, CANVAS_WIDTH, SOFA_HEIGHT);
            
            // Título no topo
            ctx.fillStyle = '#4A044E';
            ctx.font = 'bold 50px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(currentComposition.name.toUpperCase(), CANVAS_WIDTH / 2, 80);

            // Desenhar almofadas na posição exata
            if (currentComposition.items) {
                for (const item of [...currentComposition.items].sort((a,b) => a.zIndex - b.zIndex)) {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = item.product.baseImageUrl;
                    await new Promise(r => img.onload = r);
                    
                    const baseSize = 250;
                    let drawW = baseSize;
                    let drawH = baseSize;

                    if (item.size === CushionSize.SQUARE_40) { drawW = 210; drawH = 210; }
                    else if (item.size === CushionSize.SQUARE_50) { drawW = 280; drawH = 280; }
                    else if (item.size === CushionSize.SQUARE_60) { drawW = 340; drawH = 340; }
                    else if (item.size === CushionSize.LUMBAR) { drawW = 300; drawH = 170; }
                    
                    const posX = (item.x / 100) * CANVAS_WIDTH;
                    const posY = 120 + (item.y / 100) * (SOFA_HEIGHT - 400);

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 40;
                    ctx.shadowOffsetY = 20;
                    ctx.drawImage(img, posX, posY, drawW, drawH);
                    ctx.restore();
                }
            }

            // --- 3. Área de Detalhes (Lista de Itens) ---
            let currentY = SOFA_HEIGHT + 80;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText("ITENS DA VITRINE:", 100, currentY);
            
            currentY += 80;
            currentComposition.products.forEach((p, idx) => {
                const size = currentComposition.productSizes?.[idx] || '45x45';
                
                // Marcador fuchsia
                ctx.fillStyle = '#A21CAF';
                ctx.beginPath();
                ctx.arc(80, currentY - 12, 10, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#111827';
                ctx.font = 'bold 30px sans-serif';
                ctx.fillText(`${p.name.toUpperCase()}`, 110, currentY);
                
                ctx.fillStyle = '#6B7280';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText(`Tam: ${size} | Tecido: ${p.fabricType}`, 110, currentY + 35);
                currentY += 90;
            });

            // --- 4. Renderização IA (Se houver) ---
            if (currentComposition.imageUrl) {
                const aiLabelY = currentY + 40;
                ctx.fillStyle = '#F3F4F6';
                ctx.fillRect(0, currentY + 20, CANVAS_WIDTH, AI_RENDER_HEIGHT);
                
                ctx.fillStyle = '#6B7280';
                ctx.font = 'black 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("SIMULAÇÃO REALISTA POR INTELIGÊNCIA ARTIFICIAL", CANVAS_WIDTH / 2, aiLabelY + 50);

                const aiImage = new Image();
                aiImage.crossOrigin = 'Anonymous';
                aiImage.src = currentComposition.imageUrl;
                await new Promise(res => aiImage.onload = res);
                
                const margin = 100;
                const availableW = CANVAS_WIDTH - (margin * 2);
                const availableH = AI_RENDER_HEIGHT - 150;
                
                // Manter proporção
                const ratio = Math.min(availableW / aiImage.width, availableH / aiImage.height);
                const drawW = aiImage.width * ratio;
                const drawH = aiImage.height * ratio;
                const drawX = (CANVAS_WIDTH - drawW) / 2;
                const drawY = aiLabelY + 100;

                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 20;
                ctx.drawImage(aiImage, drawX, drawY, drawW, drawH);
                ctx.restore();
            }

            // --- 5. Rodapé Profissional ---
            const [tecaLogo, ioneLogo] = await loadLogos();
            const footerY = canvas.height - FOOTER_HEIGHT;
            ctx.fillStyle = '#FDF4FF';
            ctx.fillRect(0, footerY, CANVAS_WIDTH, FOOTER_HEIGHT);
            
            const logoSize = 60;
            const textY = footerY + FOOTER_HEIGHT / 2;
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#4A044E';
            
            // Centralizar logos e links
            const siteText = "tecalojas.vercel.app";
            const handleText = "@tecadecoracoestorredetv";
            const separator = " | ";
            const totalRowWidth = (logoSize * 2) + 40 + ctx.measureText(siteText).width + ctx.measureText(handleText).width + (ctx.measureText(separator).width * 2);
            
            let startX = (CANVAS_WIDTH - totalRowWidth) / 2;
            
            ctx.drawImage(tecaLogo, startX, textY - logoSize / 2, logoSize, logoSize);
            startX += logoSize + 10;
            ctx.drawImage(ioneLogo, startX, textY - logoSize / 2, logoSize, logoSize);
            startX += logoSize + 30;
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(siteText, startX, textY);
            startX += ctx.measureText(siteText).width;
            ctx.fillText(separator, startX, textY);
            startX += ctx.measureText(separator).width;
            ctx.fillText(handleText, startX, textY);

            // Compartilhar
            canvas.toBlob(async (blob) => {
                if (blob && navigator.share) {
                    const file = new File([blob], 'catalogo-teca.png', { type: 'image/png' });
                    await navigator.share({
                        title: `Vitrine: ${currentComposition.name}`,
                        text: `Olha que combinação incrível eu montei nas Lojas Têca!`,
                        files: [file]
                    });
                }
            }, 'image/png', 0.95);

        } catch (e) {
            console.error("Share Image Generation Error:", e);
            alert("Erro ao preparar o catálogo de compartilhamento.");
        }
    };

    const handleGenerateEnvironment = async () => {
        if (!currentComposition) return;
        setIsGenerating(true);
        try {
            const imageParts = await Promise.all(currentComposition.products.map(p => getBase64FromImageUrl(p.baseImageUrl).then(img => ({inlineData: img}))));
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const promptText = `Crie uma simulação profissional de designer de interiores. Arrume estas ${currentComposition.products.length} almofadas de forma elegante e luxuosa em um sofá moderno de cor ${currentComposition.sofaColor || 'neutra'}. Foco total na iluminação de estúdio e texturas.`;
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash-image', 
                contents: { parts: [...imageParts, { text: promptText }] } 
            });
            
            const candidate = response.candidates?.[0];
            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (!imagePart?.inlineData) throw new Error("IA não retornou imagem.");
            
            const newImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            onSaveComposition({ ...currentComposition, imageUrl: newImageUrl });
        } catch (e: any) {
            alert("IA instável. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

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

    if (!currentComposition) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className={`relative w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border overflow-hidden flex flex-col ${isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200"}`} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
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
                            Compartilhar Catálogo
                        </button>
                    </div>

                    <div className={`rounded-3xl border p-4 flex flex-col items-center justify-center relative min-h-[300px] ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         {currentComposition.imageUrl ? (
                            <img src={currentComposition.imageUrl} alt="IA preview" className="w-full h-auto rounded-2xl shadow-2xl" />
                        ) : (
                            <div className="text-center p-8">
                                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className={`text-sm font-medium ${textClasses}`}>{isGenerating ? 'IA Processando ambiente...' : 'Nenhuma simulação gerada.'}</p>
                            </div>
                        )}
                         {!currentComposition.imageUrl && (
                            <button onClick={handleGenerateEnvironment} disabled={isGenerating} className={`mt-4 font-black py-3 px-8 rounded-xl text-xs transition-all uppercase tracking-widest ${isDark ? 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}>
                                {isGenerating ? <ButtonSpinner /> : "Gerar Simulação IA"}
                            </button>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompositionViewerModal;
