import React, { useState, useContext } from 'react';
import { ThemeContext } from './types';

interface SignUpModalProps {
    onClose: () => void;
    onSignUp: (email: string, pass: string) => Promise<void>;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ onClose, onSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor, insira um e-mail válido.');
            return;
        }
        
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        
        setError(null);
        setIsLoading(true);
        try {
            await onSignUp(email, password);
            // O fechamento do modal e o redirecionamento são feitos no App.tsx
        } catch (err: any) {
            if (err.code === 'auth/invalid-email') {
                setError('O formato do e-mail é inválido.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
                setError('Cadastro por e-mail desativado. Habilite-o no Console do Firebase.');
            } else {
                setError('Ocorreu um erro ao criar a conta.');
                console.error(err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                
                <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className={`text-2xl font-bold mb-2 text-center ${titleClasses}`}>Criar Conta</h2>
                <p className={`text-center mb-6 ${subtitleClasses}`}>Cadastre-se para gerenciar seu estoque.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>E-mail</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>
                     <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Senha</label>
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>
                     <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Confirmar Senha</label>
                        <input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-500 font-semibold">{error}</p>}
                    
                    <div className="flex justify-end items-center pt-4 gap-4">
                        <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100">
                            {isLoading ? 'Criando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUpModal;