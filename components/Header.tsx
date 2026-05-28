
import React, { useContext, useState } from 'react';
import { View, ThemeContext } from '../types';

interface HeaderProps {
    onMenuClick: () => void;
    cartItemCount: number;
    onCartClick: () => void;
    activeView: View;
    onNavigate: (view: View) => void;
    isAdmin: boolean;
    isLoggedIn: boolean;
    hasPendingPreorders?: boolean;
    isSearchOpen: boolean;
    onToggleSearch: () => void;
    searchIconOpacity: number;
}

const QrCodeIcon = () => (
    <img src="https://i.postimg.cc/rFQwCjmD/Design-sem-nome.png" alt="QR Code Icon" className="h-6 w-6" />
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ onMenuClick, cartItemCount, onCartClick, activeView, onNavigate, isAdmin, isLoggedIn, hasPendingPreorders, isSearchOpen, onToggleSearch, searchIconOpacity }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const menuColor = isDark ? 'text-white' : 'text-gray-800';

    const lightLogoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
    const darkLogoUrl = 'https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png';

    const logoUrl = isDark ? darkLogoUrl : lightLogoUrl;
    const isCartActive = activeView === View.CART || activeView === View.PAYMENT;
    const showQrIcon = isAdmin && activeView === View.STOCK;

    // Efeito de brilho roxo/fuchsia luxuoso e responsivo que cresce proporcionalmente
    const searchGlowStyle: React.CSSProperties = {
        opacity: searchIconOpacity,
        boxShadow: (searchIconOpacity > 0.05 && searchIconOpacity < 0.95) 
            ? `0 0 ${searchIconOpacity * 16}px ${searchIconOpacity * 3.5}px ${isDark ? 'rgba(217, 70, 239, 0.75)' : 'rgba(147, 51, 234, 0.65)'}` 
            : 'none',
        border: (searchIconOpacity > 0.05 && searchIconOpacity < 0.95) 
            ? `1px solid ${isDark ? `rgba(217, 70, 239, ${searchIconOpacity * 0.45})` : `rgba(147, 51, 234, ${searchIconOpacity * 0.45})`}` 
            : '1px solid transparent',
        transform: `scale(${0.9 + (searchIconOpacity * 0.1)})`,
        transition: 'box-shadow 0.15s ease-out, border-color 0.15s ease-out, transform 0.15s ease-out'
    };

    return (
        <div className={`fixed top-3 left-4 right-4 h-16 px-3 flex items-center justify-between z-50 transition-all duration-300 backdrop-blur-lg rounded-2xl ${isDark ? 'bg-black/40 shadow-xl shadow-black/50 border border-white/10' : 'bg-white/85 shadow-lg shadow-fuchsia-200/40 border border-fuchsia-50'}`}>
            <div className="flex items-center gap-0.5">
                <button 
                    onClick={onMenuClick} 
                    className={`p-1.5 rounded-xl focus:outline-none outline-none ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                    aria-label="Abrir menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <button
                    onClick={() => onNavigate(View.STOCK)}
                    className={`p-1.5 rounded-xl focus:outline-none outline-none ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors ${isLoggedIn ? (isDark ? 'text-fuchsia-400' : 'text-purple-600') : menuColor}`}
                    aria-label="Acessar Sistema"
                >
                    <UserIcon />
                </button>
            </div>

            <div className="absolute top-1/2 left-[48%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <img 
                    src={logoUrl} 
                    alt="Logo Lojas Têca & Ione" 
                    className="h-10 md:h-12 object-contain transition-all duration-300"
                />
            </div>

            <div className="flex items-center gap-0.5">
                <button 
                  onClick={onToggleSearch}
                  style={searchGlowStyle}
                  className={`p-1.5 rounded-xl focus:outline-none outline-none ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-all`}
                  aria-label="Buscar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isSearchOpen ? (isDark ? 'text-fuchsia-400' : 'text-purple-600') : menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button 
                    onClick={showQrIcon ? () => onNavigate(View.QR_CODES) : (isCartActive ? () => onNavigate(View.SHOWCASE) : onCartClick)} 
                    className={`relative p-1.5 rounded-xl focus:outline-none outline-none ring-0 border-0 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                    aria-label={showQrIcon ? "Gerar QR Codes" : (isCartActive ? "Fechar Carrinho" : "Ver carrinho")}
                >
                    {showQrIcon ? (
                        <QrCodeIcon />
                    ) : isCartActive ? (
                        // X Icon (Close)
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        // Classic Shopping Cart Icon
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isDark ? 'text-fuchsia-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    )}
                    
                    {/* Cart Item Counter Badge - Only show when NOT active/open */}
                    {cartItemCount > 0 && !isCartActive && !showQrIcon && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#1A1129]">
                            {cartItemCount}
                        </span>
                    )}
                    
                    {/* Pending Pre-order Orange Dot (Only if cart is empty and not active) */}
                    {!showQrIcon && !isCartActive && hasPendingPreorders && cartItemCount === 0 && (
                        <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-orange-500 animate-pulse ring-2 ring-white dark:ring-[#1A1129]"></span>
                    )}
                </button>
            </div>
        </div>
    );
};


export default Header;
