import React, { useState, useContext } from 'react';
import { SaleRequest, View, ThemeContext, Product } from '../types';
import ProductSelectModal from '../components/ProductSelectModal';

interface SalesScreenProps {
    saleRequests: SaleRequest[];
    onCompleteSaleRequest: (requestId: string) => void;
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

    // POS State
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [posCart, setPosCart] = useState<any[]>([]); // Simplified for now

    const pendingRequests = saleRequests.filter(r => r.status === 'pending');
    const completedRequests = saleRequests.filter(r => r.status === 'completed');

    const handleConfirmPayment = (requestId: string) => {
        onCompleteSaleRequest(requestId);
        setSelectedRequest(null);
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
                <button key={req.id} onClick={() => setSelectedRequest(req)} className={`w-full p-4 rounded-xl flex items-center justify-between text-left ${cardClasses}`}>
                    <div>
                        <p className={`font-bold ${titleClasses}`}>Pedido de {req.items.length} item(s)</p>
                        <p className={`text-sm ${subtitleClasses}`}>Total: R$ {req.totalPrice.toFixed(2).replace('.', ',')} via {req.paymentMethod}</p>
                    </div>
                    {req.status === 'pending' && <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
                </button>
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
                                    <div className={`min-h-[100px] p-4 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                                        {/* Items will be listed here */}
                                        <p className={subtitleClasses}>Adicione produtos para começar...</p>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-xl">
                                        <p className={titleClasses}>Total:</p>
                                        <p className={isDark ? 'text-fuchsia-400' : 'text-purple-600'}>R$ 0,00</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setIsProductSelectOpen(true)} className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Adicionar Produto</button>
                                        <button className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Valor Avulso</button>
                                        <button className={`w-full py-3 rounded-lg font-semibold ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>Escanear QR Code</button>
                                        <button className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg">Finalizar Venda</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {selectedRequest && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
                    <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${cardClasses}`} onClick={e => e.stopPropagation()}>
                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Detalhes da Solicitação</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                             {selectedRequest.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <img src={item.baseImageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
                                    <div>
                                        <p className={`text-sm font-semibold ${titleClasses}`}>{item.quantity}x {item.name}</p>
                                        <p className={`text-xs ${subtitleClasses}`}>{item.variationSize}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t my-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}></div>
                        <p className={`text-sm ${subtitleClasses}`}>Pagamento: <span className="font-bold">{selectedRequest.paymentMethod}</span></p>
                        <p className={`text-sm ${subtitleClasses}`}>Total: <span className="font-bold">R$ {selectedRequest.totalPrice.toFixed(2).replace('.', ',')}</span></p>

                        <div className="mt-6 flex flex-col gap-3">
                            <button onClick={() => handleConfirmPayment(selectedRequest.id)} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg">Confirmar Pagamento</button>
                            <button onClick={() => setSelectedRequest(null)} className={`w-full font-bold py-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>Fechar</button>
                        </div>
                    </div>
                 </div>
            )}
            {isProductSelectOpen && (
                <ProductSelectModal
                    products={products}
                    onClose={() => setIsProductSelectOpen(false)}
                    onConfirm={(ids) => {
                        console.log("Selected IDs for POS:", ids);
                        setIsProductSelectOpen(false);
                    }}
                    initialSelectedIds={[]}
                    maxSelection={99} // High limit for POS
                />
            )}
        </>
    );
};

export default SalesScreen;