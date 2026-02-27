import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
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

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.8);
};

export const ProductCreationWizard: React.FC<ProductCreationWizardProps> = ({ onClose, onConfigure, allColors, onAddColor, categories, products, brands }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [baseName, setBaseName] = useState('');
  const [description, setDescription] = useState('');
  const [waterResistance, setWaterResistance] = useState<WaterResistanceLevel>(WaterResistanceLevel.NONE);
  const [selectedSizes, setSelectedSizes] = useState<CushionSize[]>(Object.values(CushionSize));
  const [category, setCategory] = useState(categories[0] || '');
  const [brand, setBrand] = useState<Brand | string>(Brand.MARCA_PROPRIA);
  const [fabricType, setFabricType] = useState(Object.keys(BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA])[0]);
  const [selectedColors, setSelectedColors] = useState<{name: string, hex: string}[]>([]);
  const [mainColor, setMainColor] = useState<{name: string, hex: string} | null>(null);
  const [productionCost, setProductionCost] = useState<number>(0);
  const [isLimited, setIsLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropper State
  const [dropperImage, setDropperImage] = useState<string | null>(null);
  const [fabricImage, setFabricImage] = useState<string | null>(null);
  const [isDropperActive, setIsDropperActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [newColorName, setNewColorName] = useState('');
  
  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppingTarget, setCroppingTarget] = useState<'product' | 'fabric'>('product');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fabricFileInputRef = useRef<HTMLInputElement>(null);
  const fabricGalleryInputRef = useRef<HTMLInputElement>(null);

  const availableFabricTypes = useMemo(() => Object.keys(BRAND_FABRIC_MAP[brand] || {}), [brand]);
  const allBrandNames = useMemo(() => {
    const dynamicNames = brands.map(b => b.name);
    const staticNames = Object.values(Brand);
    return [...new Set([...dynamicNames, ...staticNames])];
  }, [brands]);

  useEffect(() => {
    const fabricInfo = BRAND_FABRIC_MAP[brand];
    if (fabricInfo) {
        const firstFabric = Object.keys(fabricInfo)[0] || '';
        setFabricType(firstFabric);
        setDescription(fabricInfo[firstFabric] || '');
    }
  }, [brand]);

  const handleFabricChange = (newFabric: string) => {
    setFabricType(newFabric);
    const fabricInfo = BRAND_FABRIC_MAP[brand];
    if (fabricInfo && fabricInfo[newFabric]) {
        setDescription(fabricInfo[newFabric]);
    }
  };

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'fabric') => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setImageToCrop(event.target?.result as string);
            setCroppingTarget(target);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApplyCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
        try {
            const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
            // Resize to ensure it's small enough for Firestore (1MB limit)
            // 800x800 at 0.6 quality is usually ~100-200KB
            const resizedImage = await resizeImage(croppedImage, 800, 800);
            
            if (croppingTarget === 'product') {
                setDropperImage(resizedImage);
                setIsDropperActive(true);
            } else {
                setFabricImage(resizedImage);
            }
            
            setIsCropping(false);
            setImageToCrop(null);
        } catch (e) {
            console.error(e);
            setError("Erro ao processar imagem. Tente uma foto menor.");
        }
    }
  };

  useEffect(() => {
    if (dropperImage && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = dropperImage;
        img.onload = () => {
            // Maintain aspect ratio while fitting in a reasonable size for picking
            const maxDisplayWidth = 800;
            const scale = Math.min(1, maxDisplayWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
    }
  }, [dropperImage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates to match canvas internal resolution
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
    setPickedColor(hex.toUpperCase());
    
    // Auto-focus the name input when a color is picked
    setTimeout(() => {
        const input = document.getElementById('new-color-name-input');
        if (input) input.focus();
    }, 100);
  };

  const handleAddNewColor = () => {
    if (!pickedColor || !newColorName.trim()) return;
    const newColor = { name: newColorName.trim(), hex: pickedColor };
    onAddColor(newColor);
    handleToggleColor(newColor);
    setPickedColor(null);
    setNewColorName('');
    setIsDropperActive(false);
  };

  const handleToggleSize = (size: CushionSize) => {
    setSelectedSizes(prev => 
        prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleCreateProducts = () => {
    setError(null);
    try {
        if (!baseName.trim() || !category.trim() || !brand.trim() || !fabricType.trim()) {
            throw new Error("Preencha todos os campos obrigatórios.");
        }
        if (selectedColors.length === 0) {
            throw new Error("Selecione pelo menos uma cor.");
        }
        if (selectedSizes.length === 0) {
            throw new Error("Selecione pelo menos um tamanho.");
        }
        if (!mainColor) {
            throw new Error("Selecione uma cor principal.");
        }

        const variationGroupId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newProducts: Omit<Product, 'id'>[] = selectedColors.map(color => {
            const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
            const newName = `${baseName.trim()} (${capitalizedColorName})`;
            
            const nameExists = products.some(p => p.name.toLowerCase() === newName.toLowerCase());
            if (nameExists) {
                throw new Error(`O produto "${newName}" já existe.`);
            }

            return {
                name: newName,
                baseImageUrl: dropperImage || '',
                fabricImageUrl: fabricImage || '',
                unitsSold: 0,
                category: pluralize(category),
                subCategory: '',
                fabricType: fabricType,
                description: description || BRAND_FABRIC_MAP[brand]?.[fabricType] || '',
                brand: brand,
                waterResistance: waterResistance,
                productionCost: productionCost,
                isLimited: isLimited,
                variations: selectedSizes.map(size => ({
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
            };
        });

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
                {/* Section 1: Photo & Color Picking (The Core of the Wizard) */}
                <div className={`p-4 rounded-3xl border-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200 shadow-sm'}`}>
                    <label className={`text-sm font-bold uppercase tracking-wider mb-3 block ${labelClasses}`}>1. Foto do Produto & Gota de Cor</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`border-2 border-dashed rounded-2xl p-2 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-300 bg-white'}`}>
                            {dropperImage ? (
                                <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    <canvas 
                                        ref={canvasRef} 
                                        onClick={handleCanvasClick}
                                        className="max-w-full max-h-[300px] cursor-crosshair rounded-lg shadow-inner"
                                        title="Clique para capturar a cor"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setDropperImage(null)}
                                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-xl transition-transform active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded-lg text-center pointer-events-none">
                                        Toque na cor desejada na foto
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex flex-col items-center gap-2 text-fuchsia-500 hover:text-fuchsia-600 transition-all group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                            <span className="font-black text-xs uppercase tracking-tighter">Tirar Foto</span>
                                        </button>

                                        <div className={`w-full h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>

                                        <button 
                                            type="button"
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="flex flex-col items-center gap-2 text-purple-500 hover:text-purple-600 transition-all group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <span className="font-black text-xs uppercase tracking-tighter">Escolher da Galeria</span>
                                        </button>
                                    </div>

                                    <div className={`w-full h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>

                                    {/* Fabric Photo Button */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => fabricFileInputRef.current?.click()}
                                                className={`p-2 rounded-lg border-2 transition-all ${fabricImage ? 'border-emerald-500 text-emerald-500' : 'border-gray-300 text-gray-400 hover:border-emerald-500 hover:text-emerald-500'}`}
                                                title="Tirar foto do tecido"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => fabricGalleryInputRef.current?.click()}
                                                className={`p-2 rounded-lg border-2 transition-all ${fabricImage ? 'border-emerald-500 text-emerald-500' : 'border-gray-300 text-gray-400 hover:border-emerald-500 hover:text-emerald-500'}`}
                                                title="Escolher foto do tecido da galeria"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </button>
                                        </div>
                                        <span className="font-black text-[10px] uppercase tracking-tighter text-emerald-600">Foto do Tecido</span>
                                        {fabricImage && (
                                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm">
                                                <img src={fabricImage} alt="Tecido" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'product')} className="hidden" />
                            <input type="file" accept="image/*" ref={galleryInputRef} onChange={(e) => handleImageUpload(e, 'product')} className="hidden" />
                            <input type="file" accept="image/*" capture="environment" ref={fabricFileInputRef} onChange={(e) => handleImageUpload(e, 'fabric')} className="hidden" />
                            <input type="file" accept="image/*" ref={fabricGalleryInputRef} onChange={(e) => handleImageUpload(e, 'fabric')} className="hidden" />
                        </div>

                        <div className="flex flex-col justify-center space-y-4">
                            {pickedColor ? (
                                <div className={`p-5 rounded-2xl border-2 animate-fade-in ${isDark ? 'bg-black/40 border-fuchsia-500/50' : 'bg-white border-fuchsia-200 shadow-md'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-3 ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}>Nova Cor Detectada</p>
                                    <div className="flex items-center gap-4">
                                        <div 
                                            style={{ backgroundColor: pickedColor }} 
                                            className="w-16 h-16 rounded-2xl border-4 border-white shadow-xl flex-shrink-0"
                                        ></div>
                                        <div className="flex-grow">
                                            <input 
                                                id="new-color-name-input"
                                                type="text" 
                                                value={newColorName} 
                                                onChange={e => setNewColorName(e.target.value)} 
                                                placeholder="Dê um nome à cor..." 
                                                className={`w-full text-lg font-bold border-b-2 bg-transparent focus:outline-none focus:border-fuchsia-500 py-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                                            />
                                            <p className="text-[10px] mt-2 opacity-60 font-mono">{pickedColor}</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleAddNewColor}
                                        disabled={!newColorName.trim()}
                                        className="w-full mt-4 bg-fuchsia-600 text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        Confirmar Cor
                                    </button>
                                </div>
                            ) : (
                                <div className={`h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-2xl ${isDark ? 'border-white/5 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                    <p className="text-sm font-medium">Tire uma foto e use a <span className="text-fuchsia-500 font-bold">Gota de Cor</span> para selecionar a tonalidade exata.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Color Selector moved right below photo for optimized flow */}
                    <div className="mt-6 pt-6 border-t border-dashed border-gray-300">
                        <label className={`text-sm font-bold uppercase tracking-wider mb-3 block ${labelClasses}`}>Cores Selecionadas para este Lançamento</label>
                        <ColorSelector
                            allColors={allColors}
                            onAddCustomColor={onAddColor}
                            multiSelect
                            selectedColors={selectedColors}
                            onToggleColor={handleToggleColor}
                        />
                    </div>
                </div>

                {/* Section 2: Basic Info */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <label className={`text-sm font-bold uppercase tracking-wider mb-4 block ${labelClasses}`}>2. Informações do Produto</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Nome Base (Ex: Suede Liso)</label>
                                <input type="text" value={baseName} onChange={e => setBaseName(e.target.value)} placeholder="Nome do modelo..." className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`} />
                            </div>
                            <div>
                                <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Descrição Curta</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do tecido, toque, etc..." className={`w-full border-2 rounded-xl px-4 py-3 h-24 ${inputClasses}`} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Marca</label>
                                    <select value={brand} onChange={e => setBrand(e.target.value)} className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`}>{allBrandNames.map(b => <option key={b} value={b}>{b}</option>)}</select>
                                </div>
                                <div>
                                    <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Categoria</label>
                                    <input list="categories-list" value={category} onChange={e => setCategory(e.target.value)} required className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`} />
                                    <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Tecido</label>
                                    <select value={fabricType} onChange={e => handleFabricChange(e.target.value)} className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`}>{availableFabricTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                </div>
                                <div>
                                    <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Resistência</label>
                                    <select 
                                        value={waterResistance} 
                                        onChange={e => setWaterResistance(e.target.value as WaterResistanceLevel)} 
                                        className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`}
                                    >
                                        <option value={WaterResistanceLevel.NONE}>Nenhuma</option>
                                        <option value={WaterResistanceLevel.SEMI}>Semi-Impermeável</option>
                                        <option value={WaterResistanceLevel.FULL}>Waterblock</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Sizes & Production Info */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <label className={`text-sm font-bold uppercase tracking-wider mb-4 block ${labelClasses}`}>3. Tamanhos & Produção</label>
                    <div className="flex flex-wrap gap-3 mb-6">
                        {Object.values(CushionSize).map(size => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => handleToggleSize(size)}
                                className={`px-6 py-3 rounded-xl text-sm font-black border-2 transition-all transform active:scale-95 ${selectedSizes.includes(size) ? 'border-fuchsia-500 bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30' : 'border-transparent ' + (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-gray-300">
                        <div>
                            <label className={`text-xs font-bold mb-1 block ${labelClasses}`}>Custo de Produção (R$)</label>
                            <input 
                                type="number" 
                                value={productionCost} 
                                onChange={e => setProductionCost(Number(e.target.value))} 
                                placeholder="0,00" 
                                className={`w-full border-2 rounded-xl px-4 py-3 ${inputClasses}`} 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsLimited(!isLimited)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all w-full ${isLimited ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-gray-300 text-gray-400'}`}
                            >
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isLimited ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                                    {isLimited && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                </div>
                                <span className="font-bold text-sm">Produto de Edição Limitada</span>
                            </button>
                        </div>
                    </div>
                </div>

                {selectedColors.length > 0 && (
                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-fuchsia-50 border-fuchsia-200'}`}>
                        <label className={`text-sm font-bold uppercase tracking-wider mb-4 block ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>Configuração Final</label>
                        <p className={`text-xs mb-3 font-medium ${isDark ? 'text-fuchsia-400/80' : 'text-fuchsia-600'}`}>Qual cor você deseja configurar as fotos de ambiente primeiro?</p>
                        <div className="flex flex-wrap gap-2">
                            {selectedColors.map(color => (
                                <button
                                    key={color.name}
                                    type="button"
                                    onClick={() => setMainColor(color)}
                                    className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold border-2 transition-all ${mainColor?.name === color.name ? 'border-fuchsia-500 bg-white text-fuchsia-600 shadow-md' : 'border-transparent bg-white/50 ' + (isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-white')}`}
                                >
                                    <div style={{ backgroundColor: color.hex }} className="w-5 h-5 rounded-full border border-black/20 shadow-sm"></div>
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

        {/* Cropping Modal */}
        {isCropping && imageToCrop && (
            <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                <div className="relative w-full h-full max-w-2xl max-h-[70vh] rounded-3xl overflow-hidden">
                    <Cropper
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="w-full max-w-2xl mt-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-white text-xs font-bold uppercase">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-grow accent-fuchsia-500"
                        />
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => { setIsCropping(false); setImageToCrop(null); }}
                            className="flex-grow py-4 rounded-xl bg-white/10 text-white font-black uppercase tracking-widest hover:bg-white/20"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleApplyCrop}
                            className="flex-grow py-4 rounded-xl bg-fuchsia-600 text-white font-black uppercase tracking-widest shadow-xl hover:bg-fuchsia-700"
                        >
                            Cortar & Usar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};