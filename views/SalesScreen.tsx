
import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { SaleRequest, View, ThemeContext, Product, PosCartItem, Variation, CushionSize } from '../types';
import ProductSelectModal from '../components/ProductSelectModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as api from '../firebase';


interface SalesScreenProps {
    saleRequests: SaleRequest[];
    onCompleteSaleRequest: (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number }) => void;
    products: Product[];
    onMenuClick: () => void;
    error?: string | null;
}

type ActiveTab = 'requests' | 'calculator';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const ItemTypeChoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'cover' | 'full') => void;
    productName: string;
    isDark: boolean;
}> = ({ isOpen, onClose, onSelect, productName, isDark }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-xs p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold text-center mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Adicionar Item</h3>
                <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{productName}</p>
                <div className="space-y-3">
                    <button onClick={() => onSelect('cover')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Só Capa</button>
                    <button onClick={() => onSelect('full')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Cheia</button>
                </div>
            </div>
        </div>
    );
};

type ScannedItem = { product: Product; variation: Variation; type: 'cover' | 'full'; uniqueId: string };
type ScanMode = 'cover' | 'full' | 'none';

const ScannerModal: React.FC<{
    onClose: () => void;
    onConfirmScans: (scannedItems: ScannedItem[]) => void;
    products: Product[];
    isDark: boolean;
}> = ({ onClose, onConfirmScans, products, isDark }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const [error, setError] = useState('');
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [scanMode, setScanMode] = useState<ScanMode>('none');
    const [lastScanSuccess, setLastScanSuccess] = useState<string | null>(null);
    const [itemForTypeChoice, setItemForTypeChoice] = useState<{ product: Product; variation: Variation } | null>(null);
    const [isScanPaused, setIsScanPaused] = useState(false);

    const handleSuccessfulScan = (product: Product, variation: Variation) => {
        setIsScanPaused(true);
        if (navigator.vibrate) navigator.vibrate(200);

        setLastScanSuccess(`${product.name} (${variation.size})`);
        setTimeout(() => {
            setLastScanSuccess(null);
            if (!itemForTypeChoice) setIsScanPaused(false);
        }, 1500);

        if (scanMode === 'none') {
            setItemForTypeChoice({ product, variation });
        } else {
            addItem(product, variation, scanMode);
            setTimeout(() => setIsScanPaused(false), 500);
        }
    };
    
    const addItem = (product: Product, variation: Variation, type: 'cover' | 'full') => {
        setScannedItems(prev => [...prev, { product, variation, type, uniqueId: `${product.id}-${variation.size}-${Date.now()}` }]);
    };
    
    const handleTypeSelected = (type: 'cover' | 'full') => {
        if (itemForTypeChoice) {
            addItem(itemForTypeChoice.product, itemForTypeChoice.variation, type);
            setItemForTypeChoice(null);
            setIsScanPaused(false);
        }
    };
    
    const handleCloseTypeChoice = () => {
        setItemForTypeChoice(null);
        setIsScanPaused(false);
    };
    
    const handleConfirm = () => {
        onConfirmScans(scannedItems);
        onClose();
    };
    
    const handleModeChange = (mode: ScanMode) => {
        setScanMode(prev => (prev === mode ? 'none' : mode));
    };

    const processQrCode = (code: string) => {
        try {
            const data = JSON.parse(code);
            const product = products.find(p => p.id === data.productId);
            const variation = product?.variations.find(v => v.size === data.variationSize);
            if (product && variation) {
                handleSuccessfulScan(product, variation);
                return true;
            }
        } catch (e) {}
        return false;
    }

    const handleManualScan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA || isScanPaused) {
            setError("Câmera não está pronta.");
            setTimeout(() => setError(""), 1500);
            return;
        }

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
            if (!processQrCode(code.data)) {
                 setError("QR Code inválido ou produto não encontrado.");
                 setTimeout(() => setError(""), 2000);
            }
        } else {
            setError("Nenhum QR Code detectado. Tente novamente.");
            setTimeout(() => setError(""), 1500);
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        let stream: MediaStream;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(s => {
                stream = s;
                if(video) {
                    video.srcObject = s;
                    video.setAttribute("playsinline", "true");
                    video.play();
                }
            }).catch(err => {
                console.error("Camera Error:", err);
                setError("Não foi possível acessar a câmera. Verifique as permissões.");
            });
        
        const scan = () => {
            if (isScanPaused || !videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
                animationFrameId.current = requestAnimationFrame(scan);
                return;
            }
            if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if(context) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                    if (code) {
                        processQrCode(code.data);
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(scan);
        };
        
        scan();
        
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isScanPaused, products]);

    return (
        <div className="fixed inset-0 bg-black z-[140] flex flex-col items-center justify-center">
            <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="absolute inset-0 bg-black/40"></div>
            <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {(lastScanSuccess || error) && (
                <div className={`absolute top-16 text-white p-3 rounded-lg font-bold text-center z-20 ${error ? 'bg-red-500/80' : 'bg-green-500/80 animate-pulse'}`}>
                    {lastScanSuccess || error}
                </div>
            )}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-[300px] h-auto aspect-square pointer-events-none">
                 <div className="relative w-full h-full border-4 border-white/50 rounded-lg"></div>
            </div>
            <div className="absolute top-4 right-16 w-64 max-h-60 overflow-y-auto bg-black/70 p-3 rounded-lg backdrop-blur-sm z-10 purple-scrollbar">
                <h4 className="text-white font-bold mb-2 text-sm border-b border-white/20 pb-2">Itens ({scannedItems.length})</h4>
                <ul className="text-white text-xs space-y-1">
                    {scannedItems.map(item => (
                        <li key={item.uniqueId}>{item.product.name} ({item.variation.size}) - <span className="font-semibold">{item.type === 'cover' ? 'Capa' : 'Cheia'}</span></li>
                    ))}
                </ul>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 z-10">
                <div className="flex flex-col items-center gap-2 p-2 bg-black/60 rounded-xl backdrop-blur-sm">
                    <p className="text-white text-xs font-bold">Modo Fixo:</p>
                    <div className="flex gap-2">
                        <button onClick={() => handleModeChange('cover')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${scanMode === 'cover' ? 'bg-fuchsia-600 text-white' : 'bg-gray-700/50 text-gray-300'}`}>Capa</button>
                        <button onClick={() => handleModeChange('full')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${scanMode === 'full' ? 'bg-fuchsia-600 text-white' : 'bg-gray-700/50 text-gray-300'}`}>Cheia</button>
                    </div>
                </div>
                <button onClick={handleManualScan} className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-black ring-fuchsia-500 shadow-lg disabled:opacity-50" disabled={isScanPaused}></button>
                 <button onClick={handleConfirm} disabled={scannedItems.length === 0} className="bg-green-600 text-white font-bold p-2 rounded-xl shadow-lg h-[88px] w-24 flex flex-col items-center justify-center disabled:bg-gray-500">
                    <span className="text-sm">Confirmar</span>
                    <span className="text-xl">({scannedItems.length})</span>
                </button>
            </div>
            <ItemTypeChoiceModal isOpen={!!itemForTypeChoice} onClose={handleCloseTypeChoice} onSelect={handleTypeSelected} productName={itemForTypeChoice ? `${itemForTypeChoice.product.name} (${itemForTypeChoice.variation.size})` : ''} isDark={isDark} />
        </div>
    );
};


const SalesScreen: React.FC<SalesScreenProps> = ({ saleRequests, onCompleteSaleRequest, products, onMenuClick, error }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
    const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [installments, setInstallments] = useState(1);
    const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isCustomValueModalOpen, setIsCustomValueModalOpen] = useState(false);
    const [isFinalizeSaleModalOpen, setIsFinalizeSaleModalOpen] = useState(false);
    const [posCart, setPosCart] = useState<PosCartItem[]>([]); 
    const [productForVariationSelect, setProductForVariationSelect] = useState<Product | null>(null);
    const [itemForPosTypeChoice, setItemForPosTypeChoice] = useState<{ product: Product, variation: Variation } | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);


    const finalPrice = useMemo(() => {
        if (!selectedRequest) return 0;
        return selectedRequest.totalPrice - (discount || 0);
    }, [selectedRequest, discount]);
    
    const posTotal = useMemo(() => posCart.reduce((sum, item) => sum + item.price * item.quantity, 0), [posCart]);

    const pendingRequests = saleRequests.filter(r => r.status === 'pending');
    const completedRequests = saleRequests.filter(r => r.status === 'completed');

    // Filtragem por Período
    const filteredCompletedRequests = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let filtered = completedRequests;
        if (timeFilter === 'today') filtered = completedRequests.filter(req => req.createdAt?.toDate() >= startOfToday);
        else if (timeFilter === 'week') filtered = completedRequests.filter(req => req.createdAt?.toDate() >= startOfWeek);
        else if (timeFilter === 'month') filtered = completedRequests.filter(req => req.createdAt?.toDate() >= startOfMonth);

        return filtered;
    }, [completedRequests, timeFilter]);

    // Agrupamento por Dia
    const groupedCompletedRequests = useMemo(() => {
        const groups: Record<string, { requests: SaleRequest[], total: number }> = {};
        
        filteredCompletedRequests.forEach(req => {
            if (!req.createdAt || !req.createdAt.toDate) return;
            // Forçamos locale pt-BR para consistência
            const dateStr = req.createdAt.toDate().toLocaleDateString('pt-BR');
            if (!groups[dateStr]) groups[dateStr] = { requests: [], total: 0 };
            groups[dateStr].requests.push(req);
            groups[dateStr].total += (req.finalPrice ?? req.totalPrice);
        });

        return groups;
    }, [filteredCompletedRequests]);
    
    const completedSalesTotal = useMemo(() => filteredCompletedRequests.reduce((sum, req) => sum + (req.finalPrice ?? req.totalPrice), 0), [filteredCompletedRequests]);

    const handleConfirmPayment = () => {
        if (!selectedRequest) return;
        onCompleteSaleRequest(selectedRequest.id, {
            discount: discount > 0 ? discount : undefined,
            finalPrice: finalPrice,
            installments: selectedRequest.paymentMethod === 'Crédito' ? installments : undefined,
        });
        setSelectedRequest(null);
        setIsProcessing(false);
        setDiscount(0);
        setInstallments(1);
    };

    const handleAddProductsToPos = (selectedIds: string[]) => {
        setIsProductSelectOpen(false);
        if (selectedIds.length === 0) return;
        const productToAdd = products.find(p => p.id === selectedIds[0]);
        if (!productToAdd) return;
        if (productToAdd.variations.length > 1) setProductForVariationSelect(productToAdd);
        else if (productToAdd.variations.length === 1) setItemForPosTypeChoice({ product: productToAdd, variation: productToAdd.variations[0] });
    };

    const handlePosItemTypeSelected = (type: 'cover' | 'full') => {
        if (!itemForPosTypeChoice) return;
        const { product, variation } = itemForPosTypeChoice;
        const price = type === 'cover' ? variation.priceCover : variation.priceFull;
        const name = `${product.name} (${variation.size}) - ${type === 'cover' ? 'Capa' : 'Cheia'}`;
        const newItem: PosCartItem = {
            id: `${product.id}-${variation.size}-${type}`,
            name: name,
            price: price,
            quantity: 1,
            product: product,
            variation: variation,
            itemType: type,
            isCustom: false,
        };
        setPosCart(prev => {
            const existingItem = prev.find(item => item.id === newItem.id);
            if (existingItem) return prev.map(item => item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, newItem];
        });
        setItemForPosTypeChoice(null);
    };

    const handleConfirmScans = (scannedItems: ScannedItem[]) => {
        const newPosCartItems: PosCartItem[] = scannedItems.map(item => {
            const price = item.type === 'cover' ? item.variation.priceCover : item.variation.priceFull;
            const name = `${item.product.name} (${item.variation.size}) - ${item.type === 'cover' ? 'Capa' : 'Cheia'}`;
            return {
                id: `${item.product.id}-${item.variation.size}-${item.type}`,
                name: name,
                price: price,
                quantity: 1,
                product: item.product,
                variation: item.variation,
                itemType: item.type,
                isCustom: false,
            };
        });
        setPosCart(prevCart => {
            const updatedCart = [...prevCart];
            newPosCartItems.forEach(newItem => {
                const existingIndex = updatedCart.findIndex(cartItem => cartItem.id === newItem.id);
                if (existingIndex > -1) updatedCart[existingIndex].quantity += 1;
                else updatedCart.push(newItem);
            });
            return updatedCart;
        });
    };

    const handleFinalizeSale = async (paymentMethod: 'PIX' | 'Débito' | 'Crédito', details: { discount: number; finalPrice: number; installments: number }) => {
        try {
            await api.finalizePosSale(posCart, posTotal, paymentMethod, details);
            if (('Notification' in window) && Notification.permission === 'granted') {
                new Notification("Venda Concluída!", {
                    body: `Venda de R$ ${details.finalPrice.toFixed(2)} finalizada com sucesso!`,
                    icon: 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'
                });
            }
            setPosCart([]);
            setIsFinalizeSaleModalOpen(false);
        } catch (err: any) {
            console.error("Failed to finalize POS sale:", err);
            alert(`Erro ao finalizar venda: ${err.message}`);
        }
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const labelClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const inputClasses = isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300';
    
    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                    <div className="max-w-2xl mx-auto">
                        <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Vendas</h1>
                        <div className="flex gap-2 mb-6">
                            <button onClick={() => setActiveTab('requests')} className={`flex-1 py-3 text-sm font-bold rounded-lg relative transition-colors ${activeTab === 'requests' ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white') : (isDark ? 'bg-black/20 text-gray-300' : 'bg-gray-200 text-gray-700')}`}>
                                Solicitações
                                {pendingRequests.length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full blinking-dot"></span>}
                            </button>
                            <button onClick={() => setActiveTab('calculator')} className={`flex-1 py-3 text-sm font-bold rounded-lg relative transition-colors ${activeTab === 'calculator' ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white') : (isDark ? 'bg-black/20 text-gray-300' : 'bg-gray-200 text-gray-700')}`}>Vender Agora (PDV)</button>
                        </div>
                        {activeTab === 'requests' ? (
                            <div>
                                {pendingRequests.length > 0 && <div className="mb-6"><h3 className={`font-bold mb-3 ${titleClasses}`}>Pendentes de Confirmação</h3>{pendingRequests.map(req => (
                                    <div key={req.id} className={`p-4 rounded-xl flex items-center justify-between mb-2 relative cursor-pointer border ${cardClasses}`} onClick={() => { setSelectedRequest(req); setIsProcessing(true); }}>
                                        <div><p className={`font-bold ${titleClasses}`}>Pedido de {req.customerName || `${req.items.length} item(s)`}</p><p className={`text-sm ${subtitleClasses}`}>Total: R$ {req.totalPrice.toFixed(2)} via {req.paymentMethod}</p></div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 bg-green-500 rounded-full blinking-dot"></div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeletingRequestId(req.id); }}
                                                className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}</div>}
                                
                                <div className="mt-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={`font-bold ${titleClasses}`}>Vendas Confirmadas</h3>
                                        <select 
                                            value={timeFilter} 
                                            onChange={e => setTimeFilter(e.target.value as TimeFilter)}
                                            className={`text-xs p-2 rounded-lg border focus:outline-none ${isDark ? 'bg-black/40 text-white border-white/10' : 'bg-white border-gray-200'}`}
                                        >
                                            <option value="all">Todos</option>
                                            <option value="today">Hoje</option>
                                            <option value="week">Esta Semana</option>
                                            <option value="month">Este Mês</option>
                                        </select>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl mb-6 text-center border ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-100'}`}>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-green-300' : 'text-green-700'}`}>Total do Período</p>
                                        <p className={`text-2xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>{completedSalesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>

                                    <div className="space-y-6">
                                        {(Object.entries(groupedCompletedRequests) as [string, { requests: SaleRequest[], total: number }][]).sort((a, b) => {
                                            const dateA = a[0].split('/').reverse().join('-');
                                            const dateB = b[0].split('/').reverse().join('-');
                                            return dateB.localeCompare(dateA);
                                        }).map(([date, data]) => (
                                            <div key={date}>
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <span className={`text-sm font-bold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>{date}</span>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded bg-black/10 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal: {data.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {data.requests.map(req => (
                                                        <div key={req.id} className={`p-4 rounded-xl flex items-center justify-between border ${cardClasses}`}>
                                                            <div>
                                                                <p className={`font-bold ${titleClasses}`}>Venda de {req.customerName || 'Cliente'}</p>
                                                                <p className={`text-xs ${subtitleClasses}`}>Forma: {req.paymentMethod} • {(req.createdAt?.toDate ? req.createdAt.toDate() : new Date()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                                                <p className="text-sm font-black text-fuchsia-500">R$ {(req.finalPrice ?? req.totalPrice).toFixed(2)}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setDeletingRequestId(req.id); }}
                                                                className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`p-6 rounded-2xl border ${cardClasses}`}>
                                <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Ponto de Venda (Imediato)</h3>
                                <div className="space-y-4">
                                    <div className={`min-h-[100px] max-h-60 overflow-y-auto p-2 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                                        {posCart.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2">
                                                <div><p className={`font-semibold text-sm ${titleClasses}`}>{item.name}</p><p className={`text-xs ${subtitleClasses}`}>R$ {item.price.toFixed(2)}</p></div>
                                                <div className="flex items-center gap-2"><button onClick={() => setPosCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity - 1} : i).filter(i => i.quantity > 0))} className="w-6 h-6 rounded bg-black/20 text-white font-bold">-</button><span>{item.quantity}</span><button onClick={() => setPosCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="w-6 h-6 rounded bg-black/20 text-white font-bold">+</button></div>
                                            </div>
                                        ))}
                                        {posCart.length === 0 && <p className={`text-center py-4 text-xs ${subtitleClasses}`}>Seu carrinho de PDV está vazio.</p>}
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-xl"><p className={titleClasses}>Total:</p><p className={isDark ? 'text-fuchsia-400' : 'text-purple-600'}>R$ {posTotal.toFixed(2)}</p></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setIsScannerOpen(true)} className={`col-span-2 w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>Escanear QR Code</button>
                                        <button onClick={() => setIsProductSelectOpen(true)} className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Adicionar Produto</button>
                                        <button onClick={() => setIsCustomValueModalOpen(true)} className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Valor Avulso</button>
                                        <button onClick={() => setPosCart([])} className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'}`}>Limpar</button>
                                        <button onClick={() => setIsFinalizeSaleModalOpen(true)} disabled={posCart.length === 0} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg disabled:bg-gray-500">Finalizar Venda</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {isProcessing && selectedRequest && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setIsProcessing(false); setSelectedRequest(null); }}>
                    <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${cardClasses}`} onClick={e => e.stopPropagation()}>
                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Processar Pedido {selectedRequest.customerName ? `de ${selectedRequest.customerName}`: ''}</h3>
                        <div className="space-y-4">
                            <div><label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Confirmar Valor</label><input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} placeholder="Desconto (Opcional)" className={`w-full p-2 rounded ${inputClasses}`} /></div>
                        </div>
                        <div className="space-y-4 border-t pt-4 mt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                            <div className="flex justify-between items-center text-lg font-bold"><span className={titleClasses}>Total Final:</span><span className={isDark ? 'text-fuchsia-400' : 'text-purple-600'}>R$ {finalPrice.toFixed(2)}</span></div>
                        </div>
                        <div className="mt-6 flex flex-col gap-3">
                            <button onClick={handleConfirmPayment} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg">Confirmar Venda</button>
                            <button onClick={() => { setIsProcessing(false); setSelectedRequest(null); }} className={`w-full font-bold py-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>Cancelar</button>
                        </div>
                    </div>
                 </div>
            )}
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onConfirmScans={handleConfirmScans} products={products} isDark={isDark} />}
            {isProductSelectOpen && <ProductSelectModal products={products} onClose={() => setIsProductSelectOpen(false)} onConfirm={handleAddProductsToPos} initialSelectedIds={[]} maxSelection={1} />}
            {productForVariationSelect && <VariationSelectModal product={productForVariationSelect} onClose={() => setProductForVariationSelect(null)} onSelect={(p, v) => { setProductForVariationSelect(null); setItemForPosTypeChoice({ product: p, variation: v }); }} />}
            <ItemTypeChoiceModal isOpen={!!itemForPosTypeChoice} onClose={() => setItemForPosTypeChoice(null)} onSelect={handlePosItemTypeSelected} productName={itemForPosTypeChoice ? `${itemForPosTypeChoice.product.name} (${itemForPosTypeChoice.variation.size})` : ''} isDark={isDark} />
            {isCustomValueModalOpen && <CustomValueModal onClose={() => setIsCustomValueModalOpen(false)} onConfirm={(n, p) => setPosCart(prev => [...prev, { id: `custom-${Date.now()}`, name: n, price: p, quantity: 1, isCustom: true }])} />}
            {isFinalizeSaleModalOpen && <FinalizeSaleModal isOpen={isFinalizeSaleModalOpen} onClose={() => setIsFinalizeSaleModalOpen(false)} onConfirm={handleFinalizeSale} total={posTotal} />}
            <ConfirmationModal isOpen={!!deletingRequestId} onClose={() => setDeletingRequestId(null)} onConfirm={async () => { if(deletingRequestId) { try { await api.deleteSaleRequest(deletingRequestId); setDeletingRequestId(null); } catch(e: any) { alert("Erro ao excluir: " + e.message); } } }} title="Confirmar Exclusão" message="Tem certeza que deseja excluir permanentemente este registro de venda?" />
        </>
    );
};

const VariationSelectModal: React.FC<{ product: Product; onClose: () => void; onSelect: (product: Product, variation: Variation) => void; }> = ({ product, onClose, onSelect }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[130] p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`font-bold text-lg mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Selecione o Tamanho para "{product.name}"</h3>
                <div className="space-y-2">{product.variations.map(variation => (
                    <button key={variation.size} onClick={() => onSelect(product, variation)} className={`w-full p-4 rounded-lg text-left flex justify-between items-center transition-colors ${isDark ? 'bg-black/20 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}><span className="font-semibold">{variation.size}</span><span className="font-bold text-fuchsia-500">R$ {variation.priceFull.toFixed(2)}</span></button>
                ))}</div>
            </div>
        </div>
    );
};

const CustomValueModal: React.FC<{onClose: () => void, onConfirm: (name: string, price: number) => void}> = ({onClose, onConfirm}) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]" onClick={onClose}>
            <div className={`p-6 rounded-lg ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white shadow-xl'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Adicionar Valor Avulso</h3>
                <div className="space-y-4"><input type="text" placeholder="Descrição" value={name} onChange={e => setName(e.target.value)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} /><input type="number" placeholder="Preço" value={price} onChange={e => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} /></div>
                <div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className={`font-bold py-2 px-4 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Cancelar</button><button onClick={() => onConfirm(name || 'Item avulso', Number(price) || 0)} className="bg-fuchsia-600 text-white px-4 py-2 rounded-lg">Adicionar</button></div>
            </div>
        </div>
    );
}

const FinalizeSaleModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (paymentMethod: 'PIX' | 'Débito' | 'Crédito', details: { discount: number; finalPrice: number; installments: number }) => void; total: number; }> = ({ isOpen, onClose, onConfirm, total }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Débito' | 'Crédito'>('Débito');
    const [discount, setDiscount] = useState(0);
    const [installments, setInstallments] = useState(1);
    const finalPrice = total - (discount || 0);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[130] p-4" onClick={onClose}>
             <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                 <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Finalizar Venda</h3>
                 <div className="space-y-4">
                    <div><label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Forma de Pagamento</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`}><option value="Débito">Débito</option><option value="Crédito">Crédito</option><option value="PIX">PIX</option></select></div>
                    {paymentMethod === 'Crédito' && (<div><label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Parcelas</label><select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`}><option value={1}>À vista (1x)</option><option value={2}>2x</option><option value={3}>3x</option></select></div>)}
                    <div><label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Desconto (R$)</label><input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} /></div>
                 </div>
                 <div className="flex justify-between items-center text-xl font-bold my-4 border-t pt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}><span className={isDark ? 'text-white' : 'text-gray-900'}>Total Final:</span><span className="text-fuchsia-500">R$ {finalPrice.toFixed(2)}</span></div>
                 <button onClick={() => onConfirm(paymentMethod, { discount, finalPrice, installments: paymentMethod === 'Crédito' ? installments : 1 })} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg">Confirmar Venda</button>
                 <button onClick={onClose} className={`w-full mt-2 py-2 rounded-lg font-semibold ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>Cancelar</button>
             </div>
        </div>
    );
};

export default SalesScreen;
