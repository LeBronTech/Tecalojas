
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
const ALL_COLORS_STORAGE_KEY = 'pillow-oasis-all-colors';
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

// --- FIX: Added icons and SideMenu component to resolve the error in App.tsx ---

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);
const CompositionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
    const activeClasses = isDark ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' : 'bg-purple-100 text-purple-700 border-purple-200';
    const inactiveClasses = isDark ? 'text-gray-400 hover:bg-white/5 border-transparent' : 'text-gray-600 hover:bg-gray-50 border-transparent';

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${isActive ? activeClasses : inactiveClasses}`}
        >
            <div className="flex items-center gap-3">
                <span className={isActive ? (isDark ? 'text-fuchsia-400' : 'text-purple-700') : 'text-gray-400'}>{icon}</span>
                <span className="font-bold text-sm">{label}</span>
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
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-1 no-scrollbar">
                    <div className="pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Navegação</div>
                    <MenuButton icon={<HomeIcon />} label="Vitrine" isActive={activeView === View.SHOWCASE} onClick={() => { onNavigate(View.SHOWCASE); onClose(); }} />
                    <MenuButton icon={<CompositionIcon />} label="Composições" isActive={activeView === View.COMPOSITIONS} onClick={() => { onNavigate(View.COMPOSITIONS); onClose(); }} />
                    
                    {isAdmin && (
                        <>
                            <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Administração</div>
                            <MenuButton icon={<SalesIcon />} label="Vendas" isActive={activeView === View.SALES} onClick={() => { onNavigate(View.SALES); onClose(); }} hasNotification={hasNewSaleRequests} />
                            <MenuButton icon={<InventoryIcon />} label="Estoque" isActive={activeView === View.STOCK} onClick={() => { onNavigate(View.STOCK); onClose(); }} />
                            <MenuButton icon={<ReplacementIcon />} label="Assistente" isActive={activeView === View.ASSISTANT} onClick={() => { onNavigate(View.ASSISTANT); onClose(); }} hasNotification={hasItemsToRestock} />
                            <MenuButton icon={<DiagnosticsIcon />} label="Diagnósticos" isActive={activeView === View.DIAGNOSTICS} onClick={() => { onNavigate(View.DIAGNOSTICS); onClose(); }} />
                            <MenuButton icon={<CatalogIcon />} label="Catálogos" isActive={activeView === View.CATALOG} onClick={() => { onNavigate(View.CATALOG); onClose(); }} />
                            <MenuButton icon={<SettingsIcon />} label="Configurações" isActive={activeView === View.SETTINGS} onClick={() => { onNavigate(View.SETTINGS); onClose(); }} />
                        </>
                    )}

                    <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Ações</div>
                    <MenuButton icon={<PixIcon />} label="Pagamento via PIX" onClick={() => { onPixClick(); onClose(); }} />
                </div>

                <div className="p-4 border-t border-white/10">
                    {isLoggedIn ? (
                        <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 font-bold hover:bg-red-500/10 transition-colors">
                            <LogoutIcon />
                            Sair da Conta
                        </button>
                    ) : (
                        <button onClick={onLoginClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-fuchsia-600 text-white font-bold shadow-lg hover:bg-fuchsia-700 transition-colors">
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [allColors, setAllColors] = useState<{ name: string; hex: string }[]>([]);
  const [sofaColors, setSofaColors] = useState<{ name: string; hex: string }[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleRequests, setSaleRequests] = useState<SaleRequest[]>([]);
  const [saleRequestError, setSaleRequestError] = useState<string | null>(null);
  const loginRedirect = useRef<View | null>(null);
  const notifiedRequestIds = useRef(new Set<string>());
  const isFirstRequestsLoad = useRef(true);
  const [cardFees, setCardFees] = useState<CardFees>({ debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 });

  const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [toastNotification, setToastNotification] = useState<{ message: string; sub: string; type: 'sale' | 'preorder' } | null>(null);
  const [infoModalState, setInfoModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  useEffect(() => {
    if (!firebaseConfig.apiKey) return;
    const unsubscribe = api.onSettingsUpdate((settings) => {
        if (settings?.cardFees) {
            setCardFees(settings.cardFees);
        }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateCardFees = useCallback(async (newFees: CardFees) => {
      setCardFees(newFees);
      try {
          await api.updateGlobalCardFees(newFees);
      } catch (error) {
          console.error("Failed to sync card fees to Firestore:", error);
      }
  }, []);

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
    if (isAdmin) {
      setSaleRequestError(null);
      const unsubscribe = api.onSaleRequestsUpdate(
        (requests) => {
            if (isFirstRequestsLoad.current) {
                requests.forEach(r => notifiedRequestIds.current.add(r.id));
                isFirstRequestsLoad.current = false;
            }
            setSaleRequests(requests);
        },
        (error) => {
          console.error("Failed to fetch sale requests:", error);
          setSaleRequestError("Falha ao carregar pedidos: Verifique permissões.");
        }
      );
      return () => {
          isFirstRequestsLoad.current = true;
          unsubscribe();
      };
    } else {
        setSaleRequests([]);
    }
  }, [isAdmin]);
  
  const handleCompleteSaleRequest = useCallback(async (requestId: string, details: { discount?: number, finalPrice?: number, installments?: number, netValue?: number, totalProductionCost?: number }) => {
      try {
        await api.completeSaleRequest(requestId, details);
      } catch (error) {
        console.error("Failed to complete sale request:", error);
        alert(`Erro: ${(error as Error).message}`);
      }
  }, []);

  const hasNewSaleRequests = useMemo(() => saleRequests.some(r => r.status === 'pending'), [saleRequests]);
  
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

  useEffect(() => {
    if (!isAdmin) return;
    
    const newItems = saleRequests.filter(r => r.status === 'pending' && !notifiedRequestIds.current.has(r.id));
    
    if (newItems.length > 0) {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(440, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.5);
            }
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } catch (e) {}

        const latest = newItems[0];
        const isPre = latest.type === 'preorder';
        const title = isPre ? 'Nova Encomenda!' : 'Nova Venda Pendente!';
        const body = `${latest.customerName || 'Cliente'} - R$ ${(latest.totalPrice).toFixed(2)}`;

        setToastNotification({ message: title, sub: body, type: latest.type });
        setTimeout(() => setToastNotification(null), 5000);

        if (('Notification' in window) && (Notification as any).permission === 'granted') {
            try {
              new Notification(title, {
                  body: body,
                  icon: 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png',
                  tag: 'sale-update'
              });
            } catch (e) {}
        }
        newItems.forEach(r => notifiedRequestIds.current.add(r.id));
    }
  }, [isAdmin, saleRequests]);

  useEffect(() => {
    try {
      const storedColors = localStorage.getItem(ALL_COLORS_STORAGE_KEY);
      if (storedColors) setAllColors(JSON.parse(storedColors));
      else {
        setAllColors(PREDEFINED_COLORS);
        localStorage.setItem(ALL_COLORS_STORAGE_KEY, JSON.stringify(PREDEFINED_COLORS));
      }
      
      const storedSofaColors = localStorage.getItem(SOFA_COLORS_STORAGE_KEY);
      if (storedSofaColors) setSofaColors(JSON.parse(storedSofaColors));
      else {
        setSofaColors(PREDEFINED_SOFA_COLORS);
        localStorage.setItem(SOFA_COLORS_STORAGE_KEY, JSON.stringify(PREDEFINED_SOFA_COLORS));
      }

      const storedCompositions = localStorage.getItem(SAVED_COMPOSITIONS_STORAGE_KEY);
      if (storedCompositions) setSavedCompositions(JSON.parse(storedCompositions));
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, []);
  
  useEffect(() => {
    try {
        localStorage.setItem(SAVED_COMPOSITIONS_STORAGE_KEY, JSON.stringify(savedCompositions));
    } catch (error) { console.error("Failed to save compositions", error); }
  }, [savedCompositions]);

  useEffect(() => {
    try {
        localStorage.setItem(SOFA_COLORS_STORAGE_KEY, JSON.stringify(sofaColors));
    } catch (error) { console.error("Failed to save sofa colors", error); }
  }, [sofaColors]);

  const handleSaveComposition = useCallback((compositionToSave: Omit<SavedComposition, 'id'>) => {
    const id = `${compositionToSave.size}-${compositionToSave.products.map(p => p.id).sort().join('-')}`;
    setSavedCompositions(prev => {
        const newComposition = { ...compositionToSave, id };
        const existingIndex = prev.findIndex(c => c.id === id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = newComposition;
            return updated;
        } else return [...prev, newComposition];
    });
  }, []);

  const handleAddColor = (color: { name: string; hex: string }) => {
    setAllColors(prevColors => {
        if (prevColors.some(c => c.name.toLowerCase() === color.name.toLowerCase())) return prevColors;
        const newColors = [...prevColors, color];
        localStorage.setItem(ALL_COLORS_STORAGE_KEY, JSON.stringify(newColors));
        return newColors;
    });
  };

  const handleDeleteColor = (colorName: string) => {
      setAllColors(prevColors => {
          const newColors = prevColors.filter(c => c.name.toLowerCase() !== colorName.toLowerCase());
          localStorage.setItem(ALL_COLORS_STORAGE_KEY, JSON.stringify(newColors));
          return newColors;
      });
  };
  
  const handleAddSofaColor = (color: { name: string; hex: string }) => {
    setSofaColors(prevColors => {
        if (prevColors.some(c => c.name.toLowerCase() === color.name.toLowerCase())) return prevColors;
        return [...prevColors, color];
    });
  };

  const handleDeleteSofaColor = (colorName: string) => {
      setSofaColors(prevColors => prevColors.filter(c => c.name.toLowerCase() !== colorName.toLowerCase()));
  };
  
  const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_REAL_API_KEY_HERE";

  useEffect(() => {
    if (!isConfigValid) { setAuthLoading(false); return; };
    const unsubscribe = api.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isConfigValid]);

  useEffect(() => {
    const onDeviceReady = () => console.log('Dispositivo pronto.');
    document.addEventListener('devready', onDeviceReady, false);
    return () => document.removeEventListener('devready', onDeviceReady, false);
  }, []);
  
  useEffect(() => {
    if (!isConfigValid) {
        setProducts(INITIAL_PRODUCTS);
        setProductsLoading(false);
        setHasFetchError(true);
        return;
    };
    setProductsLoading(true);
    setHasFetchError(false);

    const unsubProducts = api.onProductsUpdate(
        (updatedProducts) => { setProducts(updatedProducts); setProductsLoading(false); setHasFetchError(false); },
        (error) => { setProducts(INITIAL_PRODUCTS); setHasFetchError(true); setProductsLoading(false); }
    );
    const unsubBrands = api.onBrandsUpdate((updatedBrands) => setBrands(updatedBrands), (e) => {});
    const unsubCatalogs = api.onCatalogsUpdate((updatedCatalogs) => setCatalogs(updatedCatalogs), (e) => {});
    const unsubCategories = api.onCategoriesUpdate((updatedCategories) => setCategories(updatedCategories), (e) => {});

    return () => {
      unsubProducts();
      unsubBrands();
      unsubCatalogs();
      unsubCategories();
    };
  }, [currentUser, isConfigValid]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);
  
  const handleLogin = useCallback(async (email: string, pass: string) => {
      await api.signIn(email, pass);
      if (loginRedirect.current) {
          setView(loginRedirect.current);
          loginRedirect.current = null;
      } else setView(View.STOCK);
  }, []);
  
  const handleSignUp = useCallback(async (email: string, pass: string) => {
      await api.signUp(email, pass);
      setIsSignUpModalOpen(false);
      if (loginRedirect.current) {
          setView(loginRedirect.current);
          loginRedirect.current = null;
      } else setView(View.STOCK);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
      await api.signInWithGoogle();
      if (loginRedirect.current) {
          setView(loginRedirect.current);
          loginRedirect.current = null;
      } else setView(View.STOCK);
  }, []);

  const handleLogout = useCallback(() => {
    api.signOut();
    setCurrentUser(null);
    setIsMenuOpen(false);
    setView(View.SHOWCASE);
  }, []);

    const handleSaveProduct = useCallback(async (productToSave: Product, options?: { closeModal?: boolean }): Promise<Product> => {
        try {
            if (!productToSave.category?.trim() || !productToSave.fabricType?.trim() || !productToSave.colors || productToSave.colors.length === 0 || !productToSave.name?.trim()) {
                throw new Error("Nome, categoria, tipo de tecido e cor são obrigatórios.");
            }
            let productWithGroupId = { ...productToSave };
            if (!productWithGroupId.variationGroupId) {
                productWithGroupId.variationGroupId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            let productForBackgroundUpload: Product;
            if (productWithGroupId.id) {
                const { id, ...productData } = productWithGroupId;
                await api.updateProductData(id, productData);
                productForBackgroundUpload = productWithGroupId;
            } else {
                const { id, ...productData } = productWithGroupId;
                productForBackgroundUpload = await api.addProductData(productData);
            }
            api.processImageUploadsForProduct(productForBackgroundUpload).catch(err => {
                console.error("Background image processing failed:", err);
            });
            if (options?.closeModal !== false) setEditingProduct(null);
            return productForBackgroundUpload;
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                throw new Error('Permissão negada. Sua conta não tem privilégios de administrador.');
            }
            throw error;
        }
    }, []);

    const handleCreateColorVariations = useCallback(async (parentProduct: Product, newColors: {name: string, hex: string}[]) => {
        try {
            const productsToCreate = newColors.map(color => {
                let baseName = parentProduct.name;
                const parentColorName = parentProduct.colors[0]?.name;
                if (parentColorName) {
                    const regex = new RegExp(`\\b${parentColorName}\\b|\\(${parentColorName}\\)`, 'i');
                    baseName = baseName.replace(regex, '').trim();
                }
                baseName = baseName.replace(/\s\s+/g, ' ').trim();
                const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
                const newName = `${baseName} (${capitalizedColorName})`.trim();
                const newProductData: Omit<Product, 'id'> = {
                    ...parentProduct,
                    name: newName,
                    colors: [color],
                    baseImageUrl: '',
                    unitsSold: 0,
                    backgroundImages: {},
                    variationGroupId: parentProduct.variationGroupId,
                    variations: parentProduct.variations.map(v => ({
                        ...v,
                        imageUrl: '',
                        stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 },
                    }))
                };
                const { id, ...rest } = newProductData as any;
                return rest;
            });
            await Promise.all(productsToCreate.map(p => api.addProductData(p)));
        } catch (error: any) {
            if (error.code === 'permission-denied') throw new Error('Permissão negada.');
            throw error;
        }
    }, []);

  const handleCreateProductsFromWizard = useCallback(async (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => {
      try {
          const createdDocs = await Promise.all(productsToCreate.map(p => api.addProductData(p)));
          const configuredProductDoc = createdDocs.find((doc, index) => productsToCreate[index].colors[0]?.name === productToConfigure.colors[0]?.name);
          if (!configuredProductDoc) throw new Error("Could not find created product.");
          setIsWizardOpen(false);
          setEditingProduct({ ...productToConfigure, id: configuredProductDoc.id });
      } catch (error: any) {
          if (error.code === 'permission-denied') throw new Error('Permissão negada.');
          throw error;
      }
  }, []);

  const handleAddNewBrand = useCallback(async (brandName: string, logoFile?: File, logoUrl?: string) => {
    try {
        let finalLogoUrl = logoUrl || '';
        if (logoFile) finalLogoUrl = await api.uploadFile(`brand_logos/${Date.now()}_${logoFile.name}`, logoFile).promise;
        if (!finalLogoUrl) throw new Error("É necessário fornecer uma URL ou um arquivo para o logo.");
        await api.addBrand({ name: brandName.trim(), logoUrl: finalLogoUrl });
    } catch (error: any) {
        if (error.code === 'permission-denied') throw new Error('Permissão negada.');
        throw error;
    }
  }, []);

  const handleAddCategory = useCallback(async (name: string, type: 'category' | 'subcategory') => {
      try {
          await api.addCategory({ name: name.trim(), type });
      } catch(error: any) {
          throw new Error("Erro ao adicionar categoria: " + error.message);
      }
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
      try {
          await api.deleteCategory(categoryId);
      } catch(error: any) {
          throw new Error("Erro ao excluir categoria: " + error.message);
      }
  }, []);

  const handleUploadCatalog = useCallback(async (brandName: string, pdfFile: File, onProgress: (progress: number) => void) => {
      const { promise: uploadPromise, cancel } = api.uploadFile(`catalogs/${brandName}_${Date.now()}_${pdfFile.name}`, pdfFile, onProgress);
      const overallPromise = uploadPromise.then(async (pdfUrl) => {
        await api.addCatalog({ brandName, pdfUrl, fileName: pdfFile.name });
      });
      return { promise: overallPromise, cancel };
  }, []);

  const handleUpdateStock = useCallback(async (productId: string, variationSize: CushionSize, store: StoreName, change: number) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate) return;
    const updatedProduct = JSON.parse(JSON.stringify(productToUpdate));
    const variationToUpdate = updatedProduct.variations.find((v: Variation) => v.size === variationSize);
    if (!variationToUpdate) return;
    variationToUpdate.stock[store] = Math.max(0, variationToUpdate.stock[store] + change);
    const { id, ...productData } = updatedProduct;
    try { await api.updateProductData(id, productData); } catch (error: any) { alert('Falha ao atualizar o estoque.'); }
  }, [products]);

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return;
    try {
      await api.deleteProduct(deletingProductId);
      if (typeof editingProduct === 'object' && editingProduct?.id === deletingProductId) setEditingProduct(null);
    } catch (error: any) { alert(`Falha ao excluir o produto.`); }
    // --- FIX: Fixed typo where setDeletingRequestId was called instead of setDeletingProductId ---
    finally { setDeletingProductId(null); }
  };

  const isLoggedIn = !!currentUser;
  const handleMenuClick = useCallback(() => setIsMenuOpen(true), []);

  const hasItemsToRestock = useMemo(() => {
    if (!isAdmin) return false;
    return products.some(p => {
        const totalStock = p.variations.reduce((sum, v) => sum + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0);
        return totalStock <= 1 || !p.colors || p.colors.length === 0 || p.colors.some(c => c.name === 'Indefinida') || !p.variations || p.variations.length === 0 || !p.baseImageUrl;
    });
  }, [products, isAdmin]);

  const mergedCategories = useMemo(() => {
      const productCategories = new Set(products.map(p => p.category));
      const managedCategories = categories.filter(c => c.type === 'category').map(c => c.name);
      return Array.from(new Set([...productCategories, ...managedCategories])).sort();
  }, [products, categories]);

  const renderView = () => {
    if (productsLoading || authLoading) return <div className="flex-grow flex items-center justify-center"><p className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>Carregando...</p></div>;
    const protectedViews = [View.STOCK, View.SETTINGS, View.CATALOG, View.ASSISTANT, View.DIAGNOSTICS, View.SALES, View.PAYMENT, View.QR_CODES];
    if (protectedViews.includes(view) && !currentUser) return <div className="flex-grow flex flex-col overflow-hidden"><LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onOpenSignUp={() => setIsSignUpModalOpen(true)} isCheckout={view === View.PAYMENT} /></div>;

    switch (view) {
      case View.SHOWCASE:
        return <ShowcaseScreen products={products} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={handleAddToCart} sofaColors={sofaColors} cart={cart} />;
      case View.STOCK:
        return <StockManagementScreen products={products} onEditProduct={setEditingProduct} onAddProduct={() => setIsWizardOpen(true)} onDeleteProduct={(id) => setDeletingProductId(id)} onUpdateStock={handleUpdateStock} canManageStock={isAdmin} hasFetchError={hasFetchError} brands={brands} onMenuClick={handleMenuClick} />;
       case View.SETTINGS:
        return <SettingsScreen canManageStock={isAdmin} brands={brands} allColors={allColors} onAddColor={handleAddColor} onDeleteColor={handleDeleteColor} onMenuClick={handleMenuClick} cardFees={cardFees} onSaveCardFees={handleUpdateCardFees} sofaColors={sofaColors} onAddSofaColor={handleAddSofaColor} onDeleteSofaColor={handleDeleteSofaColor} categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
       case View.CATALOG:
        return <CatalogScreen catalogs={catalogs} onUploadCatalog={handleUploadCatalog} onMenuClick={handleMenuClick} canManageStock={isAdmin} brands={brands} />;
       case View.COMPOSITION_GENERATOR:
        return <CompositionGeneratorScreen products={products} onNavigate={handleNavigate} savedCompositions={savedCompositions} onSaveComposition={handleSaveComposition} setSavedCompositions={setSavedCompositions} />;
       case View.COMPOSITIONS:
        return <CompositionsScreen savedCompositions={savedCompositions} setSavedCompositions={setSavedCompositions} onNavigate={handleNavigate} products={products} onEditProduct={setEditingProduct} onSaveComposition={handleSaveComposition} />;
       case View.ASSISTANT:
        return <AssistantScreen products={products} onEditProduct={setEditingProduct} onDeleteProduct={(id) => setDeletingProductId(id)} canManageStock={isAdmin} onMenuClick={handleMenuClick} />;
       case View.DIAGNOSTICS:
        return <DiagnosticsScreen products={products} saleRequests={saleRequests} cardFees={cardFees} onMenuClick={handleMenuClick} />;
       case View.CART:
        return <CartScreen cart={cart} products={products} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onNavigate={handleNavigate} />;
       case View.PAYMENT:
        return <PaymentScreen cart={cart} totalPrice={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)} onPlaceOrder={async (method, msg, successCb) => {
            const saleItems = [...cart];
            if (saleItems.length === 0) return;
            try {
                await api.addSaleRequest({ items: saleItems, totalPrice: saleItems.reduce((acc, i) => acc + (i.price * i.quantity), 0), paymentMethod: method, customerName });
                if (successCb) successCb();
                handleClearCart();
                setInfoModalState({ isOpen: true, title: 'Sucesso!', message: msg, onConfirm: () => handleNavigate(View.SHOWCASE) });
            } catch (e: any) {
                alert("Erro: " + e.message);
            }
        }} onNavigate={handleNavigate} onPixClick={() => setIsPixModalOpen(true)} customerName={customerName} />;
       case View.SALES:
        return <SalesScreen saleRequests={saleRequests} onCompleteSaleRequest={handleCompleteSaleRequest} products={products} onMenuClick={handleMenuClick} error={saleRequestError} cardFees={cardFees} />;
       case View.QR_CODES:
        return <QrCodeScreen products={products} />;
      default:
        return <ShowcaseScreen products={products} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={handleAddToCart} sofaColors={sofaColors} cart={cart} />;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1A1129] text-white' : 'bg-white text-gray-900'}`}>
            {!isConfigValid && <ConfigurationRequiredModal />}
            <Header onMenuClick={handleMenuClick} cartItemCount={cart.reduce((sum, i) => sum + i.quantity, 0)} onCartClick={() => handleNavigate(View.CART)} activeView={view} onNavigate={handleNavigate} isAdmin={isAdmin} />
            {renderView()}
            <BottomNav activeView={view} onNavigate={handleNavigate} hasItemsToRestock={hasItemsToRestock} isAdmin={isAdmin} hasNewSaleRequests={hasNewSaleRequests} />
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
                <div className="fixed top-24 right-4 z-[200] max-w-xs w-full bg-white dark:bg-[#2D1F49] border-l-4 border-green-500 rounded-r shadow-lg p-4 animate-slide-in-right">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-3 w-0 flex-1 pt-0.5">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{toastNotification.message}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{toastNotification.sub}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </ThemeContext.Provider>
  );
}
