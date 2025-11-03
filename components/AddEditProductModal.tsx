import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Product, StoreName, Variation, CushionSize, Brand, WaterResistanceLevel, DynamicBrand, ThemeContext } from '../types';
import { VARIATION_DEFAULTS, BRAND_FABRIC_MAP, STORE_NAMES, BRANDS, WATER_RESISTANCE_INFO, PREDEFINED_COLORS } from '../constants';
import { GoogleGenAI, Modality } from '@google/genai';
import ColorSelector from './ColorSelector';

// --- Cordova/TypeScript Declarations ---
declare var navigator: any;
declare var Camera: any;


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
  brands: DynamicBrand[];
}

const defaultFabricInfo = BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA];
const defaultFabricType = Object.keys(defaultFabricInfo)[0];
const initialFormState: Omit<Product, 'id'> = {
  name: '',
  baseImageUrl: '',
  unitsSold: 0,
  category: '',
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


const pluralizeCategory = (category: string): string => {
    const trimmed = category.trim();
    if (!trimmed) return '';
    
    // Capitalize first letter
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


const AddEditProductModal: React.FC<AddEditProductModalProps> = ({ product, products, onClose, onSave, onCreateVariations, onSwitchProduct, onRequestDelete, categories, apiKey, onRequestApiKey, allColors, onAddColor, brands }) => {
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
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);

  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const noApiKeyTitle = "Adicionar chave de API da Gemini para usar IA";
  
  const allBrandNames = useMemo(() => {
    const dynamicNames = brands.map(b => b.name);
    const staticNames = Object.values(Brand);
    return [...new Set([...dynamicNames, ...staticNames])];
  }, [brands]);

  const familyProducts = useMemo(() => {
    if (!formData.category || !formData.fabricType || !formData.brand) return [];
    return products.filter(p => 
        p.category === formData.category &&
        p.fabricType === formData.fabricType &&
        p.brand === formData.brand
    );
  }, [products, formData.category, formData.fabricType, formData.brand]);

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
    setFormData({ 
        ...initialFormState, 
        ...product, 
        backgroundImages: product.backgroundImages || {},
        colors: product.colors && product.colors.length > 0 ? product.colors : initialFormState.colors,
    });
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
    setIsBatchColorMode(false);
    setSelectedNewColors([]);
    setImageRotation(0);
    setIsCategoryVisible(false);
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
        window.alert("Primeiro, adicione uma imagem base para o produto."); 
        return; 
    }
    setAiGenerating(prev => ({ ...prev, [variation.size]: true }));
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: getAiPromptForSize(variation.size) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const candidate = aiResponse.candidates?.[0];
        if (!candidate || !candidate.content?.parts?.find(p => p.inlineData)) {
            throw new Error('A IA não retornou uma imagem válida.');
        }
       
        const generatedImagePart = candidate.content.parts.find(p => p.inlineData);
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
        window.alert("Aconteceu um erro! Mas não se preocupe, tente novamente agora");
    } 
    finally { setAiGenerating(prev => ({ ...prev, [variation.size]: false })); }
  };

  const generateShowcaseImage = async () => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.baseImageUrl) { 
        window.alert("Adicione uma imagem antes de gerar uma vitrine."); 
        return; 
    }
    
    setIsGeneratingShowcase(true);
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: 'Foto de produto para catálogo, close-up de uma única almofada quadrada. A almofada está perfeitamente centralizada, vista de frente, preenchendo cerca de 80% do quadro. Fundo branco liso com uma sombra suave projetada pela almofada no chão, criando profundidade. Iluminação de estúdio profissional que destaca a textura do tecido e cria uma sombra natural e suave. A imagem deve ser limpa, realista e com qualidade de estúdio.' };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const imagePartResponse = aiResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePartResponse?.inlineData) {
            throw new Error("A IA não retornou uma imagem válida.");
        }

        const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
        const resizedImageUrl = await resizeImage(newImageUrl);
        setFormData(prev => ({ ...prev, baseImageUrl: resizedImageUrl }));
    } catch (error: any) { 
        console.error("AI showcase image generation failed:", error); 
        window.alert("Aconteceu um erro! Mas não se preocupe, tente novamente agora");
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
        window.alert("Primeiro, adicione uma imagem base para o produto."); 
        return; 
    }
    const contextKey = background.toLowerCase() as 'quarto' | 'sala' | 'varanda' | 'piscina';
    setBgGenerating(prev => ({ ...prev, [contextKey]: true }));
    try {
        const { base64Data, mimeType } = await getBase64FromImageUrl(formData.baseImageUrl);
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: getPromptForBackground(background) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        
        const imagePartResponse = aiResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePartResponse?.inlineData) {
            throw new Error(`A IA não retornou uma imagem válida para ${background}.`);
        }

        const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
        const resizedImageUrl = await resizeImage(newImageUrl);
        setFormData(prev => ({ ...prev, backgroundImages: { ...prev.backgroundImages, [contextKey]: resizedImageUrl } }));
    } catch (error: any) { 
        console.error(`AI background generation for ${background} failed:`, error); 
        window.alert("Aconteceu um erro! Mas não se preocupe, tente novamente agora");
    } 
    finally { setBgGenerating(prev => ({ ...prev, [contextKey]: false })); }
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
        window.alert("Aconteceu um erro! Mas não se preocupe, tente novamente agora");
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

        productToSave.category = pluralizeCategory(productToSave.category);
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
            <form onSubmit={handleSubmit} className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-