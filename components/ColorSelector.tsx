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
  layout?: 'grid' | 'horizontal';
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ 
    allColors = [], 
    disabledColors = [], 
    onAddCustomColor, 
    onDeleteColor, 
    selectedColor, 
    onSelectColor, 
    multiSelect = false, 
    selectedColors = [], 
    onToggleColor,
    layout = 'grid'
}) => {
  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [nameError, setNameError] = useState(false);

  const cardClasses = isDark ? "border-white/10" : "border-gray-200"; 
  const inputClasses = isDark ? "bg-black/30 text-white border-white/10" : "bg-white text-gray-900 border-gray-300";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const colorNameClasses = isDark ? "text-gray-300" : "text-gray-700";

  const sortedColors = useMemo(() => 
    [...allColors].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [allColors]
  );

  const handleAddNewColor = () => {
    if (!onAddCustomColor || !newColor.name.trim()) {
      setNameError(true);
      return;
    }
    const colorToAdd = { name: newColor.name.trim(), hex: newColor.hex };
    onAddCustomColor(colorToAdd);
    setNewColor({ name: '', hex: '#ffffff' });
    setNameError(false);
  };

  const renderColorItem = (color: { name: string; hex: string }) => {
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
                className={`w-10 h-10 rounded-full border-2 transition-transform transform hover:scale-110 ${isDark ? 'border-gray-600' : 'border-gray-300'} relative ${isSelected ? 'ring-4 ring-fuchsia-500 ring-offset-2' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
            >
                {isSelected && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                )}
            </button>
             <span className={`text-[10px] mt-1 text-center truncate w-14 ${colorNameClasses}`}>{color.name}</span>
        </div>
    )
  };

  return (
    <div className={`mt-2 rounded-xl ${layout === 'grid' ? 'border p-4 ' + cardClasses : ''}`}>
        {sortedColors.length > 0 ? (
            <div className={layout === 'grid' ? "grid grid-cols-5 sm:grid-cols-6 gap-3 max-h-48 overflow-y-auto" : "flex gap-4 overflow-x-auto pb-2"}>
                {sortedColors.map(renderColorItem)}
            </div>
        ) : (
            <p className="text-xs text-gray-500 italic py-2">Carregando cores...</p>
        )}

        {onAddCustomColor && (
            <div className="border-t pt-4 mt-4 dark:border-white/10 border-gray-100">
                <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                        <label className={`text-xs font-bold mb-1 block uppercase ${labelClasses}`}>Nova Cor</label>
                        <input type="text" placeholder="Nome da cor" value={newColor.name} onChange={e => setNewColor({...newColor, name: e.target.value})} className={`w-full text-sm p-2 rounded-lg border ${inputClasses}`} />
                    </div>
                    <input type="color" value={newColor.hex} onChange={e => setNewColor({...newColor, hex: e.target.value})} className="w-10 h-10 p-1 rounded-lg bg-transparent border-0 cursor-pointer" />
                    <button type="button" onClick={handleAddNewColor} className="bg-fuchsia-600 text-white font-bold p-2 rounded-lg hover:bg-fuchsia-700">Add</button>
                </div>
                {nameError && <p className="text-[10px] text-red-500 mt-1">Digite um nome válido.</p>}
            </div>
        )}
    </div>
  );
};

export default ColorSelector;