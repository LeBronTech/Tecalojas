import React, { useContext } from 'react';
import { ThemeContext } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const messageClasses = isDark ? "text-gray-400" : "text-gray-500";
  const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-300" onClick={onClose}>
      <div 
        className={`border rounded-3xl shadow-2xl w-full max-w-sm p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale text-center ${modalBgClasses}`} 
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
        `}</style>
        
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h3 className={`text-xl font-bold mt-4 ${titleClasses}`}>{title}</h3>
        <p className={`mt-2 text-sm ${messageClasses}`}>{message}</p>

        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className={`font-bold py-3 px-6 rounded-lg transition w-full ${cancelBtnClasses}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-red-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-red-600/30 hover:bg-red-700 transition"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;