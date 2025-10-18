import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ThemeContext } from '../App';
import {
  Product,
  Variation,
  CushionSize,
  Brand,
  WaterResistanceLevel,
  StoreName,
} from '../types';
import {
  BRAND_FABRIC_MAP,
  BRANDS,
  VARIATION_DEFAULTS,
  WATER_RESISTANCE_INFO,
} from '../constants';

interface AddEditProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
  categories: string[];
  apiKey: string | null;
  onRequestApiKey: () => void;
}

const AiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);


const getNewProduct = (): Product => {
  const defaultBrand = Brand.MARCA_PROPRIA;
  const fabricTypes = Object.keys(BRAND_FABRIC_MAP[defaultBrand]);
  const defaultFabricType = fabricTypes.length > 0 ? fabricTypes[0] : '';
  const defaultDescription = BRAND_FABRIC_MAP[defaultBrand][defaultFabricType] || '';

  return {
    id: '', 
    name: '',
    baseImageUrl: 'https://i.imgur.com/gA0Wxkm.png',
    unitsSold: 0,
    category: '',
    brand: defaultBrand,
    fabricType: defaultFabricType,
    description: defaultDescription,
    waterResistance: WaterResistanceLevel.NONE,
    variations: [
      {
        size: CushionSize.SQUARE_45,
        imageUrl: '',
        priceCover: VARIATION_DEFAULTS[CushionSize.SQUARE_45].priceCover,
        priceFull: VARIATION_DEFAULTS[CushionSize.SQUARE_45].priceFull,
        stock: {
          [StoreName.TECA]: 0,
          [StoreName.IONE]: 0,
        },
      },
    ],
  };
};

const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  product,
  onClose,
  onSave,
  categories,
  apiKey,
  onRequestApiKey,
}) => {
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState<Product>(product || getNewProduct());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deep copy to avoid mutating the original product object from props
    const initialData = product ? JSON.parse(JSON.stringify(product)) : getNewProduct();
    setFormData(initialData);
  }, [product]);

  const handleChange = useCallback((field: keyof Product, value: any) => {
    setFormData(prev => {
        const newState = { ...prev, [field]: value };
        // If brand changes, update fabric type and description to a valid default
        if (field === 'brand') {
            const newBrand = value as Brand;
            const fabricTypes = Object.keys(BRAND_FABRIC_MAP[newBrand]);
            const newFabricType = fabricTypes[0] || '';
            newState.fabricType = newFabricType;
            newState.description = BRAND_FABRIC_MAP[newBrand][newFabricType] || '';
        }
        // If fabric type changes, update description
        if (field === 'fabricType') {
            const newFabricType = value as string;
            newState.description = BRAND_FABRIC_MAP[newState.brand][newFabricType] || '';
        }
        return newState;
    });
  }, []);

  const handleVariationChange = (index: number, field: keyof Variation | `stock.${StoreName}`, value: any) => {
    const newVariations = [...formData.variations];
    const variationToUpdate = { ...newVariations[index] };

    if (typeof field === 'string' && field.startsWith('stock.')) {
        const store = field.split('.')[1] as StoreName;
        variationToUpdate.stock[store] = Number(value);
    } else {
        const key = field as keyof Variation;
        (variationToUpdate[key] as any) = (key === 'priceCover' || key === 'priceFull') ? Number(value) : value;
    }
    newVariations[index] = variationToUpdate;
    setFormData(prev => ({...prev, variations: newVariations}));
  };

  const handleAddVariation = () => {
    const existingSizes = new Set(formData.variations.map(v => v.size));
    const availableSizes = Object.values(CushionSize).filter(s => !existingSizes.has(s));
    
    if (availableSizes.length === 0) {
        setError("Todos os tamanhos de variação já foram adicionados.");
        return;
    }

    const newSize = availableSizes[0];
    const newVariation: Variation = {
        size: newSize,
        imageUrl: '',
        priceCover: VARIATION_DEFAULTS[newSize].priceCover,
        priceFull: VARIATION_DEFAULTS[newSize].priceFull,
        stock: {
            [StoreName.TECA]: 0,
            [StoreName.IONE]: 0,
        }
    };
    setFormData(prev => ({ ...prev, variations: [...prev.variations, newVariation] }));
  };

  const handleRemoveVariation = (index: number) => {
    if (formData.variations.length <= 1) {
        setError("O produto deve ter pelo menos uma variação.");
        return;
    }
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, variations: newVariations }));
  };
  
  const handleGenerateDescription = async () => {
    if (!apiKey) {
      setError("Chave de API (IA) não configurada.");
      onRequestApiKey();
      return;
    }
    if (!formData.name || !formData.category || !formData.fabricType) {
        setError("Preencha Nome, Categoria e Tipo de Tecido para gerar a descrição.");
        return;
    }
    setIsGenerating(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({apiKey});
        const prompt = `Crie uma descrição de marketing curta e atraente para uma almofada. A descrição deve ser em português do Brasil, com no máximo 2-3 frases, focada em decoração. Detalhes do produto:
- Nome: "${formData.name}"
- Categoria: "${formData.category}"
- Marca: "${formData.brand}"
- Tecido: "${formData.fabricType}"
- Descrição do tecido: "${BRAND_FABRIC_MAP[formData.brand][formData.fabricType] || 'N/A'}"
- Resistência à água: "${formData.waterResistance !== WaterResistanceLevel.NONE ? 'Sim' : 'Não'}"

Exemplo de tom: "Perfeita para adicionar um toque de cor e conforto à sua sala de estar."`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const text = response.text;
        if (text) {
            handleChange('description', text);
        } else {
            setError("A IA não conseguiu gerar uma descrição.");
        }
    } catch (e) {
        console.error("Gemini API error:", e);
        setError("Erro ao gerar descrição. Verifique sua chave de API.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
        setError("O nome do produto é obrigatório.");
        return;
    }
    if (formData.variations.length === 0) {
        setError("Adicione pelo menos uma variação de tamanho.");
        return;
    }

    setIsLoading(true);
    try {
        await onSave(formData);
    } catch (error) {
        setError("Falha ao salvar o produto. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const isDark = theme === 'dark';
  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
  const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
  const sectionClasses = isDark ? "bg-black/20 p-4 rounded-xl" : "bg-gray-50 p-4 rounded-xl border";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
        <form 
            onSubmit={handleSave}
            className={`border rounded-3xl shadow-2xl w-full max-w-lg relative flex flex-col ${modalBgClasses}`}
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
        >
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <h2 className={`text-2xl font-bold text-center ${titleClasses}`}>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</h2>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 space-y-5">
                {/* Basic Info */}
                <div className={sectionClasses}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Nome do Produto</label>
                            <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} required className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`} />
                        </div>
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                            <input type="text" list="categories" value={formData.category} onChange={e => handleChange('category', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`} />
                            <datalist id="categories">
                                {categories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                            <select value={formData.brand} onChange={e => handleChange('brand', e.target.value as Brand)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`}>
                                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tipo de Tecido</label>
                            <select value={formData.fabricType} onChange={e => handleChange('fabricType', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`}>
                                {Object.keys(BRAND_FABRIC_MAP[formData.brand]).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Impermeabilidade</label>
                            <select value={formData.waterResistance} onChange={e => handleChange('waterResistance', e.target.value as WaterResistanceLevel)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`}>
                                <option value={WaterResistanceLevel.NONE}>Nenhuma</option>
                                <option value={WaterResistanceLevel.SEMI}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.SEMI]?.label}</option>
                                <option value={WaterResistanceLevel.FULL}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.FULL]?.label}</option>
                            </select>
                        </div>
                    </div>
                </div>

                 {/* Description */}
                <div className={sectionClasses}>
                    <label className={`text-sm font-semibold mb-1 flex items-center justify-between ${labelClasses}`}>
                        <span>Descrição</span>
                        <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className={`text-xs flex items-center gap-1 font-bold p-2 rounded-lg transition ${isDark ? 'text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20' : 'text-fuchsia-600 bg-fuchsia-100 hover:bg-fuchsia-200'} disabled:opacity-50`}>
                            {isGenerating ? 'Gerando...' : <><AiIcon /> Gerar com IA</>}
                        </button>
                    </label>
                    <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={3} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClasses}`} />
                </div>
                
                 {/* Variations */}
                <div className={sectionClasses}>
                    <h3 className={`text-md font-bold mb-3 ${titleClasses}`}>Variações e Estoque</h3>
                    <div className="space-y-4">
                       {formData.variations.map((variation, index) => (
                           <div key={index} className={`grid grid-cols-2 md:grid-cols-4 gap-3 items-end p-3 rounded-lg ${isDark ? 'bg-black/30' : 'bg-white border'}`}>
                                <div>
                                    <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Tamanho</label>
                                    <select value={variation.size} onChange={e => handleVariationChange(index, 'size', e.target.value)} className={`w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500 ${inputClasses}`}>
                                        {Object.values(CushionSize).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço Capa (R$)</label>
                                    <input type="number" step="0.01" value={variation.priceCover} onChange={e => handleVariationChange(index, 'priceCover', e.target.value)} className={`w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500 ${inputClasses}`} />
                                </div>
                                <div>
                                    <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço Cheia (R$)</label>
                                    <input type="number" step="0.01" value={variation.priceFull} onChange={e => handleVariationChange(index, 'priceFull', e.target.value)} className={`w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500 ${inputClasses}`} />
                                </div>
                               <button type="button" onClick={() => handleRemoveVariation(index)} className={`text-red-500 h-9 px-2 rounded-lg hover:bg-red-500/10 text-xs font-bold transition col-span-2 md:col-span-1 ${formData.variations.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>Remover</button>
                           </div>
                       ))}
                    </div>
                     <button type="button" onClick={handleAddVariation} className="w-full mt-4 text-sm font-bold py-2 rounded-lg border-2 border-dashed hover:bg-fuchsia-500/10 hover:border-fuchsia-500 transition-colors border-fuchsia-500/50 text-fuchsia-400">
                        + Adicionar Variação
                    </button>
                </div>
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {error && <p className="text-sm text-center text-red-500 font-semibold mb-3">{error}</p>}
                <div className="flex justify-end items-center gap-4">
                    <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={isLoading} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition disabled:bg-gray-400 disabled:shadow-none">
                        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </form>
    </div>
  );
};

export default AddEditProductModal;
