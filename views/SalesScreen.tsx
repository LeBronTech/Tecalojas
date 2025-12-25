
import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { SaleRequest, Product, CardFees, ThemeContext, PosCartItem, StoreName, Variation, CartItem } from '../types';
import { finalizePosSale, deleteSaleRequest } from '../firebase';
import ConfirmationModal from '../components/ConfirmationModal';

interface SalesScreenProps {
  saleRequests: SaleRequest[];
  onCompleteSaleRequest: (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number, netValue?: number, totalProductionCost?: number }) => Promise<void>;
  products: Product[];
  onMenuClick: () => void;
  error: string | null;
  cardFees: CardFees;
}

type ScanMode = 'none' | 'camera';
type Tab = 'pending' | 'history' | 'pos';

// --- Helper Components ---

const StatusBadge = ({ status }: { status: string }) => {
    const isPending = status === 'pending';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
            {isPending ? 'Pendente' : 'Concluído'}
        </span>
    );
};

const SalesScreen: React.FC<SalesScreenProps> = ({ saleRequests, onCompleteSaleRequest, products, onMenuClick, error, cardFees }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    
    // POS State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const [scanError, setScanError] = useState('');
    const [scannedItems, setScannedItems] = useState<PosCartItem[]>([]);
    const [scanMode, setScanMode] = useState<ScanMode>('none');
    const [posSearchQuery, setPosSearchQuery] = useState('');
    const [posPaymentMethod, setPosPaymentMethod] = useState<'PIX' | 'Débito' | 'Crédito' | 'Dinheiro'>('Dinheiro');
    const [posInstallments, setPosInstallments] = useState(1);
    const [posDiscount, setPosDiscount] = useState(0);
    const [isFinishingPos, setIsFinishingPos] = useState(false);

    // Request Management State
    const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
    // Completion Modal State
    const [compDiscount, setCompDiscount] = useState(0);
    const [compInstallments, setCompInstallments] = useState(1);

    const pendingRequests = useMemo(() => saleRequests.filter(r => r.status === 'pending'), [saleRequests]);
    const historyRequests = useMemo(() => saleRequests.filter(r => r.status === 'completed'), [saleRequests]);

    const posFilteredProducts = useMemo(() => {
        if (!posSearchQuery) return [];
        return products.filter(p => p.name.toLowerCase().includes(posSearchQuery.toLowerCase()));
    }, [products, posSearchQuery]);

    const posTotal = useMemo(() => scannedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [scannedItems]);
    const posFinalTotal = Math.max(0, posTotal - posDiscount);

    // --- POS Logic ---

    useEffect(() => {
        if (scanMode === 'camera') {
            startScan();
        } else {
            stopScan();
        }
        return () => stopScan();
    }, [scanMode]);

    const startScan = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                videoRef.current.play();
                animationFrameId.current = requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setScanError("Não foi possível acessar a câmera.");
            setScanMode('none');
        }
    };

    const stopScan = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    };

    const tick = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (canvas && video) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    // Assuming jsQR is globally available or imported
                    const code = (window as any).jsQR ? (window as any).jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;

                    if (code) {
                        handleQrCodeScan(code.data);
                        // Optional: Pause scanning briefly or give feedback
                    }
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(tick);
    };

    const handleQrCodeScan = (data: string) => {
        try {
            const { productId, variationSize } = JSON.parse(data);
            const product = products.find(p => p.id === productId);
            if (product) {
                const variation = product.variations.find(v => v.size === variationSize);
                if (variation) {
                    addToPosCart(product, variation);
                    setScanMode('none'); // Stop scanning after successful read
                    // Could play a beep sound here
                }
            }
        } catch (e) {
            console.error("Invalid QR Code", e);
        }
    };

    const addToPosCart = (product: Product, variation: Variation) => {
        setScannedItems(prev => {
            const existing = prev.find(i => i.product?.id === product.id && i.variation?.size === variation.size);
            if (existing) {
                return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id: `${product.id}-${variation.size}-${Date.now()}`,
                name: `${product.name} (${variation.size})`,
                price: variation.priceFull, // Defaulting to full price
                quantity: 1,
                product,
                variation,
                isCustom: false
            }];
        });
    };

    const handlePosCheckout = async () => {
        if (scannedItems.length === 0) return;
        setIsFinishingPos(true);
        try {
            // Calculate Net Value
            let netValue = posFinalTotal;
            if (posPaymentMethod === 'Débito') netValue -= posFinalTotal * (cardFees.debit / 100);
            else if (posPaymentMethod === 'Crédito') {
                const feeKey = posInstallments === 1 ? 'credit1x' : (posInstallments === 2 ? 'credit2x' : 'credit3x');
                const fee = (cardFees as any)[feeKey] || 0;
                netValue -= posFinalTotal * (fee / 100);
            }

            // Calculate estimated cost
            const totalProductionCost = scannedItems.reduce((sum, item) => {
                const cost = item.product?.productionCost || (item.price * 0.5); // Fallback 50%
                return sum + (cost * item.quantity);
            }, 0);

            await finalizePosSale(scannedItems, posFinalTotal, posPaymentMethod, {
                discount: posDiscount,
                finalPrice: posFinalTotal,
                installments: posInstallments,
                netValue,
                totalProductionCost
            });
            
            setScannedItems([]);
            setPosDiscount(0);
            setPosInstallments(1);
            setActiveTab('history'); // Go to history to see the sale
        } catch (e: any) {
            alert("Erro ao finalizar venda: " + e.message);
        } finally {
            setIsFinishingPos(false);
        }
    };

    // --- Request Management Logic ---

    const openCompleteModal = (request: SaleRequest) => {
        setSelectedRequest(request);
        setCompDiscount(0);
        setCompInstallments(1);
        setIsCompleteModalOpen(true);
    };

    const handleConfirmCompletion = async () => {
        if (!selectedRequest) return;
        
        const finalPrice = Math.max(0, selectedRequest.totalPrice - compDiscount);
        
        // Calculate Fees
        let netValue = finalPrice;
        if (selectedRequest.paymentMethod === 'Débito') netValue -= finalPrice * (cardFees.debit / 100);
        else if (selectedRequest.paymentMethod === 'Crédito' || selectedRequest.paymentMethod === 'Cartão (Online)') {
             const feeKey = compInstallments === 1 ? 'credit1x' : (compInstallments === 2 ? 'credit2x' : 'credit3x');
             const fee = (cardFees as any)[feeKey] || 0;
             netValue -= finalPrice * (fee / 100);
        }

        // Calculate Cost
        const totalProductionCost = selectedRequest.items.reduce((sum, item: any) => {
            // Try to find product to get cost
            const prod = products.find(p => p.id === item.productId);
            const cost = prod?.productionCost || (item.price * 0.5);
            return sum + (cost * item.quantity);
        }, 0);

        try {
            await onCompleteSaleRequest(selectedRequest.id, {
                discount: compDiscount,
                finalPrice,
                installments: compInstallments,
                netValue,
                totalProductionCost
            });
            setIsCompleteModalOpen(false);
            setSelectedRequest(null);
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleDeleteRequest = async () => {
        if (!confirmDeleteId) return;
        try {
            await deleteSaleRequest(confirmDeleteId);
            setConfirmDeleteId(null);
        } catch (e: any) {
            alert("Erro ao excluir: " + e.message);
        }
    };

    const titleClasses = isDark ? "text-white" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-600";
    const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200 shadow-sm";
    const inputClasses = isDark ? "bg-black/30 border-white/10 text-white" : "bg-gray-100 border-gray-300 text-gray-900";

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold ${titleClasses}`}>Central de Vendas</h1>
                    <button onClick={onMenuClick} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                        <svg className={`w-6 h-6 ${titleClasses}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                <div className={`flex p-1 rounded-xl mb-6 ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                    {(['pending', 'pos', 'history'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-fuchsia-600 text-white shadow-lg' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {tab === 'pending' ? `Pendentes (${pendingRequests.length})` : tab === 'pos' ? 'Nova Venda (PDV)' : 'Histórico'}
                        </button>
                    ))}
                </div>

                {error && <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">{error}</div>}

                {/* --- PENDING REQUESTS TAB --- */}
                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingRequests.length === 0 ? (
                            <p className={`text-center py-10 ${subtitleClasses}`}>Nenhum pedido pendente.</p>
                        ) : (
                            pendingRequests.map(req => (
                                <div key={req.id} className={`p-5 rounded-2xl border ${cardClasses}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className={`font-bold text-lg ${titleClasses}`}>{req.customerName || 'Cliente sem nome'}</p>
                                            <p className={`text-xs ${subtitleClasses}`}>{new Date(req.createdAt?.seconds * 1000).toLocaleString()}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <StatusBadge status={req.status} />
                                            {req.type === 'preorder' && <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded-full">Encomenda</span>}
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        {req.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
                                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{item.quantity}x {item.name || item.product?.name} ({item.variationSize || item.variation?.size})</span>
                                                <span className="font-mono opacity-70">R$ {item.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className={`text-sm ${subtitleClasses}`}>Pagamento: <strong className={titleClasses}>{req.paymentMethod}</strong></span>
                                        <span className={`text-xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>R$ {req.totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setConfirmDeleteId(req.id)} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${isDark ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>Cancelar</button>
                                        <button onClick={() => openCompleteModal(req)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-600 text-white shadow-lg hover:bg-green-700">Concluir Venda</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- POS TAB --- */}
                {activeTab === 'pos' && (
                    <div className="space-y-6">
                        <div className={`p-4 rounded-2xl border ${cardClasses}`}>
                            <div className="flex gap-2 mb-4">
                                {scanMode === 'none' ? (
                                    <button onClick={() => setScanMode('camera')} className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h.01M9 20h.01M9 17h.01M12 17h.01M12 14h.01M15 11h.01M15 17h.01M15 20h.01M11.64 19.5h.72a2 2 0 001.99-2v-4a2 2 0 00-2-2h-.72a2 2 0 00-2 2v4a2 2 0 002 2zm6-4a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        Ler QR Code
                                    </button>
                                ) : (
                                    <button onClick={() => setScanMode('none')} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg">Parar Câmera</button>
                                )}
                            </div>
                            
                            {scanMode === 'camera' && (
                                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-4">
                                    <video ref={videoRef} className="w-full h-full object-cover" />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-fuchsia-500 rounded-lg"></div>
                                    </div>
                                    <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs font-bold drop-shadow-md">Aponte para a etiqueta</p>
                                </div>
                            )}

                            {scanError && <p className="text-red-500 text-center text-sm mb-4">{scanError}</p>}

                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Ou busque o produto..." 
                                    value={posSearchQuery}
                                    onChange={e => setPosSearchQuery(e.target.value)}
                                    className={`w-full py-3 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`}
                                />
                                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                {posSearchQuery && posFilteredProducts.length > 0 && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto ${isDark ? 'bg-[#2D1F49] border border-white/10' : 'bg-white border border-gray-200'}`}>
                                        {posFilteredProducts.map(p => (
                                            <button key={p.id} onClick={() => {
                                                if (p.variations.length > 0) addToPosCart(p, p.variations[0]); // Default first var
                                                setPosSearchQuery('');
                                            }} className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-gray-800'}`}>
                                                <img src={p.baseImageUrl} className="w-8 h-8 rounded object-cover" alt="" />
                                                <span>{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {scannedItems.length > 0 && (
                            <div className={`p-4 rounded-2xl border ${cardClasses}`}>
                                <h3 className={`font-bold mb-4 ${titleClasses}`}>Carrinho PDV</h3>
                                <div className="space-y-3 mb-4">
                                    {scannedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div>
                                                <p className={`font-bold ${titleClasses}`}>{item.name}</p>
                                                <p className="text-xs opacity-60">Unit: R$ {item.price.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center rounded-lg ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                    <button onClick={() => setScannedItems(prev => {
                                                        const newArr = [...prev];
                                                        if (newArr[idx].quantity > 1) newArr[idx].quantity--;
                                                        else newArr.splice(idx, 1);
                                                        return newArr;
                                                    })} className="px-2 py-1">-</button>
                                                    <span className={`px-2 font-bold ${titleClasses}`}>{item.quantity}</span>
                                                    <button onClick={() => setScannedItems(prev => {
                                                        const newArr = [...prev];
                                                        newArr[idx].quantity++;
                                                        return newArr;
                                                    })} className="px-2 py-1">+</button>
                                                </div>
                                                <span className={`font-bold w-16 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="space-y-3 pt-4 border-t border-dashed border-gray-500/30">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`text-xs font-bold block mb-1 ${subtitleClasses}`}>Pagamento</label>
                                            <select value={posPaymentMethod} onChange={e => setPosPaymentMethod(e.target.value as any)} className={`w-full p-2 rounded-lg text-sm border focus:outline-none ${inputClasses}`}>
                                                <option>Dinheiro</option>
                                                <option>PIX</option>
                                                <option>Débito</option>
                                                <option>Crédito</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-xs font-bold block mb-1 ${subtitleClasses}`}>Parcelas</label>
                                            <select value={posInstallments} onChange={e => setPosInstallments(parseInt(e.target.value))} disabled={posPaymentMethod !== 'Crédito'} className={`w-full p-2 rounded-lg text-sm border focus:outline-none ${inputClasses} disabled:opacity-50`}>
                                                <option value={1}>1x</option>
                                                <option value={2}>2x</option>
                                                <option value={3}>3x</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-xs font-bold block mb-1 ${subtitleClasses}`}>Desconto (R$)</label>
                                        <input type="number" value={posDiscount} onChange={e => setPosDiscount(parseFloat(e.target.value) || 0)} className={`w-full p-2 rounded-lg text-sm border focus:outline-none ${inputClasses}`} />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-between items-center">
                                    <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {posFinalTotal.toFixed(2)}</p>
                                    <button onClick={handlePosCheckout} disabled={isFinishingPos} className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-green-700 transition disabled:opacity-50">
                                        {isFinishingPos ? 'Finalizando...' : 'Finalizar Venda'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- HISTORY TAB --- */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {historyRequests.length === 0 ? (
                            <p className={`text-center py-10 ${subtitleClasses}`}>Nenhuma venda registrada.</p>
                        ) : (
                            historyRequests.map(req => (
                                <div key={req.id} className={`p-4 rounded-2xl border opacity-80 hover:opacity-100 transition-opacity ${cardClasses}`}>
                                    <div className="flex justify-between mb-2">
                                        <p className={`font-bold ${titleClasses}`}>{req.customerName || 'Venda Balcão'}</p>
                                        <span className={`text-xs font-mono ${subtitleClasses}`}>{new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className={`text-sm ${subtitleClasses}`}>{req.items.length} itens • {req.paymentMethod}</p>
                                        <div className="text-right">
                                            {req.discount && req.discount > 0 ? (
                                                <p className="text-xs text-red-400 line-through">R$ {req.totalPrice.toFixed(2)}</p>
                                            ) : null}
                                            <p className={`font-bold text-lg ${isDark ? 'text-green-400' : 'text-green-600'}`}>R$ {(req.finalPrice || req.totalPrice).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setConfirmDeleteId(req.id)} className="text-xs text-red-500 hover:underline mt-2">Excluir Registro</button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Complete Sale Modal */}
            {isCompleteModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={() => setIsCompleteModalOpen(false)}>
                    <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                        <h3 className={`text-xl font-bold mb-4 ${titleClasses}`}>Finalizar Pedido</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className={`text-sm font-bold block mb-1 ${subtitleClasses}`}>Desconto (R$)</label>
                                <input type="number" value={compDiscount} onChange={e => setCompDiscount(parseFloat(e.target.value) || 0)} className={`w-full p-3 rounded-lg border focus:outline-none ${inputClasses}`} />
                            </div>
                            {(selectedRequest.paymentMethod === 'Crédito' || selectedRequest.paymentMethod === 'Cartão (Online)') && (
                                <div>
                                    <label className={`text-sm font-bold block mb-1 ${subtitleClasses}`}>Parcelas</label>
                                    <select value={compInstallments} onChange={e => setCompInstallments(parseInt(e.target.value))} className={`w-full p-3 rounded-lg border focus:outline-none ${inputClasses}`}>
                                        <option value={1}>1x</option>
                                        <option value={2}>2x</option>
                                        <option value={3}>3x</option>
                                    </select>
                                </div>
                            )}
                            <div className={`p-4 rounded-xl text-center border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <p className={`text-sm mb-1 ${subtitleClasses}`}>Valor Final a Receber</p>
                                <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {(Math.max(0, selectedRequest.totalPrice - compDiscount)).toFixed(2)}</p>
                            </div>
                        </div>
                        <button onClick={handleConfirmCompletion} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700">Confirmar Recebimento</button>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={!!confirmDeleteId} 
                onClose={() => setConfirmDeleteId(null)} 
                onConfirm={handleDeleteRequest} 
                title="Excluir Venda" 
                message="Tem certeza? Se o pedido já foi concluído, o estoque será devolvido." 
            />
        </div>
    );
};

export default SalesScreen;
