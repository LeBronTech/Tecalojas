
import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { SaleRequest, Product, CardFees, ThemeContext, PosCartItem, StoreName, Variation, CartItem, CushionSize } from '../types';
import { finalizePosSale, deleteSaleRequest } from '../firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import ProductSelectModal from '../components/ProductSelectModal';
import { Camera, QrCode, Banknote, CreditCard, Zap, ChevronLeft, Trash2, Percent } from 'lucide-react';

interface SalesScreenProps {
  saleRequests: SaleRequest[];
  onCompleteSaleRequest: (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number, netValue?: number, totalProductionCost?: number }) => Promise<void>;
  products: Product[];
  onMenuClick: () => void;
  error: string | null;
  cardFees: CardFees;
  activeTab?: 'pos' | 'history' | 'pending' | 'preorders';
  onTabChange?: (tab: 'pos' | 'history' | 'pending' | 'preorders') => void;
}

type ScanMode = 'none' | 'camera';
type Tab = 'pending' | 'preorders' | 'history' | 'pos';

// --- Helper Components ---

const ProductConfigModal: React.FC<{
    product: Product;
    onConfirm: (variation: Variation, itemType: 'cover' | 'full', price: number, quantity: number) => void;
    onCancel: () => void;
    isDark: boolean;
}> = ({ product, onConfirm, onCancel, isDark }) => {
    const [itemType, setItemType] = useState<'cover' | 'full'>('cover');
    const [quantity, setQuantity] = useState(1);

    const variation = product.variations[0];
    const price = variation ? (itemType === 'cover' ? variation.priceCover : variation.priceFull) : 0;

    const modalBg = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleColor = isDark ? "text-white" : "text-gray-900";
    const textColor = isDark ? "text-gray-300" : "text-gray-700";
    const inputBg = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";

    if (!variation) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onCancel}>
            <div className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border ${modalBg}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-bold mb-1 ${titleColor}`}>{product.name}</h3>
                <p className={`text-sm mb-4 ${textColor}`}>{product.category}</p>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textColor}`}>Opção de Almofada</label>
                        <div className="flex bg-black/20 rounded-lg p-1">
                            <button 
                                onClick={() => setItemType('cover')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${itemType === 'cover' ? 'bg-white text-black shadow' : 'text-gray-400'}`}
                            >
                                Capa
                            </button>
                            <button 
                                onClick={() => setItemType('full')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${itemType === 'full' ? 'bg-white text-black shadow' : 'text-gray-400'}`}
                            >
                                Cheia
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textColor}`}>Quantidade</label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className={`w-10 h-10 rounded-lg font-bold text-lg cursor-pointer ${inputBg}`}>-</button>
                                <span className={`text-xl font-bold ${titleColor}`}>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className={`w-10 h-10 rounded-lg font-bold text-lg cursor-pointer ${inputBg}`}>+</button>
                            </div>
                        </div>
                        <div className="text-right">
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textColor}`}>Total</label>
                            <span className={`text-2xl font-black ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>R$ {(price * quantity).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button onClick={onCancel} className={`flex-1 py-3 rounded-xl font-bold cursor-pointer ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-800'}`}>Cancelar</button>
                        <button onClick={() => onConfirm(variation, itemType, price, quantity)} className="flex-1 py-3 rounded-xl font-bold bg-fuchsia-600 text-white shadow-lg hover:bg-fuchsia-700 cursor-pointer">Adicionar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status, type }: { status: string, type: 'sale' | 'preorder' }) => {
    const isPending = status === 'pending';
    const isPreorder = type === 'preorder';
    
    if (isPreorder) {
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200`}>
                {isPending ? 'Encomenda' : 'Entregue'}
            </span>
        );
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
            {isPending ? 'Pendente' : 'Concluído'}
        </span>
    );
};

const Calculator: React.FC<{ onAdd: (value: number) => void }> = ({ onAdd }) => {
    const [cents, setCents] = useState(0);
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const handlePress = (char: string) => {
        if (char === '.') {
            // Adiciona dois zeros (ex: digitar 5 e apertar virgula vira 500 centavos = R$ 5,00)
            setCents(prev => {
                if (prev >= 99999) return prev;
                return prev * 100;
            });
            return;
        }

        const digit = parseInt(char, 10);
        if (isNaN(digit)) return;

        setCents(prev => {
            // Limitar em 99.999,99 para segurança
            if (prev >= 9999999) return prev;
            return prev * 10 + digit;
        });
    };

    const handleClear = () => setCents(0);
    
    const handleBackspace = () => {
        setCents(prev => Math.floor(prev / 10));
    };

    const handleSubmit = () => {
        const val = cents / 100;
        if (val > 0) {
            onAdd(val);
            setCents(0);
            // Dispatch event to scroll top
            window.dispatchEvent(new CustomEvent('item-added-scroll-top'));
        }
    };

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('calculator-cents-changed', { detail: { cents } }));
    }, [cents]);

    useEffect(() => {
        const handleAddFromNav = () => {
            const val = cents / 100;
            if (val > 0) {
                onAdd(val);
                setCents(0);
                // Dispatch event to scroll top
                window.dispatchEvent(new CustomEvent('item-added-scroll-top'));
            }
        };
        window.addEventListener('add-calculator-value', handleAddFromNav);
        return () => window.removeEventListener('add-calculator-value', handleAddFromNav);
    }, [cents, onAdd]);

    const btnClass = `flex-1 h-14 rounded-xl text-xl font-bold transition-all active:scale-95 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`;
    const actionBtnClass = `flex-1 h-14 rounded-xl text-xl font-bold transition-all active:scale-95 text-white shadow-lg ${isDark ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-purple-600 hover:bg-purple-700'}`;

    return (
        <div className={`p-4 rounded-2xl animate-fade-in-scale ${isDark ? 'bg-black/30' : 'bg-white'}`}>
             <style>{`
                @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards; }
            `}</style>
            <div className={`mb-4 text-right text-3xl font-mono font-bold p-3 rounded-xl border-2 ${isDark ? 'bg-black/40 border-white/10 text-green-400' : 'bg-gray-50 border-gray-200 text-green-600'}`}>
                R$ {(cents / 100).toFixed(2)}
            </div>
            {/* Botões de Ação no Topo: C e Apagar lado a lado */}
            <div className="flex gap-3 mb-3">
                <button 
                    type="button"
                    onClick={handleClear} 
                    className="flex-1 h-14 rounded-xl text-lg font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-all active:scale-95"
                >
                    C
                </button>
                <button 
                    type="button"
                    onClick={handleBackspace} 
                    className={`flex-1 h-14 rounded-xl font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center text-lg ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                    ⌫
                </button>
            </div>

            {/* Grid de números e novo botão Adicionar */}
            <div className="grid grid-cols-3 gap-3">
                {['7','8','9','4','5','6','1','2','3'].map(n => (
                    <button type="button" key={n} onClick={() => handlePress(n)} className={btnClass}>{n}</button>
                ))}
                <button type="button" onClick={() => handlePress('0')} className={btnClass}>0</button>
                <button type="button" onClick={handleSubmit} className={`col-span-2 ${actionBtnClass}`}>
                    Adicionar
                </button>
            </div>
        </div>
    );
};

const SaleDetailModal: React.FC<{ request: SaleRequest, onClose: () => void, cardFees: CardFees, isDark: boolean, products: Product[], onNavigateToPreorders: () => void }> = ({ request, onClose, cardFees, isDark, products, onNavigateToPreorders }) => {
    // Safety check
    const safeFees = cardFees || { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 };

    const fees = (() => {
        if (request.paymentMethod === 'Débito') return safeFees.debit;
        if (request.paymentMethod === 'Crédito' || request.paymentMethod === 'Cartão (Online)') {
            const inst = request.installments || 1;
            return inst === 1 ? safeFees.credit1x : (inst === 2 ? safeFees.credit2x : safeFees.credit3x);
        }
        return 0;
    })();

    const gross = request.finalPrice ?? request.totalPrice;
    const feeValue = (gross * fees) / 100;
    const net = request.netValue ?? (gross - feeValue);
    
    // Estimate cost if not saved
    const cost = request.totalProductionCost ?? (request.items.reduce((acc, item: any) => {
        return acc + ((item.price || 0) * (item.quantity || 1) * 0.5); // Fallback 50%
    }, 0));
    
    const profit = net - cost;
    const isPreorder = request.type === 'preorder';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
            <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] ${isDark ? 'bg-[#1A1129] border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isPreorder ? 'Detalhes da Encomenda' : 'Detalhes da Venda'}
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(request.createdAt?.seconds * 1000).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>

                {isPreorder && (
                    <div className="mb-4 p-3 bg-orange-100 text-orange-800 rounded-xl flex justify-between items-center border border-orange-200">
                        <span className="text-xs font-bold uppercase">Esta venda é uma encomenda</span>
                        <button onClick={onNavigateToPreorders} className="text-xs font-bold underline text-orange-700">Ir para Encomendas</button>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto mb-4 space-y-2 pr-2">
                    {request.items.map((item: any, idx) => {
                        const prod = products.find(p => p.id === item.productId);
                        const img = item.baseImageUrl || prod?.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
                        return (
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <img src={img} className="w-12 h-12 rounded-md object-cover" alt="" />
                                <div>
                                    <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</p>
                                    <p className="text-xs opacity-60">{item.quantity}x • R$ {item.price.toFixed(2)}</p>
                                    {item.variationSize && <span className="text-[10px] uppercase bg-gray-200 dark:bg-gray-700 px-1 rounded">{item.variationSize}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between items-center py-1">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Valor Total</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {gross.toFixed(2)}</span>
                    </div>
                    {request.discount ? (
                        <div className="flex justify-between items-center py-1">
                            <span className="text-red-400">Desconto Dado</span>
                            <span className="text-red-400 font-bold">- R$ {request.discount.toFixed(2)}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between items-center py-1">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Taxas ({request.paymentMethod})</span>
                        <span className="text-amber-500 font-bold">- R$ {feeValue.toFixed(2)} ({fees}%)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Custo Produção (Est.)</span>
                        <span className="text-amber-500 font-bold">- R$ {cost.toFixed(2)}</span>
                    </div>
                    
                    <div className={`mt-2 p-4 rounded-xl text-center ${isDark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                        <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-700'}`}>Lucro Real</p>
                        <p className={`text-3xl font-black ${isDark ? 'text-green-300' : 'text-green-600'}`}>R$ {profit.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Optimized History Item to prevent lag
const HistoryItem = React.memo<{ 
    req: SaleRequest, 
    products: Product[], 
    isDark: boolean, 
    onDetail: (req: SaleRequest) => void, 
    onDelete: (id: string) => void, 
    titleClasses: string, 
    subtitleClasses: string, 
    cardClasses: string 
}>(({ req, products, isDark, onDetail, onDelete, titleClasses, subtitleClasses, cardClasses }) => (
    <div onClick={() => onDetail(req)} className={`relative p-4 rounded-2xl border flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-transform ${cardClasses}`}>
        {/* Thumbnail Stack */}
        <div className="flex -space-x-3 overflow-hidden flex-shrink-0">
            {req.items.slice(0, 3).map((item: any, idx) => {
                const prod = products.find(p => p.id === item.productId);
                const img = item.baseImageUrl || prod?.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png';
                return (
                    <img key={idx} src={img} alt="" className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 object-cover" />
                );
            })}
            {req.items.length > 3 && (
                <div className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                    +{req.items.length - 3}
                </div>
            )}
        </div>

        <div className="flex-grow min-w-0">
            <div className="flex justify-between items-baseline mb-1">
                <p className={`font-bold truncate ${titleClasses}`}>{req.customerName || 'Venda Balcão'}</p>
                <span className={`text-xs font-mono ${subtitleClasses}`}>{new Date(req.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between items-center">
                <p className={`text-xs ${subtitleClasses}`}>{req.paymentMethod} • {req.items.length} itens</p>
                <p className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>R$ {(req.finalPrice || req.totalPrice).toFixed(2)}</p>
            </div>
        </div>
        
        <button 
            onClick={(e) => { e.stopPropagation(); onDelete(req.id); }} 
            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    </div>
));

const SalesScreen: React.FC<SalesScreenProps> = ({ 
    saleRequests, 
    onCompleteSaleRequest, 
    products, 
    onMenuClick, 
    error, 
    cardFees,
    activeTab: activeTabProp,
    onTabChange: onTabChangeProp
}) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    // Safety check for cardFees
    const safeCardFees = cardFees || { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 };

    // Support both synced prop and local state fallback to remain robust
    const [localActiveTab, setLocalActiveTab] = useState<Tab>(() => {
        const hasPending = saleRequests.some(r => r.status === 'pending');
        return hasPending ? 'pending' : 'pos';
    });

    const activeTab = activeTabProp || localActiveTab;
    const setActiveTab = (tab: Tab) => {
        if (onTabChangeProp) {
            onTabChangeProp(tab);
        } else {
            setLocalActiveTab(tab);
        }
    };
    
    // POS State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const [scanError, setScanError] = useState('');
    const [scannedItems, setScannedItems] = useState<PosCartItem[]>([]);
    const [posStep, setPosStep] = useState<'cart' | 'payment'>('cart');
    const [scanMode, setScanMode] = useState<ScanMode>('none');
    const [posPaymentMethod, setPosPaymentMethod] = useState<'PIX' | 'Débito' | 'Crédito' | 'Dinheiro'>('Dinheiro');
    const [posInstallments, setPosInstallments] = useState(1);
    const [posDiscount, setPosDiscount] = useState(0);
    const [isFinishingPos, setIsFinishingPos] = useState(false);
    const [showCalculator, setShowCalculator] = useState(true);
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
    const [sessionAddedCount, setSessionAddedCount] = useState(0);
    const [isScanSuccess, setIsScanSuccess] = useState(false);
    const lastScannedRef = useRef<string>('');
    const scanCooldownRef = useRef<boolean>(false);
    
    // POS Modals & Feedback
    const [showAddedFeedback, setShowAddedFeedback] = useState(false);

    // Scroll & Keyboard controls refs
    const mainRef = useRef<HTMLElement>(null);
    const calcContainerRef = useRef<HTMLDivElement>(null);
    const [showBackToCalc, setShowBackToCalc] = useState(false);

    const scrollToTop = () => {
        setTimeout(() => {
            if (mainRef.current) {
                mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 120);
    };

    useEffect(() => {
        const handleScrollTopMsg = () => {
            scrollToTop();
        };
        window.addEventListener('item-added-scroll-top', handleScrollTopMsg);
        return () => window.removeEventListener('item-added-scroll-top', handleScrollTopMsg);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const currentLength = scannedItems.length;
        if (currentLength > 0 && scrollTop > 130) {
            setShowBackToCalc(true);
        } else {
            setShowBackToCalc(false);
        }
    };

    // Request Management State
    const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<SaleRequest | null>(null);
    
    // Completion Modal State
    const [compDiscount, setCompDiscount] = useState(0);
    const [compInstallments, setCompInstallments] = useState(1);

    // Filter Logic:
    // Pending Tab: ONLY shows pending requests that are NOT preorders.
    const pendingRequests = useMemo(() => saleRequests.filter(r => r.status === 'pending' && r.type !== 'preorder'), [saleRequests]);
    // Preorders Tab: ONLY shows requests that ARE preorders (regardless of status, but usually filtered by pending in UI, here we keep pending/active ones)
    const preorderRequests = useMemo(() => saleRequests.filter(r => r.status === 'pending' && r.type === 'preorder'), [saleRequests]);
    const historyRequests = useMemo(() => saleRequests.filter(r => r.status === 'completed'), [saleRequests]);

    // History Grouping by Date
    const groupedHistory = useMemo(() => {
        const groups: Record<string, SaleRequest[]> = {};
        historyRequests.forEach(req => {
            const date = new Date(req.createdAt?.seconds * 1000);
            const dateStr = date.toLocaleDateString('pt-BR');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(req);
        });
        
        // Sort keys (dates) descending
        return Object.entries(groups).sort((a, b) => {
            const dateA = a[1][0].createdAt?.seconds || 0;
            const dateB = b[1][0].createdAt?.seconds || 0;
            return dateB - dateA; // Newest first
        });
    }, [historyRequests]);

    const posTotal = useMemo(() => scannedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [scannedItems]);
    const posFinalTotal = Math.max(0, posTotal - posDiscount);

    // --- POS Logic ---

    const handleToggleItemType = (index: number, newType: 'cover' | 'full') => {
        setScannedItems(prev => {
            const newArr = [...prev];
            const item = { ...newArr[index] }; // Shallow copy item
            
            if (!item.variation) return prev; // Ignore custom items

            item.itemType = newType;
            item.price = newType === 'cover' ? item.variation.priceCover : item.variation.priceFull;
            
            // Update name to reflect change
            const baseName = item.product?.name || item.name.split('(')[0].trim();
            const size = item.variation.size;
            item.name = `${baseName} (${size} - ${newType === 'cover' ? 'Capa' : 'Cheia'})`;

            newArr[index] = item;
            return newArr;
        });
    };

    const handleChangeItemSize = (index: number, newSize: CushionSize) => {
        setScannedItems(prev => {
            const newArr = [...prev];
            const item = { ...newArr[index] };
            
            if (!item.product) return prev;

            const newVariation = item.product.variations.find(v => v.size === newSize);
            if (newVariation) {
                item.variation = newVariation;
                item.price = item.itemType === 'cover' ? newVariation.priceCover : newVariation.priceFull;
                
                const baseName = item.product.name;
                item.name = `${baseName} (${newVariation.size} - ${item.itemType === 'cover' ? 'Capa' : 'Cheia'})`;
                
                newArr[index] = item;
            }
            return newArr;
        });
    };

    // Beep sound setup
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'square';
            oscillator.frequency.value = 880; 
            gainNode.gain.value = 0.1;
            oscillator.start();
            setTimeout(() => oscillator.stop(), 100);
        } catch (e) { console.error("Audio error", e); }
    };

    useEffect(() => {
        if (scanMode === 'camera') {
            startScan();
            setSessionAddedCount(0); // Reset count on scan start
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
                
                // Attempt to focus on tap if possible
                const track = stream.getVideoTracks()[0];
                if (track && track.getCapabilities && (track.getCapabilities() as any).focusMode) {
                    try {
                        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
                    } catch (e) { console.log('Focus not supported'); }
                }

                animationFrameId.current = requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setScanError("Não foi possível acessar a câmera.");
            setScanMode('none');
        }
    };

    const handleCameraClick = async () => {
        if (!videoRef.current || !videoRef.current.srcObject) return;
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && (track.getCapabilities() as any).focusMode) {
             try {
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
            } catch (e) {}
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
                    const code = (window as any).jsQR ? (window as any).jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;

                    if (code && code.data) {
                        handleQrCodeScan(code.data);
                    }
                }
            }
        }
        if (scanMode === 'camera') {
            animationFrameId.current = requestAnimationFrame(tick);
        }
    };

    const handleQrCodeScan = (data: string) => {
        if (scanCooldownRef.current) return;

        try {
            const { productId } = JSON.parse(data);
            const product = products.find(p => p.id === productId);
            if (product) {
                // Cooldown logic to prevent accidental double scans of the same frame
                scanCooldownRef.current = true;
                setTimeout(() => { scanCooldownRef.current = false; }, 2000);

                playBeep();
                if (navigator.vibrate) navigator.vibrate(200);
                
                // Keep scanner OPEN (Removed stopScan and setScanMode('none'))
                
                // Visual feedback in scanner
                setIsScanSuccess(true);
                setTimeout(() => setIsScanSuccess(false), 500);
                setSessionAddedCount(prev => prev + 1);

                // Automatically add 1 unit (Cover price default)
                const variation = product.variations[0]; 
                const itemType = 'cover';
                const price = variation.priceCover;

                setScannedItems(prev => {
                    const existing = prev.find(i => 
                        i.product?.id === product.id && 
                        i.variation?.size === variation.size && 
                        i.itemType === itemType
                    );
                    if (existing) {
                        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
                    }
                    return [...prev, {
                        id: `${product.id}-${variation.size}-${itemType}-${Date.now()}`,
                        name: `${product.name} (${variation.size} - Capa)`,
                        price: price,
                        quantity: 1,
                        product: product,
                        variation,
                        itemType,
                        isCustom: false
                    }];
                });
                
                setShowAddedFeedback(true);
                setTimeout(() => setShowAddedFeedback(false), 2000);
                scrollToTop();
            }
        } catch (e) {
            console.error("Invalid QR Code", e);
        }
    };

    const handleManualAddProducts = (selectedIds: string[]) => {
        if (selectedIds.length === 1) {
            const product = products.find(p => p.id === selectedIds[0]);
            if (product) {
                setPendingProduct(product);
            }
        } else {
            selectedIds.forEach(id => {
                const product = products.find(p => p.id === id);
                if (product) {
                    // Default to first variation, cover only
                    const variation = product.variations[0];
                    const itemType = 'cover';
                    const price = variation.priceCover;

                    setScannedItems(prev => {
                        return [...prev, {
                            id: `${product.id}-${variation.size}-${itemType}-${Date.now()}`,
                            name: `${product.name} (${variation.size} - Capa)`,
                            price: price,
                            quantity: 1,
                            product: product,
                            variation,
                            itemType,
                            isCustom: false
                        }];
                    });
                }
            });
            scrollToTop();
        }
        setIsProductSelectOpen(false);
    };

    const handleConfigConfirm = (variation: Variation, itemType: 'cover' | 'full', price: number, quantity: number) => {
        if (!pendingProduct) return;
        const product = pendingProduct;
        
        if (editingCartIndex !== null) {
            setScannedItems(prev => {
                const newArr = [...prev];
                if (editingCartIndex >= 0 && editingCartIndex < newArr.length) {
                    newArr[editingCartIndex] = {
                        ...newArr[editingCartIndex],
                        variation,
                        itemType,
                        price,
                        quantity,
                        name: `${product.name} (${variation.size} - ${itemType === 'cover' ? 'Capa' : 'Cheia'})`
                    };
                }
                return newArr;
            });
            setEditingCartIndex(null);
            setPendingProduct(null);
            scrollToTop();
            return;
        }

        setScannedItems(prev => {
            const existing = prev.find(i => 
                i.product?.id === product.id && 
                i.variation?.size === variation.size && 
                i.itemType === itemType
            );
            if (existing) {
                return prev.map(i => i === existing ? { ...i, quantity: i.quantity + quantity } : i);
            }
            return [...prev, {
                id: `${product.id}-${variation.size}-${itemType}-${Date.now()}`,
                name: `${product.name} (${variation.size} - ${itemType === 'cover' ? 'Capa' : 'Cheia'})`,
                price: price,
                quantity: quantity,
                product: product,
                variation,
                itemType,
                isCustom: false
            }];
        });
        setPendingProduct(null);
        scrollToTop();
    };

    const handleAddCustomAmount = (amount: number) => {
        setScannedItems(prev => [...prev, {
            id: `custom-${Date.now()}`,
            name: 'Venda PDV',
            price: amount,
            quantity: 1,
            isCustom: true
        }]);
        setShowCalculator(false);
    };

    const handlePosCheckout = async () => {
        if (scannedItems.length === 0) return;
        setIsFinishingPos(true);
        try {
            const finalPrice = Math.max(0, posTotal - posDiscount);
            let netValue = finalPrice;
            if (posPaymentMethod === 'Débito') {
                netValue -= finalPrice * (safeCardFees.debit / 100);
            } else if (posPaymentMethod === 'Crédito') {
                const feeKey = posInstallments === 1 ? 'credit1x' : (posInstallments === 2 ? 'credit2x' : 'credit3x');
                const fee = (safeCardFees as any)[feeKey] || 0;
                netValue -= finalPrice * (fee / 100);
            }

            const totalProductionCost = scannedItems.reduce((sum, item) => {
                if (item.isCustom) return sum; 
                const cost = item.product?.productionCost || (item.price * 0.5); 
                return sum + (cost * item.quantity);
            }, 0);

            await finalizePosSale(scannedItems, finalPrice, posPaymentMethod, {
                discount: posDiscount,
                finalPrice,
                installments: posPaymentMethod === 'Crédito' ? posInstallments : 1,
                netValue,
                totalProductionCost
            });
            
            setScannedItems([]);
            setPosDiscount(0);
            setPosInstallments(1);
            setPosStep('cart');
            // Move to pending tab so user can confirm
            setActiveTab('pending');
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
        
        let netValue = finalPrice;
        if (selectedRequest.paymentMethod === 'Débito') netValue -= finalPrice * (safeCardFees.debit / 100);
        else if (selectedRequest.paymentMethod === 'Crédito' || selectedRequest.paymentMethod === 'Cartão (Online)') {
             const feeKey = compInstallments === 1 ? 'credit1x' : (compInstallments === 2 ? 'credit2x' : 'credit3x');
             const fee = (safeCardFees as any)[feeKey] || 0;
             netValue -= finalPrice * (fee / 100);
        }

        const totalProductionCost = selectedRequest.items.reduce((sum, item: any) => {
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
        // Optimistic UI update could be done here if needed, but let's rely on fast response
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

    const TabButton = ({ tab, label, activeClass }: { tab: Tab, label: string, activeClass: string }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                activeTab === tab 
                ? activeClass
                : (isDark ? 'text-gray-400 bg-white/5 hover:bg-white/10' : 'text-gray-500 bg-gray-100 hover:bg-gray-200')
            }`}
        >
            {label}
            {tab === 'preorders' && preorderRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse shadow-sm"></span>
            )}
        </button>
    );

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main ref={mainRef} onScroll={handleScroll} className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className={`text-3xl font-bold ${titleClasses}`}>Central de Vendas</h1>
                        <p className={`text-xs mt-1 font-semibold uppercase tracking-widest ${
                            activeTab === 'pos' ? 'text-fuchsia-500' : 
                            activeTab === 'history' ? 'text-purple-500' : 
                            activeTab === 'pending' ? 'text-emerald-500' : 'text-orange-500'
                        }`}>
                            {activeTab === 'pos' && '• Painel PDV / Caixa'}
                            {activeTab === 'history' && '• Histórico de Pedidos'}
                            {activeTab === 'pending' && `• Vendas Pendentes (${pendingRequests.length})`}
                            {activeTab === 'preorders' && `• Encomendas e Pré-vendas (${preorderRequests.length})`}
                        </p>
                    </div>
                </div>

                {error && <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">{error}</div>}

                {/* --- POS TAB --- */}
                {activeTab === 'pos' && (
                    <div className="space-y-6">
                        {showAddedFeedback && (
                            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-xl z-50 animate-bounce pointer-events-none">
                                + 1 Produto Adicionado
                            </div>
                        )}

                        {scannedItems.length > 0 && (
                            <div className="space-y-4">
                                {/* Barra Duplicada de Escanear e Botão Maiszinho no topo (só se posStep === 'cart') */}
                                {posStep === 'cart' && (
                                    <div className="flex gap-2.5 items-center">
                                        {/* Botão de Scanner Duplicado */}
                                        <button 
                                            onClick={() => setScanMode('camera')} 
                                            className={`flex-grow h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 border relative overflow-hidden cursor-pointer ${
                                                isDark 
                                                    ? 'bg-[#22153c]/30 hover:bg-[#2e1d52]/50 border-fuchsia-500/30 text-fuchsia-200 shadow-lg shadow-fuchsia-950/20' 
                                                    : 'bg-purple-50/70 hover:bg-purple-100/90 border-purple-200 text-purple-750 shadow-sm'
                                            }`}
                                        >
                                            <div className="relative flex items-center justify-center h-5 w-5 mr-1">
                                                <QrCode className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />
                                                <span className="absolute w-5 h-[1.5px] bg-fuchsia-500 dark:bg-fuchsia-400 rounded-full animate-scan-line shadow-[0_0_8px_rgba(217,70,239,1)]"></span>
                                            </div>
                                            <span className="font-bold tracking-wide text-xs">Escanear Almofada</span>
                                        </button>

                                        {/* Botão de Adição Manual Duplicado */}
                                        <button 
                                            onClick={() => setIsProductSelectOpen(true)}
                                            className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg border cursor-pointer ${
                                                isDark 
                                                    ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white border-fuchsia-400/30' 
                                                    : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
                                            }`}
                                            title="Adicionar Almofada Manual"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {/* Segundo botão de Voltar para a Etapa 1 no Topo, especificamente na Etapa de Pagamento (Etapa 2) */}
                                {posStep === 'payment' && (
                                    <button 
                                        onClick={() => {
                                            setPosStep('cart');
                                            scrollToTop();
                                        }}
                                        className="w-full h-11 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-sm transition-all"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Voltar para Lista de Vendas (Etapa 1)
                                    </button>
                                )}

                                {/* Botão de Voltar para a Calculadora no topo também (só se posStep === 'cart') */}
                                {posStep === 'cart' && (
                                    <button 
                                        onClick={() => {
                                            calcContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                        }}
                                        className="w-full h-10 text-xs font-bold text-fuchsia-500 hover:underline cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 shadow-sm transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
                                        </svg>
                                        Voltar para calculadora
                                    </button>
                                )}

                                {posStep === 'cart' ? (
                                    /* --- ETAPA 1: LISTA DE VENDAS --- */
                                    <div className={`p-4 rounded-3xl border ${cardClasses}`}>
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-500/10">
                                            <h3 className={`font-bold text-sm uppercase tracking-wider ${titleClasses}`}>Lista de Vendas ({scannedItems.reduce((a,b)=>a+b.quantity,0)} itens)</h3>
                                            <button onClick={() => { setScannedItems([]); setPosStep('cart'); }} className="text-red-500 text-xs font-bold hover:underline cursor-pointer flex items-center gap-1">
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Limpar Lista
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3 mb-4 max-h-[420px] overflow-y-auto pr-1 no-scrollbar-y">
                                            {scannedItems.map((item, idx) => (
                                                <div key={idx} className={`relative flex flex-col p-4 rounded-2xl border gap-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                                                    
                                                    {/* Linha do topo: Imagem + Nome e Opções de forma 100% horizontal */}
                                                    <div className="flex items-start gap-3 w-full justify-between">
                                                        <div className="flex items-center gap-3 flex-grow min-w-0">
                                                            {item.product?.baseImageUrl ? (
                                                                <img src={item.product.baseImageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0 border border-gray-500/10" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0">PDV</div>
                                                            )}
                                                            <div className="min-w-0 flex-grow">
                                                                {/* Nome completo na horizontal com quebra automática, sem truncar */}
                                                                <h4 className={`font-black text-sm leading-snug tracking-tight ${titleClasses} break-words`}>
                                                                    {item.product?.name || item.name}
                                                                </h4>
                                                                {item.variation && (
                                                                    <span className="inline-block text-[10px] mt-1 opacity-60 font-mono bg-black/5 dark:bg-white/5 py-0.5 px-2 rounded-full border border-black/10 dark:border-white/10">
                                                                        Tamanho: {item.variation.size}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Botão de Excluir por Completo de uma vez (Lixeira Cinza) */}
                                                        <button 
                                                            type="button"
                                                            onClick={() => setScannedItems(prev => prev.filter((_, i) => i !== idx))} 
                                                            className="text-gray-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 active:scale-95" 
                                                            title="Remover item"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>

                                                    {/* Linha de Baixo: Controles organizados horizontalmente em duas colunas para perfeita simetria */}
                                                    <div className="flex items-stretch justify-between gap-4 pt-3 border-t border-dashed border-gray-500/15">
                                                        
                                                        {/* Coluna da Esquerda: Controle de Quantidade no topo e Tipo (Capa/Cheia) embaixo */}
                                                        <div className="flex flex-col items-start gap-2.5">
                                                            
                                                            {/* Controle de Quantidade - botões maiores e bem sinalizados */}
                                                            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1 border border-black/10 dark:border-white/10 shadow-inner">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setScannedItems(prev => {
                                                                        const newArr = [...prev];
                                                                        if (newArr[idx].quantity > 1) newArr[idx].quantity--;
                                                                        return newArr;
                                                                    })} 
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/10 transition-all shadow-sm active:scale-95 cursor-pointer"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setScannedItems(prev => {
                                                                        const newArr = [...prev];
                                                                        newArr[idx].quantity++;
                                                                        return newArr;
                                                                    })} 
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/10 transition-all shadow-sm active:scale-95 cursor-pointer"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>

                                                            {/* Opções de Capa / Cheia abaixo do botão de adicionar */}
                                                            {!item.isCustom && item.product && item.variation && (
                                                                <div className="flex rounded-xl p-1 bg-black/10 dark:bg-white/10 border border-black/5 dark:border-white/5 shadow-sm">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleToggleItemType(idx, 'cover')}
                                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                                            item.itemType === 'cover' 
                                                                                ? 'bg-fuchsia-600 text-white shadow' 
                                                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                                        }`}
                                                                    >
                                                                        Capa
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleToggleItemType(idx, 'full')}
                                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                                            item.itemType === 'full' 
                                                                                ? 'bg-fuchsia-600 text-white shadow' 
                                                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                                        }`}
                                                                    >
                                                                        Cheia
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Coluna da Direita: Botão de Editar no topo e Área de Preço embaixo */}
                                                        <div className="flex flex-col items-end justify-between gap-2.5 text-right min-w-[120px]">
                                                            
                                                            {/* Botão de Editar Tamanho à direita do botão de adicionar */}
                                                            {!item.isCustom && item.product ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingCartIndex(idx);
                                                                        setPendingProduct(item.product);
                                                                    }}
                                                                    className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/10 px-3 py-1.5 h-10 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                    </svg>
                                                                    Editar
                                                                </button>
                                                            ) : (
                                                                <div className="h-10"></div>
                                                            )}

                                                            {/* Área de Valor abaixo do botão de editar */}
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-base font-black block tracking-tight ${isDark ? 'text-white' : 'text-purple-950'}`}>
                                                                    Total Itens: R$ {(item.price * item.quantity).toFixed(2)}
                                                                </span>
                                                                <span className="text-[10px] opacity-50 block leading-none mt-1">
                                                                    R$ {item.price.toFixed(2)} / un
                                                                </span>
                                                            </div>

                                                        </div>
                                                    </div>

                                                </div>
                                            ))}
                                        </div>

                                        {/* Total e ir para Próxima Etapa */}
                                        <div className="pt-3 border-t border-dashed border-gray-500/20 flex flex-col gap-3">
                                            <div className="flex justify-between items-center px-1.5 font-bold">
                                                <span className={`text-sm ${subtitleClasses}`}>Total da Lista:</span>
                                                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>R$ {posTotal.toFixed(2)}</p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setPosStep('payment');
                                                    scrollToTop();
                                                }} 
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200 flex justify-center items-center cursor-pointer uppercase tracking-wider text-xs"
                                            >
                                                Próxima Etapa
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* --- ETAPA 2: FORMAS DE PAGAMENTO, DESCONTO, PARCELAS E FINALIZAR --- */
                                    <div className={`p-5 rounded-3xl border ${cardClasses} space-y-5`}>
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-500/10">
                                            <h3 className={`font-bold text-xs uppercase tracking-wider ${titleClasses}`}>Método de Pagamento</h3>
                                            <span className="text-[10px] bg-purple-500/10 text-purple-500 font-bold px-2 py-0.5 rounded-full">Etapa 2 de 2</span>
                                        </div>

                                        {/* Grade de cartões de pagamento coloridos e estilizados */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Dinheiro (Verde) */}
                                            <button
                                                onClick={() => {
                                                    setPosPaymentMethod('Dinheiro');
                                                    setPosInstallments(1);
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                                                    posPaymentMethod === 'Dinheiro'
                                                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                                                        : 'bg-black/5 border-transparent hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <Banknote className={`h-7 w-7 ${posPaymentMethod === 'Dinheiro' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Dinheiro</span>
                                            </button>

                                            {/* PIX (Teal / Turquesa) */}
                                            <button
                                                onClick={() => {
                                                    setPosPaymentMethod('PIX');
                                                    setPosInstallments(1);
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                                                    posPaymentMethod === 'PIX'
                                                        ? 'bg-teal-500/15 border-teal-500 text-teal-600 dark:text-teal-400 shadow-md shadow-teal-500/10'
                                                        : 'bg-black/5 border-transparent hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <Zap className={`h-7 w-7 ${posPaymentMethod === 'PIX' ? 'text-teal-500 animate-pulse' : 'text-gray-400'}`} />
                                                <span className="text-xs font-bold uppercase tracking-wider">PIX</span>
                                            </button>

                                            {/* Cartão de Crédito (Fúchsia / Roxo) */}
                                            <button
                                                onClick={() => {
                                                    setPosPaymentMethod('Crédito');
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                                                    posPaymentMethod === 'Crédito'
                                                        ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400 shadow-md shadow-fuchsia-500/10'
                                                        : 'bg-black/5 border-transparent hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <CreditCard className={`h-7 w-7 ${posPaymentMethod === 'Crédito' ? 'text-fuchsia-500' : 'text-gray-400'}`} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Crédito</span>
                                            </button>

                                            {/* Cartão de Débito (Azul / Indigo) */}
                                            <button
                                                onClick={() => {
                                                    setPosPaymentMethod('Débito');
                                                    setPosInstallments(1);
                                                }}
                                                className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                                                    posPaymentMethod === 'Débito'
                                                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10'
                                                        : 'bg-black/5 border-transparent hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <CreditCard className={`h-7 w-7 ${posPaymentMethod === 'Débito' ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Débito</span>
                                            </button>
                                        </div>

                                        {/* Parcelamento para Crédito as a structured expanding option */}
                                        {posPaymentMethod === 'Crédito' && (
                                            <div className="space-y-1.5 animate-fade-in-scale">
                                                <label className={`text-xs font-bold uppercase tracking-wider block ${subtitleClasses}`}>Número de Parcelas</label>
                                                <div className="relative">
                                                    <select
                                                        value={posInstallments}
                                                        onChange={e => setPosInstallments(parseInt(e.target.value, 10))}
                                                        className={`w-full p-3 rounded-xl text-sm border focus:outline-none appearance-none font-semibold ${inputClasses} cursor-pointer`}
                                                    >
                                                        {[1, 2, 3, 4, 5, 6].map(x => (
                                                            <option key={x} value={x}>{x}x sem juros</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-60">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Campo de Desconto digitado desde os centavos até a casa decimal */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className={`text-xs font-bold uppercase tracking-wider block ${subtitleClasses}`}>Desconto</label>
                                                {posDiscount > 0 && (
                                                    <span className="text-[10px] text-fuchsia-500 font-bold">R$ {posDiscount.toFixed(2)} aplicados</span>
                                                )}
                                            </div>
                                            <div className="relative flex items-center">
                                                <span className="absolute left-3.5 text-sm font-bold opacity-60">R$</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={posDiscount === 0 ? '' : (posDiscount).toFixed(2).replace('.', ',')}
                                                    onChange={(e) => {
                                                        const digits = e.target.value.replace(/\D/g, '');
                                                        const cents = digits ? parseInt(digits, 10) : 0;
                                                        setPosDiscount(cents / 100);
                                                    }}
                                                    placeholder="0,00"
                                                    className={`w-full pl-10 pr-16 py-3 rounded-xl text-sm font-semibold border focus:ring-2 focus:ring-fuchsia-500 focus:outline-none ${inputClasses}`}
                                                />
                                                {posDiscount > 0 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setPosDiscount(0)} 
                                                        className="absolute right-3 text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-md hover:bg-red-500/20 font-bold transition-all cursor-pointer"
                                                    >
                                                        Limpar
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resumo Final de Valores */}
                                        <div className="pt-3 border-t border-dashed border-gray-500/20 space-y-2">
                                            <div className="flex justify-between items-center px-1 text-xs opacity-75">
                                                <span className={subtitleClasses}>Subtotal:</span>
                                                <span className={`font-semibold ${titleClasses}`}>R$ {posTotal.toFixed(2)}</span>
                                            </div>
                                            {posDiscount > 0 && (
                                                <div className="flex justify-between items-center px-1 text-xs text-red-500">
                                                    <span>Desconto:</span>
                                                    <span className="font-semibold">- R$ {posDiscount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center px-1.5 pt-2 border-t border-gray-500/10">
                                                <span className={`text-sm font-bold ${subtitleClasses}`}>Total Líquido Final</span>
                                                <p className={`text-2xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>R$ {Math.max(0, posTotal - posDiscount).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Botões de Decisão: Voltar para Lista vs Finalizar Venda */}
                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button"
                                                onClick={() => setPosStep('cart')}
                                                className={`flex-[1] h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition active:scale-95 border cursor-pointer ${
                                                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-gray-200 border-gray-300 hover:bg-gray-300 text-gray-800'
                                                }`}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Voltar
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={handlePosCheckout} 
                                                disabled={isFinishingPos} 
                                                className="flex-[2] bg-green-600 text-white font-bold h-12 rounded-xl shadow-lg hover:bg-green-700 transition disabled:opacity-50 flex justify-center items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider font-semibold"
                                            >
                                                {isFinishingPos ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    'FINALIZAR VENDA'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {posStep === 'cart' && (
                            <div ref={calcContainerRef} className={`p-4 rounded-3xl border flex flex-col gap-3 ${cardClasses}`}>
                                {/* Stylized buttons row */}
                                <div className="flex gap-2.5 items-center">
                                    {/* Stylized QR Scanner button */}
                                    <button 
                                        onClick={() => setScanMode('camera')} 
                                        className={`flex-grow h-11 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 border relative overflow-hidden cursor-pointer ${
                                            isDark 
                                                ? 'bg-[#22153c]/30 hover:bg-[#2e1d52]/50 border-fuchsia-500/30 text-fuchsia-200 shadow-lg shadow-fuchsia-950/20' 
                                                : 'bg-purple-50/70 hover:bg-purple-100/90 border-purple-200 text-purple-750 shadow-sm'
                                        }`}
                                    >
                                        <style>{`
                                            @keyframes scan-line-pulse {
                                                0%, 100% { transform: translateY(-8px); opacity: 0.2; }
                                                50% { transform: translateY(8px); opacity: 1; }
                                            }
                                            .animate-scan-line {
                                                animation: scan-line-pulse 1.8s infinite ease-in-out;
                                            }
                                        `}</style>
                                        
                                        {/* Scanning laser glow effect */}
                                        <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-500"></span>
                                        
                                        <div className="relative flex items-center justify-center h-5 w-5 mr-1">
                                            <QrCode className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-400" />
                                            {/* A linha roxa que fica piscando de scanner no ícone */}
                                            <span className="absolute w-5 h-[1.5px] bg-fuchsia-500 dark:bg-fuchsia-400 rounded-full animate-scan-line shadow-[0_0_8px_rgba(217,70,239,1)]"></span>
                                        </div>
                                        
                                        <span className="font-bold tracking-wide text-xs">Escanear Almofada</span>
                                    </button>

                                    {/* Manual Add "+" button */}
                                    <button 
                                        onClick={() => setIsProductSelectOpen(true)}
                                        className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg border cursor-pointer ${
                                            isDark 
                                                ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white border-fuchsia-400/30' 
                                                : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
                                        }`}
                                        title="Adicionar Almofada Manual"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Collapsible toggle for calculator */}
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Calculadora PDV</span>
                                    <button 
                                        onClick={() => setShowCalculator(!showCalculator)} 
                                        className="text-xs font-bold text-fuchsia-500 px-2 py-0.5 rounded-md hover:bg-fuchsia-500/10 transition-colors"
                                    >
                                        {showCalculator ? 'Minimizar' : 'Expandir'}
                                    </button>
                                </div>

                                {showCalculator && <Calculator onAdd={handleAddCustomAmount} />}
                                
                                {scanError && <p className="text-red-500 text-center text-sm mb-4">{scanError}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* --- PENDING REQUESTS TAB (MIXED) --- */}
                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingRequests.length === 0 ? (
                            <p className={`text-center py-10 ${subtitleClasses}`}>Nenhum pedido pendente.</p>
                        ) : (
                            pendingRequests.map(req => {
                                const isPreorder = req.type === 'preorder';
                                return (
                                    <div key={req.id} className={`p-5 rounded-2xl border relative ${isPreorder ? 'border-orange-500 border-2 bg-orange-500/5' : cardClasses}`}>
                                        {isPreorder && (
                                            <div className="absolute -top-3 left-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                                                Encomenda
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-3 pt-2">
                                            <div>
                                                <p className={`font-bold text-lg ${titleClasses}`}>{req.customerName || 'Cliente sem nome'}</p>
                                                <p className={`text-xs ${subtitleClasses}`}>{new Date(req.createdAt?.seconds * 1000).toLocaleString()}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <StatusBadge status={req.status} type={req.type} />
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
                                            <span className={`text-xl font-black ${isDark ? (isPreorder ? 'text-orange-400' : 'text-green-400') : (isPreorder ? 'text-orange-600' : 'text-green-600')}`}>R$ {req.totalPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setConfirmDeleteId(req.id)} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${isDark ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>Cancelar</button>
                                            
                                            {isPreorder ? (
                                                <button onClick={() => setActiveTab('preorders')} className="flex-1 py-3 rounded-xl font-bold text-sm bg-orange-600 text-white shadow-lg hover:bg-orange-700">Ir para Encomendas</button>
                                            ) : (
                                                <button onClick={() => openCompleteModal(req)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-600 text-white shadow-lg hover:bg-green-700">Concluir Venda</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* --- PREORDERS TAB (SPECIFIC) --- */}
                {activeTab === 'preorders' && (
                    <div className="space-y-4">
                        {preorderRequests.length === 0 ? (
                            <p className={`text-center py-10 ${subtitleClasses}`}>Nenhuma encomenda pendente.</p>
                        ) : (
                            preorderRequests.map(req => (
                                <div key={req.id} className={`p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className={`font-bold text-lg ${titleClasses}`}>{req.customerName}</p>
                                            <p className={`text-xs ${subtitleClasses}`}>{new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                        </div>
                                        <StatusBadge status={req.status} type="preorder" />
                                    </div>
                                    <div className={`p-3 rounded-xl mb-3 bg-white/50 dark:bg-black/20`}>
                                        {req.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
                                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{item.quantity}x {item.name}</span>
                                                <span className="font-mono opacity-70">R$ {item.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className={`text-sm ${subtitleClasses}`}>Total Encomenda:</span>
                                        <span className={`text-xl font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>R$ {req.totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setConfirmDeleteId(req.id)} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10`}>Cancelar</button>
                                        <a 
                                            href={`https://wa.me/5561991434805?text=${encodeURIComponent(`Olá, sobre a encomenda do cliente ${req.customerName} no valor de R$ ${req.totalPrice.toFixed(2)}...`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-green-600 text-white shadow-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                            Confirmar no WhatsApp
                                        </a>
                                        <button onClick={() => openCompleteModal(req)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-orange-600 text-white shadow-lg hover:bg-orange-700">Entregue</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- HISTORY TAB --- */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        {groupedHistory.length === 0 ? (
                            <p className={`text-center py-10 ${subtitleClasses}`}>Nenhuma venda registrada.</p>
                        ) : (
                            groupedHistory.map(([date, requests]) => {
                                // Determine "Today" or "Yesterday" for better UX
                                const today = new Date().toLocaleDateString('pt-BR');
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                const yesterdayStr = yesterday.toLocaleDateString('pt-BR');
                                
                                let displayDate = date;
                                if (date === today) displayDate = 'Hoje';
                                else if (date === yesterdayStr) displayDate = 'Ontem';

                                return (
                                    <div key={date}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <h2 className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{displayDate}</h2>
                                            <div className={`flex-grow h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                        </div>
                                        <div className="space-y-3">
                                            {requests.map(req => (
                                                <HistoryItem 
                                                    key={req.id} 
                                                    req={req} 
                                                    products={products} 
                                                    isDark={isDark} 
                                                    onDetail={setShowDetailModal} 
                                                    onDelete={setConfirmDeleteId}
                                                    titleClasses={titleClasses}
                                                    subtitleClasses={subtitleClasses}
                                                    cardClasses={cardClasses}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
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

            {/* Config Modal for Scanned/Selected Product */}
            {pendingProduct && (
                <ProductConfigModal 
                    product={pendingProduct} 
                    onConfirm={handleConfigConfirm}
                    onCancel={() => {
                        setPendingProduct(null);
                        setEditingCartIndex(null);
                    }}
                    isDark={isDark}
                />
            )}

            {/* Sale Detail Modal */}
            {showDetailModal && (
                <SaleDetailModal 
                    request={showDetailModal} 
                    onClose={() => setShowDetailModal(null)} 
                    cardFees={safeCardFees}
                    isDark={isDark}
                    products={products}
                    onNavigateToPreorders={() => {
                        setShowDetailModal(null);
                        setActiveTab('preorders');
                    }}
                />
            )}

            {/* Product Select Modal for Manual Add */}
            {isProductSelectOpen && (
                <ProductSelectModal 
                    products={products} 
                    onClose={() => setIsProductSelectOpen(false)} 
                    onConfirm={handleManualAddProducts}
                    initialSelectedIds={[]}
                    maxSelection={10}
                />
            )}

            <ConfirmationModal 
                isOpen={!!confirmDeleteId} 
                onClose={() => setConfirmDeleteId(null)} 
                onConfirm={handleDeleteRequest} 
                title="Excluir Venda" 
                message="Tem certeza? Se o pedido já foi concluído, o estoque será devolvido." 
            />

            {/* Full Screen Scanner Modal */}
            {scanMode === 'camera' && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
                    <div className="relative w-full h-full">
                        <video ref={videoRef} className="w-full h-full object-cover" onClick={handleCameraClick} />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlay Container */}
                        <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50">
                            <div className={`absolute inset-0 border-4 m-4 flex items-center justify-center transition-colors duration-300 ${isScanSuccess ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)]' : 'border-white/50'}`}>
                                {!isScanSuccess && (
                                    <div className="w-64 h-64 border-2 border-fuchsia-500 rounded-2xl relative opacity-50">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-fuchsia-500 animate-scan"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Counter Badge */}
                        {sessionAddedCount > 0 && (
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-2xl z-[210] animate-bounce flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                                {sessionAddedCount} produtos lidos
                            </div>
                        )}

                        <button 
                            onClick={() => setScanMode('none')}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-bold shadow-2xl z-[210] active:scale-95 transition-transform"
                        >
                            Concluir Escaneamento
                        </button>
                        <p className="absolute bottom-28 left-0 right-0 text-center text-white/80 text-sm font-semibold drop-shadow-md z-[210]">Mantenha o código no centro</p>
                    </div>
                    <style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } } .animate-scan { animation: scan 2s linear infinite; }`}</style>
                </div>
            )}
        </div>
    );
};

export default SalesScreen;
