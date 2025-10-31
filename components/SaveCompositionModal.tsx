import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '../types';

interface SaveCompositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    predefinedName: string;
}

const SaveCompositionModal: React.FC<SaveCompositionModalProps> = ({ isOpen, onClose, onConfirm, predefinedName }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [name, setName] = useState(predefinedName);

    useEffect(() => {
        setName(predefinedName);
    }, [predefinedName]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Salvar Composição</h2>
                <input
                    type="text"
                    placeholder="Dê um nome à composição"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className={`w-full border-2 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onClose} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>Cancelar</button>
                    <button type="submit" className="bg-fuchsia-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700">Salvar</button>
                </div>
            </form>
        </div>
    );
};

export default SaveCompositionModal;
