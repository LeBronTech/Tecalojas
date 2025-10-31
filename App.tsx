import React, { useState, useCallback, createContext, useContext, useEffect, useMemo } from 'react';
import { Product, View, Theme, User, StoreName, Variation, CushionSize, DynamicBrand, CatalogPDF, SavedComposition, ThemeContext, ThemeContextType } from './types';
// FIX: Import PREDEFINED_COLORS to be used when creating color variations for products.
import { INITIAL_PRODUCTS, PREDEFINED_COLORS } from './constants';
import LoginScreen from './views/LoginScreen';
import ShowcaseScreen from './views/ShowcaseScreen';
import StockManagementScreen from './views/StockManagementScreen';
import SettingsScreen from './views/SettingsScreen';
import CatalogScreen from './views/CatalogScreen';
import CompositionGeneratorScreen from './views/CompositionGeneratorScreen';
import CompositionsScreen from './views/CompositionsScreen';
import ReplacementScreen from './views/ReplacementScreen';
import AddEditProductModal from './components/AddEditProductModal';
import SignUpModal from './SignUpModal';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ApiKeyModal from './components/ApiKeyModal';
import ConfirmationModal from './components/ConfirmationModal';
// FIX: Changed to a named import for ProductCreationWizard as it does not have a default export.
import { ProductCreationWizard } from './views/ProductCreationWizard'; // Import the new wizard
import * as api from './firebase';
import { firebaseConfig } from './firebaseConfig';

// --- Cordova/TypeScript Declarations ---
declare global {
  interface Window {
    cordova?: any;
    plugins?: any;
  }
  // FIX: Extend the Navigator interface to include the 'connection' property for the Cordova network plugin, instead of redeclaring the 'navigator' variable which caused a type conflict.
  interface Navigator {
    connection: any;
  }
  var Connection: any;
  var Camera: any;
}


// --- Constants for localStorage keys ---
const THEME_STORAGE_KEY = 'pillow-oasis-theme';
const API_KEY_STORAGE_KEY = 'pillow-oasis-api-key';
const CUSTOM_COLORS_STORAGE_KEY = 'pillow-oasis-custom-colors';
const DELETED_PREDEFINED_COLORS_KEY = 'pillow-oasis-deleted-predefined-colors';
const SAVED_COMPOSITIONS_STORAGE_KEY = 'pillow-oasis-saved-compositions';

// --- Configuration Required Modal ---
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className={`text-2xl font-bold mt-4 ${titleColor}`}>Ação Necessária: Configure o Firebase</h1>
                    <p className={`mt-2 ${textColor}`}>O aplicativo não pode se conectar ao banco de dados porque a chave de configuração (API Key) do Firebase não foi definida. Siga os passos abaixo para corrigir.</p>
                </div>
                
                <div className={`mt-6 text-left space-y-3 p-4 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                    <p className={`font-semibold ${textColor}`}><strong>Passo 1:</strong> Abra o arquivo <code className={`text-sm font-mono p-1 rounded ${codeBg}`}>firebaseConfig.ts</code> no editor de código.</p>
                    <p className={`font-semibold ${textColor}`}><strong>Passo 2:</strong> Acesse seu projeto no <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-fuchsia-500 underline">Firebase Console</a>.</p>
                    <p className={`font-semibold ${textColor}`}><strong>Passo 3:</strong> Vá para "Configurações do Projeto" (⚙️) &gt; "Geral" e encontre o objeto de configuração do seu aplicativo web.</p>
                    <p className={`font-semibold ${textColor}`}><strong>Passo 4:</strong> Copie o objeto de configuração e cole-o em <code className={`text-sm font-mono p-1 rounded ${codeBg}`}>firebaseConfig.ts</code>, substituindo o conteúdo de exemplo.</p>
                </div>

                <div className={`mt-4 p-4 rounded-lg text-sm font-mono overflow-x-auto ${codeBg} ${textColor}`}>
                  <span className="text-gray-500">// O conteúdo do seu arquivo deve ficar assim:</span><br/>
                  export const firebaseConfig = &#123;<br/>
                  &nbsp;&nbsp;apiKey: <span className={codeText}>"AIzaSy...SUA_CHAVE_REAL..."</span>,<br/>
                  &nbsp;&nbsp;authDomain: <span className={codeText}>"seu-projeto.firebaseapp.com"</span>,<br/>
                  &nbsp;&nbsp;...<br/>
                  &#125;;
                </div>
                
                <div className="mt-8 text-center">
                    <button onClick={() => window.location.reload()} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                        Recarregar Aplicativo (Após Salvar)
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- PIX Payment Modal ---
interface PixPaymentModalProps {
  onClose: () => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ onClose }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const newPixUrl = "https://i.postimg.cc/3R3f8ZRn/photo-2025-10-18-03-13-40.jpg";

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
                <div className="flex-grow overflow-y-auto no-scrollbar flex items-center justify-center">
                     <div className="w-full">
                        <img src={newPixUrl} alt="QR Code PIX Unificado" className="rounded-lg shadow-lg w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const InventoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const CatalogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const CompositionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const ReplacementIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- Side Menu Component ---
interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onLoginClick: () => void;
  onPixClick: () => void;
  activeView: View;
  onNavigate: (view: View) => void;
  isLoggedIn: boolean;
  hasItemsToRestock: boolean;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onLogout, onLoginClick, onPixClick, activeView, onNavigate, isLoggedIn, hasItemsToRestock }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const menuBgColor = theme === 'dark' ? 'bg-[#1A1129]' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const itemBgHover = theme === 'dark' ? 'hover:bg-purple-900/50' : 'hover:bg-gray-100';
  const borderColor = theme === 'dark' ? 'border-r-purple-500/20' : 'border-r-gray-200';

  const NavItem: React.FC<{ label: string; view: View; icon: React.ReactNode }> = ({ label, view, icon }) => {
    const isActive = activeView === view;
    const activeClasses = theme === 'dark' ? 'bg-purple-900/50 text-fuchsia-300' : 'bg-gray-100 text-purple-600';
    return (
      <button 
        onClick={() => { onNavigate(view); onClose(); }}
        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover} ${isActive ? activeClasses : ''}`}
      >
        <span className="mr-3">{icon}</span>
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 left-0 h-full w-72 ${menuBgColor} shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r ${borderColor} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`p-6 ${textColor}`}>
          <h2 className="text-2xl font-bold text-fuchsia-500 mb-8">Menu</h2>
          <nav className="flex flex-col space-y-2">
            <NavItem label="Vitrine" view={View.SHOWCASE} icon={<HomeIcon />} />
            <NavItem label="Composições" view={View.COMPOSITIONS} icon={<CompositionIcon />} />
            <NavItem label="Estoque" view={View.STOCK} icon={<InventoryIcon />} />
            <NavItem 
                label="Reposição" 
                view={View.REPLACEMENT} 
                icon={
                    <div className="relative">
                        <ReplacementIcon />
                        {hasItemsToRestock && (
                           <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1A1129] blinking-dot" />
                        )}
                    </div>
                } 
            />
            <NavItem label="Catálogo" view={View.CATALOG} icon={<CatalogIcon />} />
            <NavItem label="Configurações" view={View.SETTINGS} icon={<SettingsIcon />} />
            
            <div className={`border-b pt-2 my-2 ${theme === 'dark' ? 'border-purple-500/20' : 'border-gray-200'}`}></div>

            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
            >
              <span className="mr-3">
                {theme === 'dark' 
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                }
              </span>
              <span className="font-semibold">
                Mudar para Tema {theme === 'dark' ? 'Claro' : 'Escuro'}
              </span>
            </button>
            <button 
              onClick={() => { onPixClick(); onClose(); }}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
            >
              <span className="mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 12v1m0 1v1m0 1v1m0 0h.01M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
              </span>
              <span className="font-semibold">Pagamento PIX</span>
            </button>
            {isLoggedIn ? (
                 <button 
                  onClick={onLogout}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
                >
                  <span className="mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </span>
                  <span className="font-semibold">Sair</span>
                </button>
            ) : (
                 <button 
                  onClick={onLoginClick}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
                >
                  <span className="mr-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </span>
                  <span className="font-semibold">Entrar</span>
                </button>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};


export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>(View.SHOWCASE);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<DynamicBrand[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogPDF[]>([]);
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
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(API_KEY_STORAGE_KEY) || "AIzaSyCq8roeLwkCxFR8_HBlsVOHkM-LQiYNtto");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customColors, setCustomColors] = useState<{ name: string; hex: string }[]>([]);
  const [deletedPredefinedColorNames, setDeletedPredefinedColorNames] = useState<string[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);


  // Effect for loading custom colors from localStorage on initial load
  useEffect(() => {
    try {
      const storedColors = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
      if (storedColors) setCustomColors(JSON.parse(storedColors));

      const storedDeleted = localStorage.getItem(DELETED_PREDEFINED_COLORS_KEY);
      if (storedDeleted) setDeletedPredefinedColorNames(JSON.parse(storedDeleted));
      
      const storedCompositions = localStorage.getItem(SAVED_COMPOSITIONS_STORAGE_KEY);
      if (storedCompositions) setSavedCompositions(JSON.parse(storedCompositions));

    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, []);

  useEffect(() => {
      try {
          localStorage.setItem(DELETED_PREDEFINED_COLORS_KEY, JSON.stringify(deletedPredefinedColorNames));
      } catch (error) {
          console.error("Failed to save deleted predefined colors to localStorage:", error);
      }
  }, [deletedPredefinedColorNames]);
  
  // Effect for saving compositions to localStorage
  useEffect(() => {
    try {
        localStorage.setItem(SAVED_COMPOSITIONS_STORAGE_KEY, JSON.stringify(savedCompositions));
    } catch (error) {
        console.error("Failed to save compositions to localStorage:", error);
    }
  }, [savedCompositions]);

  const handleSaveComposition = useCallback((compositionToSave: Omit<SavedComposition, 'id'>) => {
    const id = `${compositionToSave.size}-${compositionToSave.products.map(p => p.id).sort().join('-')}`;
    
    setSavedCompositions(prev => {
        const newComposition = { ...compositionToSave, id };
        const existingIndex = prev.findIndex(c => c.id === id);

        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = newComposition;
            return updated;
        } else {
            return [...prev, newComposition];
        }
    });
  }, []);

  const addCustomColor = useCallback((color: { name: string; hex: string }) => {
    setCustomColors(prev => {
      const newColors = [...prev, color];
      try {
        localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(newColors));
      } catch (error) {
        console.error("Failed to save custom colors to localStorage:", error);
      }
      return newColors;
    });
  }, []);
  
  const deleteCustomColor = useCallback((colorNameToDelete: string) => {
    setCustomColors(prev => {
      const newColors = prev.filter(c => c.name.toLowerCase() !== colorNameToDelete.toLowerCase());
      try {
        localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(newColors));
      } catch (error) {
        console.error("Failed to save custom colors to localStorage:", error);
      }
      return newColors;
    });
  }, []);

  const deletePredefinedColor = useCallback((colorNameToDelete: string) => {
    setDeletedPredefinedColorNames(prev => {
        if (prev.includes(colorNameToDelete)) {
            return prev;
        }
        return [...prev, colorNameToDelete];
    });
  }, []);

  const allAppColors = useMemo(() => {
    const activePredefined = PREDEFINED_COLORS.filter(c => !deletedPredefinedColorNames.includes(c.name));
    const uniqueCustom = customColors.filter(
        (cc, index, self) => index === self.findIndex(c => c.name.toLowerCase() === cc.name.toLowerCase())
    );
    return [...activePredefined, ...uniqueCustom];
  }, [customColors, deletedPredefinedColorNames]);
  
  // Check if the Firebase config is valid. If not, the app will be blocked.
  const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_REAL_API_KEY_HERE";

  // Effect for handling auth state changes
  useEffect(() => {
    if (!isConfigValid) {
        setAuthLoading(false);
        return;
    };
    const unsubscribe = api.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isConfigValid]);

  // Effect for Cordova device ready and network status
  useEffect(() => {
    const onOffline = () => {
      alert("Conexão perdida!");
    };

    const onOnline = () => {
      console.log("Conexão recuperada!");
    };

    const onDeviceReady = () => {
      console.log('Dispositivo pronto e plugins carregados.');
      if (navigator.connection && typeof Connection !== 'undefined') {
        if (navigator.connection.type === Connection.NONE) {
          alert("Você está offline. Este app precisa de internet para funcionar.");
        } else {
          console.log("Conexão OK: " + navigator.connection.type);
        }
      }
      document.addEventListener("offline", onOffline, false);
      document.addEventListener("online", onOnline, false);
    };

    document.addEventListener('deviceready', onDeviceReady, false);

    return () => {
      document.removeEventListener('deviceready', onDeviceReady, false);
      document.removeEventListener("offline", onOffline, false);
      document.removeEventListener("online", onOnline, false);
    };
  }, []);
  
  // Effect for listening to real-time data updates (products, brands, catalogs).
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
        (error) => { console.error("Firestore error (products):", error); setProducts(INITIAL_PRODUCTS); setHasFetchError(true); setProductsLoading(false); }
    );
    const unsubBrands = api.onBrandsUpdate(
        (updatedBrands) => setBrands(updatedBrands),
        (error) => console.error("Firestore error (brands):", error)
    );
    const unsubCatalogs = api.onCatalogsUpdate(
        (updatedCatalogs) => setCatalogs(updatedCatalogs),
        (error) => console.error("Firestore error (catalogs):", error)
    );

    return () => {
      unsubProducts();
      unsubBrands();
      unsubCatalogs();
    };
  }, [currentUser, isConfigValid]);


  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);
  
  const handleNavigate = useCallback((newView: View) => {
    setView(newView);
  }, []);
  
  const handleLogin = useCallback(async (email: string, pass: string) => {
      await api.signIn(email, pass);
      setView(View.STOCK); // Redirect to stock after login
  }, []);
  
  const handleSignUp = useCallback(async (email: string, pass: string) => {
      await api.signUp(email, pass);
      setIsSignUpModalOpen(false);
      setView(View.STOCK); // Redirect to stock after sign up
  }, []);

  const handleGoogleLogin = useCallback(async () => {
      await api.signInWithGoogle();
      setView(View.STOCK); // Redirect to stock after login
  }, []);

  const handleLogout = useCallback(() => {
    api.signOut();
    setCurrentUser(null);
    setIsMenuOpen(false);
    setView(View.SHOWCASE); // Go back to showcase on logout
  }, []);

  const handleSaveApiKey = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setIsApiKeyModalOpen(false);
  }, []);

    const handleSaveProduct = useCallback(async (productToSave: Product, options?: { closeModal?: boolean }): Promise<Product> => {
        try {
            if (!productToSave.category?.trim() || !productToSave.fabricType?.trim() || !productToSave.colors || productToSave.colors.length === 0 || !productToSave.name?.trim()) {
                throw new Error("Nome, categoria, tipo de tecido e cor são obrigatórios.");
            }
    
            const existingProductWithSameName = products.find(p => 
                p.name.toLowerCase() === productToSave.name.toLowerCase() && p.id !== productToSave.id
            );
            if (existingProductWithSameName) {
                throw new Error(`Já existe um produto com o nome exato "${productToSave.name}".`);
            }
            
            let finalProductToSave = { ...productToSave };
            
            if (!finalProductToSave.variationGroupId) {
                finalProductToSave.variationGroupId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
    
            if (finalProductToSave.id) {
                const { id, ...productData } = finalProductToSave;
                await api.updateProduct(id, productData);
            } else {
                const { id, ...productData } = finalProductToSave;
                const newDoc = await api.addProduct(productData);
                finalProductToSave.id = newDoc.id;
            }
          
            if (options?.closeModal !== false) {
                setEditingProduct(null);
            }
            return finalProductToSave;
        } catch (error: any) {
            console.error("Failed to save product:", error);
            if (error.code === 'permission-denied') {
                throw new Error('Permissão negada. Sua conta não tem privilégios de administrador para salvar produtos.');
            }
            throw error;
        }
    }, [products]);

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
    
            const creationPromises = productsToCreate.map(p => api.addProduct(p));
            await Promise.all(creationPromises);
        } catch (error: any) {
            console.error("Failed to create color variations:", error);
            if (error.code === 'permission-denied') {
                throw new Error('Permissão negada. Sua conta não tem privilégios de administrador para criar produtos.');
            }
            throw error;
        }
    }, [customColors]);


  const handleCreateProductsFromWizard = useCallback(async (
    productsToCreate: Omit<Product, 'id'>[], 
    productToConfigure: Omit<Product, 'id'>
  ) => {
      try {
          const creationPromises = productsToCreate.map(p => api.addProduct(p));
          const createdDocs = await Promise.all(creationPromises);
  
          const configuredProductDoc = createdDocs.find((doc, index) => 
              productsToCreate[index].colors[0]?.name === productToConfigure.colors[0]?.name
          );
  
          if (!configuredProductDoc) {
              throw new Error("Could not find the created product to configure.");
          }
  
          const productToEdit: Product = {
              ...productToConfigure,
              id: configuredProductDoc.id,
          };
  
          setIsWizardOpen(false);
          setEditingProduct(productToEdit);
  
      } catch (error: any) {
          console.error("Failed to create products from wizard:", error);
          if (error.code === 'permission-denied') {
              throw new Error('Permissão negada. Sua conta não tem privilégios de administrador para criar produtos. Fale com o administrador do sistema.');
          }
          throw error;
      }
  }, []);

  const handleAddNewBrand = useCallback(async (brandName: string, logoFile?: File, logoUrl?: string) => {
    try {
        if (!brandName.trim()) {
            throw new Error("O nome da marca não pode ser vazio.");
        }

        let finalLogoUrl = logoUrl || '';
        if (logoFile) {
            finalLogoUrl = await api.uploadFile(`brand_logos/${Date.now()}_${logoFile.name}`, logoFile).promise;
        }

        if (!finalLogoUrl) {
            throw new Error("É necessário fornecer uma URL ou um arquivo para o logo.");
        }
        await api.addBrand({ name: brandName.trim(), logoUrl: finalLogoUrl });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            throw new Error('Permissão negada. Sua conta não tem privilégios de administrador para adicionar marcas.');
        }
        throw error;
    }
  }, []);

  const handleUploadCatalog = useCallback(async (brandName: string, pdfFile: File, onProgress: (progress: number) => void) => {
      if (!brandName || !pdfFile) {
          throw new Error("Marca e arquivo PDF são obrigatórios.");
      }
      const { promise: uploadPromise, cancel } = api.uploadFile(`catalogs/${brandName}_${Date.now()}_${pdfFile.name}`, pdfFile, onProgress);

      const overallPromise = uploadPromise.then(async (pdfUrl) => {
        await api.addCatalog({ brandName, pdfUrl, fileName: pdfFile.name });
      });
      
      return { promise: overallPromise, cancel };
  }, []);

  const handleSwitchToProduct = useCallback((product: Product) => {
    setEditingProduct(product);
  }, []);
  
  const handleUpdateStock = useCallback(async (productId: string, variationSize: CushionSize, store: StoreName, change: number) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate) {
        console.error("Product not found to update stock.");
        return;
    }

    const updatedProduct = JSON.parse(JSON.stringify(productToUpdate));
    const variationToUpdate = updatedProduct.variations.find((v: Variation) => v.size === variationSize);

    if (!variationToUpdate) {
        console.error(`Variation size ${variationSize} not found for product ${productId}.`);
        return;
    }

    const currentStock = variationToUpdate.stock[store];
    const newStock = Math.max(0, currentStock + change);

    if (newStock === currentStock) return; 

    variationToUpdate.stock[store] = newStock;
    
    const { id, ...productData } = updatedProduct;
    try {
        await api.updateProduct(id, productData);
    } catch (error: any) {
        console.error("Failed to update stock:", error);
        let alertMessage = 'Falha ao atualizar o estoque.';
        if (error.code === 'permission-denied') {
            alertMessage = 'Permissão negada. Sua conta não tem privilégios de administrador para atualizar o estoque.';
        }
        window.alert(alertMessage);
    }
  }, [products]);


  const requestDeleteProduct = useCallback((productId: string) => {
    setDeletingProductId(productId);
  }, []);

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return;

    try {
      await api.deleteProduct(deletingProductId);
      if (typeof editingProduct === 'object' && editingProduct?.id === deletingProductId) {
        setEditingProduct(null);
      }
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      if (error.code === 'permission-denied') {
        window.alert('Permissão negada. Você não tem autorização para excluir produtos. Verifique se sua conta é um "admin" no banco de dados do Firebase.');
      } else {
        window.alert(`Falha ao excluir o produto. Erro: ${error.message}`);
      }
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleLoginRedirect = useCallback(() => {
    handleNavigate(View.STOCK);
    setIsMenuOpen(false);
  }, [handleNavigate]);

  const uniqueCategories = [...new Set(products.map(p => p.category))];
  
  const canManageStock = currentUser?.role === 'admin';
  const isLoggedIn = !!currentUser;
  
  const handleMenuClick = useCallback(() => setIsMenuOpen(true), []);

  const mainScreenProps = useMemo(() => ({
    onMenuClick: handleMenuClick,
  }), [handleMenuClick]);

  const hasItemsToRestock = useMemo(() => {
    return products.some(p => {
        const totalStock = p.variations.reduce((sum, v) => sum + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0);
        return totalStock <= 1;
    });
  }, [products]);

  const renderView = () => {
    if (productsLoading || authLoading) {
      return <div className="flex-grow flex items-center justify-center"><p className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>Carregando...</p></div>
    }

    const isStockViewAttempt = view === View.STOCK || view === View.SETTINGS || view === View.CATALOG || view === View.REPLACEMENT;
    const needsLogin = isStockViewAttempt && !currentUser;

    if (needsLogin) {
      return (
        <div className="flex-grow flex flex-col overflow-hidden">
          <LoginScreen 
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onOpenSignUp={() => setIsSignUpModalOpen(true)}
          />
        </div>
      );
    }

    switch (view) {
      case View.SHOWCASE:
        return <ShowcaseScreen 
                    products={products} 
                    hasFetchError={hasFetchError} 
                    canManageStock={!!canManageStock}
                    onEditProduct={setEditingProduct}
                    brands={brands}
                    apiKey={apiKey}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                    onNavigate={handleNavigate}
                    savedCompositions={savedCompositions}
                    {...mainScreenProps} 
                />;
      case View.STOCK:
        return (
          <StockManagementScreen
            products={products}
            onEditProduct={setEditingProduct}
            onAddProduct={() => setIsWizardOpen(true)}
            onDeleteProduct={requestDeleteProduct}
            onUpdateStock={handleUpdateStock}
            canManageStock={!!canManageStock}
            hasFetchError={hasFetchError}
            brands={brands}
            {...mainScreenProps}
          />
        );
       case View.SETTINGS:
        return <SettingsScreen
                    onSaveApiKey={handleSaveApiKey}
                    onAddNewBrand={handleAddNewBrand}
                    canManageStock={!!canManageStock}
                    brands={brands}
                    customColors={customColors}
                    onAddCustomColor={addCustomColor}
                    onDeleteCustomColor={deleteCustomColor}
                    onDeletePredefinedColor={deletePredefinedColor}
                    {...mainScreenProps}
                />;
       case View.CATALOG:
        return <CatalogScreen
                    catalogs={catalogs}
                    onUploadCatalog={handleUploadCatalog}
                    canManageStock={!!canManageStock}
                    brands={brands}
                    {...mainScreenProps}
                />;
      case View.REPLACEMENT:
        return <ReplacementScreen
                    products={products}
                    onEditProduct={setEditingProduct}
                    onDeleteProduct={requestDeleteProduct}
                    canManageStock={!!canManageStock}
                    {...mainScreenProps}
                />;
      case View.COMPOSITION_GENERATOR:
        return <CompositionGeneratorScreen
                    products={products}
                    onNavigate={handleNavigate}
                    apiKey={apiKey}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                    savedCompositions={savedCompositions}
                    onSaveComposition={handleSaveComposition}
                    setSavedCompositions={setSavedCompositions}
                    availableColors={allAppColors}
                />;
      case View.COMPOSITIONS:
        return <CompositionsScreen
                    savedCompositions={savedCompositions}
                    setSavedCompositions={setSavedCompositions}
                    onNavigate={handleNavigate}
                    apiKey={apiKey}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                    products={products}
                    onEditProduct={setEditingProduct}
                    onSaveComposition={handleSaveComposition}
                />
      default:
        return <ShowcaseScreen 
                    products={products} 
                    hasFetchError={hasFetchError} 
                    canManageStock={!!canManageStock}
                    onEditProduct={setEditingProduct}
                    brands={brands}
                    apiKey={apiKey}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                    onNavigate={handleNavigate}
                    savedCompositions={savedCompositions}
                    {...mainScreenProps} 
                />;
    }
  };

  const bgClass = theme === 'dark' ? 'bg-[#1A1129]' : 'bg-gray-50';
  const mainContainerBgClass = theme === 'dark' ? 'bg-gradient-to-br from-[#2D1F49] to-[#1A1129]' : 'bg-white';
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {!isConfigValid && <ConfigurationRequiredModal />}
        <div className={`min-h-screen ${bgClass} font-sans ${!isConfigValid ? 'blur-sm pointer-events-none' : ''}`}>
            <div className={`w-full max-w-6xl mx-auto h-screen ${mainContainerBgClass} md:rounded-[40px] md:shadow-2xl flex flex-col relative md:my-4 md:h-[calc(100vh-2rem)] max-h-[1200px]`}>
                <Header onMenuClick={handleMenuClick} />
                {renderView()}

                <SideMenu
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onLogout={handleLogout}
                    onLoginClick={handleLoginRedirect}
                    onPixClick={() => setIsPixModalOpen(true)}
                    activeView={view}
                    onNavigate={handleNavigate}
                    isLoggedIn={!!isLoggedIn}
                    hasItemsToRestock={hasItemsToRestock}
                />
                <div className="md:hidden">
                    <BottomNav activeView={view} onNavigate={handleNavigate} hasItemsToRestock={hasItemsToRestock} />
                </div>
            </div>

            {isWizardOpen && (
                <ProductCreationWizard
                    onClose={() => setIsWizardOpen(false)}
                    onConfigure={handleCreateProductsFromWizard}
                    allColors={allAppColors}
                    onAddCustomColor={addCustomColor}
                    categories={uniqueCategories}
                    products={products}
                    brands={brands}
                />
            )}

            {editingProduct && (
                <AddEditProductModal
                    product={editingProduct}
                    products={products}
                    onClose={() => setEditingProduct(null)}
                    onSave={handleSaveProduct}
                    onCreateVariations={handleCreateColorVariations}
                    onSwitchProduct={handleSwitchToProduct}
                    onRequestDelete={requestDeleteProduct}
                    categories={uniqueCategories}
                    apiKey={apiKey}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                    allColors={allAppColors}
                    onAddCustomColor={addCustomColor}
                    brands={brands}
                />
            )}
            {isSignUpModalOpen && (
                <SignUpModal
                    onClose={() => setIsSignUpModalOpen(false)}
                    onSignUp={handleSignUp}
                />
            )}
            {isPixModalOpen && <PixPaymentModal onClose={() => setIsPixModalOpen(false)} />}
            {isApiKeyModalOpen && (
                <ApiKeyModal
                    onClose={() => setIsApiKeyModalOpen(false)}
                    onSave={handleSaveApiKey}
                />
            )}
            {deletingProductId && (
                <ConfirmationModal
                    isOpen={!!deletingProductId}
                    onClose={() => setDeletingProductId(null)}
                    onConfirm={confirmDeleteProduct}
                    title="Confirmar Exclusão"
                    message="Tem certeza que deseja excluir este produto? A ação não pode ser desfeita."
                />
            )}
        </div>
    </ThemeContext.Provider>
  );
}
