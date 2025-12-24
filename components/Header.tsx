import React, { useContext, useState } from 'react';
import { View, ThemeContext } from '../types';

interface HeaderProps {
    onMenuClick: () => void;
    cartItemCount: number;
    onCartClick: () => void;
    activeView: View;
    onNavigate: (view: View) => void;
    isAdmin: boolean;
}

const QrCodeIcon = () => (
    <img src="https://i.postimg.cc/rFQwCjmD/Design-sem-nome.png" alt="QR Code Icon" className="h-7 w-7" />
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ onMenuClick, cartItemCount, onCartClick, activeView, onNavigate, isAdmin }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const menuColor = isDark ? 'text-white' : 'text-gray-800';
    const [shareTooltip, setShareTooltip] = useState(false);

    const lightLogoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
    const darkLogoUrl = 'https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png';

    const logoUrl = isDark ? darkLogoUrl : lightLogoUrl;
    const isCartActive = activeView === View.CART;
    const showQrIcon = isAdmin && activeView === View.STOCK;

    const handleShareCatalog = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Catálogo Lojas Têca & Ione',
                    text: 'Confira nosso estoque de almofadas e decorações!',
                    url: url,
                });
            } catch (e) {
                console.log("Share cancelled");
            }
        } else {
            navigator.clipboard.writeText(url);
            setShareTooltip(true);
            setTimeout(() => setShareTooltip(false), 2000);
        }
    };

    return (
        <div className={`absolute top-0 left-0 right-0 h-20 px-4 flex items-center justify-between z-20`}>
            <div className="flex items-center gap-1">
                <button 
                    onClick={onMenuClick} 
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                    aria-label="Abrir menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="relative">
                    <button 
                        onClick={handleShareCatalog}
                        className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-purple-600'} transition-all`}
                        title="Compartilhar Link da Vitrine"
                    >
                        <ShareIcon />
                    </button>
                    {shareTooltip && (
                        <div className="absolute top-full left-0 mt-1 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap animate-bounce font-bold">Link copiado!</div>
                    )}
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <img 
                    src={logoUrl} 
                    alt="Logo Lojas Têca & Ione" 
                    className="h-16 object-contain transition-all duration-300"
                />
            </div>

             <button 
                onClick={showQrIcon ? () => onNavigate(View.QR_CODES) : onCartClick} 
                className={`relative p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                aria-label={showQrIcon ? "Gerar QR Codes" : "Ver carrinho"}
            >
                {showQrIcon ? (
                    <QrCodeIcon />
                ) : isCartActive ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )}
                {cartItemCount > 0 && !isCartActive && !showQrIcon && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-500 text-xs font-bold text-white ring-2 ring-white dark:ring-[#1A1129]">
                        {cartItemCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default Header;