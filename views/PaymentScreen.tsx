import React, { useContext, useState } from 'react';
import { CartItem, View, ThemeContext } from '../types';

interface PaymentScreenProps {
    cart: CartItem[];
    totalPrice: number;
    onPlaceOrder: (paymentMethod: 'PIX' | 'Débito' | 'Crédito', successMessage: string) => Promise<void>;
    onNavigate: (view: View) => void;
    onPixClick: () => void;
}

const CardTypeSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'Crédito' | 'Débito') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-xs p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tipo de Cartão</h3>
                <div className="space-y-3">
                    <button onClick={() => onSelect('Crédito')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Crédito</button>
                    <button onClick={() => onSelect('Débito')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Débito</button>
                </div>
            </div>
        </div>
    );
};

const PaymentScreen: React.FC<PaymentScreenProps> = ({ cart, totalPrice, onPlaceOrder, onNavigate, onPixClick }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);

    const handlePaymentSelection = async (method: 'PIX' | 'Débito' | 'Crédito') => {
        setIsLoading(true);
        setIsCardModalOpen(false);

        const successMessage = method === 'PIX'
            ? "Pedido enviado! Use o QR Code para pagar."
            : "Boa escolha! Dirija-se ao vendedor para fazer o pagamento na maquininha.";

        if (method === 'PIX') {
            onPixClick();
        }
        
        try {
            await onPlaceOrder(method, successMessage);
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
        <>
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
                                <div key={`${item.productId}-${item.variationSize}-${item.type}`} className="flex justify-between items-center text-sm">
                                    <p className={subtitleClasses}>{item.quantity}x {item.name} ({item.variationSize})</p>
                                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
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
                                <img src="https://i.postimg.cc/6qF1dkk4/5.png" alt="Ícone PIX" className="h-10 w-10 object-contain flex-shrink-0" />
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>PIX</p>
                                    <p className={`text-sm ${subtitleClasses}`}>Pagamento rápido e fácil com QR Code.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setIsCardModalOpen(true)}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 text-left transition-colors flex items-center gap-4 ${isDark ? 'border-gray-700 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'} disabled:opacity-50`}
                            >
                                <img src="https://i.postimg.cc/j2nMd8Dw/6.png" alt="Ícone Cartão" className="h-10 w-10 object-contain flex-shrink-0" />
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>Cartão</p>
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
        <CardTypeSelectionModal
            isOpen={isCardModalOpen}
            onClose={() => setIsCardModalOpen(false)}
            onSelect={(type) => handlePaymentSelection(type)}
        />
        </>
    );
};

export default PaymentScreen;