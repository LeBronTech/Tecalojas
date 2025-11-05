import React, { useState, useContext, useEffect, useMemo } from 'react';
import { SaleRequest, View, ThemeContext, Product, PosCartItem, Variation } from '../types';
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

const SalesScreen: React.FC<SalesScreenProps> = ({ saleRequests, onCompleteSaleRequest, products, onMenuClick, error }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
    const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [installments, setInstallments] = useState(1);
    const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
    
    // POS State
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [isCustomValueModalOpen, setIsCustomValueModalOpen] = useState(false);
    const [isFinalizeSaleModalOpen, setIsFinalizeSaleModalOpen] = useState(false);
    const [posCart, setPosCart] = useState<PosCartItem[]>([]); 
    const [productForVariationSelect, setProductForVariationSelect] = useState<Product | null>(null);


    const finalPrice = useMemo(() => {
        if (!selectedRequest) return 0;
        return selectedRequest.totalPrice - discount;
    }, [selectedRequest, discount]);
    
    const posTotal = useMemo(() => posCart.reduce((sum, item) => sum + item.price * item.quantity, 0), [posCart]);

    const pendingRequests = saleRequests.filter(r => r.status === 'pending');
    const completedRequests = saleRequests.filter(r => r.status === 'completed');

    const handleConfirmPayment = () => {
        if (!selectedRequest) return;
        onCompleteSaleRequest(selectedRequest.id, {
            discount: discount > 0 ? discount : undefined,
            finalPrice: finalPrice,
            installments: selectedRequest.paymentMethod === 'Crédito' ? installments : undefined,
        });
        setSelectedRequest(null);
        setDiscount(0);
        setInstallments(1);
    };

     const handleAddProductsToPos = (selectedIds: string[]) => {
        const productsToAdd = products.filter(p => selectedIds.includes(p.id));

        if (productsToAdd.length === 1 && productsToAdd[0].variations.length > 1) {
            setProductForVariationSelect(productsToAdd[0]);
        } else {
            const newCartItems: PosCartItem[] = productsToAdd.map(p => {
                const defaultVariation = p.variations[0];
                return {
                    id: `${p.id}-${defaultVariation.size}`,
                    name: `${p.name} (${defaultVariation.size})`,
                    price: defaultVariation.priceFull,
                    quantity: 1,
                    product: p,
                    variation: defaultVariation,
                    isCustom: false,
                };
            });
             setPosCart(prev => {
                const existingIds = new Set(prev.map(item => item.id));
                const uniqueNewItems = newCartItems.filter(item => !existingIds.has(item.id));
                return [...prev, ...uniqueNewItems];
            });
        }
        setIsProductSelectOpen(false);
    };

    const handleVariationSelected = (product: Product, variation: Variation) => {
        const newItem: PosCartItem = {
            id: `${product.id}-${variation.size}`,
            name: `${product.name} (${variation.size})`,
            price: variation.priceFull,
            quantity: 1,
            product: product,
            variation: variation,
            isCustom: false,
        };
        setPosCart(prev => {
            const existingItem = prev.find(item => item.id === newItem.id);
            if (existingItem) {
                return prev.map(item => item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, newItem];
        });
        setProductForVariationSelect(null);
    };
    
    const handleAddCustomItem = (name: string, price: number) => {
        const newItem: PosCartItem = {
            id: `custom-${Date.now()}`,
            name,
            price,
            quantity: 1,
            isCustom: true,
        };
        setPosCart(prev => [...prev, newItem]);
        setIsCustomValueModalOpen(false);
    };

    const updatePosQuantity = (itemId: string, newQuantity: number) => {
        setPosCart(prev => prev.map(item => item.id === itemId ? {...item, quantity: Math.max(0, newQuantity)} : item).filter(item => item.quantity > 0));
    };

    const handleFinalizeSale = async (paymentMethod: 'PIX' | 'Débito' | 'Crédito', details: { discount: number; finalPrice: number; installments: number }) => {
        try {
            await api.finalizePosSale(posCart, posTotal, paymentMethod, details);
            alert(`Venda de R$ ${details.finalPrice.toFixed(2)} finalizada com sucesso!`);
            setPosCart([]);
            setIsFinalizeSaleModalOpen(false);
        } catch (err: any) {
            console.error("Failed to finalize POS sale:", err);
            alert(`Erro ao finalizar venda: ${err.message}`);
        }
    };

    const confirmDeleteRequest = async () => {
        if (!deletingRequestId) return;
        try {
            await api.deleteSaleRequest(deletingRequestId);
        } catch (error: any) {
            alert(`Falha ao excluir pedido: ${error.message}`);
        } finally {
            setDeletingRequestId(null);
        }
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    
    const TabButton: React.FC<{ label: string; tabId: ActiveTab; notification?: boolean }> = ({ label, tabId, notification }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex-1 py-3 text-sm font-bold rounded-lg relative transition-colors ${
                activeTab === tabId
                    ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white')
                    : (isDark ? 'bg-black/20 text-gray-300' : 'bg-gray-200 text-gray-700')
            }`}
        >
            {label}
            {notification && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full blinking-dot"></span>}
        </button>
    );

    const RequestList = ({ requests }: { requests: SaleRequest[] }) => (
        <div className="space-y-3">
            {requests.map(req => (
                <div key={req.id} className={`p-4 rounded-xl flex items-center justify-between text-left ${cardClasses}`}>
                    <button onClick={() => { setSelectedRequest(req); setIsProcessing(true); }} className="flex-grow text-left">
                        <p className={`font-bold ${titleClasses}`}>Pedido de {req.items.length} item(s)</p>
                        <p className={`text-sm ${subtitleClasses}`}>Total: R$ {req.totalPrice.toFixed(2).replace('.', ',')} via {req.paymentMethod}</p>
                    </button>
                     <div className="flex items-center gap-2">
                        {req.status === 'pending' && <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
                        <button onClick={(e) => { e.stopPropagation(); setDeletingRequestId(req.id); }} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
    
    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                    <div className="max-w-2xl mx-auto">
                        <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Vendas</h1>
                        <p className={`text-md mb-6 ${subtitleClasses}`}>Gerencie pedidos de clientes e vendas presenciais.</p>

                        {error && (
                            <div className={`p-4 mb-6 rounded-xl text-center font-semibold border ${isDark ? 'bg-red-900/50 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                <p className="font-bold text-lg">Erro de Acesso</p>
                                <p className="text-sm">{error}</p>
                                <p className="text-xs mt-2">Consulte o arquivo <code className="font-mono bg-black/20 p-1 rounded">firebase.ts</code> para obter ajuda sobre como configurar as regras.</p>
                            </div>
                        )}

                        <div className="flex gap-2 mb-6">
                            <TabButton label="Solicitações" tabId="requests" notification={pendingRequests.length > 0} />
                            <TabButton label="Calculadora (PDV)" tabId="calculator" />
                        </div>

                        {activeTab === 'requests' && (
                            <div>
                                {pendingRequests.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className={`font-bold mb-3 ${titleClasses}`}>Pendentes</h3>
                                        <RequestList requests={pendingRequests} />
                                    </div>
                                )}
                                 <div>
                                    <h3 className={`font-bold mb-3 ${titleClasses}`}>Concluídas</h3>
                                    {completedRequests.length > 0 ? (
                                        <RequestList requests={completedRequests} />
                                    ) : (
                                        <p className={subtitleClasses}>Nenhuma venda concluída ainda.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'calculator' && (
                            <div className={`p-6 rounded-2xl ${cardClasses}`}>
                                <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Ponto de Venda</h3>
                                <div className="space-y-4">
                                    <div className={`min-h-[100px] max-h-60 overflow-y-auto p-2 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                                        {posCart.length > 0 ? (
                                            posCart.map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-2">
                                                    <div>
                                                        <p className={`font-semibold text-sm ${titleClasses}`}>{item.name}</p>
                                                        <p className={`text-xs ${subtitleClasses}`}>R$ {item.price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => updatePosQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-black/20 text-white font-bold">-</button>
                                                        <span>{item.quantity}</span>
                                                        <button onClick={() => updatePosQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-black/20 text-white font-bold">+</button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={`text-center py-8 ${subtitleClasses}`}>Adicione produtos para começar...</p>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-xl">
                                        <p className={titleClasses}>Total:</p>
                                        <p className={isDark ? 'text-fuchsia-400' : 'text-purple-600'}>R$ {posTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
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
                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Processar Pagamento</h3>
                        
                        <div className="space-y-3 max-h-48 overflow-y-auto mb-4 pr-2">
                             {selectedRequest.items.map((item, index) => {
                                const product = products.find(p => p.id === ('productId' in item ? item.productId : item.product?.id));
                                const variationSize = 'variationSize' in item ? item.variationSize : item.variation?.size;
                                const imageUrl = product?.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png";
                                return (
                                    <div key={index} className="flex items-center gap-3 text-sm">
                                        <img src={imageUrl} className="w-12 h-12 rounded-md object-cover flex-shrink-0" alt={item.name}/>
                                        <div className="flex-grow">
                                            <p className={`font-semibold ${titleClasses}`}>{item.quantity}x {item.name}</p>
                                            <p className={subtitleClasses}>Tamanho: {variationSize}</p>
                                        </div>
                                        <p className={`font-semibold ${titleClasses}`}>R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="space-y-4 border-t pt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                            <div>
                                <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Desconto (R$)</label>
                                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className={`w-full border-2 rounded-lg px-4 py-2 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`} />
                            </div>
                            {selectedRequest.paymentMethod === 'Crédito' && (
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Parcelas</label>
                                    <select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className={`w-full border-2 rounded-lg px-4 py-2 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                                        <option value={1}>À vista (1x)</option>
                                        <option value={2}>2x</option>
                                        <option value={3}>3x</option>
                                    </select>
                                </div>
                            )}
                            <div className="border-t my-2" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}></div>
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span className={titleClasses}>Total Final:</span>
                                <span className={isDark ? 'text-fuchsia-400' : 'text-purple-600'}>R$ {finalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <button onClick={handleConfirmPayment} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg">Confirmar Pagamento</button>
                            <button onClick={() => { setIsProcessing(false); setSelectedRequest(null); }} className={`w-full font-bold py-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Cancelar</button>
                        </div>
                    </div>
                 </div>
            )}
            {isProductSelectOpen && (
                <ProductSelectModal
                    products={products}
                    onClose={() => setIsProductSelectOpen(false)}
                    onConfirm={handleAddProductsToPos}
                    initialSelectedIds={[]}
                    maxSelection={99}
                />
            )}
            {productForVariationSelect && (
                <VariationSelectModal
                    product={productForVariationSelect}
                    onClose={() => setProductForVariationSelect(null)}
                    onSelect={handleVariationSelected}
                />
            )}
            {isCustomValueModalOpen && (
                <CustomValueModal 
                    onClose={() => setIsCustomValueModalOpen(false)}
                    onConfirm={handleAddCustomItem}
                />
            )}
             {isFinalizeSaleModalOpen && (
                <FinalizeSaleModal
                    isOpen={isFinalizeSaleModalOpen}
                    onClose={() => setIsFinalizeSaleModalOpen(false)}
                    onConfirm={handleFinalizeSale}
                    total={posTotal}
                />
            )}
            <ConfirmationModal
                isOpen={!!deletingRequestId}
                onClose={() => setDeletingRequestId(null)}
                onConfirm={confirmDeleteRequest}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir esta solicitação de venda? A ação não pode ser desfeita."
            />
        </>
    );
};

// Modals
const VariationSelectModal: React.FC<{ product: Product; onClose: () => void; onSelect: (product: Product, variation: Variation) => void; }> = ({ product, onClose, onSelect }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[130] p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`font-bold text-lg mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Selecione o Tamanho para "{product.name}"</h3>
                <div className="space-y-2">
                    {product.variations.map(variation => (
                        <button key={variation.size} onClick={() => onSelect(product, variation)} className={`w-full p-4 rounded-lg text-left flex justify-between items-center transition-colors ${isDark ? 'bg-black/20 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
                            <span className="font-semibold">{variation.size}</span>
                            <span className="font-bold text-fuchsia-500">R$ {variation.priceFull.toFixed(2)}</span>
                        </button>
                    ))}
                </div>
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
                <div className="space-y-4">
                    <input type="text" placeholder="Descrição" value={name} onChange={e => setName(e.target.value)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} />
                    <input type="number" placeholder="Preço" value={price} onChange={e => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className={`font-bold py-2 px-4 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Cancelar</button>
                    <button onClick={() => onConfirm(name || 'Item avulso', Number(price) || 0)} className="bg-fuchsia-600 text-white px-4 py-2 rounded-lg">Adicionar</button>
                </div>
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
    const finalPrice = total - discount;

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(paymentMethod, {
            discount,
            finalPrice,
            installments: paymentMethod === 'Crédito' ? installments : 1
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[130] p-4" onClick={onClose}>
             <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                 <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Finalizar Venda</h3>
                 <div className="space-y-4">
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Forma de Pagamento</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`}>
                            <option value="Débito">Débito</option>
                            <option value="Crédito">Crédito</option>
                            <option value="PIX">PIX</option>
                        </select>
                    </div>
                    {paymentMethod === 'Crédito' && (
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Parcelas</label>
                            <select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`}>
                                <option value={1}>À vista (1x)</option>
                                <option value={2}>2x</option>
                                <option value={3}>3x</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Desconto (R$)</label>
                        <input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className={`w-full p-2 rounded ${isDark ? 'bg-black/20 text-white' : 'bg-gray-100'}`} />
                    </div>
                 </div>
                 <div className="flex justify-between items-center text-xl font-bold my-4 border-t pt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                     <span className={isDark ? 'text-white' : 'text-gray-900'}>Total Final:</span>
                     <span className="text-fuchsia-500">R$ {finalPrice.toFixed(2)}</span>
                 </div>
                 <button onClick={handleConfirm} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg">Confirmar Venda</button>
                 <button onClick={onClose} className={`w-full mt-2 py-2 rounded-lg font-semibold ${isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>Cancelar</button>
             </div>
        </div>
    );
};


export default SalesScreen;