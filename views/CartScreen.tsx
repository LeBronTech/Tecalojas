
import React, { useContext, useState } from 'react';
import { CartItem, View, CushionSize, ThemeContext, Product, StoreName } from '../types';

interface CartScreenProps {
    cart: CartItem[];
    products: Product[];
    onUpdateQuantity: (productId: string, variationSize: CushionSize, itemType: 'cover' | 'full', newQuantity: number) => void;
    onRemoveItem: (productId: string, variationSize: CushionSize, itemType: 'cover' | 'full') => void;
    onNavigate: (view: View) => void;
}

const CartScreen: React.FC<CartScreenProps> = ({ cart, products, onUpdateQuantity, onRemoveItem, onNavigate }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [stockAlerts, setStockAlerts] = useState<Record<string, boolean>>({});

    const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);

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
            const key = `${item.productId}-${item.variationSize}-${item.type}`;
            setStockAlerts(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setStockAlerts(prev => ({ ...prev, [key]: false })), 2000);
        } else {
            onUpdateQuantity(item.productId, item.variationSize, item.type, item.quantity + change);
        }
    };

    const handlePreOrderWhatsApp = (item: CartItem) => {
        const name = prompt("Para seguir com a encomenda, por favor digite seu nome:");
        if (!name) return;

        const itemType = item.type === 'full' ? 'almofada cheia' : 'capa';
        const message = `Olá, sou a ${name} e quero encomendar ${item.quantity} ${itemType} da almofada ${item.name} (${item.variationSize}).`;
        const whatsappUrl = `https://wa.me/5561991434805?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };


    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const buttonClasses = isDark ? 'bg-black/30 hover:bg-black/50' : 'bg-gray-200 hover:bg-gray-300';


    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-44 md:pb-6 no-scrollbar z-10">
                <div className="max-w-2xl mx-auto">
                    <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Seu Carrinho</h1>
                    <p className={`text-md mb-8 ${subtitleClasses}`}>
                        {cart.length > 0 ? `${cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) no seu carrinho.` : 'Seu carrinho está vazio.'}
                    </p>

                    {cart.length > 0 ? (
                        <div className="space-y-4">
                            {cart.map(item => {
                                const key = `${item.productId}-${item.variationSize}-${item.type}-${item.isPreOrder ? 'pre' : 'phys'}`;
                                return (
                                <div key={key} className={`p-4 rounded-xl flex flex-col gap-3 ${cardClasses} ${item.isPreOrder ? 'border-l-4 border-amber-500 bg-amber-500/5' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <img src={item.baseImageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-bold ${titleClasses}`}>{item.name}</p>
                                                {item.isPreOrder && (
                                                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Encomenda</span>
                                                )}
                                            </div>
                                            <p className={`text-sm ${subtitleClasses}`}>
                                                {item.variationSize} - <span className="font-semibold">{item.type === 'cover' ? 'Capa' : 'Cheia'}</span>
                                            </p>
                                            <p className={`text-sm font-semibold ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>
                                                R$ {item.price.toFixed(2).replace('.', ',')}
                                            </p>
                                            {stockAlerts[`${item.productId}-${item.variationSize}-${item.type}`] && (
                                                <p className="text-xs text-red-500 font-semibold mt-1 animate-pulse">Estoque físico insuficiente!</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleQuantityChange(item, -1)} className={`w-8 h-8 rounded-md font-bold text-lg flex items-center justify-center transition-colors ${buttonClasses}`}>-</button>
                                            <span className="w-10 text-center font-bold text-lg text-fuchsia-500">{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item, 1)} className={`w-8 h-8 rounded-md font-bold text-lg flex items-center justify-center transition-colors ${buttonClasses}`}>+</button>
                                        </div>
                                        <button onClick={() => onRemoveItem(item.productId, item.variationSize, item.type)} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    
                                    {item.isPreOrder && (
                                        <button 
                                            onClick={() => handlePreOrderWhatsApp(item)}
                                            className="w-full py-2.5 bg-[#25D366] text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-[#1fb355] transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                            PEDIR ENCOMENDA NO WHATSAPP
                                        </button>
                                    )}
                                </div>
                            )})}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <p className={`text-lg font-semibold ${titleClasses}`}>Seu carrinho está vazio</p>
                            <p className={`mt-2 ${subtitleClasses}`}>Adicione produtos da vitrine para começar.</p>
                            <button onClick={() => onNavigate(View.SHOWCASE)} className="mt-6 bg-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                                Voltar para a Vitrine
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {cart.length > 0 && (
                <div className={`absolute bottom-20 md:bottom-0 left-0 right-0 p-6 z-20 ${isDark ? 'bg-gradient-to-t from-[#1A1129]' : 'bg-gradient-to-t from-white'}`}>
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <p className={`text-lg font-semibold ${subtitleClasses}`}>Total:</p>
                            <p className={`text-3xl font-bold ${titleClasses}`}>
                                R$ {totalPrice.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <button
                            onClick={() => onNavigate(View.PAYMENT)}
                            className="w-full bg-fuchsia-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-fuchsia-500/30 hover:bg-fuchsia-700 transition"
                        >
                            Ir para Pagamento
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartScreen;
