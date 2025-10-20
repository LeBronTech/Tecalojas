import React, { useState, useContext } from 'react';
import { ThemeContext } from '../App';

// --- ColorSelector Component ---
interface ColorSelectorProps {
  allColors: { name: string; hex: string }[];
  disabledColors?: string[];
  onAddCustomColor: (color: { name: string; hex: string }) => void;
  // Single selection mode
  selectedColor?: { name: string; hex: string };
  onSelectColor?: (color: { name: string; hex: string }) => void;
  // Multi selection mode
  multiSelect?: boolean;
  selectedColors?: { name: string; hex: string }[];
  onToggleColor?: (color: { name: string; hex: string }) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ allColors, disabledColors = [], onAddCustomColor, selectedColor, onSelectColor, multiSelect = false, selectedColors = [], onToggleColor }) => {
  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200";
  const inputClasses = isDark ? "bg-black/30 text-white border-white/10" : "bg-white text-gray-900 border-gray-300";

  const handleAddNewColor = () => {
    if (newColor.name.trim() && !allColors.some(c => c.name.toLowerCase() === newColor.name.trim().toLowerCase())) {
        const colorToAdd = { name: newColor.name.trim(), hex: newColor.hex };
        onAddCustomColor(colorToAdd);
        if (multiSelect && onToggleColor) {
            onToggleColor(colorToAdd);
        } else if (!multiSelect && onSelectColor) {
            onSelectColor(colorToAdd);
        }
        setNewColor({ name: '', hex: '#ffffff' });
    }
  };

  return (
    <div className={`p-4 mt-3 rounded-xl border ${cardClasses}`}>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-black/10">
            {allColors.map(color => {
                const isDisabled = disabledColors.map(d => d.toLowerCase()).includes(color.name.toLowerCase());
                const isSelected = multiSelect 
                    ? selectedColors.some(c => c.name.toLowerCase() === color.name.toLowerCase())
                    : selectedColor?.name.toLowerCase() === color.name.toLowerCase();
                
                return (
                    <button 
                        type="button" 
                        key={color.name} 
                        onClick={() => {
                            if (multiSelect && onToggleColor) onToggleColor(color);
                            else if (!multiSelect && onSelectColor) onSelectColor(color);
                        }}
                        style={{ backgroundColor: color.hex }} 
                        className={`w-10 h-10 rounded-full border-2 transition-transform transform hover:scale-110 ${isDark ? 'border-gray-500' : 'border-gray-300'} focus:outline-none relative ${isSelected ? 'ring-4 ring-offset-2 ring-fuchsia-500' : ''} ${isDisabled ? 'cursor-not-allowed' : ''}`} 
                        title={isDisabled ? `Cor "${color.name}" já em uso nesta família.` : color.name}
                        disabled={isDisabled}
                    >
                        {isDisabled && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                        {isSelected && !multiSelect && (
                             <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                         {isSelected && multiSelect && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
        <div className="flex gap-2 mt-4 items-center border-t pt-3" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
            <input type="text" placeholder="Nome da nova cor" value={newColor.name} onChange={e => setNewColor(c => ({...c, name: e.target.value}))} className={`flex-grow text-sm p-2 rounded ${inputClasses}`} />
            <input type="color" value={newColor.hex} onChange={e => setNewColor(c => ({...c, hex: e.target.value}))} className="w-10 h-10 p-1 rounded bg-transparent border-0 cursor-pointer" />
            <button type="button" onClick={handleAddNewColor} title="Adicionar e Salvar Nova Cor" className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold p-2 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
        </div>
    </div>
  );
};

export default ColorSelector;