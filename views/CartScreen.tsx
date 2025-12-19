
import React, { useContext, useState, useMemo } from 'react';
import { CartItem, View, CushionSize, ThemeContext, Product, StoreName } from '../types';
import * as api from '../firebase';

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
                        {isLoading ? 'SALVANDO...' : 'IR PARA O WHATSAPP'}
                    </button>
                    <button onClick={onClose} disabled={isLoading} className={`py-2 text-sm font-bold ${textColor}`}>Cancelar</button>
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

    const physicalItems = useMemo(() => cart.filter(i => !i.isPreOrder), [cart]);
    const preOrderItems = useMemo(() => cart.filter(i => i.isPreOrder), [cart]);

    const physicalTotal = physicalItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const preOrderTotal = preOrderItems.reduce((total, item) => total + item.price * item.quantity, 0);

    const handleQuantityChange = (item: CartItem, change: number) => {
        const product = products.find(p => p.id === item.productId);
        const variation = product?.variations.find(v => v.size === item.variationSize);
        if (!variation) return;

        const physicalStock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
        
        if (item.isPreOrder) {
            onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity + change);
            return;
        }

        const inCartTotal = cart
            .filter(cartItem => cartItem.productId === item.productId && cartItem.variationSize === item.variationSize && !cartItem.isPreOrder)
            .reduce((sum, cartItem) => sum + (cartItem === item ? cartItem.quantity + change : cartItem.quantity), 0);
        
        if (inCartTotal > physicalStock && change > 0) {
            return;
        } else {
            onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity + change);
        }
    };

    const handleConfirmPreOrder = async (customerName: string) => {
        setIsSavingPreOrder(true);
        try {
            // Salva a encomenda no Firebase para que o vendedor veja no PDV
            await api.addSaleRequest({
                items: preOrderItems,
                totalPrice: preOrderTotal,
                paymentMethod: 'WhatsApp (Encomenda)',
                customerName: customerName,
                type: 'preorder'
            });

            const itemDescriptions = preOrderItems.map(item => {
                const typeLabel = item.type === 'full' ? 'cheia' : 'capa';
                return `• ${item.quantity}x ${item.name} (${item.variationSize}) - ${typeLabel}`;
            });

            const message = `Olá, sou a ${customerName}. Gostaria de encomendar os seguintes itens que vi no site:\n\n${itemDescriptions.join('\n')}\n\nPode me informar o prazo e como prosseguir?`;
            const whatsappUrl = `https://wa.me/5561991434805?text=${encodeURIComponent(message)}`;
            
            // Remove itens de encomenda do carrinho local
            preOrderItems.forEach(item => onRemoveItem(item.productId, item.variationSize, item.type));
            
            window.open(whatsappUrl, '_blank');
            setIsPreOrderModalOpen(false);
        } catch (e: any) {
            alert("Erro ao salvar encomenda: " + e.message);
        } finally {
            setIsSavingPreOrder(false);
        }
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const buttonClasses = isDark ? 'bg-black/30 hover:bg-black/50' : 'bg-gray-200 hover:bg-gray-300';

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-4 pt-24 pb-80 md:pb-6 no-scrollbar z-10">
                <div className="max-w-2xl mx-auto">
                    <h1 className={`text-2xl font-bold mb-1 ${titleClasses}`}>Seu Carrinho</h1>
                    <p className={`text-sm mb-6 ${subtitleClasses}`}>
                        {cart.length > 0 ? `${cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) no total.` : 'Seu carrinho está vazio.'}
                    </p>

                    {cart.length > 0 ? (
                        <div className="space-y-8">
                            {/* Section: Physical Items */}
                            {physicalItems.length > 0 && (
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-3 ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>Itens Disponíveis</h3>
                                    <div className="space-y-3">
                                        {physicalItems.map(item => (
                                            <div key={`${item.productId}-${item.variationSize}-${item.type}`} className={`p-3 rounded-2xl flex items-center gap-3 ${cardClasses}`}>
                                                <img src={item.baseImageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                                                <div className="flex-grow min-w-0">
                                                    <p className={`font-bold text-sm truncate ${titleClasses}`}>{item.name}</p>
                                                    <p className={`text-xs ${subtitleClasses}`}>{item.variationSize} • {item.type === 'cover' ? 'Capa' : 'Cheia'}</p>
                                                    <p className={`text-xs font-bold ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>R$ {item.price.toFixed(2)}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleQuantityChange(item, -1)} className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center ${buttonClasses}`}>-</button>
                                                        <span className="w-6 text-center font-bold text-sm text-fuchsia-500">{item.quantity}</span>
                                                        <button onClick={() => handleQuantityChange(item, 1)} className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center ${buttonClasses}`}>+</button>
                                                    </div>
                                                    <button onClick={() => onRemoveItem(item.productId, item.variationSize, item.type)} className="text-[10px] font-bold text-red-500/60 uppercase">Remover</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section: Pre-order Items */}
                            {preOrderItems.length > 0 && (
                                <div>
                                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Para Encomenda</h3>
                                    <div className={`p-1 rounded-3xl border-2 border-dashed ${isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
                                        <div className="space-y-1 p-2">
                                            {preOrderItems.map(item => (
                                                <div key={`${item.productId}-${item.variationSize}-${item.type}-pre`} className="flex items-center gap-3 p-2 rounded-xl">
                                                    <img src={item.baseImageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                                    <div className="flex-grow min-w-0">
                                                        <p className={`font-bold text-xs truncate ${titleClasses}`}>{item.name}</p>
                                                        <p className={`text-[10px] ${subtitleClasses}`}>{item.variationSize} • {item.type === 'cover' ? 'Capa' : 'Cheia'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleQuantityChange(item, -1)} className={`w-6 h-6 rounded-md font-bold text-xs ${buttonClasses}`}>-</button>
                                                        <span className="w-5 text-center font-bold text-xs text-amber-500">{item.quantity}</span>
                                                        <button onClick={() => handleQuantityChange(item, 1)} className={`w-6 h-6 rounded-md font-bold text-xs ${buttonClasses}`}>+</button>
                                                        <button onClick={() => onRemoveItem(item.productId, item.variationSize, item.type)} className="ml-1 text-red-500/60"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setIsPreOrderModalOpen(true)}
                                            className="w-full py-4 bg-amber-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-amber-600 transition-colors uppercase tracking-widest"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                            Confirmar Encomenda
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
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
                <div className={`fixed bottom-24 md:bottom-4 left-4 right-4 p-5 z-20 rounded-3xl border shadow-2xl safe-area-bottom ${isDark ? 'bg-[#2D1F49]/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-gray-200'}`}>
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
                            Finalizar Itens Disponíveis
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
