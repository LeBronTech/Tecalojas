import React, { useContext } from 'react';
import { ThemeContext } from '../types';

interface GenerateKeysScreenProps {
    onMenuClick: () => void;
}

const GenerateKeysScreen: React.FC<GenerateKeysScreenProps> = ({ onMenuClick }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    return (
        <div className="flex-1 overflow-y-auto p-6 pb-24">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold">Chaves de API Gemini</h1>
                    <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <div className={`p-8 rounded-2xl border shadow-sm mb-8 ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-xl font-bold mb-4">Como configurar a Inteligência Artificial</h2>
                    <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Para utilizar os recursos de Inteligência Artificial (como geração de imagens de fundo, criação de composições e assistente virtual), você precisa de uma chave de API do Google Gemini.
                    </p>

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-500 font-bold text-xl">
                                1
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">Gerar a Chave</h3>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Clique no botão abaixo para acessar o Google AI Studio. Faça login com sua conta Google e clique em "Create API Key".
                                </p>
                            </div>
                            <button 
                                onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                                className="flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                Gerar Chave Gemini
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-500 font-bold text-xl">
                                2
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-fuchsia-600 dark:text-fuchsia-400">Inserir a Chave</h3>
                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Após copiar a chave gerada, clique no botão abaixo para inseri-la no aplicativo.
                                </p>
                            </div>
                            {window.aistudio ? (
                                <button 
                                    onClick={() => window.aistudio?.openSelectKey()}
                                    className="flex-shrink-0 whitespace-nowrap px-6 py-3 rounded-xl font-bold bg-fuchsia-600 hover:bg-fuchsia-700 text-white transition-colors"
                                >
                                    Inserir Chave Gemini
                                </button>
                            ) : (
                                <div className="flex-shrink-0 px-4 py-2 rounded-lg bg-gray-500/20 text-gray-500 text-sm font-semibold">
                                    Recurso indisponível neste ambiente
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerateKeysScreen;
