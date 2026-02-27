import React, { useContext } from 'react';
import { ThemeContext } from '../types';

interface FabricImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const FabricImageModal: React.FC<FabricImageModalProps> = ({ imageUrl, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in" onClick={onClose}>
      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s forwards; }
      `}</style>
      <div
        className="relative w-full max-w-xl aspect-square rounded-2xl overflow-hidden shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes scale-up { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-scale-up { animation: scale-up 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>
        <img src={imageUrl} alt="Tecido Ampliado" className="w-full h-full object-contain" />

        <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-20 ${closeBtnClasses}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default FabricImageModal;
