
import React, { useState, useCallback, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Product, View, Theme, User, StoreName, Variation, CushionSize, DynamicBrand, CatalogPDF, SavedComposition, ThemeContext, ThemeContextType, CartItem, SaleRequest, CardFees, CategoryItem } from './types';
import { INITIAL_PRODUCTS, PREDEFINED_COLORS, PREDEFINED_SOFA_COLORS, SOFA_COLORS_STORAGE_KEY } from './constants';
import LoginScreen from './views/LoginScreen';
import ShowcaseScreen from './views/ShowcaseScreen';
import StockManagementScreen from './views/StockManagementScreen';
import SettingsScreen from './views/SettingsScreen';
import CatalogScreen from './views/CatalogScreen';
import CompositionGeneratorScreen from './views/CompositionGeneratorScreen';
import CompositionsScreen from './views/CompositionsScreen';
import AssistantScreen from './views/ReplacementScreen';
import DiagnosticsScreen from './views/DiagnosticsScreen';
import CartScreen from './views/CartScreen';
import PaymentScreen from './views/PaymentScreen';
import SalesScreen from './views/SalesScreen';
import QrCodeScreen from './views/QrCodeScreen';
import AddEditProductModal from './components/AddEditProductModal';
import SignUpModal from './SignUpModal';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ConfirmationModal from './components/ConfirmationModal';
import { ProductCreationWizard } from './views/ProductCreationWizard';
import * as api from './firebase';
import { firebaseConfig } from './firebaseConfig';

declare global {
  interface Window {
    cordova?: any;
    plugins?: any;
    AppInventor?: {
      setWebViewString: (message: string) => void;
    };
    completeGoogleSignIn?: (idToken: string | null, errorMsg: string | null) => void;
    handleLoginToken?: (idToken: string) => void;
  }
  interface Navigator {
    connection: any;
    camera: any;
  }
  var Connection: any;
  var Camera: any;
}

const THEME_STORAGE_KEY = 'pillow-oasis-theme';
const SAVED_COMPOSITIONS_STORAGE_KEY = 'pillow-oasis-saved-compositions';
const CART_STORAGE_KEY = 'pillow-oasis-cart';

const ConfigurationRequiredModal = () => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const modalBg = isDark ? 'bg-[#1A1129]' : 'bg-gray-50';
    const cardBg = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200';
    const textColor = isDark ? 'text-gray-300' : 'text-gray-700';
    const titleColor = isDark ? 'text-white' : 'text-gray-900';
    const codeBg = isDark ? 'bg-black/40' : 'bg-gray-100';
    const codeText = isDark ? 'text-fuchsia-300' : 'text-red-600';

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${modalBg}`}>
            <div className={`rounded-3xl shadow-2xl w-full max-w-2xl p-8 border ${cardBg}`}>
                <div className="text-center">
                    <svg className={`mx-auto h-12 w-12 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className={`text-2xl font-bold mt-4 ${titleColor}`}>Ação Necessária: Configure o Firebase</h1>
                    <p className={`mt-2 ${textColor}`}>O aplicativo não pode se conectar ao banco de dados porque a configuração do Firebase não foi definida.</p>
                </div>
                <div className="mt-8 text-center">
                    <button onClick={() => window.location.reload()} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                        Recarregar Aplicativo
                    </button>
                </div>
            </div>
        </div>
    );
};

interface PixPaymentModalProps {
  onClose: () => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ onClose }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [copySuccess, setCopySuccess] = useState('');
    const pixKey = "00020126360014BR.GOV.BCB.PIX0114+55619932247435204000053039865802BR5912Cosme Daniel6008Brasilia62070503***63041F78";

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(pixKey);
            setCopySuccess('Copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        } catch (err) {
            setCopySuccess('Falhou!');
        }
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const newPixUrl = "https://i.postimg.cc/Kv6YwYXM/Cartao-de-Visita-Elegante-Minimalista-Cinza-e-Marrom.png";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                 <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-20 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-center mb-4">
                     <h2 className={`text-2xl font-bold ${titleClasses}`}>Pagamento via PIX</h2>
                     <p className={`mt-1 ${subtitleClasses}`}>Use o QR Code unificado para ambas as lojas.</p>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col items-center justify-center">
                    <div className="w-full">
                         <div className="mb-4">
                            <p className={`text-center text-sm font-semibold mb-2 ${subtitleClasses}`}>PIX Copia e Cola:</p>
                            <div className={`relative p-3 pr-12 rounded-lg text-xs break-all ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{pixKey}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className={`absolute top-1/2 right-1 -translate-y-1/2 p-2 rounded-lg transition-colors ${isDark ? 'bg-purple-600 text-white' : 'bg-purple-50 text-white'}`}
                                >
                                    {copySuccess ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {copySuccess && <p className="text-center text-xs text-green-500 font-semibold mt-1">{copySuccess}</p>}
                        </div>
                        <img src={newPixUrl} alt="QR Code PIX Unificado" className="rounded-lg shadow-lg w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CustomerNameModalProps {
  onClose: () => void;
  onConfirm: (name: string) => void;
}

const CustomerNameModal: React.FC<CustomerNameModalProps> = ({ onClose, onConfirm }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={onClose}>
            <form 
                onSubmit={handleSubmit}
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
            >
                 <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                <h2 className={`text-2xl font-bold mb-2 text-center ${titleClasses}`}>Identificação</h2>
                <p className={`text-center text-sm mb-6 ${subtitleClasses}`}>Por favor, digite seu nome para identificarmos o pedido.</p>
                <div className="space-y-4">
                    <div>
                        <input 
                            type="text"
                            placeholder="Seu nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>
                    <button type="submit" className="w-full bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                        Continuar para Pagamento
                    </button>
                </div>
            </form>
        </div>
    );
};

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  onConfirm?: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, message, buttonText = "OK", onConfirm }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const messageClasses = isDark ? "text-gray-400" : "text-gray-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[130] p-4" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale text-center ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                <h2 className={`text-2xl font-bold mb-2 ${titleClasses}`}>{title}</h2>
                <p className={`mb-6 ${messageClasses}`}>{message}</p>
                <button onClick={handleConfirm} className="w-full bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

// --- Icons ---

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);
// Ícone de composições em formato de layers (camadas)
const CompositionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
);
const InventoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);
const ReplacementIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const DiagnosticsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);
const SalesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);
const CatalogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const PixIcon = () => <img src="https://i.postimg.cc/6qF1dkk4/5.png" alt="PIX" className="h-5 w-5 object-contain" />;
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);
const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 v1" />
    </svg>
);

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    onLoginClick: () => void;
    onPixClick: () => void;
    activeView: View;
    onNavigate: (view: View) => void;
    isLoggedIn: boolean;
    isAdmin: boolean;
    hasItemsToRestock: boolean;
    hasNewSaleRequests: boolean;
}

const MenuButton: React.FC<{ icon: React.ReactNode, label: string, isActive?: boolean, onClick: () => void, hasNotification?: boolean }> = ({ icon, label, isActive, onClick, hasNotification }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    // Exact colors from the screenshot model for light mode
    const activeClasses = isDark ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' : 'bg-[#F5EBFF] text-[#A21CAF] border-transparent';
    const inactiveClasses = isDark ? 'text-gray-400 hover:bg-white/5 border-transparent' : 'text-gray-600 hover:bg-gray-50 border-transparent';

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isActive ? activeClasses : inactiveClasses}`}
        >
            <div className="flex items-center gap-4">
                <span className={isActive ? (isDark ? 'text-fuchsia-400' : 'text-[#A21CAF]') : 'text-gray-400'}>{icon}</span>
                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </div>
            {hasNotification && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
        </button>
    );
};

const SideMenu: React.FC<SideMenuProps> = ({ 
    isOpen, onClose, onLogout, onLoginClick, onPixClick, activeView, onNavigate, isLoggedIn, isAdmin, hasItemsToRestock, hasNewSaleRequests 
}) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    return (
        <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`absolute top-0 left-0 w-80 max-w-[85%] h-full flex flex-col transition-transform duration-300 ease-out border-r ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex justify-between items-center">
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto px-4 py-2 space-y-1 no-scrollbar">
                    <div className="pb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500/80">Navegação</div>
                    <MenuButton icon={<HomeIcon />} label="Vitrine" isActive={activeView === View.SHOWCASE} onClick={() => { onNavigate(View.SHOWCASE); onClose(); }} />
                    <MenuButton icon={<CompositionIcon />} label="Combos" isActive={activeView === View.COMPOSITIONS} onClick={() => { onNavigate(View.COMPOSITIONS); onClose(); }} />
                    
                    {isAdmin && (
                        <>
                            <div className="pt-6 pb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500/80">Administração</div>
                            <MenuButton icon={<SalesIcon />} label="Vendas" isActive={activeView === View.SALES} onClick={() => { onNavigate(View.SALES); onClose(); }} hasNotification={hasNewSaleRequests} />
                            <MenuButton icon={<InventoryIcon />} label="Estoque" isActive={activeView === View.STOCK} onClick={() => { onNavigate(View.STOCK); onClose(); }} />
                            <MenuButton icon={<ReplacementIcon />} label="Assistente" isActive={activeView === View.ASSISTANT} onClick={() => { onNavigate(View.ASSISTANT); onClose(); }} hasNotification={hasItemsToRestock} />
                            <MenuButton icon={<DiagnosticsIcon />} label="Diagnósticos" isActive={activeView === View.DIAGNOSTICS} onClick={() => { onNavigate(View.DIAGNOSTICS); onClose(); }} />
                            <MenuButton icon={<CatalogIcon />} label="Catálogos" isActive={activeView === View.CATALOG} onClick={() => { onNavigate(View.CATALOG); onClose(); }} />
                            <MenuButton icon={<SettingsIcon />} label="Configurações" isActive={activeView === View.SETTINGS} onClick={() => { onNavigate(View.SETTINGS); onClose(); }} />
                        </>
                    )}

                    <div className="pt-6 pb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500/80">Ações</div>
                    <MenuButton icon={<PixIcon />} label="Pagamento via PIX" onClick={() => { onPixClick(); onClose(); }} />
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5">
                    {isLoggedIn ? (
                        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 font-bold hover:bg-red-500/10 transition-colors">
                            <LogoutIcon />
                            Sair da Conta
                        </button>
                    ) : (
                        <button onClick={onLoginClick} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#A21CAF] text-white font-black shadow-xl shadow-fuchsia-500/30 hover:bg-fuchsia-700 transition-all active:scale-95 uppercase tracking-wider text-sm">
                            <LoginIcon />
                            Acessar Sistema
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>(View.SHOWCASE);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<DynamicBrand[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogPDF[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  });
  const isDark = theme === 'dark';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  // FIX: Initialize with default colors to prevent menu disappearance before Firebase loads
  const [allColors, setAllColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_COLORS);
  // FIX: Initialize with default sofa colors
  const [sofaColors, setSofaColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_SOFA_COLORS);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleRequests, setSaleRequests] = useState<SaleRequest[]>([]);
  const [saleRequestError, setSaleRequestError] = useState<string | null>(null);
  const loginRedirect = useRef<View | null>(null);
  const notifiedRequestIds = useRef(new Set<string>());
  const previousRequests = useRef<SaleRequest[]>([]);
  const isFirstRequestsLoad = useRef(true);
  const [cardFees, setCardFees] = useState<CardFees>({ debit: 1.0, credit1x: 1.5, credit2x: 2.0, credit3x: 4.0 });
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);

  const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [toastNotification, setToastNotification] = useState<{ message: string; sub: string; type: 'sale' | 'preorder' | 'success' } | null>(null);
  const [infoModalState, setInfoModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const [initialProductId, setInitialProductId] = useState<string | undefined>(undefined);

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  // -- Missing State/Derived --
  const isLoggedIn = !!currentUser;
  const isConfigValid = !!firebaseConfig.apiKey;

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      return newTheme;
    });
  }, []);

  const handleMenuClick = () => setIsMenuOpen(true);

  // -- Deep Linking --
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('product_id');
      if (productId) {
          setInitialProductId(productId);
          setView(View.SHOWCASE);
      }
  }, []);

  // -- Data Fetching --
  useEffect(() => {
      const unsubscribeAuth = api.onAuthStateChanged(user => {
          setCurrentUser(user);
          setAuthLoading(false);
      });
      const unsubscribeProducts = api.onProductsUpdate(
          (data) => { setProducts(data); setProductsLoading(false); },
          (err) => { console.error(err); setHasFetchError(true); setProductsLoading(false); }
      );
      const unsubscribeBrands = api.onBrandsUpdate(setBrands, console.error);
      const unsubscribeCatalogs = api.onCatalogsUpdate(setCatalogs, console.error);
      const unsubscribeCategories = api.onCategoriesUpdate(setCategories, console.error);

      return () => {
          unsubscribeAuth();
          unsubscribeProducts();
          unsubscribeBrands();
          unsubscribeCatalogs();
          unsubscribeCategories();
      };
  }, []);

  useEffect(() => {
    if (!firebaseConfig.apiKey) return;
    const unsubscribe = api.onSettingsUpdate((settings) => {
        if (settings?.cardFees) {
            setCardFees(settings.cardFees);
        }
        if (settings?.weeklyGoal !== undefined) {
            setWeeklyGoal(settings.weeklyGoal);
        }
        // Sync Colors with Firestore
        if (settings?.colors && settings.colors.length > 0) {
            setAllColors(settings.colors);
        } 
        // Sync Sofa Colors with Firestore
        if (settings?.sofaColors && settings.sofaColors.length > 0) {
            setSofaColors(settings.sofaColors);
        } 
    }, (error) => {
        // ERROR HANDLING: Silence permission-denied to prevent console spam.
        // The app uses defaults (PREDEFINED_COLORS) so functionality is preserved.
        if (error.code !== 'permission-denied') {
            console.warn("Settings sync warning:", error.message);
        }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateCardFees = useCallback(async (newFees: CardFees) => {
      setCardFees(newFees);
      try {
          await api.updateGlobalSettings({ cardFees: newFees });
      } catch (error) {
          console.error("Failed to sync card fees to Firestore:", error);
      }
  }, []);

  const handleUpdateWeeklyGoal = useCallback(async (newGoal: number) => {
      setWeeklyGoal(newGoal);
      try {
          await api.updateGlobalSettings({ weeklyGoal: newGoal });
      } catch (error) {
          console.error("Failed to sync weekly goal to Firestore:", error);
      }
  }, []);

  // -- Product Handlers --
  const handleSaveProduct = async (productToSave: Product, options?: { closeModal?: boolean }) => {
      try {
          // Upload images if they are base64
          await api.processImageUploadsForProduct(productToSave);
          
          if (products.some(p => p.id === productToSave.id)) {
              await api.updateProductData(productToSave.id, productToSave);
          } else {
              const { id, ...data } = productToSave;
              await api.addProductData(data);
          }
          
          if (options?.closeModal !== false) {
              setEditingProduct(null);
          }
          return productToSave;
      } catch (error) {
          console.error("Save product error", error);
          throw error;
      }
  };

  const confirmDeleteProduct = async () => {
      if (deletingProductId) {
          await api.deleteProduct(deletingProductId);
          setDeletingProductId(null);
          setEditingProduct(null);
      }
  };

  const handleUpdateStock = async (productId: string, variationSize: CushionSize, store: StoreName, change: number) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const newVariations = product.variations.map(v => {
          if (v.size === variationSize) {
              const newStock = Math.max(0, (v.stock[store] || 0) + change);
              return { ...v, stock: { ...v.stock, [store]: newStock } };
          }
          return v;
      });
      
      await api.updateProductData(productId, { variations: newVariations });
  };

  const handleCreateColorVariations = async (parentProduct: Product, newColors: {name: string, hex: string}[]) => {
      const batchPromises = newColors.map(color => {
          const capitalizedColor = color.name.charAt(0).toUpperCase() + color.name.slice(1);
          // Remove old color from name if exists
          let baseName = parentProduct.name;
          if (parentProduct.colors && parentProduct.colors.length > 0) {
             const oldColor = parentProduct.colors[0].name;
             const regex = new RegExp(`\\b${oldColor}\\b|\\(${oldColor}\\)`, 'gi');
             baseName = baseName.replace(regex, '').trim().replace(/\s\s+/g, ' ');
             baseName = baseName.replace(/[()]/g, '').trim();
          }
          
          const newName = `${baseName} (${capitalizedColor})`;
          
          const newProductData = {
              ...parentProduct,
              id: undefined, // remove ID to create new
              name: newName,
              colors: [color],
              baseImageUrl: '', 
              variations: parentProduct.variations.map(v => ({ ...v, stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 } })),
              unitsSold: 0
          };
          delete (newProductData as any).id;
          return api.addProductData(newProductData);
      });
      await Promise.all(batchPromises);
  };

  const handleCreateProductsFromWizard = async (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => {
      await Promise.all(productsToCreate.map(p => api.addProductData(p)));
      setIsWizardOpen(false);
  };

  // -- Category Handlers --
  const mergedCategories = useMemo(() => {
      const dbCats = categories.filter(c => c.type === 'category').map(c => c.name);
      const prodCats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
      return Array.from(new Set([...dbCats, ...prodCats])).sort();
  }, [categories, products]);

  const handleAddCategory = async (name: string, type: 'category' | 'subcategory') => {
      await api.addCategory({ name, type });
  };
  const handleDeleteCategory = async (id: string) => {
      await api.deleteCategory(id);
  };

  // -- Color Handlers --
  const handleAddColor = async (color: { name: string; hex: string }) => {
      const newColors = [...allColors, color];
      await api.updateGlobalSettings({ colors: newColors });
  };
  const handleDeleteColor = async (colorName: string) => {
      const newColors = allColors.filter(c => c.name !== colorName);
      await api.updateGlobalSettings({ colors: newColors });
  };
  const handleAddSofaColor = async (color: { name: string; hex: string }) => {
      const newColors = [...sofaColors, color];
      await api.updateGlobalSettings({ sofaColors: newColors });
  };
  const handleDeleteSofaColor = async (colorName: string) => {
      const newColors = sofaColors.filter(c => c.name !== colorName);
      await api.updateGlobalSettings({ sofaColors: newColors });
  };

  // -- Auth Handlers --
  const handleLogin = async (email: string, pass: string) => {
      const user = await api.signIn(email, pass);
      setCurrentUser(user);
      if (loginRedirect.current) {
          setView(loginRedirect.current);
          loginRedirect.current = null;
      } else {
          setView(View.STOCK);
      }
  };
  const handleGoogleLogin = async () => {
      const user = await api.signInWithGoogle();
      setCurrentUser(user);
      if (loginRedirect.current) {
          setView(loginRedirect.current);
          loginRedirect.current = null;
      } else {
          setView(View.STOCK);
      }
  };
  const handleLogout = async () => {
      await api.signOut();
      setCurrentUser(null);
      setView(View.SHOWCASE);
      setIsMenuOpen(false);
  };
  const handleSignUp = async (email: string, pass: string) => {
      await api.signUp(email, pass);
      const user = await api.signIn(email, pass);
      setCurrentUser(user);
      setIsSignUpModalOpen(false);
      setView(View.STOCK);
  };

  // -- Brand/Catalog --
  const handleAddNewBrand = async (brandName: string, logoFile?: File, logoUrl?: string) => {
      let finalLogoUrl = logoUrl || '';
      if (logoFile) {
          const { promise } = api.uploadFile(`brands/${brandName}_${Date.now()}`, logoFile);
          finalLogoUrl = await promise;
      }
      await api.addBrand({ name: brandName, logoUrl: finalLogoUrl });
  };
  const handleUploadCatalog = async (brandName: string, pdfFile: File, onProgress: (p: number) => void) => {
      const { promise, cancel } = api.uploadFile(`catalogs/${brandName}_${Date.now()}.pdf`, pdfFile, onProgress);
      const url = await promise;
      await api.addCatalog({ brandName, fileName: pdfFile.name, pdfUrl: url });
      return { promise: Promise.resolve(), cancel };
  };

  // -- Helper --
  const hasItemsToRestock = useMemo(() => {
      return products.some(p => p.variations.reduce((acc, v) => acc + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0) <= 1);
  }, [products]);

  const handlePlaceOrder = async (method: string, successMsg: string, onSuccess?: () => void) => {
      const physicalItems: CartItem[] = [];
      const preOrderItems: CartItem[] = [];
      
      let physicalTotal = 0;
      let preOrderTotal = 0;

      cart.forEach(item => {
          if (item.isPreOrder) {
              preOrderItems.push(item);
              preOrderTotal += item.price * item.quantity;
          } else {
              physicalItems.push(item);
              physicalTotal += item.price * item.quantity;
          }
      });

      const promises = [];

      // 1. Process Physical Order (Pending Sale) - CHANGED: Now sets to 'pending' instead of 'completed'
      if (physicalItems.length > 0) {
          promises.push(api.addSaleRequest({
              items: physicalItems,
              totalPrice: physicalTotal,
              paymentMethod: method === 'WhatsApp (Encomenda)' ? 'Cartão (Online)' : method as any,
              customerName,
              type: 'sale' // Explicitly mark as a standard sale
          }));
      }

      // 2. Process Pre-order (Pending Request)
      if (preOrderItems.length > 0) {
          promises.push(api.addSaleRequest({
              items: preOrderItems,
              totalPrice: preOrderTotal,
              paymentMethod: method === 'WhatsApp (Encomenda)' ? method : `Encomenda (${method})`,
              customerName,
              type: 'preorder'
          }));
      }

      await Promise.all(promises);

      handleClearCart();
      
      // Feedback
      if (preOrderItems.length > 0 && physicalItems.length > 0) {
          setToastNotification({ message: 'Pedidos Registrados!', sub: 'Venda de estoque e encomenda enviadas para aprovação.', type: 'success' });
      } else if (preOrderItems.length > 0) {
          setToastNotification({ message: 'Encomenda Registrada!', sub: 'Aguarde a confirmação na aba de Encomendas.', type: 'preorder' });
      } else {
          setToastNotification({ message: 'Venda Solicitada!', sub: 'Aguardando confirmação do vendedor.', type: 'sale' });
      }

      setTimeout(() => setToastNotification(null), 6000);
      if (onSuccess) onSuccess();
      handleNavigate(View.SHOWCASE);
  };

  // -- Render View --
  const renderView = () => {
      if (!currentUser && [View.STOCK, View.SETTINGS, View.ASSISTANT, View.SALES, View.QR_CODES].includes(view)) {
          return (
              <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
                  <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onOpenSignUp={() => setIsSignUpModalOpen(true)} />
              </div>
          );
      }

      switch (view) {
          case View.SHOWCASE:
              return <ShowcaseScreen products={products} initialProductId={initialProductId} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={handleAddToCart} sofaColors={sofaColors} cart={cart} />;
          case View.STOCK:
              return <StockManagementScreen products={products} onEditProduct={setEditingProduct} onDeleteProduct={(id) => setDeletingProductId(id)} onAddProduct={() => setIsWizardOpen(true)} onUpdateStock={handleUpdateStock} onMenuClick={handleMenuClick} canManageStock={isAdmin} hasFetchError={hasFetchError} brands={brands} />;
          case View.ASSISTANT:
              return <AssistantScreen products={products} onEditProduct={setEditingProduct} onDeleteProduct={(id) => setDeletingProductId(id)} canManageStock={isAdmin} onMenuClick={handleMenuClick} />;
          case View.SETTINGS:
              return <SettingsScreen onAddNewBrand={handleAddNewBrand} onMenuClick={handleMenuClick} canManageStock={isAdmin} brands={brands} allColors={allColors} onAddColor={handleAddColor} onDeleteColor={handleDeleteColor} cardFees={cardFees} onSaveCardFees={handleUpdateCardFees} sofaColors={sofaColors} onAddSofaColor={handleAddSofaColor} onDeleteSofaColor={handleDeleteSofaColor} categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
          case View.CATALOG:
              return <CatalogScreen catalogs={catalogs} onUploadCatalog={handleUploadCatalog} onMenuClick={handleMenuClick} canManageStock={isAdmin} brands={brands} />;
          case View.COMPOSITION_GENERATOR:
              return <CompositionGeneratorScreen products={products} onNavigate={handleNavigate} savedCompositions={savedCompositions} onSaveComposition={(c) => { 
                  const newComp = { ...c, id: Date.now().toString() };
                  const newComps = [...savedCompositions, newComp];
                  setSavedCompositions(newComps);
                  localStorage.setItem(SAVED_COMPOSITIONS_STORAGE_KEY, JSON.stringify(newComps));
              }} setSavedCompositions={setSavedCompositions} />;
          case View.COMPOSITIONS:
              return <CompositionsScreen savedCompositions={savedCompositions} setSavedCompositions={(comps) => { setSavedCompositions(comps); localStorage.setItem(SAVED_COMPOSITIONS_STORAGE_KEY, JSON.stringify(comps)); }} onNavigate={handleNavigate} products={products} onEditProduct={setEditingProduct} onSaveComposition={(c) => { 
                  const newComp = { ...c, id: Date.now().toString() };
                  const newComps = [...savedCompositions, newComp];
                  setSavedCompositions(newComps);
                  localStorage.setItem(SAVED_COMPOSITIONS_STORAGE_KEY, JSON.stringify(newComps));
              }} />;
          case View.DIAGNOSTICS:
              return <DiagnosticsScreen products={products} saleRequests={saleRequests} cardFees={cardFees} onMenuClick={handleMenuClick} weeklyGoal={weeklyGoal} onUpdateWeeklyGoal={handleUpdateWeeklyGoal} />;
          case View.CART:
              return <CartScreen cart={cart} products={products} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onNavigate={handleNavigate} saleRequests={saleRequests} />;
          case View.PAYMENT:
              return <PaymentScreen cart={cart} totalPrice={cart.reduce((sum, item) => sum + item.quantity * item.price, 0)} onPlaceOrder={handlePlaceOrder} onNavigate={handleNavigate} onPixClick={() => setIsPixModalOpen(true)} customerName={customerName} />;
          case View.SALES:
              return <SalesScreen saleRequests={saleRequests} onCompleteSaleRequest={handleCompleteSaleRequest} products={products} onMenuClick={handleMenuClick} error={saleRequestError} cardFees={cardFees} />;
          case View.QR_CODES:
              return <QrCodeScreen products={products} />;
          default:
              return <ShowcaseScreen products={products} initialProductId={initialProductId} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={handleAddToCart} sofaColors={sofaColors} cart={cart} />;
      }
  };

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (e) { console.error("Failed to load cart from localStorage", e); }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);
  
  const handleAddToCart = useCallback((product: Product, variation: Variation, quantity: number, itemType: 'cover' | 'full', price: number, isPreOrder: boolean = false) => {
    setCart(prevCart => {
        let finalQuantity = quantity;
        
        if (!isPreOrder) {
            const physicalStock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
            const otherTypeInCart = prevCart.find(item => item.productId === product.id && item.variationSize === variation.size && item.type !== itemType && !item.isPreOrder);
            const otherQuantity = otherTypeInCart?.quantity || 0;
            const maxAllowedForThisItem = physicalStock - otherQuantity;
            finalQuantity = Math.min(quantity, maxAllowedForThisItem);
        }

      if (finalQuantity <= 0) return prevCart;
      
      const existingItemIndex = prevCart.findIndex(item => 
        item.productId === product.id && 
        item.variationSize === variation.size && 
        item.type === itemType &&
        !!item.isPreOrder === isPreOrder
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: finalQuantity };
        return updatedCart;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          baseImageUrl: product.baseImageUrl,
          variationSize: variation.size,
          price: price,
          quantity: finalQuantity,
          type: itemType,
          isPreOrder: isPreOrder
        };
        return [...prevCart, newItem];
      }
    });
  }, []);

  // --- FIX: Removed unused 'name' parameter from signature to match CartScreen calls ---
  const handleUpdateCartQuantity = useCallback((productId: string, variationSize: CushionSize, itemType: 'cover' | 'full', newQuantity: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === productId && item.variationSize === variationSize && item.type === itemType);
      if (!existingItem) return prevCart;

      const product = products.find(p => p.id === productId);
      const variation = product?.variations.find(v => v.size === variationSize);
      if (!variation) return prevCart;

      let clampedQuantity = Math.max(0, newQuantity);
      
      if (!existingItem.isPreOrder) {
          const physicalStock = (variation.stock[StoreName.TECA] || 0) + (variation.stock[StoreName.IONE] || 0);
          const otherTypeInCart = prevCart.find(item => item.productId === productId && item.variationSize === variationSize && item.type !== itemType && !item.isPreOrder);
          const otherQuantity = otherTypeInCart?.quantity || 0;
          const maxAllowed = physicalStock - otherQuantity;
          clampedQuantity = Math.min(clampedQuantity, maxAllowed);
      }

      if (clampedQuantity === 0) {
        return prevCart.filter(item => item !== existingItem);
      }
      return prevCart.map(item => item === existingItem ? { ...item, quantity: clampedQuantity } : item);
    });
  }, [products]);

  const handleRemoveFromCart = useCallback((productId: string, variationSize: CushionSize, itemType: 'cover' | 'full') => {
     setCart(prevCart => prevCart.filter(item => !(item.productId === productId && item.variationSize === variationSize && item.type === itemType)));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
  }, []);

  useEffect(() => {
    // Only subscribe to sale requests if logged in
    if (!currentUser) {
        setSaleRequests([]);
        return;
    }

    setSaleRequestError(null);
    const unsubscribe = api.onSaleRequestsUpdate(
    (requests) => {
        setSaleRequests(prev => {
            previousRequests.current = prev; // Keep track of previous state
            return requests;
        });
        
        // Initial load marking
        if (isFirstRequestsLoad.current) {
            requests.forEach(r => notifiedRequestIds.current.add(r.id));
            isFirstRequestsLoad.current = false;
        }
    },
    (error) => {
        // If permission denied (common for non-admins trying to read all requests), silence or handle gracefully
        if (error.code !== 'permission-denied') {
            console.error("Failed to fetch sale requests:", error);
            setSaleRequestError("Falha ao carregar pedidos.");
        }
    }
    );
    return () => {
        isFirstRequestsLoad.current = true;
        unsubscribe();
    };
  }, [currentUser]); // Listen whenever user changes (login/logout)
  
  const handleCompleteSaleRequest = useCallback(async (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number, netValue?: number, totalProductionCost?: number }) => {
      try {
        await api.completeSaleRequest(requestId, details);
      } catch (error) {
        console.error("Failed to complete sale request:", error);
        alert(`Erro: ${(error as Error).message}`);
      }
  }, []);

  const hasNewSaleRequests = useMemo(() => saleRequests.some(r => r.status === 'pending'), [saleRequests]);
  
  // New specific flags for granular notifications
  const hasPendingSales = useMemo(() => saleRequests.some(r => r.status === 'pending' && r.type === 'sale'), [saleRequests]);
  const hasPendingPreorders = useMemo(() => saleRequests.some(r => r.status === 'pending' && r.type === 'preorder'), [saleRequests]);

  const handleNavigate = useCallback((newView: View) => {
    if (newView === View.PAYMENT) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            if (!customerName) {
                setIsCustomerNameModalOpen(true);
                return;
            }
            setView(View.PAYMENT);
            return;
        } else {
            setView(View.SHOWCASE);
            return;
        }
    }
    
    const protectedViews = [View.STOCK, View.SETTINGS, View.CATALOG, View.ASSISTANT, View.DIAGNOSTICS, View.SALES, View.QR_CODES];
    if (protectedViews.includes(newView) && !currentUser) {
        loginRedirect.current = newView;
    } else {
        loginRedirect.current = null;
    }
    
    setView(newView ?? View.SHOWCASE);
  }, [currentUser, cart, customerName]);

  const sendSystemNotification = (title: string, body: string) => {
        // Try Cordova Plugin first (Android/iOS Native)
        const cordovaWindow = window as any;
        if (cordovaWindow.cordova && cordovaWindow.cordova.plugins && cordovaWindow.cordova.plugins.notification && cordovaWindow.cordova.plugins.notification.local) {
            cordovaWindow.cordova.plugins.notification.local.schedule({
                title: title,
                text: body,
                foreground: true,
                smallIcon: 'res://icon',
                icon: 'res://icon'
            });
        }
        
        // Try Standard Web API (PWA/Chrome Android)
        else if (('Notification' in window) && Notification.permission === 'granted') {
            try {
              new Notification(title, {
                  body: body,
                  icon: 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png',
                  tag: 'sale-update' // Tag prevents duplicate stacking
              });
            } catch (e) {
                console.error("Web Notification Error:", e);
            }
        }
  };

  // Admin Notification Logic (New Sales & Preorders)
  useEffect(() => {
    if (!isAdmin) return;
    
    // Find completely new pending requests that we haven't notified about yet
    const newPendingItems = saleRequests.filter(r => r.status === 'pending' && !notifiedRequestIds.current.has(r.id));
    
    if (newPendingItems.length > 0) {
        // Differentiate types
        const newSales = newPendingItems.filter(r => r.type === 'sale');
        const newPreorders = newPendingItems.filter(r => r.type === 'preorder');

        // Helper to trigger feedback
        const triggerFeedback = (title: string, body: string, type: 'sale' | 'preorder', delay: number) => {
            setTimeout(() => {
                // Audio Feedback
                try {
                    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                        const audioCtx = new AudioContextClass();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        
                        if (type === 'preorder') {
                            // Preorder sound: Lower pitch, longer
                            osc.type = 'triangle';
                            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);
                        } else {
                            // Sale sound: Higher pitch 'ping'
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
                        }
                        
                        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.5);
                    }
                    
                    // Vibrate Feedback
                    if (navigator.vibrate) {
                        navigator.vibrate(type === 'preorder' ? [400, 200, 400] : [150, 100, 150]);
                    }
                } catch (e) { console.error("Audio playback blocked", e); }

                // UI & System Notifications
                setToastNotification({ message: title, sub: body, type: type });
                sendSystemNotification(title, body);
                setTimeout(() => setToastNotification(null), 5000);

            }, delay);
        };

        // Trigger for Sales
        if (newSales.length > 0) {
            const sale = newSales[0];
            triggerFeedback('Nova Venda Pendente!', `Cliente: ${sale.customerName || 'Balcão'} - R$ ${sale.totalPrice.toFixed(2)}`, 'sale', 0);
        }

        // Trigger for Preorders (with slight delay if both exist to ensure both sounds play)
        if (newPreorders.length > 0) {
            const preorder = newPreorders[0];
            triggerFeedback('Nova Encomenda!', `Cliente: ${preorder.customerName} - R$ ${preorder.totalPrice.toFixed(2)}`, 'preorder', newSales.length > 0 ? 1500 : 0);
        }

        // Mark all as notified
        newPendingItems.forEach(r => notifiedRequestIds.current.add(r.id));
    }
  }, [isAdmin, saleRequests]);

  // User Notification Logic (Sale Confirmation)
  useEffect(() => {
      // Check if any request transitioned from pending to completed
      // And if the user likely owns it (by name match or just general notification if generic user)
      if (previousRequests.current.length === 0) return;

      const justCompleted = saleRequests.filter(req => 
          req.status === 'completed' && 
          previousRequests.current.find(prev => prev.id === req.id)?.status === 'pending'
      );

      if (justCompleted.length > 0) {
          // If we have customerName stored, check match. Or if general user mode, notify.
          const relevantSale = justCompleted.find(s => !customerName || s.customerName === customerName);
          
          if (relevantSale) {
               setToastNotification({ 
                   message: "Venda Confirmada!", 
                   sub: "Seu pedido foi processado com sucesso.", 
                   type: 'success' 
               });
               setTimeout(() => setToastNotification(null), 5000);
               if (navigator.vibrate) navigator.vibrate(200);
          }
      }
  }, [saleRequests, customerName]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1A1129] text-white' : 'bg-white text-gray-900'}`}>
            {!isConfigValid && <ConfigurationRequiredModal />}
            <Header 
                onMenuClick={handleMenuClick} 
                cartItemCount={cart.reduce((sum, i) => sum + i.quantity, 0)} 
                onCartClick={() => handleNavigate(View.CART)} 
                activeView={view} 
                onNavigate={handleNavigate} 
                isAdmin={isAdmin} 
                isLoggedIn={isLoggedIn}
                hasPendingPreorders={hasPendingPreorders}
            />
            
            {/* Persistent Pre-order Notification */}
            {hasPendingPreorders && !isAdmin && (
                <div className="bg-orange-500 text-white px-4 py-2 text-xs font-bold flex justify-between items-center z-20">
                    <span>Você tem encomendas pendentes de confirmação!</span>
                    <button 
                        onClick={() => window.open(`https://wa.me/5561991434805?text=${encodeURIComponent("Olá, gostaria de confirmar minha encomenda.")}`, '_blank')}
                        className="bg-white text-orange-600 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider hover:bg-gray-100"
                    >
                        Confirmar no Zap
                    </button>
                </div>
            )}

            {renderView()}
            <BottomNav 
                activeView={view} 
                onNavigate={handleNavigate} 
                hasItemsToRestock={hasItemsToRestock} 
                isAdmin={isAdmin} 
                hasNewSaleRequests={hasNewSaleRequests}
                hasPendingSales={hasPendingSales}
                hasPendingPreorders={hasPendingPreorders}
            />
            <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onLogout={handleLogout} onLoginClick={() => handleNavigate(View.STOCK)} onPixClick={() => setIsPixModalOpen(true)} activeView={view} onNavigate={handleNavigate} isLoggedIn={isLoggedIn} isAdmin={isAdmin} hasItemsToRestock={hasItemsToRestock} hasNewSaleRequests={hasNewSaleRequests} />
            {editingProduct && (
                <AddEditProductModal 
                    product={editingProduct} 
                    products={products}
                    onClose={() => setEditingProduct(null)} 
                    onSave={handleSaveProduct} 
                    onCreateVariations={handleCreateColorVariations}
                    onSwitchProduct={setEditingProduct}
                    onRequestDelete={(id) => setDeletingProductId(id)}
                    categories={mergedCategories}
                    allColors={allColors}
                    onAddColor={handleAddColor}
                    onDeleteColor={handleDeleteColor}
                    brands={brands}
                    sofaColors={sofaColors}
                />
            )}
            {isWizardOpen && (
                <ProductCreationWizard
                    onClose={() => setIsWizardOpen(false)}
                    onConfigure={handleCreateProductsFromWizard}
                    allColors={allColors}
                    onAddColor={handleAddColor}
                    categories={mergedCategories}
                    products={products}
                    brands={brands}
                />
            )}
            {isPixModalOpen && <PixPaymentModal onClose={() => setIsPixModalOpen(false)} />}
            {isCustomerNameModalOpen && <CustomerNameModal onClose={() => setIsCustomerNameModalOpen(false)} onConfirm={(name) => { setCustomerName(name); setIsCustomerNameModalOpen(false); handleNavigate(View.PAYMENT); }} />}
            {isSignUpModalOpen && <SignUpModal onClose={() => setIsSignUpModalOpen(false)} onSignUp={handleSignUp} />}
            <ConfirmationModal isOpen={!!deletingProductId} onClose={() => setDeletingProductId(null)} onConfirm={confirmDeleteProduct} title="Excluir Produto" message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita." />
            <InfoModal isOpen={infoModalState.isOpen} onClose={() => setInfoModalState(prev => ({...prev, isOpen: false}))} title={infoModalState.title} message={infoModalState.message} onConfirm={infoModalState.onConfirm} />
            
            {toastNotification && (
                <div 
                    className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[200] max-w-sm w-full px-4 animate-slide-down"
                    onClick={() => {
                        if (toastNotification.type === 'sale' || toastNotification.type === 'preorder') {
                            handleNavigate(View.SALES);
                        }
                        setToastNotification(null);
                    }}
                >
                    <div className={`backdrop-blur-md border-l-4 rounded-2xl shadow-2xl p-4 flex items-center justify-between cursor-pointer hover:scale-105 transition-transform duration-300 ${
                        toastNotification.type === 'preorder' ? 'bg-orange-100/90 border-orange-500' :
                        toastNotification.type === 'success' ? 'bg-green-100/90 border-green-500' : 
                        'bg-white/80 dark:bg-[#2D1F49]/80 border-fuchsia-500'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className={`rounded-full p-2 text-white shadow-lg animate-pulse ${
                                toastNotification.type === 'preorder' ? 'bg-orange-500' :
                                toastNotification.type === 'success' ? 'bg-green-500' : 
                                'bg-fuchsia-500'
                            }`}>
                                {toastNotification.type === 'success' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className={`font-black text-lg leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{toastNotification.message}</p>
                                <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{toastNotification.sub}</p>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setToastNotification(null); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <style>{`
                        @keyframes slide-down {
                            0% { transform: translate(-50%, -100%); opacity: 0; }
                            100% { transform: translate(-50%, 0); opacity: 1; }
                        }
                        .animate-slide-down { animation: slide-down 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                    `}</style>
                </div>
            )}
        </div>
    </ThemeContext.Provider>
  );
}
