
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { Product, View, SavedComposition, CushionSize, ThemeContext, CompositionItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import ProductSelectModal from '../components/ProductSelectModal';
import SaveCompositionModal from '../components/SaveCompositionModal';
import { PREDEFINED_SOFA_COLORS, SIZE_SCALES, SOFA_FABRICS, STORE_IMAGE_URLS } from '../constants';

interface CompositionGeneratorScreenProps {
    products: Product[];
    onNavigate: (view: View) => void;
    savedCompositions: SavedComposition[];
    onSaveComposition: (composition: Omit<SavedComposition, 'id'>) => void;
    setSavedCompositions: React.Dispatch<React.SetStateAction<SavedComposition[]>>;
}

const getBase64FromImageUrl = async (imageUrl: string): Promise<{ data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        if (!mimeTypePart || !parts[1]) throw new Error('URL inválida.');
        return { mimeType: mimeTypePart[1], data: parts[1] };
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

const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, savedCompositions, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const [compItems, setCompItems] = useState<CompositionItem[]>([]);
    const [selectedSofaFabric, setSelectedSofaFabric] = useState(SOFA_FABRICS[0]);
    const [selectedSofaColor, setSelectedSofaColor] = useState(PREDEFINED_SOFA_COLORS[1]); 
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedName, setGeneratedName] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const sofaRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleAddProducts = (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;
        
        const newItems: CompositionItem[] = [];
        selectedIds.forEach((id, index) => {
            const product = products.find(p => p.id === id);
            if (product) {
                newItems.push({
                    id: `item-${Date.now()}-${index}`,
                    product,
                    size: CushionSize.SQUARE_45,
                    x: 30 + (compItems.length * 5) + (index * 5),
                    y: 35 + (index * 2),
                    zIndex: compItems.length + index + 1
                });
            }
        });

        setCompItems(prev => [...prev, ...newItems]);
        setIsProductSelectOpen(false);
    };

    const handleStartDrag = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        setSelectedId(id);
        const item = compItems.find(i => i.id === id);
        if (!item || !sofaRef.current) return;

        const rect = sofaRef.current.getBoundingClientRect();
        const itemX = (item.x / 100) * rect.width;
        const itemY = (item.y / 100) * rect.height;
        
        setDraggingId(id);
        setDragOffset({
            x: e.clientX - rect.left - itemX,
            y: e.clientY - rect.top - itemY
        });
        
        setCompItems(prev => {
            const maxZ = Math.max(...prev.map(i => i.zIndex), 0);
            return prev.map(i => i.id === id ? { ...i, zIndex: maxZ + 1 } : i);
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!draggingId || !sofaRef.current) return;

        const rect = sofaRef.current.getBoundingClientRect();
        let newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        let newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

        newX = Math.max(0, Math.min(90, newX));
        newY = Math.max(0, Math.min(85, newY));

        setCompItems(prev => prev.map(i => i.id === draggingId ? { ...i, x: newX, y: newY } : i));
    };

    const handlePointerUp = () => setDraggingId(null);

    const updateItemSize = (id: string, size: CushionSize) => {
        setCompItems(prev => prev.map(i => i.id === id ? { ...i, size } : i));
    };

    const removeItem = (id: string) => {
        setCompItems(prev => prev.filter(i => i.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const getItemDisplayName = (item: CompositionItem) => {
        const sameProductItems = compItems.filter(i => i.product.id === item.product.id);
        if (sameProductItems.length <= 1) return item.product.name;
        
        const index = sameProductItems.findIndex(i => i.id === item.id);
        return index === 0 ? item.product.name : `${item.product.name} ${index + 1}`;
    };

    const handleShareCurrentDesign = async () => {
        if (compItems.length === 0 || !canvasRef.current) return;
        
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Determinar se vamos usar a imagem da IA ou o Sofá Virtual
            const useAIImage = !!generatedImage;

            // Configuração de Dimensões
            const W = 1080; // Largura padrão Instagram/Whats
            const HEADER_H = 200; // Espaço para o Logo
            const VISUAL_H = 800; // Altura da área principal (Sofá ou IA)
            
            // Cálculo da grade de itens (Rodapé)
            const uniqueItems = compItems; // Listar todos individualmente
            const COLS = 2; // Duas colunas para nomes legíveis
            const ROW_HEIGHT = 350; // Altura generosa para item + nome
            const ROWS = Math.ceil(uniqueItems.length / COLS);
            const FOOTER_CONTENT_H = ROWS * ROW_HEIGHT;
            const FOOTER_PADDING = 50;
            const TOTAL_FOOTER_H = FOOTER_CONTENT_H + (FOOTER_PADDING * 2) + 80; // +80 para título "Itens"

            const H = HEADER_H + VISUAL_H + TOTAL_FOOTER_H;
            
            canvas.width = W; 
            canvas.height = H;

            // 1. Fundo Geral
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);

            // 2. Cabeçalho com Logo
            const logoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
            const logoImg = new Image();
            logoImg.crossOrigin = 'Anonymous';
            logoImg.src = logoUrl;
            await new Promise((resolve, reject) => {
                logoImg.onload = resolve;
                logoImg.onerror = () => { console.warn("Logo failed to load"); resolve(null); };
            });

            if (logoImg.complete) {
                const logoRatio = logoImg.width / logoImg.height;
                const drawH = 140; 
                const drawW = drawH * logoRatio;
                const drawX = (W - drawW) / 2;
                const drawY = (HEADER_H - drawH) / 2;
                ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
            }

            // 3. Área Visual Principal
            if (useAIImage && generatedImage) {
                // Renderizar Imagem da IA
                const aiImg = new Image();
                aiImg.crossOrigin = 'Anonymous';
                aiImg.src = generatedImage;
                await new Promise(r => aiImg.onload = r);
                
                // Centralizar e cobrir (cover)
                const sRatio = aiImg.width / aiImg.height;
                const dRatio = W / VISUAL_H;
                let sx, sy, sw, sh;

                if (sRatio > dRatio) {
                    sh = aiImg.height;
                    sw = sh * dRatio;
                    sx = (aiImg.width - sw) / 2;
                    sy = 0;
                } else {
                    sw = aiImg.width;
                    sh = sw / dRatio;
                    sx = 0;
                    sy = (aiImg.height - sh) / 2;
                }
                
                ctx.drawImage(aiImg, sx, sy, sw, sh, 0, HEADER_H, W, VISUAL_H);
                
                // Tag "IA" discreta
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(W - 120, HEADER_H + VISUAL_H - 40, 120, 40);
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText("Design IA", W - 100, HEADER_H + VISUAL_H - 15);

            } else {
                // Renderizar Sofá Virtual
                // Para o canvas de exportação, usamos a cor sólida por simplicidade e robustez
                ctx.fillStyle = selectedSofaColor.hex;
                ctx.fillRect(0, HEADER_H, W, VISUAL_H);
                
                // Desenhar almofadas
                for (const item of [...compItems].sort((a,b) => a.zIndex - b.zIndex)) {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = item.product.baseImageUrl;
                    await new Promise(res => img.onload = res);

                    const baseSize = 300;
                    let drawW = baseSize; let drawH = baseSize;

                    if (item.size === CushionSize.SQUARE_40) { drawW = 250; drawH = 250; }
                    else if (item.size === CushionSize.SQUARE_50) { drawW = 340; drawH = 340; }
                    else if (item.size === CushionSize.SQUARE_60) { drawW = 400; drawH = 400; }
                    else if (item.size === CushionSize.LUMBAR) { drawW = 360; drawH = 210; }

                    const posX = (item.x / 100) * W;
                    // Ajustar Y para ficar dentro da área VISUAL_H, considerando o offset do HEADER_H
                    const relativeY = (item.y / 100) * (VISUAL_H - 400); 
                    const posY = HEADER_H + 100 + relativeY;

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.35)';
                    ctx.shadowBlur = 40;
                    ctx.shadowOffsetY = 20;
                    ctx.drawImage(img, posX, posY, drawW, drawH);
                    
                    // Marca d'água de tamanho na almofada (apenas no modo sofá)
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.beginPath();
                    ctx.roundRect(posX + 10, posY + 10, 80, 28, 6);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.size, posX + 50, posY + 29);
                    ctx.restore();
                }
            }

            // 4. Rodapé com Grade de Produtos (Estilo Catálogo)
            let startY = HEADER_H + VISUAL_H + 40;
            
            // Título da Seção
            ctx.fillStyle = '#A21CAF'; // Roxo/Fúcsia da marca
            ctx.font = '900 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("ITENS SELECIONADOS", W / 2, startY);
            
            // Linha decorativa
            ctx.beginPath();
            ctx.moveTo(W/2 - 100, startY + 15);
            ctx.lineTo(W/2 + 100, startY + 15);
            ctx.strokeStyle = '#F0ABFC';
            ctx.lineWidth = 4;
            ctx.stroke();

            startY += 60;

            // Renderizar Grade
            const colWidth = W / COLS;
            
            for (let i = 0; i < uniqueItems.length; i++) {
                const item = uniqueItems[i];
                const col = i % COLS;
                const row = Math.floor(i / COLS);
                
                const itemX = col * colWidth;
                const itemY = startY + (row * ROW_HEIGHT);
                const centerX = itemX + (colWidth / 2);

                const itemImg = new Image();
                itemImg.crossOrigin = 'Anonymous';
                itemImg.src = item.product.baseImageUrl;
                await new Promise(r => itemImg.onload = r);

                // Desenhar Imagem do Produto
                const thumbSize = 200;
                // Centralizar imagem na célula
                const imgX = centerX - (thumbSize / 2);
                const imgY = itemY + 20;
                
                // Sombra leve
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.15)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetY = 5;
                ctx.drawImage(itemImg, imgX, imgY, thumbSize, thumbSize);
                ctx.restore();

                // Texto: Nome da Almofada (Abaixo da imagem)
                const textY = imgY + thumbSize + 40;
                const displayName = getItemDisplayName(item).toUpperCase();
                
                ctx.textAlign = 'center';
                ctx.fillStyle = '#111827'; // Preto suave
                ctx.font = 'bold 24px sans-serif';
                
                // Quebra de linha simples se nome for muito longo
                const maxTextW = colWidth - 40;
                if (ctx.measureText(displayName).width > maxTextW) {
                    const words = displayName.split(' ');
                    const half = Math.ceil(words.length / 2);
                    const line1 = words.slice(0, half).join(' ');
                    const line2 = words.slice(half).join(' ');
                    ctx.fillText(line1, centerX, textY);
                    ctx.fillText(line2, centerX, textY + 30);
                    
                    // Tamanho e Tecido
                    ctx.fillStyle = '#6B7280'; // Cinza
                    ctx.font = '500 20px sans-serif';
                    ctx.fillText(`${item.size} | ${item.product.fabricType}`, centerX, textY + 65);

                } else {
                    ctx.fillText(displayName, centerX, textY);
                    
                    // Tamanho e Tecido
                    ctx.fillStyle = '#6B7280'; // Cinza
                    ctx.font = '500 20px sans-serif';
                    ctx.fillText(`${item.size} | ${item.product.fabricType}`, centerX, textY + 35);
                }
            }

            // Exportar
            canvas.toBlob(async (blob) => {
                if (blob && navigator.share) {
                    const file = new File([blob], 'minha-composicao-teca.png', { type: 'image/png' });
                    await navigator.share({
                        title: 'Minha Composição - Lojas Têca',
                        text: 'Confira as almofadas que escolhi!',
                        files: [file]
                    });
                }
            }, 'image/png', 0.95);
        } catch (e) {
            console.error(e);
            alert("Erro ao criar a imagem de compartilhamento.");
        }
    };

    const handleGenerate = async () => {
        if (compItems.length === 0) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const namePrompt = `Crie um nome luxuoso para uma vitrine de almofadas: ${compItems.map(i => i.product.name).join(', ')}. Apenas o nome.`;
            const nameRes = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: namePrompt });
            setGeneratedName(nameRes.text?.trim() || 'Nova Coleção');

            const imageParts = await Promise.all(compItems.map(i => getBase64FromImageUrl(i.product.baseImageUrl).then(img => ({ inlineData: img }))));
            const imagePrompt = `Crie uma foto de revista de decoração. Almofadas organizadas realisticamente em um sofá de ${selectedSofaFabric.name.toLowerCase()} cor ${selectedSofaColor.name.toLowerCase()}. Use estas almofadas: ${compItems.map(i => `${i.product.name} no tamanho ${i.size}`).join(', ')}. Iluminação quente de fim de tarde. Foco na textura do ${selectedSofaFabric.name}.`;
            
            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, { text: imagePrompt }] }
            });

            const imagePart = imgRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                setGeneratedImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            }
        } catch (e) {
            console.error("AI Generation Error:", e);
            alert("Erro na IA. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = (name: string) => {
        onSaveComposition({
            name,
            products: compItems.map(i => i.product),
            productSizes: compItems.map(i => i.size),
            items: compItems,
            imageUrl: generatedImage || undefined,
            size: compItems.length,
            sofaFabric: selectedSofaFabric.name,
            sofaColor: selectedSofaColor.name
        });
        setIsSaveModalOpen(false);
        onNavigate(View.COMPOSITIONS);
    };

    const cardClasses = isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200 shadow-xl";
    const textClasses = isDark ? "text-gray-300" : "text-gray-600";
    const titleClasses = isDark ? "text-white" : "text-gray-900";

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <main className="flex-grow overflow-y-auto px-4 pt-20 pb-52 no-scrollbar z-10" onClick={() => setSelectedId(null)}>
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center">
                        <h1 className={`text-4xl font-black uppercase tracking-tighter ${titleClasses}`}>Sofá Virtual</h1>
                        <p className={`${textClasses} text-sm font-medium uppercase tracking-widest`}>Arranjo Livre & Catálogo no Zap</p>
                    </div>

                    {/* 1. Botão Adicionar (Topo) */}
                    <button onClick={() => setIsProductSelectOpen(true)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                        Adicionar Almofadas
                    </button>

                    {/* 2. Área do Sofá Virtual */}
                    <div className={`relative p-2 rounded-[2.5rem] border ${cardClasses} overflow-hidden shadow-2xl`}>
                        {/* Controles no TOPO (Superior) */}
                        <div className="p-4 bg-black/5 rounded-t-[2rem] border-b border-black/5 mb-[-20px] pb-8 z-10 relative">
                            <div className="space-y-4">
                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">Tecido do Sofá</label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {SOFA_FABRICS.map(f => (
                                            <button 
                                                key={f.name} 
                                                onClick={() => setSelectedSofaFabric(f)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase whitespace-nowrap transition-all border ${selectedSofaFabric.name === f.name ? 'bg-fuchsia-600 text-white border-fuchsia-500' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">Cor do Sofá</label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                        {PREDEFINED_SOFA_COLORS.map(c => (
                                            <button 
                                                key={c.name} 
                                                onClick={() => setSelectedSofaColor(c)} 
                                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${selectedSofaColor.name === c.name ? 'ring-2 ring-fuchsia-500 ring-offset-2 scale-110' : 'border-black/10 opacity-60'}`}
                                                style={{ backgroundColor: c.hex }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sofá Visual (Agora abaixo dos controles) */}
                        <div 
                            ref={sofaRef}
                            className="relative min-h-[450px] rounded-[2rem] transition-all duration-500 overflow-hidden z-0 mt-2"
                            style={{ 
                                backgroundColor: selectedSofaColor.hex,
                                backgroundImage: selectedSofaFabric.pattern,
                                backgroundBlendMode: 'multiply', // Melhor blend para texturas realistas
                                backgroundSize: '250px', // Escala da textura para parecer real
                                boxShadow: 'inset 0 20px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1), transparent, rgba(0,0,0,0.2))' }}></div>

                            {compItems.map((item) => {
                                const isSelected = selectedId === item.id;
                                const displayName = getItemDisplayName(item);
                                
                                return (
                                    <div
                                        key={item.id}
                                        onPointerDown={(e) => handleStartDrag(e, item.id)}
                                        className={`absolute cursor-move select-none touch-none transition-shadow ${isSelected ? 'ring-4 ring-fuchsia-500 rounded-xl' : ''}`}
                                        style={{ 
                                            left: `${item.x}%`, 
                                            top: `${item.y}%`, 
                                            zIndex: item.zIndex,
                                            width: SIZE_SCALES[item.size].w,
                                            height: SIZE_SCALES[item.size].h,
                                            transition: draggingId === item.id ? 'none' : 'all 0.2s ease-out'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Efeito de "Enchimento de Fibra": Sombra interna e bordas arredondadas */}
                                        <div className="relative w-full h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.15),0_10px_20px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden border-2 border-white/20 group bg-white">
                                            <img src={item.product.baseImageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                                            
                                            {/* Marca d'água de tamanho (Superior Esquerdo) */}
                                            <div className="absolute top-1 left-1 bg-black/40 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter pointer-events-none border border-white/10">
                                                {item.size}
                                            </div>

                                            {/* Nome com número (Badge Inferior) */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <p className="text-[7px] text-white font-black truncate text-center uppercase tracking-tighter">{displayName}</p>
                                            </div>
                                        </div>

                                        {/* Botão de Excluir Externo */}
                                        {isSelected && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} 
                                                className="absolute -top-4 -right-4 w-9 h-9 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-[60] transition-transform active:scale-75 hover:bg-red-700"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={4}/></svg>
                                            </button>
                                        )}
                                        
                                        {/* Seletor de Tamanho Flutuante */}
                                        {isSelected && (
                                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md p-1.5 rounded-xl flex gap-1 shadow-2xl animate-fade-in border border-white/10">
                                                {Object.values(CushionSize).map(s => (
                                                    <button 
                                                        key={s} 
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={() => updateItemSize(item.id, s)}
                                                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${item.size === s ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {compItems.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 uppercase tracking-widest font-black text-center p-8">
                                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeWidth={2}/></svg>
                                    Use o botão acima para<br/>adicionar almofadas
                                </div>
                            )}
                        </div>

                        {/* Botões de Ação na base */}
                        <div className="p-4 bg-black/5 space-y-4 rounded-b-[2.5rem]">
                            <div className="flex flex-col gap-3">
                                {/* 1. Botão Compartilhar (Vem Primeiro) */}
                                <button onClick={handleShareCurrentDesign} disabled={compItems.length === 0} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isDark ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    Compartilhar no Whats
                                </button>

                                {/* 2. Botão IA (Vem Depois) */}
                                <button onClick={handleGenerate} disabled={isGenerating || compItems.length === 0} className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Gerar imagem IA'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {generatedImage && (
                        <div className={`p-8 rounded-[2.5rem] border animate-fade-in-up ${cardClasses}`}>
                            <h2 className={`text-2xl font-black text-center mb-6 uppercase tracking-tighter ${titleClasses}`}>{generatedName}</h2>
                            <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
                                <img src={generatedImage} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-black uppercase tracking-widest text-xs">Simulação Realista</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSaveModalOpen(true)} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs hover:bg-green-700 transition-all">Salvar na Minha Galeria</button>
                        </div>
                    )}
                </div>
            </main>

            {isProductSelectOpen && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsProductSelectOpen(false)} 
                    onConfirm={handleAddProducts} 
                    initialSelectedIds={[]}
                    maxSelection={10}
                />
            )}
            
            {isSaveModalOpen && (
                <SaveCompositionModal 
                    isOpen={isSaveModalOpen} 
                    onClose={() => setIsSaveModalOpen(false)} 
                    onConfirm={handleSave} 
                    predefinedName={generatedName}
                />
            )}
            
             <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s forwards; }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default CompositionGeneratorScreen;
