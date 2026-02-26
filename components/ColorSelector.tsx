
import React, { useState, useContext, useMemo } from 'react';
import { ThemeContext } from '../types';

// --- ColorSelector Component ---
interface ColorSelectorProps {
  allColors: { name: string; hex: string }[];
  disabledColors?: string[];
  onAddCustomColor?: (color: { name: string; hex: string }) => void;
  onDeleteColor?: (colorName: string) => void;
  // Single selection mode
  selectedColor?: { name: string; hex: string };
  onSelectColor?: (color: { name: string; hex: string }) => void;
  // Multi selection mode
  multiSelect?: boolean;
  selectedColors?: { name: string; hex: string }[];
  onToggleColor?: (color: { name: string; hex: string }) => void;
  // Layout
  layout?: 'grid' | 'horizontal';
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
    layout = 'grid'
}) => {
  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [isColorPickerPristine, setIsColorPickerPristine] = useState(true);
  const [nameError, setNameError] = useState(false);

  // Removed bg-black/10 or bg-gray-50 from cardClasses to make it transparent/cleaner as requested
  const cardClasses = isDark ? "border-white/10" : "border-transparent"; 
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
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewColor();
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewColor(c => ({...c, hex: e.target.value}));
    if (isColorPickerPristine) {
        setIsColorPickerPristine(false);
    }
  };

  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (nameError) {
        setNameError(false);
    }
    setNewColor(c => ({...c, name: e.target.value}));
  };

  const renderColorItem = (color: { name: string; hex: string }) => {
    const isDisabled = disabledColors.map(d => d.toLowerCase()).includes(color.name.toLowerCase());
    const isSelected = multiSelect 
        ? selectedColors.some(c => c.name.toLowerCase() === color.name.toLowerCase())
        : selectedColor?.name.toLowerCase() === color.name.toLowerCase();
    
    const handleColorClick = () => {
        if (isDisabled && !isSelected) {
            if (!window.confirm(`Já existe almofada com essa cor, deseja adicionar essa cor mesmo assim?`)) {
                return;
            }
        }
        if (multiSelect && onToggleColor) onToggleColor(color);
        else if (!multiSelect && onSelectColor) onSelectColor(color);
    };

    return (
        <div key={color.name} className="flex flex-col items-center group relative flex-shrink-0">
            <button 
                type="button" 
                onClick={handleColorClick}
                style={{ backgroundColor: color.hex }} 
                className={`w-10 h-10 rounded-full border-2 transition-transform transform hover:scale-110 ${isDark ? 'border-gray-600' : 'border-gray-300'} focus:outline-none relative ${isSelected ? 'ring-4 ring-offset-2 ring-fuchsia-500' : ''} ${isDisabled && !isSelected ? 'opacity-50' : ''}`} 
                title={isDisabled ? `Cor "${color.name}" já em uso nesta família.` : color.name}
            >
                {isDisabled && !isSelected && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
                {isSelected && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                )}
            </button>
            {onDeleteColor && (
               <button 
                 type="button"
                 onClick={(e) => { e.stopPropagation(); onDeleteColor(color.name); }}
                 className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                 aria-label={`Excluir cor ${color.name}`}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            )}
             <span className={`text-[10px] mt-1 text-center truncate w-14 ${colorNameClasses}`}>{color.name}</span>
        </div>
    )
  };

  return (
    <div className={`mt-2 rounded-xl ${layout === 'grid' ? 'border ' + cardClasses + ' p-4' : ''}`}>
        {layout === 'grid' ? (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                {sortedColors.map(renderColorItem)}
            </div>
        ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {sortedColors.map(renderColorItem)}
            </div>
        )}

        {onAddCustomColor && (
            <div className="border-t pt-4 mt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Adicionar nova cor</label>
                
                <div className="flex items-center gap-3 mb-3">
                    <input 
                        type="color" 
                        value={newColor.hex} 
                        onChange={handleColorInputChange} 
                        className={`w-10 h-10 p-1 rounded-lg bg-transparent border-0 cursor-pointer ${isColorPickerPristine ? 'rainbow-bg' : ''}`}
                    />
                    <div className={`flex items-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                        <span>Escolha a cor</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 items-end justify-between">
                    <div className="flex-grow">
                         <label className={`text-xs font-semibold mb-1 block ${labelClasses}`}>Nome da nova cor</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Verde Oliva" 
                            value={newColor.name} 
                            onChange={handleNameInputChange} 
                            onKeyDown={handleKeyDown} 
                            className={`w-full text-sm p-2 rounded ${inputClasses} border-2 ${nameError ? 'border-red-500' : 'border-transparent'}`} 
                        />
                    </div>

                    <div className="flex flex-col items-center ml-2">
                        <button type="button" onClick={handleAddNewColor} title="Adicionar e Salvar Nova Cor" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold p-2 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </button>
                        <span className={`text-xs mt-1 ${colorNameClasses}`}>Add</span>
                    </div>
                </div>
                {nameError && <p className="text-xs text-red-500 mt-1 font-semibold">O nome da cor é obrigatório ou já existe.</p>}
            </div>
        )}
    </div>
  );
};

export default ColorSelector;
