import React, { useContext, useState } from 'react';
import { CartItem, View, ThemeContext } from '../types';

interface PaymentScreenProps {
    cart: CartItem[];
    totalPrice: number;
    onPlaceOrder: (paymentMethod: 'PIX' | 'Cartão') => Promise<void>;
    onNavigate: (view: View) => void;
    onPixClick: () => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ cart, totalPrice, onPlaceOrder, onNavigate, onPixClick }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(false);

    const handlePaymentSelection = async (method: 'PIX' | 'Cartão') => {
        setIsLoading(true);
        if (method === 'PIX') {
            onPixClick();
        }
        try {
            await onPlaceOrder(method);
            // Success is handled in App.tsx (alert and navigation)
        } catch (error) {
            console.error("Failed to place order:", error);
            alert("Ocorreu um erro ao enviar seu pedido. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center mb-8">
                        <button onClick={() => onNavigate(View.CART)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${titleClasses}`}>Pagamento</h1>
                    </div>

                    <div className={`p-6 rounded-2xl mb-6 ${cardClasses}`}>
                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Resumo do Pedido</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={`${item.productId}-${item.variationSize}`} className="flex justify-between items-center text-sm">
                                    <p className={subtitleClasses}>{item.quantity}x {item.name} ({item.variationSize})</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                        R$ {(item.priceFull * item.quantity).toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-4"></div>
                        <div className="flex justify-between items-center font-bold">
                            <p className={titleClasses}>Total</p>
                            <p className={`text-xl ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`}>
                                R$ {totalPrice.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Escolha a forma de pagamento</h3>
                        <div className="space-y-4">
                            <button
                                onClick={() => handlePaymentSelection('PIX')}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 text-left transition-colors flex items-center gap-4 ${isDark ? 'border-gray-700 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'} disabled:opacity-50`}
                            >
                                <span className="text-3xl">💳</span>
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>PIX</p>
                                    <p className={`text-sm ${subtitleClasses}`}>Pagamento rápido e fácil com QR Code.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handlePaymentSelection('Cartão')}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 text-left transition-colors flex items-center gap-4 ${isDark ? 'border-gray-700 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'} disabled:opacity-50`}
                            >
                                <span className="text-3xl">Credit Card</span>
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>Cartão de Crédito/Débito</p>
                                    <p className={`text-sm ${subtitleClasses}`}>Finalize o pagamento na maquininha.</p>
                                </div>
                            </button>
                        </div>
                        {isLoading && (
                            <p className={`text-center mt-4 ${subtitleClasses}`}>Enviando pedido...</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaymentScreen;
