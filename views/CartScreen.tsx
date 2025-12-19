
import React, { useContext, useState, useMemo } from 'react';
import { CartItem, View, CushionSize, ThemeContext, Product, StoreName } from '../types';
import * as api from '../firebase';

// --- FIX: Defined CartScreenProps interface to resolve the missing type definition error ---
interface CartScreenProps {
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, variationSize: CushionSize, itemType: 'cover' | 'full', newQuantity: number) => void;
  onRemoveItem: (productId: string, variationSize: CushionSize, itemType: 'cover' | 'full') => void;
  onNavigate: (view: View) => void;
}

const PreOrderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    onConfirm: (name: string) => void;
    isDark: boolean;
    isLoading?: boolean;
}> = ({ isOpen, onClose, items, onConfirm, isDark, isLoading }) => {
    const [name, setName] = useState('');
    
    if (!isOpen) return null;

    const modalBg = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleColor = isDark ? "text-white" : "text-gray-900";
    const textColor = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col animate-fade-in-scale ${modalBg}`} onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.2s forwards; }
                `}</style>
                <h2 className={`text-xl font-bold mb-2 ${titleColor}`}>Confirmar Encomenda</h2>
                <p className={`text-sm mb-4 ${textColor}`}>Você está encomendando {totalItems} item(s) que não possuem estoque imediato.</p>
                
                <div className={`max-h-32 overflow-y-auto mb-4 p-3 rounded-xl ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
                    {items.map((item, idx) => (
                        <p key={idx} className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            • {item.quantity}x {item.name} ({item.variationSize})
                        </p>
                    ))}
                </div>

                <label className={`text-xs font-bold mb-1 uppercase tracking-wider ${textColor}`}>Seu Nome</label>
                <input 
                    type="text" 
                    placeholder="Como podemos te chamar?" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className={`w-full border-2 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition ${inputBg}`}
                />

                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => onConfirm(name)}
                        disabled={!name.trim() || isLoading}
                        className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CartScreen: React.FC<CartScreenProps> = ({ cart, products, onUpdateQuantity, onRemoveItem, onNavigate }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState(false);
    const [isSavingPreOrder, setIsSavingPreOrder] = useState(false);

    const { physicalItems, preOrderItems, physicalTotal } = useMemo(() => {
        const physical: CartItem[] = [];
        const preorder: CartItem[] = [];
        let pTotal = 0;

        cart.forEach(item => {
            if (item.isPreOrder) {
                preorder.push(item);
            } else {
                physical.push(item);
                pTotal += item.price * item.quantity;
            }
        });

        return { physicalItems: physical, preOrderItems: preorder, physicalTotal: pTotal };
    }, [cart]);

    const handleConfirmPreOrder = async (customerName: string) => {
        setIsSavingPreOrder(true);
        try {
            const totalPrice = preOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            await api.addSaleRequest({
                items: preOrderItems,
                totalPrice: totalPrice,
                paymentMethod: 'WhatsApp (Encomenda)',
                customerName: customerName,
                type: 'preorder'
            });
            
            preOrderItems.forEach(item => {
                onRemoveItem(item.productId, item.variationSize, item.type);
            });
            
            setIsPreOrderModalOpen(false);
            alert("Sua encomenda foi solicitada com sucesso! Entraremos em contato.");
        } catch (e: any) {
            console.error("Error creating preorder:", e);
            alert("Erro ao criar encomenda: " + e.message);
        } finally {
            setIsSavingPreOrder(false);
        }
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-60 md:pb-60 no-scrollbar z-10">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button onClick={() => onNavigate(View.SHOWCASE)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${titleClasses}`}>Carrinho</h1>
                    </div>

                    {physicalItems.length > 0 && (
                        <div className="mb-8">
                            <h3 className={`text-lg font-bold mb-4 ${titleClasses}`}>Disponível Agora</h3>
                            <div className="space-y-4">
                                {physicalItems.map((item, index) => (
                                    <div key={`${item.productId}-${item.variationSize}-${item.type}-physical`} className={`p-4 rounded-2xl flex items-center justify-between border ${cardClasses}`}>
                                        <div className="flex items-center gap-4">
                                            <img src={item.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                                            <div>
                                                <p className={`font-bold ${titleClasses}`}>{item.name}</p>
                                                <p className={`text-xs ${subtitleClasses}`}>{item.variationSize} • {item.type === 'cover' ? 'Capa' : 'Cheia'}</p>
                                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>R$ {item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity - 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>-</button>
                                                <span className={`w-6 text-center font-bold ${titleClasses}`}>{item.quantity}</span>
                                                <button onClick={() => onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity + 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>+</button>
                                            </div>
                                            <button onClick={() => onRemoveItem(item.productId, item.variationSize, item.type)} className="text-xs text-red-500 hover:underline">Remover</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {preOrderItems.length > 0 && (
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-bold ${titleClasses}`}>Encomendas (Sem Estoque)</h3>
                                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 font-bold">Solicitação Separada</span>
                            </div>
                            <div className="space-y-4">
                                {preOrderItems.map((item, index) => (
                                    <div key={`${item.productId}-${item.variationSize}-${item.type}-preorder`} className={`p-4 rounded-2xl flex items-center justify-between border border-amber-500/30 bg-amber-500/5`}>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img src={item.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={item.name} className="w-16 h-16 rounded-xl object-cover grayscale opacity-80" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                                                    <span className="text-[10px] font-bold text-white bg-black/50 px-1 rounded">Encomenda</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className={`font-bold ${titleClasses}`}>{item.name}</p>
                                                <p className={`text-xs ${subtitleClasses}`}>{item.variationSize} • {item.type === 'cover' ? 'Capa' : 'Cheia'}</p>
                                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>R$ {item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity - 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>-</button>
                                                <span className={`w-6 text-center font-bold ${titleClasses}`}>{item.quantity}</span>
                                                <button onClick={() => onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity + 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>+</button>
                                            </div>
                                            <button onClick={() => onRemoveItem(item.productId, item.variationSize, item.type)} className="text-xs text-red-500 hover:underline">Remover</button>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <button 
                                        onClick={() => setIsPreOrderModalOpen(true)}
                                        className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-amber-700 transition flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Confirmar Encomenda
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {physicalItems.length === 0 && preOrderItems.length === 0 && (
                        <div className="text-center py-16">
                            <p className={`text-lg font-semibold ${titleClasses}`}>Seu carrinho está vazio</p>
                            <button onClick={() => onNavigate(View.SHOWCASE)} className="mt-6 bg-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                                Voltar para a Vitrine
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {physicalItems.length > 0 && (
                <div className={`fixed bottom-28 left-4 right-4 p-5 z-40 rounded-3xl border shadow-2xl safe-area-bottom ${isDark ? 'bg-[#2D1F49]/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-gray-200'}`}>
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-3">
                            <p className={`text-sm font-semibold ${subtitleClasses}`}>Valor Total (Disponível):</p>
                            <p className={`text-2xl font-black ${titleClasses}`}>
                                R$ {physicalTotal.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <button
                            onClick={() => onNavigate(View.PAYMENT)}
                            className="w-full bg-fuchsia-600 text-white font-black py-4 rounded-2xl text-md shadow-lg shadow-fuchsia-500/30 hover:bg-fuchsia-700 transition uppercase tracking-widest"
                        >
                            Ir para pagamento
                        </button>
                    </div>
                </div>
            )}

            <PreOrderModal 
                isOpen={isPreOrderModalOpen}
                onClose={() => setIsPreOrderModalOpen(false)}
                items={preOrderItems}
                onConfirm={handleConfirmPreOrder}
                isDark={isDark}
                isLoading={isSavingPreOrder}
            />
        </div>
    );
};

export default CartScreen;
