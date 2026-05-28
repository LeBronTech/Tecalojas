
import React, { useContext, useState } from 'react';
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
    const [shareTooltip, setShareTooltip] = useState(false);

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

    const menuItems = [
        { label: 'Vitrine', view: View.SHOWCASE, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        { label: 'Criar Composição', view: View.COMPOSITION_GENERATOR, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /> },
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
        <div className={`fixed inset-0 z-[100] flex transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            
            {/* Drawer */}
            <div className={`relative w-72 h-full shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-[#1A1129]' : 'bg-white'}`}>

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
                    <a 
                        href={`https://wa.me/5561991434805?text=${encodeURIComponent("Olá, vi o site das Lojas Têca e gostaria de fazer uma encomenda.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isDark ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                        <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span className="font-semibold text-sm">Falar no WhatsApp</span>
                    </a>

                    <button 
                        onClick={handleShareCatalog}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} relative`}
                    >
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                        <span className="font-semibold text-sm">Compartilhar Vitrine</span>
                        {shareTooltip && (
                            <div className={`absolute top-full right-4 mt-2 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} text-[10px] px-2 py-1 rounded whitespace-nowrap animate-bounce font-bold`}>Link copiado!</div>
                        )}
                    </button>

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
