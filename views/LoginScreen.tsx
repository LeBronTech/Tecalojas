import React, { useState, useEffect } from 'react';
import { STORE_IMAGE_URLS } from '../constants';

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  // FIX: onGoogleLogin should return a Promise to match the async function passed to it.
  onGoogleLogin: () => Promise<void>;
  onOpenSignUp: () => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.596 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const REMEMBER_EMAIL_KEY = 'pillow-oasis-remember-email';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoogleLogin, onOpenSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleAuthError = (err: any) => {
    if (err.code === 'auth/invalid-email') {
      setError('O formato do e-mail é inválido.');
    } else if (err.code === 'auth/unauthorized-domain') {
      setError('Domínio não autorizado. Adicione este domínio ao seu console do Firebase.');
    } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
      setError('Método de login desativado. Habilite-o no Console do Firebase.');
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      setError('E-mail ou senha incorretos.');
    } else {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha e-mail e senha.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Por favor, insira um e-mail válido.');
        return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onLogin(email, password);
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onGoogleLogin();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-full w-full relative overflow-y-auto flex flex-col items-center justify-center p-6 pt-12 pb-24 bg-[#E0D6F5] font-sans no-scrollbar">
      <div className="absolute inset-0 bg-gradient-to-br from-[#E0D6F5] to-[#D8C6F8] opacity-80"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 30%), radial-gradient(circle at 80% 90%, rgba(175, 225, 255, 0.3) 0%, transparent 30%), radial-gradient(circle at 50% 50%, rgba(255, 197, 222, 0.2) 0%, transparent 25%)'
      }}></div>
      
      <div className="text-center mt-12 mb-8 z-10" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 className="text-4xl font-bold text-[#2D1F49]">Bem-vindos às</h1>
        <h2 className="text-4xl font-bold text-[#2D1F49]">Lojas Têca</h2>
      </div>

      <div className="flex space-x-6 mb-8 z-10">
        <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
          <img src={STORE_IMAGE_URLS.teca} alt="Logo da Loja Têca" className="w-full h-full object-cover" />
        </div>
        <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
          <img src={STORE_IMAGE_URLS.ione} alt="Logo da Loja Ione Decor" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="w-full max-w-xs bg-white/30 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/80 shadow-xl z-10">
        <h3 className="text-center font-bold text-lg text-[#2D1F49] mb-4">Acesse para gerenciar</h3>
        <form onSubmit={handleEmailSubmit}>
          <div className="relative mb-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#8e44ad] outline-none"
            />
          </div>
          <div className="relative mb-4">
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white text-gray-800 placeholder-gray-400 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#8e44ad] outline-none"
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="remember-me" className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2">Lembrar e-mail</span>
            </label>
          </div>
          {error && <p className="text-xs text-center mb-2 text-red-600 font-bold">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#48C9B0] text-white font-bold py-3 rounded-lg text-lg shadow-lg shadow-teal-500/30 hover:bg-[#40b19b] transition disabled:bg-gray-400"
          >
            {isLoading ? 'Aguarde...' : 'LOGIN'}
          </button>
        </form>
         <p className="text-xs text-center mt-4 text-gray-600">
          Não tem uma conta? <button onClick={onOpenSignUp} className="font-bold text-[#8e44ad] hover:underline">Cadastre-se</button>
        </p>
        <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-400"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-xs">OU</span>
            <div className="flex-grow border-t border-gray-400"></div>
        </div>
        <button onClick={handleGoogleClick} disabled={isLoading} className="w-full flex items-center justify-center bg-white text-gray-700 font-semibold py-2.5 px-4 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition disabled:opacity-50">
            <GoogleIcon />
            Entrar com Google
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;