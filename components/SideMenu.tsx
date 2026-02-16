
import React, { useContext } from 'react';
import { View, ThemeContext } from '../types';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    isAdmin: boolean;
    activeView: View;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onNavigate, onLogout, isAdmin, activeView }) => {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    if (!isOpen) return null;

    const menuItems = [
        { label: 'Vitrine', view: View.SHOWCASE, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        { label: 'Catálogos PDF', view: View.CATALOG, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
    ];

    if (isAdmin) {
        menuItems.push(
            { label: 'Configurações', view: View.SETTINGS, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></> },
            { label: 'Diagnóstico', view: View.DIAGNOSTICS, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
            { label: 'Etiquetas QR', view: View.QR_CODES, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> }
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Drawer */}
            <div className={`relative w-72 h-full shadow-2xl flex flex-col transition-transform animate-slide-in-left ${isDark ? 'bg-[#1A1129]' : 'bg-white'}`}>
                <style>{`
                    @keyframes slide-in-left { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
                    .animate-slide-in-left { animation: slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                `}</style>

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <img src={isDark ? "https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png" : "https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png"} alt="Logo" className="h-8 object-contain" />
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Items */}
                <div className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => { onNavigate(item.view); onClose(); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                                activeView === item.view 
                                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30' 
                                : (isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100')
                            }`}
                        >
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
                            <span className="font-semibold text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-3 bg-opacity-50">
                    <button 
                        onClick={toggleTheme}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isDark ? 'bg-black/20 text-gray-300 hover:bg-black/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        <span className="text-sm font-semibold">{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? 'bg-fuchsia-600' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isDark ? 'left-6' : 'left-1'}`}></div>
                        </div>
                    </button>
                    
                    {isAdmin && (
                        <button 
                            onClick={onLogout}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            <span className="font-semibold text-sm">Sair</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
