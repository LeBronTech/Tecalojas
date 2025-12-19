
import React, { useState, useContext, useMemo } from 'react';
import { ThemeContext } from '../types';

interface ColorSelectorProps {
  allColors: { name: string; hex: string }[];
  disabledColors?: string[];
  onAddCustomColor?: (color: { name: string; hex: string }) => void;
  onDeleteColor?: (colorName: string) => void;
  selectedColor?: { name: string; hex: string };
  onSelectColor?: (color: { name: string; hex: string }) => void;
  multiSelect?: boolean;
  selectedColors?: { name: string; hex: string }[];
  onToggleColor?: (color: { name: string; hex: string }) => void;
  horizontal?: boolean; // New prop for horizontal layout
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
    allColors, 
    disabledColors = [], 
    onAddCustomColor, 
    onDeleteColor, 
    selectedColor, 
    onSelectColor, 
    multiSelect = false, 
    selectedColors = [], 
    onToggleColor,
    horizontal = false
}) => {
  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [isColorPickerPristine, setIsColorPickerPristine] = useState(true);
  const [nameError, setNameError] = useState(false);

  const inputClasses = isDark ? "bg-black/30 text-white border-white/10" : "bg-white text-gray-900 border-gray-300";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const colorNameClasses = isDark ? "text-gray-300" : "text-gray-700";

  const sortedColors = useMemo(() => 
    [...allColors].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [allColors]
  );

  const handleAddNewColor = () => {
    if (!onAddCustomColor) return;
    if (!newColor.name.trim()) {
      setNameError(true);
      return;
    }
    if (allColors.some(c => c.name.toLowerCase() === newColor.name.trim().toLowerCase())) {
        setNameError(true); 
        return;
    }

    setNameError(false);
    const colorToAdd = { name: newColor.name.trim(), hex: newColor.hex };
    onAddCustomColor(colorToAdd);
    if (multiSelect && onToggleColor) {
        onToggleColor(colorToAdd);
    } else if (!multiSelect && onSelectColor) {
        onSelectColor(colorToAdd);
    }
    setNewColor({ name: '', hex: '#ffffff' });
    setIsColorPickerPristine(true);
  };

  const containerClasses = horizontal 
    ? "flex overflow-x-auto no-scrollbar py-2 px-1 gap-4 items-center"
    : "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-2 purple-scrollbar";

  return (
    <div className="mt-3">
        <div className={containerClasses}>
            {sortedColors.map(color => {
                const isDisabled = disabledColors.map(d => d.toLowerCase()).includes(color.name.toLowerCase());
                const isSelected = multiSelect 
                    ? selectedColors.some(c => c.name.toLowerCase() === color.name.toLowerCase())
                    : selectedColor?.name.toLowerCase() === color.name.toLowerCase();
                
                return (
                    <div key={color.name} className="flex flex-col items-center group relative flex-shrink-0">
                        <button 
                            type="button" 
                            onClick={() => {
                                if (isDisabled) return;
                                if (multiSelect && onToggleColor) onToggleColor(color);
                                else if (!multiSelect && onSelectColor) onSelectColor(color);
                            }}
                            style={{ backgroundColor: color.hex }} 
                            className={`w-12 h-12 rounded-full border-2 transition-transform transform hover:scale-110 ${isDark ? 'border-gray-500' : 'border-gray-300'} focus:outline-none relative ${isSelected ? 'ring-4 ring-offset-2 ring-fuchsia-500' : ''} ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`} 
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
                            {isSelected && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </button>
                        {onDeleteColor && !horizontal && (
                           <button 
                             type="button"
                             onClick={(e) => { e.stopPropagation(); onDeleteColor(color.name); }}
                             className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                        )}
                         <span className={`text-[10px] font-bold mt-2 text-center truncate w-16 ${colorNameClasses}`}>{color.name}</span>
                    </div>
                )
            })}
        </div>
        {onAddCustomColor && !horizontal && (
            <div className="border-t pt-4 mt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Adicionar nova cor</label>
                
                <div className="flex items-center gap-3 mb-3">
                    <input 
                        type="color" 
                        value={newColor.hex} 
                        onChange={(e) => { setNewColor(c => ({...c, hex: e.target.value})); setIsColorPickerPristine(false); }} 
                        className={`w-12 h-12 p-1 rounded-lg bg-transparent border-0 cursor-pointer ${isColorPickerPristine ? 'rainbow-bg' : ''}`}
                    />
                </div>
                
                <div className="flex flex-wrap gap-2 items-end justify-between">
                    <div className="flex-grow">
                        <input 
                            type="text" 
                            placeholder="Nome da nova cor" 
                            value={newColor.name} 
                            onChange={(e) => { setNameError(false); setNewColor(c => ({...c, name: e.target.value})); }} 
                            className={`w-full text-sm p-2 rounded ${inputClasses} border-2 ${nameError ? 'border-red-500' : 'border-transparent'}`} 
                        />
                    </div>
                    <button type="button" onClick={handleAddNewColor} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold p-2 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ColorSelector;
