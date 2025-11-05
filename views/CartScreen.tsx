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

        const stock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
        
        const otherTypeInCart = cart.find(cartItem => 
            cartItem.productId === item.productId && 
            cartItem.variationSize === item.variationSize && 
            cartItem.type !== item.type
        );
        const otherQuantity = otherTypeInCart?.quantity || 0;
        
        const newQuantity = item.quantity + change;
        
        if (newQuantity + otherQuantity > stock) {
            const key = `${item.productId}-${item.variationSize}-${item.type}`;
            setStockAlerts(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setStockAlerts(prev => ({ ...prev, [key]: false })), 2000);
        } else {
            onUpdateQuantity(item.productId, item.variationSize, item.type, newQuantity);
        }
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
                                const key = `${item.productId}-${item.variationSize}-${item.type}`;
                                return (
                                <div key={key} className={`p-4 rounded-xl flex items-center gap-4 ${cardClasses}`}>
                                    <img src={item.baseImageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className={`font-bold ${titleClasses}`}>{item.name}</p>
                                        <p className={`text-sm ${subtitleClasses}`}>
                                            {item.variationSize} - <span className="font-semibold">{item.type === 'cover' ? 'Capa' : 'Cheia'}</span>
                                        </p>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>
                                            R$ {item.price.toFixed(2).replace('.', ',')}
                                        </p>
                                        {stockAlerts[key] && (
                                            <p className="text-xs text-red-500 font-semibold mt-1 animate-pulse">Estoque excedido!</p>
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