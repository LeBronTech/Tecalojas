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

interface SofaSlot {
    id: string;
    size: CushionSize;
    x: number; // percent position relative to sofa container
    y: number; // percent position relative to sofa container
    assignedProduct: Product | null;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
}

// 6 Simple visual presets for sofa arrangements
const PRESET_TEMPLATES = [
    {
        name: 'Sozinha',
        description: '1 Almofada',
        icon: '🔸',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_45, x: 42, y: 34, assignedProduct: null }
        ]
    },
    {
        name: 'Dupla',
        description: '2 Almofadas',
        icon: '🔸🔸',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_50, x: 24, y: 28, assignedProduct: null },
            { id: 'slot-2', size: CushionSize.SQUARE_50, x: 58, y: 28, assignedProduct: null }
        ]
    },
    {
        name: 'Trio',
        description: '3 Almofadas',
        icon: '🔸🔹🔸',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_50, x: 18, y: 28, assignedProduct: null },
            { id: 'slot-2', size: CushionSize.SQUARE_50, x: 62, y: 28, assignedProduct: null },
            { id: 'slot-3', size: CushionSize.LUMBAR, x: 40, y: 44, assignedProduct: null }
        ]
    },
    {
        name: 'Quatro',
        description: '4 Almofadas',
        icon: '🔹🔸🔹🔸',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_50, x: 15, y: 24, assignedProduct: null },
            { id: 'slot-2', size: CushionSize.SQUARE_45, x: 27, y: 36, assignedProduct: null },
            { id: 'slot-3', size: CushionSize.SQUARE_50, x: 65, y: 24, assignedProduct: null },
            { id: 'slot-4', size: CushionSize.LUMBAR, x: 49, y: 44, assignedProduct: null }
        ]
    },
    {
        name: 'Cinco',
        description: '5 Almofadas',
        icon: '🔹🔹🔹🔹🔹',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_60, x: 12, y: 21, assignedProduct: null },
            { id: 'slot-2', size: CushionSize.SQUARE_50, x: 25, y: 30, assignedProduct: null },
            { id: 'slot-3', size: CushionSize.SQUARE_60, x: 64, y: 21, assignedProduct: null },
            { id: 'slot-4', size: CushionSize.SQUARE_50, x: 50, y: 30, assignedProduct: null },
            { id: 'slot-5', size: CushionSize.LUMBAR, x: 39, y: 45, assignedProduct: null }
        ]
    },
    {
        name: 'Seis Almofadas',
        description: '6 Almofadas',
        icon: '💎💎💎💎💎💎',
        slots: [
            { id: 'slot-1', size: CushionSize.SQUARE_60, x: 12, y: 21, assignedProduct: null },
            { id: 'slot-2', size: CushionSize.SQUARE_50, x: 23, y: 28, assignedProduct: null },
            { id: 'slot-3', size: CushionSize.SQUARE_60, x: 66, y: 21, assignedProduct: null },
            { id: 'slot-4', size: CushionSize.SQUARE_50, x: 51, y: 28, assignedProduct: null },
            { id: 'slot-5', size: CushionSize.LUMBAR, x: 30, y: 44, assignedProduct: null },
            { id: 'slot-6', size: CushionSize.LUMBAR, x: 49, y: 44, assignedProduct: null }
        ]
    }
];

// Determine natural stacking order so smaller cushions always sit elegantly over larger ones
const getZIndexForSize = (size: CushionSize): number => {
    switch (size) {
        case CushionSize.SQUARE_60: return 10;
        case CushionSize.SQUARE_50: return 20;
        case CushionSize.SQUARE_45: return 30;
        case CushionSize.SQUARE_40: return 40;
        case CushionSize.LUMBAR: return 50;
        default: return 30;
    }
};

const getWallBackgroundClasses = (colorName: string): string => {
    const name = colorName.toLowerCase();
    
    // Sofa colors in Portuguese: Branco, Bege, Cinza, Marrom Escuro, Preto, Azul Marinho
    // When dark sofas are selected (cinza, marrom, azul, preto), style a light, high-contrast cozy wall.
    // When light sofas are selected (branco, bege), style a medium/dark contrasting elegant concrete/wood wall.
    
    if (name.includes('branco')) {
        // Light sofa -> Elegant medium-dark wall
        return 'from-zinc-400 to-zinc-500 dark:from-zinc-700 dark:to-zinc-850 border-zinc-300 dark:border-zinc-800';
    }
    if (name.includes('bege')) {
        // Light-warm sofa -> Warm gray/stone medium wall
        return 'from-stone-300 to-stone-450 dark:from-stone-700 dark:to-stone-850 border-stone-200 dark:border-stone-800';
    }
    if (name.includes('cinza')) {
        // Gray sofa -> Dynamic light wall
        return 'from-zinc-100 to-zinc-200 dark:from-zinc-150 dark:to-zinc-250 border-zinc-200 dark:border-zinc-300';
    }
    if (name.includes('marrom')) {
        // Dark brown sofa -> Warm light cream/stone wall
        return 'from-stone-50 to-stone-150 dark:from-orange-50/90 dark:to-stone-200/90 border-stone-250 dark:border-stone-300';
    }
    if (name.includes('preto')) {
        // Black sofa -> Bright modern loft wall
        return 'from-zinc-100 to-zinc-250 dark:from-zinc-50 dark:to-zinc-150 border-zinc-200 dark:border-zinc-300';
    }
    if (name.includes('azul')) {
        // Dark blue sofa -> Light ice blue/gray wall
        return 'from-slate-100 to-slate-200 dark:from-sky-50 dark:to-slate-150 border-slate-200 dark:border-slate-300';
    }
    
    // Default fallback (light gray wall in light mode, dark gray in dark mode)
    return 'from-zinc-200 to-zinc-350 dark:from-zinc-800 dark:to-zinc-900 border-zinc-200 dark:border-white/10';
};

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

const getRotatedBase64FromImageUrl = async (imageUrl: string, rotationAngle: number): Promise<{ data: string; mimeType: string }> => {
    if (!rotationAngle || rotationAngle === 0) {
        return getBase64FromImageUrl(imageUrl);
    }
    
    return new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Falha ao obter o contexto do canvas.'));
                    return;
                }
                
                const angleRad = (rotationAngle * Math.PI) / 180;
                const sin = Math.abs(Math.sin(angleRad));
                const cos = Math.abs(Math.cos(angleRad));
                const newWidth = Math.round(img.width * cos + img.height * sin);
                const newHeight = Math.round(img.width * sin + img.height * cos);
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // Translada e rotaciona
                ctx.translate(newWidth / 2, newHeight / 2);
                ctx.rotate(angleRad);
                
                // Desenha centralizado
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                
                const dataUrl = canvas.toDataURL('image/png');
                const parts = dataUrl.split(',');
                const data = parts[1];
                resolve({ mimeType: 'image/png', data });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => {
            getBase64FromImageUrl(imageUrl).then(resolve).catch(reject);
        };
        img.src = imageUrl;
    });
};

const CompositionGeneratorScreen: React.FC<CompositionGeneratorScreenProps> = ({ products, onNavigate, savedCompositions, onSaveComposition }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    // Core Layout and Pool States
    const [activePreset, setActivePreset] = useState<number>(2); // Default to Trio (3 cushions)
    const [slots, setSlots] = useState<SofaSlot[]>(() => {
        // Init slots using Preset 2 (Trio Clássico)
        return PRESET_TEMPLATES[2].slots.map(s => ({ ...s }));
    });
    const [productPool, setProductPool] = useState<Product[]>([]);
    
    const [selectedSofaFabric, setSelectedSofaFabric] = useState(SOFA_FABRICS[0]); // Default Linho (beautiful subtle linen pattern)
    const [selectedSofaColor, setSelectedSofaColor] = useState(PREDEFINED_SOFA_COLORS[1]); // Default Bege (chic and high contrast)
    
    const isWallLight = ['cinza', 'marrom', 'preto', 'azul'].some(term => 
        selectedSofaColor.name.toLowerCase().includes(term)
    );
    
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedName, setGeneratedName] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    
    // Drag and Drop & Selection states
    const [selectedId, setSelectedId] = useState<string | null>(null); // Active slot ID
    const [draggingPoolProduct, setDraggingPoolProduct] = useState<Product | null>(null);
    const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
    const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
    
    const sofaRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Populate initial product pool with catalog items so the workbench is directly filled with design options!
    useEffect(() => {
        if (products.length > 0 && productPool.length === 0) {
            const initialPool = products.slice(0, 8);
            setProductPool(initialPool);
            
            // Auto fill base slots with initial layout cushions for a beautiful first sight!
            setSlots(prev => prev.map((s, index) => ({
                ...s,
                assignedProduct: initialPool[index % initialPool.length] || null
            })));
        }
    }, [products]);

    // Computed composition items to fit existing export / save signatures cleanly!
    const compItems = useMemo<CompositionItem[]>(() => {
        return slots
            .filter(s => s.assignedProduct !== null)
            .map((s, idx) => ({
                id: s.id,
                product: s.assignedProduct!,
                size: s.size,
                x: s.x,
                y: s.y,
                zIndex: getZIndexForSize(s.size) + idx,
                zoom: s.zoom ?? 140,
                offsetX: s.offsetX ?? 0,
                offsetY: s.offsetY ?? 0
            }));
    }, [slots]);

    // Handle adding selected catalog items to our custom board pool
    const handleAddProducts = (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;
        
        const newProducts: Product[] = [];
        selectedIds.forEach((id) => {
            const product = products.find(p => p.id === id);
            if (product && !productPool.some(p => p.id === id)) {
                newProducts.push(product);
            }
        });

        const updatedPool = [...productPool, ...newProducts];
        setProductPool(updatedPool);
        setIsProductSelectOpen(false);

        // Auto assign to empty slots sequentially if there are empty slots!
        setSlots(prev => {
            let nextProductIdx = 0;
            return prev.map(s => {
                if (!s.assignedProduct && nextProductIdx < newProducts.length) {
                    const assigned = newProducts[nextProductIdx++];
                    return { ...s, assignedProduct: assigned };
                }
                return s;
            });
        });
    };

    // Duplicate a silhouette (slot) matching size, product, zoom, and slight offset position for creativity
    const handleDuplicateSlot = (slotId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;
        
        const newSlotId = `slot-dup-${Date.now()}`;
        const newSlot: SofaSlot = {
            ...slot,
            id: newSlotId,
            // Offset a tiny bit so the copy doesn't fully overlap
            x: Math.min(95, Math.max(5, slot.x + 8)),
            y: Math.min(95, Math.max(5, slot.y + 4)),
        };
        
        setSlots(prev => [...prev, newSlot]);
        setSelectedId(newSlotId);
    };

    // Change layout templates (presets) while keeping already chosen cushions matched to slots sequentially
    const handleSelectPreset = (index: number) => {
        setActivePreset(index);
        const template = PRESET_TEMPLATES[index];
        if (!template) return;

        // Collect currently assigned cushions in order
        const currentSelectedCushions = slots.map(s => s.assignedProduct).filter(Boolean) as Product[];

        const newSlots = template.slots.map((s, idx) => ({
            ...s,
            assignedProduct: currentSelectedCushions[idx] || null
        }));

        setSlots(newSlots);
        setSelectedId(null);
    };

    // Free dragging positioning with React Pointer Events (supports mouse and mobile touch perfectly!)
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, slotId: string) => {
        // Only trigger on primary left-button click or touch tap
        if (e.button !== 0) return;
        
        const targetElement = e.target as HTMLElement;
        // Ignore dragging when clicking action buttons or selectors inside the slot
        if (targetElement.closest('button') || targetElement.closest('input') || targetElement.closest('select')) {
            return;
        }

        setSelectedId(slotId);
        
        const sofaElement = sofaRef.current;
        if (!sofaElement) return;
        
        const rect = sofaElement.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;
        
        const startSlotX = slot.x;
        const startSlotY = slot.y;
        
        const target = e.currentTarget;
        try {
            target.setPointerCapture(e.pointerId);
        } catch (err) {}
        
        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            const percentDeltaX = (deltaX / rect.width) * 100;
            const percentDeltaY = (deltaY / rect.height) * 100;
            
            let newX = startSlotX + percentDeltaX;
            let newY = startSlotY + percentDeltaY;
            
            // Allow sliding slightly off-bounds for maximum flexibility
            newX = Math.max(-15, Math.min(105, newX));
            newY = Math.max(-15, Math.min(105, newY));
            
            setSlots(prev => prev.map(s => s.id === slotId ? { ...s, x: Math.round(newX), y: Math.round(newY) } : s));
        };
        
        const handlePointerUp = (upEvent: PointerEvent) => {
            try {
                target.releasePointerCapture(upEvent.pointerId);
            } catch (err) {}
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
        
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Remove cushion from specific slot (vacant/empty the slot silhouette)
    const handleRemoveProductFromSlot = (slotId: string) => {
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, assignedProduct: null } : s));
        if (selectedId === slotId) setSelectedId(null);
    };

    // Change size of specific slot dynamically (mockup resizes immediately)
    const handleUpdateSlotSize = (slotId: string, size: CushionSize) => {
        setSlots(prev => prev.map(s => s.id === slotId ? { ...s, size } : s));
    };

    // Quick pool-tap cushion placement (assigns pool item to selected slot, or first empty slot)
    const handlePoolProductClick = (product: Product) => {
        setSlots(prev => {
            // 1. If user has selected a slot specifically, assign it there!
            if (selectedId && prev.some(s => s.id === selectedId)) {
                return prev.map(s => s.id === selectedId ? { ...s, assignedProduct: product } : s);
            }
            // 2. Otherwise find the first empty slot
            const firstEmptyIndex = prev.findIndex(s => s.assignedProduct === null);
            if (firstEmptyIndex !== -1) {
                return prev.map((s, idx) => idx === firstEmptyIndex ? { ...s, assignedProduct: product } : s);
            }
            // 3. If all slots are occupied, replace the first slot for easy rotation
            return prev.map((s, idx) => idx === 0 ? { ...s, assignedProduct: product } : s);
        });
    };

    // Randomize assigned products among occupied slots (order swaps, z-index and positions preserved)
    const handleShufflePositions = () => {
        const assignedCushions = slots.map(s => s.assignedProduct).filter(p => p !== null) as Product[];
        if (assignedCushions.length <= 1) return;

        // Durstenfeld shuffle
        const shuffled = [...assignedCushions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        let idx = 0;
        setSlots(prev => prev.map(s => {
            if (s.assignedProduct !== null) {
                return { ...s, assignedProduct: shuffled[idx++] || null };
            }
            return s;
        }));
    };

    // Auto-fill all empty mockups with sequential elements from our sandbox product pool
    const handleAutoFillMocks = () => {
        if (productPool.length === 0) return;
        setSlots(prev => {
            let poolIdx = 0;
            return prev.map(s => {
                if (s.assignedProduct === null) {
                    const prod = productPool[poolIdx % productPool.length];
                    poolIdx++;
                    return { ...s, assignedProduct: prod };
                }
                return s;
            });
        });
    };

    // Vacant/clear all mockups (making them clean silhouettes again)
    const handleClearAllSlots = () => {
        setSlots(prev => prev.map(s => ({ ...s, assignedProduct: null })));
        setSelectedId(null);
    };

    const getItemDisplayName = (item: CompositionItem) => {
        const sameProductItems = compItems.filter(i => i.product.id === item.product.id);
        if (sameProductItems.length <= 1) return item.product.name;
        
        const index = sameProductItems.findIndex(i => i.id === item.id);
        return index === 0 ? item.product.name : `${item.product.name} ${index + 1}`;
    };

    // PNG Export matching our virtual sofa structure completely
    const handleShareCurrentDesign = async () => {
        if (compItems.length === 0 || !canvasRef.current) return;
        
        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const drawContainImage = (c: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
                const imgRatio = img.width / img.height;
                const targetRatio = dw / dh;
                let finalW = dw;
                let finalH = dh;
                let finalX = dx;
                let finalY = dy;
                if (imgRatio > targetRatio) {
                    finalH = dw / imgRatio;
                    finalY = dy + (dh - finalH) / 2;
                } else {
                    finalW = dh * imgRatio;
                    finalX = dx + (dw - finalW) / 2;
                }
                c.drawImage(img, finalX, finalY, finalW, finalH);
            };

            const adjustColorBrightness = (hexColor: string, percent: number) => {
                let color = hexColor.replace('#', '');
                if (color.length === 3) {
                    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
                }
                const num = parseInt(color, 16);
                let r = (num >> 16) + percent;
                let g = ((num >> 8) & 0x00FF) + percent;
                let b = (num & 0x0000FF) + percent;
                r = Math.max(0, Math.min(255, r));
                g = Math.max(0, Math.min(255, g));
                b = Math.max(0, Math.min(255, b));
                const newHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
                return `#${newHex}`;
            };

            const useAIImage = !!generatedImage;

            const W = 1080; 
            const HEADER_H = 200; 
            const VISUAL_H = 800; 
            
            const uniqueItems = compItems; 
            const COLS = 2; 
            const ROW_HEIGHT = 350; 
            const ROWS = Math.ceil(uniqueItems.length / COLS);
            const FOOTER_CONTENT_H = ROWS * ROW_HEIGHT;
            const FOOTER_PADDING = 50;
            const TOTAL_FOOTER_H = FOOTER_CONTENT_H + (FOOTER_PADDING * 2) + 80; 

            const H = HEADER_H + VISUAL_H + TOTAL_FOOTER_H;
            
            canvas.width = W; 
            canvas.height = H;

            // Fundo
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);

            // Cabeçalho
            const logoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
            const logoImg = new Image();
            logoImg.crossOrigin = 'Anonymous';
            logoImg.src = logoUrl;
            await new Promise((resolve) => {
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

            // Área Visual
            if (useAIImage && generatedImage) {
                const aiImg = new Image();
                aiImg.crossOrigin = 'Anonymous';
                aiImg.src = generatedImage;
                await new Promise(r => aiImg.onload = r);
                
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
                
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(W - 120, HEADER_H + VISUAL_H - 40, 120, 40);
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText("Design IA", W - 100, HEADER_H + VISUAL_H - 15);

            } else {
                // Sofa Virtual Esquemático Realista no Canvas de Exportação
                const sofaColor = selectedSofaColor.hex;
                const darkSofaColor = adjustColorBrightness(sofaColor, -25);
                const lightSofaColor = adjustColorBrightness(sofaColor, 20);

                ctx.fillStyle = '#F3F4F6'; 
                ctx.fillRect(0, HEADER_H, W, VISUAL_H);
                
                ctx.fillStyle = '#E5E7EB';
                ctx.fillRect(0, HEADER_H + VISUAL_H - 120, W, 120);

                // Sombra do sofá
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 40;
                ctx.shadowOffsetY = 15;
                ctx.fillStyle = '#9CA3AF';
                ctx.beginPath();
                ctx.roundRect(W * 0.08, HEADER_H + VISUAL_H - 140, W * 0.84, 50, 25);
                ctx.fill();
                ctx.restore();

                // Pés
                ctx.fillStyle = '#2D1F10'; 
                ctx.fillRect(W * 0.14, HEADER_H + VISUAL_H - 130, 25, 50); 
                ctx.fillRect(W * 0.83, HEADER_H + VISUAL_H - 130, 25, 50); 

                // Encosto
                ctx.save();
                ctx.fillStyle = sofaColor;
                ctx.shadowColor = 'rgba(0,0,0,0.15)';
                ctx.shadowBlur = 25;
                ctx.shadowOffsetY = 12;
                ctx.beginPath();
                ctx.roundRect(W * 0.08, HEADER_H + VISUAL_H * 0.15, W * 0.84, VISUAL_H * 0.45, [40, 40, 0, 0]);
                ctx.fill();
                ctx.restore();

                // Costura vertical encosto
                ctx.strokeStyle = darkSofaColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(W / 2, HEADER_H + VISUAL_H * 0.15);
                ctx.lineTo(W / 2, HEADER_H + VISUAL_H * 0.6);
                ctx.stroke();

                // Assento
                ctx.save();
                ctx.fillStyle = lightSofaColor; 
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetY = 15;
                ctx.beginPath();
                ctx.roundRect(W * 0.11, HEADER_H + VISUAL_H * 0.48, W * 0.78, VISUAL_H * 0.35, 24);
                ctx.fill();
                ctx.restore();

                // Costura central assento
                ctx.strokeStyle = darkSofaColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(W / 2, HEADER_H + VISUAL_H * 0.48);
                ctx.lineTo(W / 2, HEADER_H + VISUAL_H * 0.83);
                ctx.stroke();

                // Braço Esquerdo
                ctx.save();
                ctx.fillStyle = darkSofaColor;
                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(W * 0.02, HEADER_H + VISUAL_H * 0.32, W * 0.12, VISUAL_H * 0.53, 30);
                ctx.fill();
                ctx.restore();

                // Braço Direito
                ctx.save();
                ctx.fillStyle = darkSofaColor;
                ctx.shadowColor = 'rgba(0,0,0,0.18)';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.roundRect(W * 0.86, HEADER_H + VISUAL_H * 0.32, W * 0.12, VISUAL_H * 0.53, 30);
                ctx.fill();
                ctx.restore();

                // Renderizar Almofadas no exportador (Somente as que estão preenchidas/residentes!)
                for (const item of [...compItems].sort((a,b) => a.zIndex - b.zIndex)) {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = item.product.baseImageUrl;
                    await new Promise(res => img.onload = res);

                    const getNumericSize = (sizeStr: string): number => {
                        return parseFloat(sizeStr.replace('px', ''));
                    };

                    const refWidth = 580; 
                    const scaleFactor = W / refWidth;

                    const origW = getNumericSize(SIZE_SCALES[item.size].w);
                    const origH = getNumericSize(SIZE_SCALES[item.size].h);

                    const drawW = origW * scaleFactor;
                    const drawH = origH * scaleFactor;

                    const posX = (item.x / 100) * W;
                    const posY = HEADER_H + (item.y / 100) * VISUAL_H;

                    // Sombra cushion
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.35)';
                    ctx.shadowBlur = 30;
                    ctx.shadowOffsetY = 15;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    // Draw pointed cushion shape for shadow
                    const xValShadow = (p: number) => posX + (p / 100) * drawW;
                    const yValShadow = (p: number) => posY + (p / 100) * drawH;
                    ctx.moveTo(xValShadow(10), yValShadow(10));
                    ctx.quadraticCurveTo(xValShadow(50), yValShadow(2), xValShadow(90), yValShadow(10));
                    ctx.quadraticCurveTo(xValShadow(98), yValShadow(50), xValShadow(90), yValShadow(90));
                    ctx.quadraticCurveTo(xValShadow(50), yValShadow(98), xValShadow(10), yValShadow(90));
                    ctx.quadraticCurveTo(xValShadow(2), yValShadow(50), xValShadow(10), yValShadow(10));
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();

                    // Imagem clipada com puffy look e zoom/offsets aplicados corretamente
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(xValShadow(10), yValShadow(10));
                    ctx.quadraticCurveTo(xValShadow(50), yValShadow(2), xValShadow(90), yValShadow(10));
                    ctx.quadraticCurveTo(xValShadow(98), yValShadow(50), xValShadow(90), yValShadow(90));
                    ctx.quadraticCurveTo(xValShadow(50), yValShadow(98), xValShadow(10), yValShadow(90));
                    ctx.quadraticCurveTo(xValShadow(2), yValShadow(50), xValShadow(10), yValShadow(10));
                    ctx.closePath();
                    ctx.clip();

                    // Sizing 'object-cover' logic on canvas plus live zoom/offsets!
                    const imgRatio = img.width / img.height;
                    const targetRatio = drawW / drawH;
                    let baseW = drawW;
                    let baseH = drawH;
                    if (imgRatio > targetRatio) {
                        baseW = drawH * imgRatio;
                    } else {
                        baseH = drawW / imgRatio;
                    }

                    const centerX = posX + drawW / 2;
                    const centerY = posY + drawH / 2;
                    ctx.translate(centerX, centerY);

                    // Aplica rotação salva da almofada
                    const rotationDeg = item.product.imageRotation || 0;
                    if (rotationDeg !== 0) {
                        ctx.rotate(rotationDeg * Math.PI / 180);
                    }

                    // Apply zoom (from slots state)
                    const zoomVal = item.zoom ?? 140;
                    const zoomFactor = zoomVal / 100;
                    ctx.scale(zoomFactor, zoomFactor);

                    // Apply offsets (from slots state)
                    const oxVal = item.offsetX ?? 0;
                    const oyVal = item.offsetY ?? 0;
                    const tx = (oxVal / 100) * baseW;
                    const ty = (oyVal / 100) * baseH;
                    ctx.translate(tx, ty);

                    // Draw centered at origin
                    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
                    ctx.restore();
                    
                    // Tag discreta de tamanho
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.beginPath();
                    const labelW = 75;
                    const labelH = 26;
                    ctx.roundRect(posX + 8, posY + 8, labelW, labelH, 6);
                    ctx.fill();
                    
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(item.size, posX + 8 + labelW / 2, posY + 8 + labelH / 2);
                    ctx.restore();
                }
            }

            // Rodapé com os produtos do catálogo
            let startY = HEADER_H + VISUAL_H + 40;
            
            ctx.fillStyle = '#A21CAF'; 
            ctx.font = '900 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("ITENS SELECIONADOS", W / 2, startY);
            
            ctx.beginPath();
            ctx.moveTo(W/2 - 100, startY + 15);
            ctx.lineTo(W/2 + 100, startY + 15);
            ctx.strokeStyle = '#F0ABFC';
            ctx.lineWidth = 4;
            ctx.stroke();

            startY += 60;

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

                const thumbSize = 200;
                const imgX = centerX - (thumbSize / 2);
                const imgY = itemY + 20;

                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.08)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 6;
                ctx.fillStyle = '#FAFAFA'; 
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, thumbSize, thumbSize, 20);
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, thumbSize, thumbSize, 20);
                ctx.clip();
                drawContainImage(ctx, itemImg, imgX, imgY, thumbSize, thumbSize);
                ctx.restore();

                const textY = imgY + thumbSize + 40;
                const displayName = getItemDisplayName(item).toUpperCase();
                
                ctx.textAlign = 'center';
                ctx.fillStyle = '#111827'; 
                ctx.font = 'bold 24px sans-serif';
                
                const maxTextW = colWidth - 40;
                if (ctx.measureText(displayName).width > maxTextW) {
                    const words = displayName.split(' ');
                    const half = Math.ceil(words.length / 2);
                    const line1 = words.slice(0, half).join(' ');
                    const line2 = words.slice(half).join(' ');
                    ctx.fillText(line1, centerX, textY);
                    ctx.fillText(line2, centerX, textY + 30);
                    
                    ctx.fillStyle = '#6B7280'; 
                    ctx.font = '500 20px sans-serif';
                    ctx.fillText(`${item.size} | ${item.product.fabricType}`, centerX, textY + 65);

                } else {
                    ctx.fillText(displayName, centerX, textY);
                    
                    ctx.fillStyle = '#6B7280'; 
                    ctx.font = '500 20px sans-serif';
                    ctx.fillText(`${item.size} | ${item.product.fabricType}`, centerX, textY + 35);
                }
            }

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

            // Passa as imagens rotacionadas para a IA baseado na rotação atualizada do produto
            const imageParts = await Promise.all(
                compItems.map(i => 
                    getRotatedBase64FromImageUrl(i.product.baseImageUrl, i.product.imageRotation || 0)
                        .then(img => ({ inlineData: img }))
                )
            );

            // Constrói descrição detalhada do alinhamento/orientação de estampas de cada almofada para o prompt da IA
            const cushionsDesc = compItems.map(i => {
                const rotation = i.product.imageRotation || 0;
                let orientation = '';
                if (rotation === 90 || rotation === 270) {
                    orientation = ' (com estampa perfeitamente deitada/listras horizontais)';
                } else if (rotation === 180) {
                    orientation = ' (invertida de cabeça para baixo)';
                } else {
                    orientation = ' (com estampa em pé/sentido vertical padrão)';
                }
                return `${i.product.name} no tamanho ${i.size}${orientation}`;
            }).join(', ');

            const imagePrompt = `Crie uma foto de revista de decoração de alto padrão. Almofadas organizadas realisticamente e perfeitamente dispostas sobre um sofá de ${selectedSofaFabric.name.toLowerCase()} de cor ${selectedSofaColor.name.toLowerCase()}. Use estas almofadas na composição: ${cushionsDesc}. Preste extrema atenção à rotação e orientação do desenho das almofadas enviadas que foram rotacionadas (se enviamos a imagem deitada ou horizontal, o sofá deve conter a almofada exatamente com aquela estampa deitada/horizontal). Iluminação aconchegante de fim de tarde. Foco na textura luxuosa dos tecidos.`;
            
            const imgRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...imageParts, { text: imagePrompt }] }
            });

            const imagePart = imgRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const b64Str = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedImage(b64Str);
                

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

    const cardClasses = isDark ? "bg-black/60 border-white/10" : "bg-white border-zinc-200 shadow-xl";
    const textClasses = isDark ? "text-zinc-300" : "text-zinc-600";
    const titleClasses = isDark ? "text-white" : "text-zinc-900";

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden" onClick={() => setSelectedId(null)}>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* SVG clip-path definition for pointed cushion shape */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <clipPath id="cushion-clip" clipPathUnits="objectBoundingBox">
                        <path d="M 0.1,0.1 Q 0.5,0.02 0.9,0.1 Q 0.98,0.5 0.9,0.9 Q 0.5,0.98 0.1,0.9 Q 0.02,0.5 0.1,0.1 Z" />
                    </clipPath>
                </defs>
            </svg>
            
            <main className="flex-grow overflow-y-auto px-4 pt-20 pb-52 no-scrollbar z-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="text-center">
                        <h1 className={`text-4xl font-black uppercase tracking-tighter ${titleClasses}`}>Sofá Virtual 3D</h1>
                        <p className="text-fuchsia-500 text-xs font-black uppercase tracking-widest mt-1">Monte o seu sofá</p>
                    </div>

                    {/* 1. SELEÇÃO DE LAYOUT PRESET (Modelos de Almofada) */}
                    <div className={`p-4 rounded-3xl border ${cardClasses}`}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-3 block text-center">
                            Selecione a Quantidade de Almofadas no Sofá
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {PRESET_TEMPLATES.map((tpl, idx) => (
                                <button
                                    key={tpl.name}
                                    onClick={() => handleSelectPreset(idx)}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all ${
                                        activePreset === idx
                                            ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg scale-105'
                                            : isDark
                                                ? 'bg-zinc-900/60 border-white/10 hover:border-white/20 text-zinc-300'
                                                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700'
                                    }`}
                                >
                                    <span className="text-lg leading-none mb-1">{tpl.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter text-center">{tpl.name}</span>
                                    <span className="text-[7px] opacity-70 font-bold whitespace-nowrap mt-0.5">{tpl.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. AREA PRINCIPAL DO SOFÁ VIRTUAL */}
                    <div className={`relative p-2 rounded-[2.5rem] border ${cardClasses} overflow-hidden shadow-2xl`}>
                        
                        {/* Controles do Móvel: Tecido e Cor */}
                        <div className="p-4 bg-black/5 dark:bg-black/20 rounded-t-[2rem] border-b border-black/5 pb-4 z-10 relative">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">
                                        Superfície do Estofado (Textura)
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {SOFA_FABRICS.map(f => (
                                            <button 
                                                key={f.name} 
                                                onClick={() => setSelectedSofaFabric(f)}
                                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all border-2 ${
                                                    selectedSofaFabric.name === f.name 
                                                        ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-md' 
                                                        : isDark 
                                                            ? 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20' 
                                                            : 'bg-white text-zinc-600 border-zinc-200'
                                                }`}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-fuchsia-500 mb-2 block">
                                        Tom de Cor do Sofá
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                                        {PREDEFINED_SOFA_COLORS.map(c => (
                                            <button 
                                                key={c.name} 
                                                onClick={() => setSelectedSofaColor(c)} 
                                                title={c.name}
                                                className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition-all ${
                                                    selectedSofaColor.name === c.name 
                                                        ? 'ring-2 ring-fuchsia-500 ring-offset-2 scale-110 shadow-lg' 
                                                        : 'border-black/10 opacity-70 hover:opacity-100'
                                                }`}
                                                style={{ backgroundColor: c.hex }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MOVED: Paleta de Almofadas Disponíveis (Moved above the sofa!) */}
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border-b border-zinc-100 dark:border-white/5 space-y-3 z-10 relative">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                                <div>
                                    <h3 className={`text-[10px] font-black uppercase tracking-wider ${titleClasses}`}>
                                        Paleta de Almofadas Disponíveis ({productPool.length})
                                    </h3>
                                    <p className="text-zinc-500 text-[8px] uppercase font-bold mt-0.5">
                                        Arraste para uma almofada do sofá ou toque para aplicar automaticamente!
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsProductSelectOpen(true)} 
                                    className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black uppercase tracking-wider text-[8px] rounded-lg flex items-center gap-1 transition-all shadow-md active:scale-95"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                                    Escolher do Catálogo
                                </button>
                            </div>

                            {productPool.length === 0 ? (
                                <div className="text-center py-4 border-2 border-dashed border-zinc-300 dark:border-white/10 rounded-xl text-zinc-400 uppercase text-[9px] font-black tracking-widest leading-relaxed bg-black/5">
                                    Nenhuma estampa adicionada ainda.<br/>Use o botão para escolher tecidos!
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                    {productPool.map(product => (
                                        <div 
                                            key={product.id}
                                            draggable
                                            onDragStart={() => setDraggingPoolProduct(product)}
                                            onDragEnd={() => setDraggingPoolProduct(null)}
                                            onClick={() => handlePoolProductClick(product)}
                                            className={`group relative flex-shrink-0 w-20 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-1.5 cursor-grab active:cursor-grabbing transition-all hover:border-fuchsia-500 hover:scale-105 hover:shadow ${
                                                draggingPoolProduct?.id === product.id ? 'opacity-40 scale-95 border-fuchsia-500' : ''
                                            }`}
                                        >
                                            <div className="aspect-square rounded-lg overflow-hidden mb-1 shadow-inner bg-white relative">
                                                <img 
                                                    src={product.baseImageUrl} 
                                                    alt="" 
                                                    className="w-full h-full object-cover pointer-events-none" 
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[7px] font-black text-white uppercase tracking-widest text-center px-0.5">
                                                        Aplicar 🛋️
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={`text-[7px] font-black uppercase truncate text-center ${titleClasses}`}>{product.name}</p>
                                            <p className="text-[6px] text-zinc-500 text-center font-bold truncate">{product.fabricType}</p>
                                            
                                            {/* Delete from pool icon */}
                                            <button 
                                                type="button"
                                                title="Remover da paleta"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProductPool(prev => prev.filter(p => p.id !== product.id));
                                                    // Clean assigned slots pointing to this product
                                                    setSlots(prev => prev.map(s => s.assignedProduct?.id === product.id ? { ...s, assignedProduct: null } : s));
                                                }}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all text-[8px]"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sofá Virtual Container com Silhuetas de Enchimento (Slots) */}
                        <div 
                            ref={sofaRef}
                            className={`relative min-h-[460px] rounded-[2rem] transition-all duration-500 overflow-hidden mt-2 z-0 bg-gradient-to-b ${getWallBackgroundClasses(selectedSofaColor.name)} border`}
                        >
                            {/* Chão e Fundo */}
                            <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-b from-amber-50/5 to-amber-100/5 dark:from-zinc-800/10 dark:to-zinc-950/10 border-t border-black/5 z-0" />
                            <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-zinc-400/20 dark:bg-black/30 z-0" />

                            {/* Pés de Madeira */}
                            <div className="absolute bottom-[4%] left-[16%] w-4 h-12 bg-[#2d1f10] rounded-b-md shadow-md transform rotate-12 origin-top z-[1] border-r border-black/20" />
                            <div className="absolute bottom-[4%] right-[16%] w-4 h-12 bg-[#2d1f10] rounded-b-md shadow-md transform -rotate-12 origin-top z-[1] border-l border-black/20" />

                            {/* Encosto do Sofá */}
                            <div 
                                className="absolute top-[12%] left-[8%] right-[8%] h-[40%] rounded-t-[2.5rem] border border-black/15 shadow-[inset_0_-15px_30px_rgba(0,0,0,0.18)] transition-all duration-500 z-[2]"
                                style={{
                                    backgroundColor: selectedSofaColor.hex,
                                    backgroundImage: selectedSofaFabric.pattern,
                                    backgroundBlendMode: 'multiply',
                                    backgroundSize: '200px',
                                }}
                            >
                                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-black/15"></div>
                            </div>

                            {/* Assento do Sofá */}
                            <div 
                                className="absolute top-[48%] left-[11%] right-[11%] h-[38%] rounded-3xl border border-black/15 shadow-[0_15px_30px_rgba(0,0,0,0.25),inset_0_8px_15px_rgba(255,255,255,0.1)] transition-all duration-500 z-[3]"
                                style={{
                                    backgroundColor: selectedSofaColor.hex,
                                    backgroundImage: selectedSofaFabric.pattern,
                                    backgroundBlendMode: 'multiply',
                                    backgroundSize: '200px',
                                }}
                            >
                                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-black/15"></div>
                            </div>

                            {/* Braço Esquerdo */}
                            <div 
                                className="absolute top-[32%] left-[2%] w-[12%] h-[53%] rounded-[2rem] border border-black/15 shadow-[inset_15px_0_20px_rgba(0,0,0,0.15),0_10px_20px_rgba(0,0,0,0.15)] transition-all duration-500 z-[4]"
                                style={{
                                    backgroundColor: selectedSofaColor.hex,
                                    backgroundImage: selectedSofaFabric.pattern,
                                    backgroundBlendMode: 'multiply',
                                    backgroundSize: '200px',
                                }}
                            />

                            {/* Braço Direito */}
                            <div 
                                className="absolute top-[32%] right-[2%] w-[12%] h-[53%] rounded-[2rem] border border-black/15 shadow-[inset_-15px_0_20px_rgba(0,0,0,0.15),0_10px_20px_rgba(0,0,0,0.15)] transition-all duration-500 z-[4]"
                                style={{
                                    backgroundColor: selectedSofaColor.hex,
                                    backgroundImage: selectedSofaFabric.pattern,
                                    backgroundBlendMode: 'multiply',
                                    backgroundSize: '200px',
                                }}
                            />

                            {/* Silhuetas / Mockups do Sofá */}
                            {slots.map((slot, idx) => {
                                const isSelected = selectedId === slot.id;
                                const hasProduct = slot.assignedProduct !== null;
                                const isOver = dragOverSlotId === slot.id;
                                
                                const width = SIZE_SCALES[slot.size].w;
                                const height = SIZE_SCALES[slot.size].h;
                                
                                // Retrieve zoom/offsets with sensible, margin-removing defaults
                                const zoomPercent = slot.zoom ?? 140; 
                                const offsetXPercent = slot.offsetX ?? 0;
                                const offsetYPercent = slot.offsetY ?? 0;
                                
                                return (
                                    <div
                                        key={slot.id}
                                        onPointerDown={(e) => handlePointerDown(e, slot.id)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverSlotId(slot.id);
                                        }}
                                        onDragLeave={() => {
                                            setDragOverSlotId(null);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverSlotId(null);
                                            
                                            // Handle Drag from product list pool
                                            if (draggingPoolProduct) {
                                                setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, assignedProduct: draggingPoolProduct } : s));
                                            } 
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedId(slot.id);
                                        }}
                                        className={`absolute select-none cursor-grab active:cursor-grabbing transition-all ${
                                            isSelected 
                                                ? 'scale-[1.03]' 
                                                : isOver
                                                    ? 'scale-110'
                                                    : ''
                                        }`}
                                        style={{
                                            left: `${slot.x}%`,
                                            top: `${slot.y}%`,
                                            width: width,
                                            height: height,
                                            zIndex: isSelected ? 300 : (getZIndexForSize(slot.size) + idx),
                                            filter: hasProduct 
                                                ? 'drop-shadow(0px 12px 18px rgba(0,0,0,0.35)) drop-shadow(0px 4px 6px rgba(0,0,0,0.15))' 
                                                : 'none',
                                            touchAction: 'none'
                                        }}
                                    >
                                        {hasProduct ? (
                                            /* CUSHION EXECUTADO FILLED - Pointed-corners custom cushion with SVGs edge overlay */
                                            <div className="relative w-full h-full transition-all overflow-hidden group">
                                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
                                                    <defs>
                                                        <clipPath id={`clip-${slot.id}`}>
                                                            <path d="M 10,10 Q 50,2 90,10 Q 98,50 90,90 Q 50,98 10,90 Q 2,50 10,10 Z" />
                                                        </clipPath>
                                                    </defs>
                                                    <g clipPath={`url(#clip-${slot.id})`}>
                                                        <image 
                                                            href={slot.assignedProduct!.baseImageUrl} 
                                                            x="0"
                                                            y="0"
                                                            width="100" 
                                                            height="100" 
                                                            preserveAspectRatio="xMidYMid slice"
                                                            style={{
                                                                transform: `scale(${zoomPercent / 100}) translate(${offsetXPercent}%, ${offsetYPercent}%) rotate(${slot.assignedProduct!.imageRotation || 0}deg)`,
                                                                transformOrigin: 'center',
                                                                transformBox: 'fill-box'
                                                            }}
                                                        />
                                                    </g>
                                                    {/* Contour border following the exact curve of the pointed cushion */}
                                                    <path 
                                                        d="M 10,10 Q 50,2 90,10 Q 98,50 90,90 Q 50,98 10,90 Q 2,50 10,10 Z" 
                                                        vectorEffect="non-scaling-stroke"
                                                        fill="none"
                                                        stroke={isSelected ? '#d946ef' : 'rgba(255,255,255,0.45)'}
                                                        strokeWidth={isSelected ? '3.5' : '1.5'}
                                                        style={{
                                                            filter: isSelected ? 'drop-shadow(0 0 4px rgba(217,70,239,0.6))' : 'none'
                                                        }}
                                                    />
                                                </svg>

                                                {/* Size badge */}
                                                <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter border border-white/10">
                                                    {slot.size}
                                                </div>
  
                                                {/* Hover details */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5 pb-2.5 z-10">
                                                    <p className="text-[7.5px] text-white font-black truncate text-center uppercase tracking-widest">{slot.assignedProduct!.name}</p>
                                                    <p className="text-[5.5px] text-zinc-300 font-bold text-center uppercase tracking-tighter">{slot.assignedProduct!.fabricType}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* SILHUETA DE MOCKUP VAZIA - Pointed-corners luxury dashed cushion */
                                            <div className="w-full h-full relative flex flex-col items-center justify-center">
                                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 pointer-events-none">
                                                    <path 
                                                        d="M 10,10 Q 50,2 90,10 Q 98,50 90,90 Q 50,98 10,90 Q 2,50 10,10 Z" 
                                                        vectorEffect="non-scaling-stroke"
                                                        className="transition-all duration-300"
                                                        style={{
                                                            strokeWidth: isOver ? 3 : (isSelected ? 2.5 : 2),
                                                            strokeDasharray: '4,4',
                                                            stroke: isOver 
                                                                ? '#d946ef' 
                                                                : isSelected 
                                                                    ? '#d946ef' 
                                                                    : (isWallLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'),
                                                            fill: isOver 
                                                                ? 'rgba(217,70,239,0.15)' 
                                                                : isWallLight 
                                                                    ? 'rgba(255,255,255,0.45)' 
                                                                    : 'rgba(0,0,0,0.25)'
                                                        }}
                                                    />
                                                </svg>
                                                <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center">
                                                    <svg className={`w-5 h-5 mb-1 opacity-70 animate-pulse ${isWallLight ? 'text-zinc-650' : 'text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isWallLight ? 'bg-black/5 text-zinc-700' : 'bg-black/30 text-zinc-400'}`}>
                                                        {slot.size}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
 
                                        {/* Botão de Excluir Cushion do Mockup */}
                                        {hasProduct && isSelected && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleRemoveProductFromSlot(slot.id); 
                                                }} 
                                                className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-30 transition-transform active:scale-75 hover:bg-red-700"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={4}/></svg>
                                            </button>
                                        )}
 
                                        {/* SELETOR DE TAMANHO / ZOOM E AJUSTE DO MOCKUP COMPLETO */}
                                        {isSelected && (
                                            <div 
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute -bottom-28 left-1/2 -translate-x-1/2 z-[110] bg-zinc-950/95 backdrop-blur-md p-2.5 rounded-2xl flex flex-col gap-2 shadow-2xl border border-white/20 whitespace-nowrap min-w-[185px]"
                                            >
                                                {/* Zoom Slider */}
                                                <div className="flex flex-col gap-1 px-1">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                                                        <span>🔍 Zoom da Estampa</span>
                                                        <span className="text-fuchsia-400 font-bold">{zoomPercent}%</span>
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="100"
                                                        max="300"
                                                        value={zoomPercent}
                                                        onChange={(e) => {
                                                            const newZoom = parseInt(e.target.value);
                                                            setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, zoom: newZoom } : s));
                                                        }}
                                                        className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                                                    />
                                                </div>

                                                {/* Divider */}
                                                <div className="h-[1px] bg-white/10 w-full" />

                                                {/* Size Selector Buttons */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider px-1">📏 Tamanho Almofada</span>
                                                    <div className="flex gap-1 justify-center">
                                                        {Object.values(CushionSize).map(sz => (
                                                            <button 
                                                                type="button"
                                                                key={sz} 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateSlotSize(slot.id, sz);
                                                                }}
                                                                className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                                                    slot.size === sz 
                                                                        ? 'bg-fuchsia-600 text-white shadow-md' 
                                                                        : 'text-zinc-400 hover:text-white bg-white/5'
                                                                }`}
                                                            >
                                                                {sz}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="h-[1px] bg-white/10 w-full" />

                                                {/* Actions row: Duplicar */}
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDuplicateSlot(slot.id, e)}
                                                        className="w-full py-1 text-zinc-950 bg-fuchsia-400 hover:bg-fuchsia-300 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95 duration-150"
                                                    >
                                                        <span>👥 Duplicar Silhueta</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Botões de Ação na base do sofá - Simplificado para conter somente 'Esvaziar Sofá' */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-b-[2.5rem] border-t border-zinc-100 dark:border-white/5 flex justify-center">
                            <button 
                                type="button"
                                onClick={handleClearAllSlots}
                                className="w-full max-w-xs py-3 px-4 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-2xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 shadow transition-all active:scale-[0.98]"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h4m-4-7a1-1 0 00-1-1H9a1-1 0 00-1 1" />
                                </svg>
                                Esvaziar Sofá 🗑️
                            </button>
                        </div>
                    </div>

                    {/* Botões de Ação de Compartilhamento / IA e Salvar */}
                    <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/20 rounded-3xl space-y-4 border border-zinc-200/50 dark:border-white/5">
                        <div className="flex flex-col gap-3">
                            
                            {/* Compartilhar */}
                            <button 
                                onClick={handleShareCurrentDesign} 
                                disabled={compItems.length === 0} 
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                                    compItems.length === 0
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-green-600/10'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                Exportar e Enviar para Zap
                            </button>

                            {/* Salvar Composição */}
                            <button 
                                onClick={() => setIsSaveModalOpen(true)} 
                                disabled={compItems.length === 0} 
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                                    compItems.length === 0
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                        : 'bg-zinc-800 text-white hover:bg-zinc-900 shadow-md'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeWidth={2}/></svg>
                                Salvar Estudo na Minha Galeria
                            </button>

                            {/* Gerar imagem IA */}
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || compItems.length === 0} 
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Gerar Foto de Revista com IA ✨'}
                            </button>
                        </div>
                    </div>

                    {generatedImage && (
                        <div className={`p-8 rounded-[2.5rem] border animate-fade-in-up ${cardClasses}`}>
                            <h2 className={`text-2xl font-black text-center mb-6 uppercase tracking-tighter ${titleClasses}`}>{generatedName}</h2>
                            <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
                                <img src={generatedImage} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-black uppercase tracking-widest text-xs">Simulação High-End Revestida</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSaveModalOpen(true)} className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all">
                                Salvar Proposta de Decoração
                            </button>
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
