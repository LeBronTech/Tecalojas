
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Product, View, Theme, User, StoreName, Variation, CushionSize, DynamicBrand, CatalogPDF, SavedComposition, ThemeContext, AiContext, AiContextState } from './types';
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
import { ProductCreationWizard } from './views/ProductCreationWizard';
import * as api from './firebase';
import { firebaseConfig } from './firebaseConfig';

// --- Cordova/TypeScript Declarations ---
declare global {
  interface Window {
    cordova?: any;
    plugins?: any;
  }
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
    const { theme } = React.useContext(ThemeContext);
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
    const { theme } = React.useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const newPixUrl = "https://i.postimg.cc/3R3f8ZRn/photo