import React, { useContext } from 'react';
import { ThemeContext } from '../App';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { theme } = useContext(ThemeContext);
    const menuColor = theme === 'dark' ? 'text-white' : 'text-gray-800';

    return (
        <div className={`absolute top-0 left-0 right-0 px-4 pt-4 flex justify-start items-center z-20`}>
            {/* Menu button */}
            <button 
                onClick={onMenuClick} 
                className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                aria-label="Abrir menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${menuColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
    );
};

export default Header;