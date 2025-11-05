import React, { useContext } from 'react';
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
    <img src="https://i.postimg.cc/j2v9tdcm/20251105-132026-0000.png" alt="QR Code Icon" className="h-7 w-7" />
);


const Header: React.FC<HeaderProps> = ({ onMenuClick, cartItemCount, onCartClick, activeView, onNavigate, isAdmin }) => {
    const { theme } = useContext(ThemeContext);
    const menuColor = theme === 'dark' ? 'text-white' : 'text-gray-800';

    const lightLogoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
    const darkLogoUrl = 'https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png';

    const logoUrl = theme === 'dark' ? darkLogoUrl : lightLogoUrl;
    const isCartActive = activeView === View.CART;
    const showQrIcon = isAdmin && activeView === View.STOCK;

    return (
        <div className={`absolute top-0 left-0 right-0 h-20 px-4 flex items-center justify-between z-20`}>
            <button 
                onClick={onMenuClick} 
                className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                aria-label="Abrir menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <img 
                    src={logoUrl} 
                    alt="Logo Lojas Têca & Ione" 
                    className="h-16 object-contain transition-all duration-300"
                />
            </div>

             <button 
                onClick={showQrIcon ? () => onNavigate(View.QR_CODES) : onCartClick} 
                className={`relative p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
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