import React, { useState, useContext } from 'react';
import { ThemeContext } from '../types';

interface ApiKeyModalProps {
    onClose: () => void;
    onSave: (apiKey: string) => Promise<void>;
}

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave }) => {
    const [key, setKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim() || isVerifying || isSuccess) {
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            await onSave(key.trim());
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500); // Close after 1.5 seconds
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido ao validar a chave.");
        } finally {
            setIsVerifying(false);
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
                            disabled={isVerifying || isSuccess}
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>
                    {error && <p className="text-sm text-center text-red-500 font-semibold">{error}</p>}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-fuchsia-500 hover:underline">
                        Obter uma chave de API
                    </a>
                    
                    <button 
                        type="submit" 
                        disabled={isVerifying || isSuccess || !key.trim()}
                        className={`w-full text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform flex items-center justify-center h-[52px]
                            ${isSuccess 
                                ? 'bg-green-500' 
                                : `bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-600/30 hover:scale-105 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed`
                            }
                        `}
                    >
                        {isVerifying && <ButtonSpinner />}
                        {isSuccess && (
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Chave Salva!
                            </div>
                        )}
                        {!isVerifying && !isSuccess && 'Verificar e Salvar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApiKeyModal;