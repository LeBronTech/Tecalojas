import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Product, Brand, CushionSize, StoreName, WaterResistanceLevel, DynamicBrand } from '../types';
import { ThemeContext } from '../App';
import { BRAND_FABRIC_MAP, PREDEFINED_COLORS, VARIATION_DEFAULTS } from '../constants';
import ColorSelector from './ColorSelector';

interface WizardData {
    brand: string;
    fabricType: string;
    category: string;
    baseName: string;
    colors: { name: string; hex: string }[];
}

interface ProductCreationWizardProps {
    products: Product[]; // Need all products for validation
    onClose: () => void;
    onConfigure: (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => void;
    customColors: { name: string; hex: string }[];
    onAddCustomColor: (color: { name: string; hex: string }) => void;
    categories: string[];
    brands: DynamicBrand[];
}

const ProductCreationWizard: React.FC<ProductCreationWizardProps> = ({ products, onClose, onConfigure, customColors, onAddCustomColor, categories, brands }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [step, setStep] = useState(1);
    const [wizardData, setWizardData] = useState<WizardData | null>(null);
    
    const [familyDetailsSet, setFamilyDetailsSet] = useState(false);

    // Step 1 State
    const [brand, setBrand] = useState<string>(Brand.MARCA_PROPRIA);
    const [fabricType, setFabricType] = useState<string>(Object.keys(BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA])[0]);
    const [category, setCategory] = useState('');
    const [baseName, setBaseName] = useState('');
    const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    
    const allBrandNames = useMemo(() => {
        const dynamicNames = brands.map(b => b.name);
        const staticNames = Object.values(Brand);
        return [...new Set([...dynamicNames, ...staticNames])];
    }, [brands]);

    const allFabricTypes = useMemo(() => {
        const fabricSet = new Set<string>();
        Object.values(BRAND_FABRIC_MAP).forEach(fabricMap => {
            Object.keys(fabricMap).forEach(type => fabricSet.add(type));
        });
        return Array.from(fabricSet).sort();
    }, []);

    const existingFamilyProducts = useMemo(() => {
        if (!category || !fabricType) return [];
        return products.filter(p => p.category === category && p.fabricType === fabricType);
    }, [products, category, fabricType]);

    const usedColorNamesInFamily = useMemo(() => 
        existingFamilyProducts.map(p => p.mainColor?.name).filter((name): name is string => !!name),
        [existingFamilyProducts]
    );

    const allColors = useMemo(() => [...PREDEFINED_COLORS, ...customColors].filter(
        (color, index, self) => index === self.findIndex((c) => c.name.toLowerCase() === color.name.toLowerCase())
    ), [customColors]);
    
    // Reset dependant state when primary selections change
    useEffect(() => {
        setFamilyDetailsSet(false);
        setBaseName('');
        setSelectedColors([]);
        setError(null);
        setNameError(null);
    }, [brand, fabricType, category]);

    useEffect(() => {
        setNameError(null);
        if(baseName.trim()){
            const proposedNames = selectedColors.map(color => `${color.name} ${baseName}`.trim().toLowerCase());
            const existingNames = existingFamilyProducts.map(p => p.name.toLowerCase());
            
            for(const proposedName of proposedNames){
                if(existingNames.includes(proposedName)){
                    setNameError(`O nome "${proposedName}" já existe nesta família.`);
                    return;
                }
            }
        }
    }, [baseName, selectedColors, existingFamilyProducts]);


    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBrand = e.target.value as Brand;
        setBrand(newBrand);
        // In creation wizard, fabric type is independent
    };

    const createProductPayloads = (data: WizardData) => {
        const groupId = `var_${Date.now()}`;
        
        return data.colors.map(color => {
            const productName = `${color.name} ${data.baseName}`.trim();
            const fabricDescription = BRAND_FABRIC_MAP[data.brand]?.[data.fabricType] || BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA]?.[data.fabricType] || '';

            return {
                name: productName,
                brand: data.brand,
                fabricType: data.fabricType,
                category: data.category,
                mainColor: color,
                baseImageUrl: '',
                unitsSold: 0,
                description: fabricDescription,
                waterResistance: WaterResistanceLevel.NONE,
                variations: [{
                    size: CushionSize.SQUARE_45,
                    imageUrl: '',
                    priceCover: VARIATION_DEFAULTS[CushionSize.SQUARE_45].priceCover,
                    priceFull: VARIATION_DEFAULTS[CushionSize.SQUARE_45].priceFull,
                    stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 },
                }],
                backgroundImages: {},
                variationGroupId: groupId,
            };
        });
    };
    
    const handleProceed = () => {
        if (!category.trim() || !fabricType.trim() || !baseName.trim()) {
            setError('Categoria, tecido e nome base são obrigatórios.');
            return;
        }
        if (selectedColors.length === 0) {
            setError('Selecione pelo menos uma cor.');
            return;
        }
        if (nameError) {
             setError(nameError);
             return;
        }
        setError(null);
        
        const currentWizardData = {
            brand,
            fabricType,
            category: category.trim(),
            baseName: baseName.trim(),
            colors: selectedColors,
        };
        
        const productsToCreate = createProductPayloads(currentWizardData);

        if (selectedColors.length === 1) {
            if (productsToCreate.length > 0) {
                onConfigure(productsToCreate, productsToCreate[0]);
            }
        } else {
            setWizardData(currentWizardData);
            setStep(2);
        }
    };
    
    const handleStartConfiguration = (colorToConfigure: { name: string; hex: string }) => {
        if (!wizardData) return;
        
        const productsToCreate = createProductPayloads(wizardData);
        const productToConfigure = productsToCreate.find(p => p.mainColor.name === colorToConfigure.name);
        
        if (productToConfigure) {
            onConfigure(productsToCreate, productToConfigure);
        }
    };


    // Common styles
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
    const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";


    const renderStep1 = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${titleClasses}`}>Novo Produto (Etapa 1/2)</h2>
                <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Defina as características da nova família de produtos.</p>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                        <input list="categories-list" value={category} onChange={e => setCategory(e.target.value)} required className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                        <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                    </div>
                     <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                        <select value={brand} onChange={handleBrandChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{allBrandNames.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                </div>
                 <div>
                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tipo de Tecido</label>
                    <select value={fabricType} onChange={e => setFabricType(e.target.value)} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{allFabricTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>
                </div>
                
                {(!category.trim() || !fabricType.trim()) && <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-black/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>Preencha a Categoria e o Tecido para continuar.</div>}

                {category.trim() && fabricType.trim() && !familyDetailsSet && (
                     <div className="text-center pt-2">
                        <button type="button" onClick={() => setFamilyDetailsSet(true)} className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-cyan-700 transition">
                            Escolher Cores e Nome
                        </button>
                    </div>
                )}

                {familyDetailsSet && (
                    <div className="space-y-4 border-t pt-4 mt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Nome Base da Almofada (ex: Lisa, Estampada)</label>
                            <input type="text" value={baseName} onChange={e => setBaseName(e.target.value)} required placeholder="Ex: Lisa" className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                             {nameError && <p className="text-xs text-red-500 mt-1 font-semibold">{nameError}</p>}
                        </div>
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Selecione as cores</label>
                            <ColorSelector
                                allColors={allColors}
                                multiSelect
                                selectedColors={selectedColors}
                                disabledColors={usedColorNamesInFamily}
                                onToggleColor={(color) => {
                                    setSelectedColors(prev => 
                                        prev.some(c => c.name === color.name)
                                            ? prev.filter(c => c.name !== color.name)
                                            : [...prev, color]
                                    );
                                }}
                                onAddCustomColor={onAddCustomColor}
                            />
                        </div>

                         {existingFamilyProducts.length > 0 && (
                            <div>
                                <h4 className={`text-sm font-semibold mb-2 ${labelClasses}`}>Produtos já existentes nesta família:</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-black/10">
                                    {existingFamilyProducts.map(p => (
                                        <div key={p.id} className={`p-2 rounded-lg flex items-center gap-3 ${isDark ? 'bg-black/20' : 'bg-white/50'}`}>
                                            <div className={`w-8 h-8 rounded-md flex-shrink-0 overflow-hidden ${isDark ? 'bg-black/20' : 'bg-gray-200'}`}>
                                                {p.baseImageUrl && <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover"/>}
                                            </div>
                                            <p className={`text-sm font-semibold truncate ${titleClasses}`}>{p.name}</p>
                                            <div style={{ backgroundColor: p.mainColor?.hex }} className="w-5 h-5 ml-auto rounded-full border border-black/20 flex-shrink-0"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-end items-center pt-6 gap-4 border-t border-gray-200 dark:border-white/10 mt-6">
                 {error && <p className="text-sm text-red-500 font-semibold text-left flex-grow">{error}</p>}
                 <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>Cancelar</button>
                 <button 
                    type="button" 
                    onClick={handleProceed} 
                    disabled={!familyDetailsSet || !!nameError}
                    className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                 >
                    {selectedColors.length <= 1 ? 'Configurar Produto' : 'Próximo'}
                 </button>
            </div>
        </>
    );

    const renderStep2 = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${titleClasses}`}>Novo Produto (Etapa 2/2)</h2>
                <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
             <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Os produtos abaixo serão criados. Qual você quer configurar primeiro?</p>
             <div className="space-y-3 max-h-64 overflow-y-auto">
                 {wizardData?.colors.map(color => (
                     <div key={color.name} className={`p-3 rounded-xl flex items-center justify-between border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border border-black/20 flex-shrink-0"></div>
                             <span className={`font-semibold ${titleClasses}`}>{color.name} {wizardData.baseName}</span>
                         </div>
                         <button onClick={() => handleStartConfiguration(color)} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-cyan-700 transition text-sm">
                             Configurar
                         </button>
                     </div>
                 ))}
             </div>
             <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-white/10">
                  <button type="button" onClick={() => setStep(1)} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>Voltar</button>
             </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()}>
                {step === 1 ? renderStep1() : renderStep2()}
            </div>
        </div>
    );
};

export default ProductCreationWizard;