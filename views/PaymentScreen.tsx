
import React, { useContext, useState } from 'react';
import { CartItem, View, ThemeContext } from '../types';

interface PaymentScreenProps {
    cart: CartItem[];
    totalPrice: number;
    onPlaceOrder: (paymentMethod: 'PIX' | 'Débito' | 'Crédito' | 'Cartão (Online)' | 'Dinheiro', successMessage: string, onSuccess?: () => void) => Promise<void>;
    onNavigate: (view: View) => void;
    onPixClick: () => void;
    customerName: string;
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
                <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tipo de Cartão (Presencial)</h3>
                <div className="space-y-3">
                    <button onClick={() => onSelect('Crédito')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Crédito</button>
                    <button onClick={() => onSelect('Débito')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Débito</button>
                </div>
            </div>
        </div>
    );
};

const CardPaymentMethodModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (method: 'presencial' | 'online') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-xs p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Como deseja pagar com cartão?</h3>
                <div className="space-y-3">
                    <button onClick={() => onSelect('presencial')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Presencial (Maquininha)</button>
                    <button onClick={() => onSelect('online')} className={`w-full font-semibold py-3 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Online (WhatsApp)</button>
                </div>
            </div>
        </div>
    );
};


const PaymentScreen: React.FC<PaymentScreenProps> = ({ cart, totalPrice, onPlaceOrder, onNavigate, onPixClick, customerName }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(false);
    const [isCardTypeModalOpen, setIsCardTypeModalOpen] = useState(false);
    const [isCardMethodModalOpen, setIsCardMethodModalOpen] = useState(false);

    // Fallback para evitar tela branca se o carrinho sumir ou dados falharem
    if (!cart || cart.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center p-6 text-center">
                <div className="max-w-xs">
                    <p className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Seu carrinho está vazio ou ocorreu um erro.</p>
                    <button onClick={() => onNavigate(View.SHOWCASE)} className="w-full bg-fuchsia-600 text-white font-bold py-3 rounded-lg">Voltar para a Vitrine</button>
                </div>
            </div>
        );
    }

    const handlePaymentSelection = async (method: 'PIX' | 'Débito' | 'Crédito' | 'Dinheiro') => {
        setIsLoading(true);
        setIsCardTypeModalOpen(false);

        let successMessage = "";
        
        if (method === 'PIX') {
            successMessage = "Pedido enviado! Use o QR Code para pagar.";
            onPixClick();
        } else if (method === 'Dinheiro') {
            successMessage = "Pedido registrado! Dirija-se ao balcão para finalizar o pagamento.";
        } else {
            successMessage = "Boa escolha! Dirija-se ao vendedor para fazer o pagamento na maquininha.";
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

    const handleOnlinePayment = async () => {
        setIsLoading(true);

        const itemDescriptions = cart.map(item => {
            const itemType = item.type === 'full' 
                ? (item.quantity > 1 ? 'almofadas cheias' : 'almofada cheia') 
                : (item.quantity > 1 ? 'capas' : 'capa');
            const baseName = item.name.split('(')[0].trim().toLowerCase();
            return `${item.quantity} ${itemType} ${baseName}`;
        });

        const itemsText = itemDescriptions.length > 1 
            ? itemDescriptions.slice(0, -1).join(', ') + ' e ' + itemDescriptions.slice(-1) 
            : itemDescriptions[0];

        const message = `Olá sou a ${customerName}, fiz o pedido no site de ${itemsText}, no valor total de R$ ${totalPrice.toFixed(2).replace('.', ',')} como posso prosseguir com o pagamento ?`;
        
        const whatsappUrl = `https://wa.me/5561991434805?text=${encodeURIComponent(message)}`;
        
        const successMessage = "Seu pedido foi registrado! Conclua o pagamento no WhatsApp clicando em OK.";

        try {
            await onPlaceOrder('Cartão (Online)', successMessage, () => {
                window.open(whatsappUrl, '_blank');
            });
        } catch (error) {
            console.error("Failed to place online order:", error);
            alert("Ocorreu um erro ao registrar seu pedido. Tente novamente.");
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
                                onClick={() => handlePaymentSelection('Dinheiro')}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 text-left transition-colors flex items-center gap-4 ${isDark ? 'border-gray-700 hover:border-green-500' : 'border-gray-300 hover:border-green-500'} disabled:opacity-50`}
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 12v1m0 1v1m0 1v1m0 0h.01M12 21a9 9 0 110-18 9 9 0 010 18z" />
                                </svg>
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>Dinheiro</p>
                                    <p className={`text-sm ${subtitleClasses}`}>Pagar diretamente no balcão.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setIsCardMethodModalOpen(true)}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 text-left transition-colors flex items-center gap-4 ${isDark ? 'border-gray-700 hover:border-fuchsia-500' : 'border-gray-300 hover:border-purple-500'} disabled:opacity-50`}
                            >
                                <img src="https://i.postimg.cc/j2nMd8Dw/6.png" alt="Ícone Cartão" className="h-10 w-10 object-contain flex-shrink-0" />
                                <div>
                                    <p className={`font-bold ${titleClasses}`}>Cartão</p>
                                    <p className={`text-sm ${subtitleClasses}`}>Pague na maquininha ou online via WhatsApp.</p>
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
        <CardPaymentMethodModal
            isOpen={isCardMethodModalOpen}
            onClose={() => setIsCardMethodModalOpen(false)}
            onSelect={(method) => {
                setIsCardMethodModalOpen(false);
                if (method === 'presencial') {
                    setIsCardTypeModalOpen(true);
                } else {
                    handleOnlinePayment();
                }
            }}
        />
        <CardTypeSelectionModal
            isOpen={isCardTypeModalOpen}
            onClose={() => setIsCardTypeModalOpen(false)}
            onSelect={(type) => handlePaymentSelection(type)}
        />
        </>
    );
};

export default PaymentScreen;
