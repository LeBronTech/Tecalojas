import React, { useContext } from 'react';
import { ThemeContext } from '../types';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { theme } = useContext(ThemeContext);
    const menuColor = theme === 'dark' ? 'text-white' : 'text-gray-800';

    const lightLogoUrl = 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png';
    const darkLogoUrl = 'https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png';

    const logoUrl = theme === 'dark' ? darkLogoUrl : lightLogoUrl;

    return (
        <div className={`absolute top-0 left-0 right-0 h-20 px-4 flex items-center z-20`}>
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
        </div>
    );
};

export default Header;