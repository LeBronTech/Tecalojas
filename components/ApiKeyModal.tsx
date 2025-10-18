import React, { useState, useContext } from 'react';
import { ThemeContext } from '../App';

interface ApiKeyModalProps {
    onClose: () => void;
    onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave }) => {
    const [key, setKey] = useState('');
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onSave(key.trim());
        }
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
            <form 
                onSubmit={handleSubmit}
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                
                <button type="button" onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className={`text-2xl font-bold mb-2 text-center ${titleClasses}`}>Chave de API da Gemini</h2>
                <p className={`text-center text-sm mb-6 ${subtitleClasses}`}>Para usar os recursos de IA, você precisa de uma chave de API do Google AI Studio.</p>

                <div className="space-y-4">
                    <div>
                        <input 
                            type="password"
                            placeholder="Cole sua chave de API aqui"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            required
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-fuchsia-500 hover:underline">
                        Obter uma chave de API
                    </a>
                    
                    <button type="submit" className="w-full bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105">
                        Salvar e Continuar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApiKeyModal;