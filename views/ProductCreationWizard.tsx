import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, Brand, CushionSize, StoreName, WaterResistanceLevel, DynamicBrand, ThemeContext, Variation } from '../types';
import { BRAND_FABRIC_MAP, PREDEFINED_COLORS, VARIATION_DEFAULTS } from '../constants';
import ColorSelector from '../components/ColorSelector';

// --- Helper Components & Functions ---

const resizeImage = (base64Str: string, maxWidth = 512, maxHeight = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (error) => {
            reject(error);
        }
    });
};

interface ProductCreationWizardProps {
  onClose: () => void;
  onConfigure: (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => void;
  allColors: { name: string; hex: string }[];
  onAddColor: (color: { name: string; hex: string }) => void;
  categories: string[];
  products: Product[]; // To check for name conflicts
  brands: DynamicBrand[];
}

const pluralize = (word: string): string => {
    const trimmed = word.trim();
    if (!trimmed) return '';
    
    let capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    const lower = capitalized.toLowerCase();

    if (lower.endsWith('s')) return capitalized;
    
    if (['a', 'e', 'i', 'o', 'u'].some(vowel => lower.endsWith(vowel))) {
        return capitalized + 's';
    }
    if (lower.endsWith('l')) {
        return capitalized.slice(0, -1) + 'is';
    }

    return capitalized + 's';
};

export const ProductCreationWizard: React.FC<ProductCreationWizardProps> = ({ onClose, onConfigure, allColors, onAddColor, categories, products, brands }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [baseName, setBaseName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [brand, setBrand] = useState<Brand | string>(Brand.MARCA_PROPRIA);
  const [fabricType, setFabricType] = useState(Object.keys(BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA])[0]);
  const [selectedColors, setSelectedColors] = useState<{name: string, hex: string}[]>([]);
  const [mainColor, setMainColor] = useState<{name: string, hex: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableFabricTypes = useMemo(() => Object.keys(BRAND_FABRIC_MAP[brand] || {}), [brand]);
  const allBrandNames = useMemo(() => {
    const dynamicNames = brands.map(b => b.name);
    const staticNames = Object.values(Brand);
    return [...new Set([...dynamicNames, ...staticNames])];
  }, [brands]);

  useEffect(() => {
    setFabricType(Object.keys(BRAND_FABRIC_MAP[brand] || {})[0] || '');
  }, [brand]);

  const handleToggleColor = (color: { name: string; hex: string }) => {
    setSelectedColors(prev => {
        const isSelected = prev.some(c => c.name === color.name);
        if (isSelected) {
            const newSelection = prev.filter(c => c.name !== color.name);
            if (mainColor?.name === color.name) {
                setMainColor(newSelection[0] || null);
            }
            return newSelection;
        } else {
            const newSelection = [...prev, color];
            if (!mainColor) {
                setMainColor(color);
            }
            return newSelection;
        }
    });
  };

  const handleCreateProducts = () => {
    setError(null);
    if (!baseName.trim() || !category.trim() || !brand.trim() || !fabricType.trim()) {
        setError("Preencha todos os campos: Nome base, Categoria, Marca e Tecido.");
        return;
    }
    if (selectedColors.length === 0) {
        setError("Selecione pelo menos uma cor para os novos produtos.");
        return;
    }
    if (!mainColor) {
        setError("Selecione uma cor principal para configurar após a criação.");
        return;
    }

    const variationGroupId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newProducts: Omit<Product, 'id'>[] = selectedColors.map(color => {
        const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
        const newName = `${baseName.trim()} (${capitalizedColorName})`;
        
        const nameExists = products.some(p => p.name.toLowerCase() === newName.toLowerCase());
        if (nameExists) {
            throw new Error(`O produto "${newName}" já existe. Remova-o da seleção ou altere o nome base.`);
        }

        return {
            name: newName,
            baseImageUrl: '',
            unitsSold: 0,
            category: pluralize(category),
            subCategory: '',
            fabricType: fabricType,
            description: BRAND_FABRIC_MAP[brand]?.[fabricType] || '',
            brand: brand,
            waterResistance: WaterResistanceLevel.NONE,
            variations: Object.values(CushionSize).map(size => ({
                size,
                imageUrl: '',
                priceCover: VARIATION_DEFAULTS[size].priceCover,
                priceFull: VARIATION_DEFAULTS[size].priceFull,
                stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 }
            })),
            backgroundImages: {},
            colors: [color],
            isMultiColor: false,
            variationGroupId,
            isLimited: false,
        };
    });

    try {
        const productToConfigure = newProducts.find(p => p.colors[0].name === mainColor.name);
        if (!productToConfigure) {
            throw new Error("A cor principal selecionada não está na lista de cores a serem criadas.");
        }
        onConfigure(newProducts, productToConfigure);
    } catch (e: any) {
        setError(e.message);
    }
  };

  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
        <div className={`border rounded-3xl shadow-2xl w-full max-w-2xl p-6 flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${titleClasses}`}>Criar Novos Produtos</h2>
                <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                <div>
                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Nome Base</label>
                    <input type="text" value={baseName} onChange={e => setBaseName(e.target.value)} placeholder="Ex: Suede Liso" className={`w-full border-2 rounded-lg px-4 py-3 ${inputClasses}`} />
                    <p className={`text-xs mt-1 ${labelClasses}`}>O nome da cor será adicionado automaticamente. Ex: "Suede Liso (Vermelho)".</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                        <input list="categories-list" value={category} onChange={e => setCategory(e.target.value)} required className={`w-full border-2 rounded-lg px-4 py-3 ${inputClasses}`} />
                        <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                    </div>
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                        <select value={brand} onChange={e => setBrand(e.target.value)} className={`w-full border-2 rounded-lg px-4 py-3 ${inputClasses}`}>{allBrandNames.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tecido</label>
                        <select value={fabricType} onChange={e => setFabricType(e.target.value)} className={`w-full border-2 rounded-lg px-4 py-3 ${inputClasses}`}>{availableFabricTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                </div>
                <div>
                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Selecione as cores para criar os produtos</label>
                    <ColorSelector
                        allColors={allColors}
                        onAddCustomColor={onAddColor}
                        multiSelect
                        selectedColors={selectedColors}
                        onToggleColor={handleToggleColor}
                    />
                </div>
                {selectedColors.length > 0 && (
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Qual cor configurar primeiro?</label>
                        <div className="flex flex-wrap gap-2">
                            {selectedColors.map(color => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => setMainColor(color)}
                                    className={`flex items-center gap-2 p-2 rounded-lg text-sm font-semibold border-2 ${mainColor?.name === color.name ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-transparent ' + (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}`}
                                >
                                    <div style={{ backgroundColor: color.hex }} className="w-5 h-5 rounded-full border border-black/20"></div>
                                    <span>{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-4 pt-4 mt-auto border-t" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                {error && <p className="text-sm text-red-500 font-semibold self-center">{error}</p>}
                <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100"}`}>Cancelar</button>
                <button type="button" onClick={handleCreateProducts} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700">Criar Produtos</button>
            </div>
        </div>
    </div>
  );
};