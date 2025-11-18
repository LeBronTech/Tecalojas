import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Product, StoreName, Variation, CushionSize, Brand, WaterResistanceLevel, DynamicBrand, ThemeContext } from '../types';
import { VARIATION_DEFAULTS, BRAND_FABRIC_MAP, STORE_NAMES, BRANDS, WATER_RESISTANCE_INFO, PREDEFINED_COLORS } from '../constants';
import { GoogleGenAI, Modality } from '@google/genai';
import ColorSelector from './ColorSelector';
import ConfirmationModal from './ConfirmationModal';

// --- Moved Helper Component ---
const MultiColorCircle: React.FC<{ colors: { hex: string }[], size?: number }> = ({ colors, size = 4 }) => {
    const className = `w-${size} h-${size}`;
    const gradient = useMemo(() => {
        if (!colors || colors.length === 0) return 'transparent';
        if (colors.length === 1) return colors[0].hex;
        const step = 100 / colors.length;
        const stops = colors.map((color, i) => `${color.hex} ${i * step}% ${(i + 1) * step}%`).join(', ');
        return `conic-gradient(${stops})`;
    }, [colors]);

    return (
        <div
            className={`${className} rounded-full border border-black/20 flex-shrink-0`}
            style={{ background: gradient }}
        />
    );
};


// --- CameraView Component ---
interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
      }
    }
    setupCamera();

    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && stream) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
        cleanupCamera();
      }
    }
  };

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {error ? (
        <div className="text-white text-center p-4">
          <p>{error}</p>
          <button onClick={handleClose} className="mt-4 bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg">
            Fechar
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-around items-center">
            <button onClick={handleClose} className="text-white font-semibold">
              Cancelar
            </button>
            <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"></button>
            <div className="w-16"></div> {/* Spacer */}
          </div>
        </>
      )}
    </div>
  );
};


// --- ImagePickerModal Component ---
interface ImagePickerModalProps {
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
  onTakePhoto: () => void;
}

const OptionButton: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, sublabel: string }> = ({ onClick, icon, label, sublabel }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const buttonClasses = isDark 
        ? "bg-gray-700/50 hover:bg-purple-900/50 border-white/10" 
        : "bg-gray-50 hover:bg-gray-100 border-gray-200";
    const iconBgClasses = isDark ? "bg-gray-800" : "bg-white";
    const labelClasses = isDark ? "text-gray-200" : "text-gray-800";
    const sublabelClasses = isDark ? "text-gray-400" : "text-gray-500";
    
    return (
        <button onClick={onClick} className={`w-full flex items-center p-4 rounded-xl transition-colors duration-200 border ${buttonClasses}`}>
            <div className={`p-3 rounded-lg shadow-sm mr-4 ${iconBgClasses}`}>{icon}</div>
            <div>
                <p className={`font-bold text-left ${labelClasses}`}>{label}</p>
                <p className={`text-sm text-left ${sublabelClasses}`}>{sublabel}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
    );
};

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ onSelect, onClose, onTakePhoto }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onSelect(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
        onSelect(imageUrl.trim());
    }
  };

  const modalBgClasses = isDark ? "bg-[#2D1F49] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-gray-800/50" : "text-gray-500 hover:text-gray-800 bg-gray-100/50";
  const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-end justify-center z-50 p-4 transition-opacity duration-300">
      <div className={`border rounded-t-3xl shadow-2xl w-full max-w-md p-6 relative transform transition-all duration-300 translate-y-full opacity-0 animate-slide-in-up ${modalBgClasses}`}>
        <style>{`
          @keyframes slide-in-up {
            0% { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-in-up { animation: slide-in-up 0.3s forwards ease-out; }
        `}</style>
        
        <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${titleClasses}`}>Escolher Imagem</h2>
            <button onClick={onClose} className={`rounded-full p-2 transition-colors ${closeBtnClasses}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="space-y-4 mb-6">
            <OptionButton
                onClick={onTakePhoto}
                label="Tirar Foto"
                sublabel="Use a câmera do seu dispositivo"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <OptionButton
                onClick={handleUploadClick}
                label="Galeria de Fotos"
                sublabel="Escolha uma imagem existente"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
             <div className="relative">
                <input 
                    type="text"
                    placeholder="Ou cole uma URL de imagem aqui"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className={`w-full border-2 rounded-lg pl-4 pr-16 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
                />
                <button 
                    onClick={handleUrlSubmit} 
                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-fuchsia-600 text-white font-bold py-2 px-3 text-sm rounded-md hover:bg-fuchsia-700 transition-colors"
                >
                    Usar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Main AddEditProductModal Component ---

interface AddEditProductModalProps {
  product: Product;
  products: Product[];
  onClose: () => void;
  onSave: (product: Product, options?: { closeModal?: boolean }) => Promise<Product>;
  onCreateVariations: (parentProduct: Product, newColors: {name: string, hex: string}[]) => Promise<void>;
  onSwitchProduct: (product: Product) => void;
  onRequestDelete: (productId: string) => void;
  categories: string[];
  apiKey: string | null;
  onRequestApiKey: () => void;
  allColors: { name: string; hex: string }[];
  onAddColor: (color: { name: string; hex: string }) => void;
  onDeleteColor: (colorName: string) => void;
  brands: DynamicBrand[];
  sofaColors: { name: string; hex: string }[];
}

const defaultFabricInfo = BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA];
const defaultFabricType = Object.keys(defaultFabricInfo)[0];
const initialFormState: Omit<Product, 'id'> = {
  name: '',
  baseImageUrl: '',
  unitsSold: 0,
  category: '',
  subCategory: '',
  fabricType: defaultFabricType,
  description: defaultFabricInfo[defaultFabricType],
  brand: Brand.MARCA_PROPRIA,
  waterResistance: WaterResistanceLevel.NONE,
  variations: [],
  backgroundImages: {},
  colors: [{ name: 'Branco', hex: '#FFFFFF' }],
  isMultiColor: false,
  variationGroupId: undefined,
};

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const FormInput = ({ label, children, ...props }: { label: string, children?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    const inputClasses = isDark 
        ? "bg-black/20 text-white border-white/10" 
        : "bg-gray-100 text-gray-900 border-gray-300";

    return (
        <div>
            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>{label}</label>
            <div className="relative">
                <input 
                    {...props}
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses} ${children ? 'pr-28' : ''}`} 
                />
                {children}
            </div>
        </div>
    );
};


const resizeImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
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
            
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => {
            reject(error);
        };
    });
};


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

const standardizeProductName = (name: string, productColors: {name: string, hex: string}[], allPossibleColors: {name: string, hex: string}[]): string => {
    let productName = name.trim();
    
    // First, strip out ANY existing color from the name to get a clean base name
    const sortedAllColors = [...allPossibleColors].sort((a, b) => b.name.length - a.name.length);
    for (const color of sortedAllColors) {
        const regex = new RegExp(`\\b${color.name}\\b|\\(${color.name}\\)`, 'ig');
        productName = productName.replace(regex, '').trim();
    }
    
    productName = productName.replace(/\s\s+/g, ' ').trim();
    let baseName = productName.charAt(0).toUpperCase() + productName.slice(1);
    baseName = baseName.replace(/[()]/g, '').trim();

    if (productColors && productColors.length > 0) {
        const colorName = productColors[0].name.charAt(0).toUpperCase() + productColors[0].name.slice(1);
        return `${baseName} (${colorName})`;
    }
    
    return baseName;
};

const AddEditProductModal: React.FC<AddEditProductModalProps> = ({ product, products, onClose, onSave, onCreateVariations, onSwitchProduct, onRequestDelete, categories, apiKey, onRequestApiKey, allColors, onAddColor, onDeleteColor, brands, sofaColors }) => {
  const [formData, setFormData] = useState<Product>(() => ({ ...initialFormState, ...product }));
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<Record<string, boolean>>({});
  const [isGeneratingShowcase, setIsGeneratingShowcase] = useState(false);
  const [addVariationSize, setAddVariationSize] = useState<CushionSize | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bgGenerating, setBgGenerating] = useState<Record<string, boolean>>({});
  const [isBatchColorMode, setIsBatchColorMode] = useState(false);
  const [selectedNewColors, setSelectedNewColors] = useState<{name: string, hex: string}[]>([]);
  const [isCreatingVariations, setIsCreatingVariations] = useState(false);
  const [isNameAiLoading, setIsNameAiLoading] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isVariationsVisible, setIsVariationsVisible] = useState(true);
  const [isBackgroundsVisible, setIsBackgroundsVisible] = useState(true);
  const [isCategorySectionVisible, setIsCategorySectionVisible] = useState(true);
  const [isGeneratingColors, setIsGeneratingColors] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [generatingColor, setGeneratingColor] = useState<Partial<Record<'sala' | 'quarto', string | null>>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<'sala' | 'quarto' | null>(null);

  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const noApiKeyTitle = "Adicionar chave de API da Gemini para usar IA";
  
  const allBrandNames = useMemo(() => {
    const dynamicNames = brands.map(b => b.name);
    const staticNames = Object.values(Brand);
    return [...new Set([...dynamicNames, ...staticNames])];
  }, [brands]);

  const familyProducts = useMemo(() => {
    if (!formData.brand || !formData.category) return [];
    
    return products.filter(p => 
        p.brand === formData.brand &&
        p.category === formData.category &&
        (p.subCategory || '') === (formData.subCategory || '')
    );
  }, [products, formData.brand, formData.category, formData.subCategory]);

  const subCategorySuggestions = useMemo(() => {
    const fromSubCategories = products.map(p => p.subCategory).filter((sc): sc is string => !!sc);
    const fromFabricTypes = products.map(p => {
        const parts = p.fabricType.split(' ');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (!lastPart.includes('®') && lastPart.length > 2) {
                return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
            }
        }
        return null;
    }).filter((ft): ft is string => !!ft);
    return [...new Set([...fromSubCategories, ...fromFabricTypes])];
  }, [products]);


  const currentBaseName = useMemo(() => {
    if (!formData.name || !formData.colors || formData.colors.length === 0) return formData.name.trim();
    const colorName = formData.colors[0].name;
    const regex = new RegExp(`\\b${colorName}\\b|\\(${colorName}\\)`, 'i');
    return formData.name.replace(regex, '').trim().replace(/\s\s+/g, ' ');
  }, [formData.name, formData.colors]);

  const usedColorNamesInFamily = useMemo(() => {
    if (!currentBaseName) return [];
    return familyProducts
        .filter(p => {
            if (p.id === formData.id || !p.colors || p.colors.length === 0) return false;
            const pBaseName = p.name.replace(new RegExp(`\\b${p.colors[0].name}\\b|\\(${p.colors[0].name}\\)`, 'ig'), '').trim().replace(/\s\s+/g, ' ');
            return pBaseName.toLowerCase() === currentBaseName.toLowerCase();
        })
        .flatMap(p => p.colors.map(c => c.name));
  }, [familyProducts, formData.id, currentBaseName]);


  useEffect(() => {
    const migratedData = JSON.parse(JSON.stringify(product)); // Deep copy
    if (migratedData.backgroundImages) {
        const salaBg = migratedData.backgroundImages.sala;
        if (salaBg && typeof salaBg === 'string') {
            migratedData.backgroundImages.sala = { 'Bege': salaBg };
        }
        const quartoBg = migratedData.backgroundImages.quarto;
        if (quartoBg && typeof quartoBg === 'string') {
            migratedData.backgroundImages.quarto = { 'Bege': quartoBg };
        }
    }
    
    setFormData({ 
        ...initialFormState, 
        ...migratedData, 
        backgroundImages: migratedData.backgroundImages || {},
        colors: migratedData.colors && migratedData.colors.length > 0 ? migratedData.colors : initialFormState.colors,
    });
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
    setIsBatchColorMode(false);
    setSelectedNewColors([]);
    setImageRotation(0);
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const { checked } = e.target as HTMLInputElement;

    const parsedValue = type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) || 0 : value);

    setFormData(prev => {
        let newState = { ...prev, [name]: parsedValue };
        if (name === 'isMultiColor') {
            const isMulti = parsedValue as boolean;
            if (!isMulti && newState.colors && newState.colors.length > 1) {
                newState.colors = [newState.colors[0]];
            }
        }
        else if (name === 'brand') {
            const newBrand = parsedValue as string;
            const fabricInfo = BRAND_FABRIC_MAP[newBrand];
            if (fabricInfo) {
              const newFabricType = Object.keys(fabricInfo)[0];
              newState.fabricType = newFabricType;
              newState.description = fabricInfo[newFabricType] || '';
            }
        } else if (name === 'fabricType') {
            const newFabricType = parsedValue as string;
            const fabricInfo = BRAND_FABRIC_MAP[newState.brand];
            if (fabricInfo) {
               newState.description = fabricInfo[newFabricType] || '';
            }
            // Automatically set water resistance for specific fabrics
            if (newFabricType.toLowerCase().includes('waterblock')) {
                newState.waterResistance = WaterResistanceLevel.FULL;
            }
        }
        return newState;
    });
  };
  
  const handleVariationChange = (index: number, field: string, value: string) => {
    const updatedVariations = [...formData.variations];
    const variation = { ...updatedVariations[index] };
    if (field === 'priceCover' || field === 'priceFull') {
      (variation as any)[field] = parseFloat(value) || 0;
    } else if (field.startsWith('stock-')) {
      const store = field.split('-')[1] as StoreName;
      variation.stock = { ...variation.stock, [store]: parseInt(value) || 0 };
    }
    updatedVariations[index] = variation;
    setFormData(prev => ({ ...prev, variations: updatedVariations }));
  };

  const handleOpenImagePicker = () => {
    setIsImagePickerOpen(true);
  };

  const handleImageSelect = async (imageUrl: string) => {
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image')) {
        try { finalImageUrl = await resizeImage(imageUrl); } 
        catch (error) { console.error("Failed to resize image:", error); }
    }
    setFormData(prev => ({ ...prev, baseImageUrl: finalImageUrl }));
    setIsImagePickerOpen(false);
    setIsCameraOpen(false);
  };
  
  const handleAddVariation = () => {
    if (!addVariationSize || formData.variations.some(v => v.size === addVariationSize)) return;
    const newVariation: Variation = {
      size: addVariationSize,
      imageUrl: '',
      priceCover: VARIATION_DEFAULTS[addVariationSize].priceCover,
      priceFull: VARIATION_DEFAULTS[addVariationSize].priceFull,
      stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 },
    };
    setFormData(prev => ({ ...prev, variations: [...prev.variations, newVariation]}));
    setAddVariationSize('');
  };
  
  const handleRemoveVariation = (indexToRemove: number) => {
     setFormData(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== indexToRemove)}));
  };

  const getBase64FromImageUrl = async (imageUrl: string): Promise<{ base64Data: string; mimeType: string }> => {
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mimeTypePart = parts[0].match(/:(.*?);/);
        if (!mimeTypePart || !parts[1]) {
            throw new Error('URL de dados da imagem base inválida.');
        }
        return { mimeType: mimeTypePart[1], base64Data: parts[1] };
    } else {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Falha ao buscar a imagem pela URL.');
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return { mimeType: blob.type, base64Data };
    }
  };

  const getAiPromptForSize = (size: CushionSize): string => {
    switch (size) {
        case CushionSize.SQUARE_60: return 'Foto de produto estilo catálogo. A almofada (grande, 60x60) está no chão, encostada em uma poltrona moderna em uma sala bem iluminada. Foco na textura e escala realista.';
        case CushionSize.LUMBAR: return 'Foto de produto estilo catálogo. A almofada lombar (pequena, retangular) está em uma poltrona moderna em uma sala bem iluminada. Foco na textura e escala realista.';
        default: return `Foto de produto estilo catálogo. A almofada está em uma poltrona moderna, em uma sala de estar bem iluminada. Foco na textura da almofada e na escala realista.`;
    }
  };

  const handleGenerateVariationImage = async (index: number) => {
    if (!apiKey) { onRequestApiKey(); return; }
    const variation = formData.variations[index];
    if (!formData.baseImageUrl) { 
        setSaveError("Primeiro, adicione uma imagem base para o produto."); 
        return; 
    }
    setAiGenerating(prev => ({ ...prev, [variation.size]: true }));
    setSaveError(null);
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: getAiPromptForSize(variation.size) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const candidate = aiResponse.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY' || aiResponse.promptFeedback?.blockReason) {
            throw new Error('Geração bloqueada por políticas de segurança.');
        }
       
        const generatedImagePart = candidate?.content?.parts?.find(p => p.inlineData);
        if (!generatedImagePart?.inlineData) {
            throw new Error(`A IA não retornou uma imagem válida para o tamanho ${variation.size}.`);
        }

        const newImageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
        const resizedImageUrl = await resizeImage(newImageUrl);
        const updatedVariations = [...formData.variations];
        updatedVariations[index].imageUrl = resizedImageUrl;
        setFormData(prev => ({ ...prev, variations: updatedVariations }));
    } catch (error: any) { 
        console.error("AI image generation failed:", error); 
        if (error.message && error.message.includes('429')) {
            let message = "Limite de uso da API atingido. Verifique seu plano e tente mais tarde.";
            const retryMatch = error.message.match(/retry in ([\d.]+)s/);
            if (retryMatch && retryMatch[1]) {
                const waitTime = Math.ceil(parseFloat(retryMatch[1]));
                message = `Limite de uso da API atingido. Tente novamente em ${waitTime} segundos.`;
            }
            setSaveError(message);
        } else if (error.message.includes('SAFETY')) {
            setSaveError("Geração bloqueada por políticas de segurança.");
        } else {
            setSaveError(error.message || "Falha na IA. Tente novamente.");
        }
    } 
    finally { setAiGenerating(prev => ({ ...prev, [variation.size]: false })); }
  };

  const generateShowcaseImage = async () => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.baseImageUrl) { 
        setSaveError("Adicione uma imagem antes de gerar uma vitrine."); 
        return; 
    }
    
    setIsGeneratingShowcase(true);
    setSaveError(null);
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: 'Foto de produto para catálogo, close-up de uma única almofada quadrada. A almofada está perfeitamente centralizada, vista de frente, preenchendo cerca de 80% do quadro. Fundo branco liso com uma sombra suave projetada pela almofada no chão, criando profundidade. Iluminação de estúdio profissional que destaca a textura do tecido e cria uma sombra natural e suave. A imagem deve ser limpa, realista e com qualidade de estúdio.' };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const candidate = aiResponse.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY' || aiResponse.promptFeedback?.blockReason) {
            throw new Error('Geração bloqueada por políticas de segurança.');
        }

        const imagePartResponse = candidate?.content?.parts?.find(p => p.inlineData);
        if (!imagePartResponse?.inlineData) {
            throw new Error("A IA não retornou uma imagem válida.");
        }

        const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
        const resizedImageUrl = await resizeImage(newImageUrl);
        setFormData(prev => ({ ...prev, baseImageUrl: resizedImageUrl }));
    } catch (error: any) { 
        console.error("AI showcase image generation failed:", error); 
        if (error.message && error.message.includes('429')) {
            let message = "Limite de uso da API atingido. Verifique seu plano e tente mais tarde.";
            const retryMatch = error.message.match(/retry in ([\d.]+)s/);
            if (retryMatch && retryMatch[1]) {
                const waitTime = Math.ceil(parseFloat(retryMatch[1]));
                message = `Limite de uso da API atingido. Tente novamente em ${waitTime} segundos.`;
            }
            setSaveError(message);
        } else if (error.message.includes('SAFETY')) {
            setSaveError("Geração bloqueada por políticas de segurança.");
        } else {
            setSaveError(error.message || "Falha na IA. Tente novamente.");
        }
    } 
    finally { setIsGeneratingShowcase(false); }
  };
  
    const backgroundOptions = useMemo(() => {
        const options: ('Sala' | 'Quarto' | 'Varanda' | 'Piscina')[] = ['Sala', 'Quarto', 'Varanda'];
        if (formData.waterResistance === WaterResistanceLevel.FULL) {
            options.push('Piscina');
        }
        return options;
    }, [formData.waterResistance]);

    const getPromptForBackground = (background: 'Quarto' | 'Sala' | 'Varanda' | 'Piscina'): string => {
        const prompts = {
            'Quarto': 'Foto de produto profissional. A almofada está em uma cama arrumada em um quarto moderno e aconchegante.',
            'Sala': 'Foto de produto profissional. A almofada está em um sofá moderno numa sala de estar elegante e com luz natural.',
            'Varanda': 'Foto de produto profissional. A almofada está em uma cadeira de exterior confortável em uma varanda com plantas.',
            'Piscina': 'Foto de produto profissional. A almofada está em uma espreguiçadeira ao lado de uma piscina de luxo em um dia ensolarado.'
        };
        return prompts[background];
    };
  
  const handleGenerateBackgroundImage = async (background: 'Quarto' | 'Sala' | 'Varanda' | 'Piscina') => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.baseImageUrl) { 
        setSaveError("Primeiro, adicione uma imagem base para o produto."); 
        return; 
    }
    const contextKey = background.toLowerCase() as 'quarto' | 'sala' | 'varanda' | 'piscina';
    setBgGenerating(prev => ({ ...prev, [contextKey]: true }));
    setSaveError(null);
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: getPromptForBackground(background) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const candidate = aiResponse.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY' || aiResponse.promptFeedback?.blockReason) {
            throw new Error('Geração bloqueada por políticas de segurança.');
        }

        const imagePartResponse = candidate?.content?.parts?.find(p => p.inlineData);
        if (!imagePartResponse?.inlineData) {
            throw new Error(`A IA não retornou uma imagem válida para ${background}.`);
        }

        const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
        const resizedImageUrl = await resizeImage(newImageUrl);
        setFormData(prev => {
            const newBgs = { ...prev.backgroundImages };
            if (contextKey === 'sala' || contextKey === 'quarto') {
                newBgs[contextKey] = { ...newBgs[contextKey], 'Bege': resizedImageUrl };
            } else {
                newBgs[contextKey] = resizedImageUrl;
            }
            return { ...prev, backgroundImages: newBgs };
        });
    } catch (error: any) { 
        console.error(`AI background generation for ${background} failed:`, error); 
        if (error.message && error.message.includes('429')) {
            let message = "Limite de uso da API atingido. Verifique seu plano e tente mais tarde.";
            const retryMatch = error.message.match(/retry in ([\d.]+)s/);
            if (retryMatch && retryMatch[1]) {
                const waitTime = Math.ceil(parseFloat(retryMatch[1]));
                message = `Limite de uso da API atingido. Tente novamente em ${waitTime} segundos.`;
            }
            setSaveError(message);
        } else if (error.message.includes('SAFETY')) {
            setSaveError("Geração bloqueada por políticas de segurança.");
        } else {
            setSaveError(error.message || "Falha na IA. Tente novamente.");
        }
    } 
    finally { setBgGenerating(prev => ({ ...prev, [contextKey]: false })); }
  };

  const handleGenerateColoredBackgrounds = async (context: 'sala' | 'quarto', colorsToGenerate: string[]) => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.baseImageUrl) { 
        setSaveError("Adicione uma imagem base primeiro."); 
        return; 
    }
    if (colorsToGenerate.length === 0) {
        alert("Nenhuma cor nova para gerar.");
        return;
    }

    setIsGeneratingColors(true);
    setSaveError(null);
    const furniture = context === 'quarto' ? 'cama' : 'sofá';
    
    let currentData: Product = formData;

    for (const color of colorsToGenerate) {
        setGeneratingColor(prev => ({ ...prev, [context]: color }));
        setGenerationProgress(`Gerando ${furniture} ${color}...`);
        try {
            const { base64Data, mimeType } = await getBase64FromImageUrl(currentData.baseImageUrl);
            const ai = new GoogleGenAI({ apiKey });
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            const textPart = { text: `Foto de produto profissional. A almofada está em um(a) ${furniture} moderno(a) de cor ${color} em uma ${context} elegante e com luz natural.` };

            const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
            
            const candidate = aiResponse.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY' || aiResponse.promptFeedback?.blockReason) {
                throw new Error('Geração bloqueada por políticas de segurança.');
            }
            
            const imagePartResponse = candidate?.content?.parts?.find(p => p.inlineData);
            if (!imagePartResponse?.inlineData) throw new Error(`A IA não retornou uma imagem para ${color}.`);
            
            const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);

            const updatedData: Product = {
                ...currentData,
                backgroundImages: {
                    ...currentData.backgroundImages,
                    [context]: {
                        ...(typeof currentData.backgroundImages?.[context] === 'object' ? currentData.backgroundImages?.[context] : {}),
                        [color]: resizedImageUrl
                    }
                }
            };
            
            setGenerationProgress(`Imagem de ${furniture} ${color} gerada! Salvando...`);
            const savedProduct = await onSave(updatedData, { closeModal: false });
            currentData = savedProduct; // Use the saved product for the next iteration
            setFormData(savedProduct); // Update UI state immediately

        } catch (error: any) {
            console.error(`Error generating for color ${color}:`, error);
            let errorMessage = `Falha em ${color}: ${error.message}`;
            if (error.message && error.message.includes('429')) {
                const retryMatch = error.message.match(/retry in ([\d.]+)s/);
                errorMessage = `API ocupada. Tente novamente em ${retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 'alguns'} segundos.`;
            } else if (error.message.includes('SAFETY')) {
                errorMessage = "Geração bloqueada por políticas de segurança.";
            }
            setSaveError(errorMessage);
            setGenerationProgress(`Falha ao gerar ${furniture} ${color}.`);
            await new Promise(res => setTimeout(res, 2000)); // show error message for a bit
        } finally {
            setGeneratingColor(prev => ({ ...prev, [context]: null }));
        }
    }

    setGenerationProgress('Concluído!');
    setTimeout(() => setGenerationProgress(''), 2000);
    setIsGeneratingColors(false);
  };

    const handleColorSelect = (color: { name: string; hex: string }) => {
        setFormData(prev => ({ ...prev, colors: [color] }));
    };

    const handleColorToggle = (color: { name: string; hex: string }) => {
        setFormData(prev => {
            const currentColors = prev.colors || [];
            const isSelected = currentColors.some(c => c.name === color.name);

            if (isSelected) {
                const newColors = currentColors.filter(c => c.name !== color.name);
                return { ...prev, colors: newColors };
            } else {
                if (currentColors.length < 3) {
                    return { ...prev, colors: [...currentColors, color] };
                }
                return prev; // Limit reached
            }
        });
    };

  const findMatchingFabricType = (aiFabric: string, brand: string): string | null => {
      const fabricMap = BRAND_FABRIC_MAP[brand];
      if (!fabricMap) return null;
      
      const aiFabricLower = aiFabric.toLowerCase().trim();
      const fabricKeys = Object.keys(fabricMap);

      for (const key of fabricKeys) {
          const keyLower = key.toLowerCase();
          if (keyLower === aiFabricLower) return key;
          const keyBase = keyLower.split('(')[0].trim();
          if (keyBase === aiFabricLower) return key;
      }
      for (const key of fabricKeys) {
          if (key.toLowerCase().includes(aiFabricLower) || aiFabricLower.includes(key.toLowerCase().split('(')[0].trim())) {
              return key;
          }
      }
      return null;
  }

  const handleAiCorrectName = async () => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.name.trim()) return;
    setIsNameAiLoading(true);
    setSaveError(null);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Você é um assistente de e-commerce para uma loja de decoração. Analise o texto de entrada: '${formData.name}'. Sua tarefa é extrair e padronizar as informações em um objeto JSON. A resposta DEVE ser um JSON válido com a estrutura: {"name": "string", "fabricType": "string", "colorName": "string", "category": "string"}. Regras: 1. 'name': Crie um nome de produto conciso, usando gênero feminino e singular (ex: 'Lisa Verde', 'Costela de Adão'). 2. 'fabricType': Extraia o tipo de tecido (ex: 'Gorgurinho', 'Suede'). Se não encontrar, retorne null. 3. 'colorName': Extraia o nome da cor principal (ex: 'Verde', 'Bege'). Se não encontrar, retorne null. 4. 'category': Extraia a categoria e coloque-a no plural (ex: 'Almofadas Lisas', 'Capas Florais'). Se não encontrar, retorne null.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const resultText = response.text.trim();
        const resultJson = JSON.parse(resultText);
        const { name, fabricType, colorName, category } = resultJson;

        setFormData(prev => {
            let newState = { ...prev };

            if (name) {
                newState.name = name;
            }
            if (category) {
                newState.category = category;
            }
            if (fabricType) {
                const matchedFabric = findMatchingFabricType(fabricType, newState.brand);
                if (matchedFabric) {
                    newState.fabricType = matchedFabric;
                    newState.description = BRAND_FABRIC_MAP[newState.brand]?.[matchedFabric] || '';
                }
            }
            if (colorName) {
                const matchedColor = allColors.find(c => c.name.toLowerCase() === colorName.toLowerCase());
                if (matchedColor) {
                    newState.colors = [matchedColor];
                }
            }
            return newState;
        });
    } catch (e: any) {
        console.error("AI Name Correction Failed:", e);
        if (e.message && e.message.includes('429')) {
            let message = "Limite de uso da API atingido. Verifique seu plano e tente mais tarde.";
            const retryMatch = e.message.match(/retry in ([\d.]+)s/);
            if (retryMatch && retryMatch[1]) {
                const waitTime = Math.ceil(parseFloat(retryMatch[1]));
                message = `Limite de uso da API atingido. Tente novamente em ${waitTime} segundos.`;
            }
            setSaveError(message);
        } else {
            setSaveError("Falha na IA. Tente novamente.");
        }
    } finally {
        setIsNameAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
        const productToSave = { ...formData };

        productToSave.category = pluralize(productToSave.category);
        if(productToSave.subCategory) {
            productToSave.subCategory = pluralize(productToSave.subCategory);
        }

        if (!productToSave.isMultiColor) {
            productToSave.name = standardizeProductName(productToSave.name, productToSave.colors, allColors);
        }

        const existingProductWithSameName = products.find(p => 
            p.name.toLowerCase() === productToSave.name.toLowerCase() && p.id !== productToSave.id
        );
        if (existingProductWithSameName) {
            throw new Error(`Já existe um produto com o nome exato "${productToSave.name}".`);
        }

        await onSave(productToSave); 
    } catch (error: any) { 
        console.error("Failed to save product:", error);
        setSaveError(error.message || "Ocorreu um erro desconhecido ao salvar.");
    } finally { 
      setIsSaving(false); 
    }
  };
  
  const handleTakePhoto = () => {
    setIsImagePickerOpen(false);
    if (navigator.camera && typeof Camera !== 'undefined') {
        navigator.camera.getPicture((imageData: string) => {
            handleImageSelect("data:image/jpeg;base64," + imageData);
        }, (msg: string) => { alert('Falha ao tirar foto: ' + msg); }, {
            quality: 50, destinationType: Camera.DestinationType.DATA_URL, sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit: false, encodingType: Camera.EncodingType.JPEG, targetWidth: 800, targetHeight: 800, saveToPhotoAlbum: false
        });
    } else { setIsCameraOpen(true); }
  };

  const handleToggleNewColor = (color: {name: string, hex: string}) => {
    setSelectedNewColors(prev => {
        if (prev.some(c => c.name === color.name)) {
            return prev.filter(c => c.name !== color.name);
        } else {
            return [...prev, color];
        }
    });
  };

  const handleCreateVariations = async () => {
    if (selectedNewColors.length === 0) return;
    setIsCreatingVariations(true);
    setSaveError(null);
    try {
        // Step 1: Save the current product to ensure its data (especially variationGroupId) is up-to-date.
        const savedParentProduct = await onSave(formData, { closeModal: false });
        
        // Step 2: Call the dedicated function to create only the new variations.
        await onCreateVariations(savedParentProduct, selectedNewColors);

        // Update the form with the potentially updated parent product (e.g., with a new variationGroupId)
        setFormData(savedParentProduct); 
        setSelectedNewColors([]);
        setIsBatchColorMode(false);

    } catch (err: any) {
        setSaveError(err.message || 'Falha ao criar variações de cor.');
    } finally {
        setIsCreatingVariations(false);
    }
  };
  
  const handleSwitch = (productToSwitchTo: Product) => {
    onSwitchProduct(productToSwitchTo);
  };
  
  const handleRotateImage = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleGenerateQrCode = (variationIndex: number) => {
    const variation = formData.variations[variationIndex];
    if (!formData.id) {
        alert("Você precisa salvar o produto pela primeira vez para poder gerar um QR Code.");
        return;
    }

    const data = JSON.stringify({ productId: formData.id, variationSize: variation.size });
    
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.top = '-9999px';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    tempDiv.innerHTML = '';

    new QRCode(tempDiv, {
        text: data,
        width: 128,
        height: 128,
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const canvas = tempDiv.querySelector('canvas');
        if (canvas) {
            const qrCodeUrl = canvas.toDataURL();
            setFormData(prev => {
                const newVariations = [...prev.variations];
                newVariations[variationIndex].qrCodeUrl = qrCodeUrl;
                return { ...prev, variations: newVariations };
            });
        }
        document.body.removeChild(tempDiv);
    }, 100);
};


  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200";
  const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
  
  const availableFabricTypes = Object.keys(BRAND_FABRIC_MAP[formData.brand] || {});
  const canCreateVariations = formData.name.trim() && formData.category.trim();

  return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 transition-opacity duration-300" onClick={onClose}>
            <form onSubmit={handleSubmit} className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                <style>{` @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } } .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; } `}</style>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${titleClasses}`}>Editar Produto</h2>
                    <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div ref={scrollContainerRef} className="flex-grow overflow-y-auto no-scrollbar pr-2 -mr-2 space-y-6 pb-24">
                    {/* Main Image Section */}
                    <div className="flex items-start gap-4">
                        <div className={`relative w-32 h-32 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>
                            {formData.baseImageUrl ? (
                                <img src={formData.baseImageUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-300" style={{ transform: `rotate(${imageRotation}deg)` }} /> 
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center relative ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                                    <img 
                                        src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" 
                                        alt="Sem Imagem" 
                                        className="w-1/2 h-1/2 object-contain opacity-20" 
                                    />
                                </div>
                            )}
                            {formData.baseImageUrl && (
                                <button
                                    type="button"
                                    onClick={handleRotateImage}
                                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full z-10 bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                                    aria-label="Girar imagem"
                                >
                                    <img src="https://i.postimg.cc/C1qXzX3z/20251019-214841-0000.png" alt="Girar Imagem" className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                        <div className="flex-grow">
                             <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Imagem Principal</label>
                            <button type="button" onClick={handleOpenImagePicker} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Alterar Imagem</button>
                            <button type="button" onClick={generateShowcaseImage} disabled={isGeneratingShowcase || !formData.baseImageUrl} title={!apiKey ? noApiKeyTitle : "Gerar imagem de vitrine com IA"} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} disabled:opacity-50`}>
                                {isGeneratingShowcase ? <ButtonSpinner /> : 'Gerar Vitrine com IA'}
                            </button>
                        </div>
                    </div>

                    <div className="w-full">
                        <FormInput 
                            label="Nome do Produto" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange}
                            required
                        >
                             <button type="button" onClick={handleAiCorrectName} disabled={isNameAiLoading || !apiKey} title="Corrigir Nome com IA" className={`absolute top-1/2 right-2 -translate-y-1/2 text-xs font-bold py-2 px-3 rounded-md transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50`}>
                                {isNameAiLoading ? <ButtonSpinner /> : 'Corrigir texto'}
                            </button>
                        </FormInput>
                    </div>

                    {/* Collapsible Category Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setIsCategorySectionVisible(!isCategorySectionVisible)}>
                            <h3 className={`text-lg font-bold ${titleClasses}`}>Categoria & Sub-categoria</h3>
                             <button type="button" className="p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isCategorySectionVisible ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCategorySectionVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {categories.map(cat => (
                                            <button
                                                type="button"
                                                key={cat}
                                                onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${formData.category === cat ? (isDark ? 'bg-fuchsia-600 text-white' : 'bg-purple-600 text-white') : (isDark ? 'bg-black/30 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <input list="categories-list" name="category" value={formData.category} onChange={handleChange} required className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                                    <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                                </div>
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Sub-categoria (Opcional)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {subCategorySuggestions.map(subCat => (
                                            <button
                                                type="button"
                                                key={subCat}
                                                onClick={() => setFormData(prev => ({ ...prev, subCategory: subCat }))}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${formData.subCategory === subCat ? (isDark ? 'bg-cyan-600 text-white' : 'bg-teal-600 text-white') : (isDark ? 'bg-black/30 text-gray-300' : 'bg-gray-200 text-gray-700')}`}
                                            >
                                                {subCat}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="text" name="subCategory" value={formData.subCategory} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                            <select name="brand" value={formData.brand} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{allBrandNames.map(brandName => <option key={brandName} value={brandName}>{brandName}</option>)}</select>
                        </div>
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tipo de Tecido</label>
                            <select name="fabricType" value={formData.fabricType} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{availableFabricTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>
                        </div>
                    </div>
                     <div>
                        <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Proteção contra líquidos</label>
                        <div className="space-y-2">
                             <label className="flex items-center cursor-pointer"><input type="radio" name="waterResistance" value={WaterResistanceLevel.NONE} checked={formData.waterResistance === WaterResistanceLevel.NONE} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" /><span className={`ml-3 text-sm font-medium ${labelClasses}`}>Nenhum</span></label>
                            <label className="flex items-center cursor-pointer"><input type="radio" name="waterResistance" value={WaterResistanceLevel.SEMI} checked={formData.waterResistance === WaterResistanceLevel.SEMI} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" /><span className={`ml-3 text-sm font-medium ${labelClasses}`}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.SEMI]?.label}</span></label>
                            <label className="flex items-center cursor-pointer"><input type="radio" name="waterResistance" value={WaterResistanceLevel.FULL} checked={formData.waterResistance === WaterResistanceLevel.FULL} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" /><span className={`ml-3 text-sm font-medium ${labelClasses}`}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.FULL]?.label}</span></label>
                        </div>
                    </div>
                    <div><label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Descrição do Tecido</label><textarea name="description" value={formData.description} onChange={handleChange} rows={2} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}></textarea></div>
                    
                    <div>
                        <h3 className={`text-lg font-bold mb-2 ${titleClasses}`}>Cor do Produto</h3>
                         <div className="flex items-center mb-3">
                            <input 
                                type="checkbox" 
                                id="isMultiColor"
                                name="isMultiColor" 
                                checked={!!formData.isMultiColor}
                                onChange={handleChange}
                                className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isMultiColor" className={`ml-2 text-sm font-medium ${labelClasses}`}>
                                É multi cor (até 3 cores)
                            </label>
                        </div>
                        <ColorSelector
                            allColors={allColors}
                            multiSelect={!!formData.isMultiColor}
                            selectedColors={formData.colors || []}
                            onToggleColor={handleColorToggle}
                            selectedColor={!formData.isMultiColor ? formData.colors?.[0] : undefined}
                            onSelectColor={handleColorSelect}
                            disabledColors={usedColorNamesInFamily}
                            onAddCustomColor={onAddColor}
                            onDeleteColor={onDeleteColor}
                        />
                    </div>
                    
                    {/* Collapsible Size Variations */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={`text-lg font-bold ${titleClasses}`}>Variações de Tamanho e Estoque</h3>
                             <button type="button" onClick={() => setIsVariationsVisible(!isVariationsVisible)} className="p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isVariationsVisible ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isVariationsVisible ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-3 pt-2">
                                {formData.variations.map((v, i) => (<div key={v.size} className={`p-4 rounded-xl border ${cardClasses}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-fuchsia-400">{v.size}</h4>
                                        <button type="button" onClick={() => handleRemoveVariation(i)} className="text-red-500 hover:text-red-700 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Capa)</label><input type="number" value={v.priceCover} onChange={e => handleVariationChange(i, 'priceCover', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/></div>
                                        <div><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Cheia)</label><input type="number" value={v.priceFull} onChange={e => handleVariationChange(i, 'priceFull', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/></div>
                                        {STORE_NAMES.map(storeName => (<div key={storeName}><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Estoque ({storeName})</label><input type="number" value={v.stock[storeName]} onChange={e => handleVariationChange(i, `stock-${storeName}`, e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`} /></div>))}
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-white'}`}>{v.imageUrl ? <img src={v.imageUrl} alt="Var" className="w-full h-full object-cover"/> : <span className="text-xs text-gray-400">Sem IA</span>}</div>
                                        <button type="button" disabled={aiGenerating[v.size] || !formData.baseImageUrl} onClick={() => handleGenerateVariationImage(i)} title={!apiKey ? noApiKeyTitle : `Gerar imagem para variação ${v.size}`} className={`w-full flex items-center justify-center gap-2 text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'} disabled:opacity-50`}>{aiGenerating[v.size] ? <ButtonSpinner /> : 'Gerar Imagem IA'}</button>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-lg p-1 flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-white' : 'border-gray-200 bg-white'}`}>
                                            {v.qrCodeUrl ? <img src={v.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain"/> : <span className="text-xs text-gray-500">Sem QR Code</span>}
                                        </div>
                                        <button type="button" onClick={() => handleGenerateQrCode(i)} disabled={!formData.id} title={!formData.id ? "Salve o produto primeiro" : "Gerar QR Code para esta variação"} className={`w-full flex items-center justify-center gap-2 text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50`}>
                                            {v.qrCodeUrl ? 'Gerar Novo QR Code' : 'Gerar QR Code'}
                                        </button>
                                    </div>
                                </div>))}
                                <div className={`flex gap-2 mt-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                                     <select value={addVariationSize} onChange={e => setAddVariationSize(e.target.value as CushionSize)} className={`flex-grow border-2 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}><option value="" disabled>Selecione um tamanho</option>{Object.values(CushionSize).map(size => (<option key={size} value={size} disabled={formData.variations.some(v => v.size === size)}>{size}</option>))}</select>
                                    <button type="button" onClick={handleAddVariation} className="bg-fuchsia-600 text-white font-bold p-3 rounded-lg hover:bg-fuchsia-700 transition-transform transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Backgrounds */}
                    <div>
                         <div className="flex justify-between items-center mb-3">
                            <h3 className={`text-lg font-bold ${titleClasses}`}>Fundos de Vitrine (IA)</h3>
                             <button type="button" onClick={() => setIsBackgroundsVisible(!isBackgroundsVisible)} className="p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isBackgroundsVisible ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                         <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isBackgroundsVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <p className={`text-sm mb-3 ${subtitleClasses}`}>Gere imagens do produto em diferentes ambientes. Estas imagens serão salvas e exibidas na vitrine.</p>
                            {generationProgress && <p className={`text-sm text-center font-semibold mb-2 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{generationProgress}</p>}
                            <div className="grid grid-cols-2 gap-4">
                                {backgroundOptions.map(bg => { 
                                    const contextKey = bg.toLowerCase() as 'sala' | 'quarto' | 'varanda' | 'piscina'; 
                                    const imagesForContext = formData.backgroundImages?.[contextKey];
                                    const isColorVaried = typeof imagesForContext === 'object' && imagesForContext !== null;
                                    const imageUrl = isColorVaried ? (imagesForContext['Bege'] || Object.values(imagesForContext)[0]) : (typeof imagesForContext === 'string' ? imagesForContext : undefined);
                                    const isGenerating = bgGenerating[contextKey]; 
                                    
                                    return (
                                    <div key={bg} className="flex flex-col items-center p-2 rounded-lg bg-black/10">
                                        <div className={`w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden border-2 mb-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>{isGenerating ? (<ButtonSpinner />) : imageUrl ? (<img src={imageUrl} alt={`Fundo de ${bg}`} className="w-full h-full object-cover" />) : (<span className={`text-xs text-center ${labelClasses}`}>Sem Imagem</span>)}</div>
                                        <div className="w-full flex flex-col gap-2">
                                            <button type="button" onClick={() => handleGenerateBackgroundImage(bg)} disabled={isGenerating || !formData.baseImageUrl || isGeneratingColors} title={!apiKey ? noApiKeyTitle : `Gerar fundo padrão de ${bg}`} className={`w-full text-center font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50`}>
                                                {isGenerating ? <ButtonSpinner/> : `Gerar Padrão (${bg})`}
                                            </button>
                                            {isColorVaried && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const existingColors = Object.keys(formData.backgroundImages?.[contextKey as 'sala' | 'quarto'] || {});
                                                            const allSofaColorNames = sofaColors.map(c => c.name);
                                                            const missingColors = allSofaColorNames.filter(name => !existingColors.includes(name));
                                                            if (missingColors.length === 0) {
                                                                alert('Todas as cores já foram geradas.');
                                                                return;
                                                            }
                                                            handleGenerateColoredBackgrounds(contextKey as 'sala' | 'quarto', missingColors);
                                                        }}
                                                        disabled={isGeneratingColors || !formData.baseImageUrl}
                                                        title={!apiKey ? noApiKeyTitle : `Gerar múltiplas cores para ${bg}`}
                                                        className={`w-full text-center font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'} disabled:opacity-50`}
                                                    >
                                                        {isGeneratingColors ? <ButtonSpinner /> : 'Gerar Cores'}
                                                    </button>
                                                    {isColorVaried && Object.keys(imagesForContext || {}).length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteConfirmation(contextKey as 'sala' | 'quarto')}
                                                            disabled={isGeneratingColors}
                                                            title={`Excluir imagens de ${bg}`}
                                                            className={`w-full text-center font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/40' : 'bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-50`}
                                                        >
                                                            Excluir Imagens
                                                        </button>
                                                    )}
                                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                        {sofaColors.map(color => {
                                                            const isGenerated = !!(imagesForContext as any)?.[color.name];
                                                            const isCurrentlyGenerating = generatingColor[contextKey as 'sala' | 'quarto'] === color.name;
                                                            return (
                                                                <div
                                                                    key={color.name}
                                                                    title={isGenerated ? `Gerado: ${color.name}` : `Pendente: ${color.name}`}
                                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isGenerated ? 'border-green-500' : (isDark ? 'border-gray-600' : 'border-gray-300')}`}
                                                                    style={{ backgroundColor: color.hex, opacity: isGenerated ? 1 : 0.4 }}
                                                                >
                                                                    {isCurrentlyGenerating && (
                                                                        <div className="w-full h-full rounded-full bg-black/50 flex items-center justify-center">
                                                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                        <h3 className={`text-lg font-bold mb-3 ${titleClasses}`}>Produtos Relacionados (Mesma Família)</h3>
                        {familyProducts.filter(p => p.id !== formData.id).length > 0 ? (
                            <div className="mb-4 space-y-2">
                                {familyProducts.filter(p => p.id !== formData.id).map(p => (
                                    <div key={p.id} className={`p-2 rounded-xl flex items-center justify-between border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 flex items-center justify-center overflow-hidden ${isDark ? 'bg-black/20' : 'bg-gray-200'}`}>
                                                {p.baseImageUrl ? (
                                                    <img src={p.baseImageUrl} alt={p.name} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center relative">
                                                        <img src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" alt="Sem Imagem" className="w-1/2 h-1/2 object-contain opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className={`text-sm font-bold truncate ${titleClasses}`}>{p.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <MultiColorCircle colors={p.colors} />
                                                    <span className={`text-xs font-medium truncate ${subtitleClasses}`}>{p.colors.map(c => c.name).join(', ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitch(p)}
                                            title={`Editar ${p.name}`}
                                            className={`flex-shrink-0 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                                        >
                                            Editar esse
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className={`text-sm mb-3 ${subtitleClasses}`}>Nenhum outro produto encontrado nesta família.</p>
                        )}
                        <div className="flex items-center">
                            <label htmlFor="isBatchColorMode" className={`text-sm font-semibold mr-3 ${labelClasses} ${!canCreateVariations ? 'opacity-50' : ''}`} title={!canCreateVariations ? 'Preencha o nome e a categoria para criar variações.' : ''}>Criar produtos para novas cores?</label>
                            <input type="checkbox" id="isBatchColorMode" checked={isBatchColorMode} onChange={(e) => setIsBatchColorMode(e.target.checked)} className="h-5 w-5 rounded text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canCreateVariations} />
                        </div>
                         {!canCreateVariations && (
                           <p className="text-xs text-amber-500 mt-1">Preencha o nome e a categoria do produto antes de criar variações de cor.</p>
                         )}

                        {isBatchColorMode && canCreateVariations && (
                            <>
                            <ColorSelector
                                allColors={allColors}
                                multiSelect
                                selectedColors={selectedNewColors}
                                onToggleColor={handleToggleNewColor}
                                disabledColors={[...usedColorNamesInFamily, ...(formData.colors?.map(c => c.name) || [])].filter((name): name is string => !!name)}
                                onAddCustomColor={onAddColor}
                                onDeleteColor={onDeleteColor}
                            />
                            <button 
                                type="button" 
                                onClick={handleCreateVariations} 
                                disabled={isCreatingVariations || selectedNewColors.length === 0}
                                className="w-full mt-4 bg-cyan-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-cyan-600/30 hover:bg-cyan-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none"
                            >
                                {isCreatingVariations ? <ButtonSpinner /> : `Criar ${selectedNewColors.length} Variações de Cor`}
                            </button>
                            </>
                        )}
                    </div>

                </div>
                 <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-white/10 mt-auto">
                    <div className="flex items-center gap-4">
                        {product && (
                            <button type="button" onClick={() => onRequestDelete(formData.id)} className="text-red-500 font-bold py-3 px-4 rounded-lg transition hover:bg-red-500/10 flex items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Excluir
                            </button>
                        )}
                         <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>Cancelar</button>
                    </div>
                     <div className="flex items-center gap-4">
                         {saveError && <p className="text-sm text-red-500 font-semibold">{saveError}</p>}
                         <button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </div>
            </form>
        </div>
        {deleteConfirmation && (
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if (deleteConfirmation) {
                        setFormData(prev => {
                            const newBgs = { ...prev.backgroundImages };
                            newBgs[deleteConfirmation] = {}; // Clear the images for the context
                            return { ...prev, backgroundImages: newBgs };
                        });
                        setDeleteConfirmation(null);
                    }
                }}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir todas as imagens geradas para o ambiente "${deleteConfirmation === 'sala' ? 'Sala' : 'Quarto'}"? Você precisará salvar para confirmar.`}
            />
        )}
        {isImagePickerOpen && <ImagePickerModal onSelect={handleImageSelect} onClose={() => setIsImagePickerOpen(false)} onTakePhoto={handleTakePhoto} />}
        {isCameraOpen && <CameraView onCapture={handleImageSelect} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};

export default AddEditProductModal;