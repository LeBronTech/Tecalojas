import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Product, StoreName, Variation, CushionSize, Brand, WaterResistanceLevel, ColorVariation } from '../types';
import { IMAGE_BANK_URLS, VARIATION_DEFAULTS, BRAND_FABRIC_MAP, STORE_NAMES, BRANDS, WATER_RESISTANCE_INFO, PREDEFINED_COLORS } from '../constants';
import { ThemeContext } from '../App';
import { GoogleGenAI, Modality } from '@google/genai';

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

  const modalBgClasses = isDark ? "bg-[#2D1F49] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-gray-800/50" : "text-gray-500 hover:text-gray-800 bg-gray-100/50";


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
        </div>

        <div>
            <h3 className={`text-sm font-bold mb-3 uppercase tracking-wider ${subtitleClasses}`}>Banco de Imagens</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2">
                {IMAGE_BANK_URLS.map(url => (
                    <button key={url} onClick={() => onSelect(url)} className="aspect-square rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 transition-transform hover:scale-105">
                        <img src={url} alt="Imagem do banco" className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};


// --- Main AddEditProductModal Component ---

interface AddEditProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
  categories: string[];
  apiKey: string | null;
  onRequestApiKey: () => void;
  customColors: { name: string; hex: string }[];
  onAddCustomColor: (color: { name: string; hex: string }) => void;
}

const defaultFabricInfo = BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA];
const defaultFabricType = Object.keys(defaultFabricInfo)[0];
const initialFormState: Product = {
  id: '',
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
  mainColor: { name: 'Branco', hex: '#FFFFFF' },
  hasColorVariations: false,
  colorVariations: [],
};

const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const FormInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    const inputClasses = isDark 
        ? "bg-black/20 text-white border-white/10" 
        : "bg-gray-100 text-gray-900 border-gray-300";

    return (
        <div>
            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>{label}</label>
            <input 
                {...props}
                className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} 
            />
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


const AddEditProductModal: React.FC<AddEditProductModalProps> = ({ product, onClose, onSave, categories, apiKey, onRequestApiKey, customColors, onAddCustomColor }) => {
  const [formData, setFormData] = useState<Product>(initialFormState);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<{type: 'base' | 'color', index?: number} | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<Record<string, boolean>>({});
  const [variationsAiError, setVariationsAiError] = useState<string | null>(null);
  const [isGeneratingShowcase, setIsGeneratingShowcase] = useState(false);
  const [showcaseAiError, setShowcaseAiError] = useState<string | null>(null);
  const [addVariationSize, setAddVariationSize] = useState<CushionSize | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bgGenerating, setBgGenerating] = useState<Record<string, boolean>>({});
  const [bgGenError, setBgGenError] = useState<string | null>(null);
  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const [aiGeneratingColor, setAiGeneratingColor] = useState<Record<number, boolean>>({});
  const [primaryColorIndex, setPrimaryColorIndex] = useState(-1);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'main' | 'variation' | null>(null);


  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const noApiKeyTitle = "Adicionar chave de API da Gemini para usar IA";

  const allColors = [...PREDEFINED_COLORS, ...customColors].filter(
    (color, index, self) => index === self.findIndex((c) => c.name === color.name)
  );

  useEffect(() => {
    if (product) {
      const initialData = { 
        ...initialFormState, 
        ...product, 
        backgroundImages: product.backgroundImages || {},
        mainColor: product.mainColor || initialFormState.mainColor,
        hasColorVariations: product.hasColorVariations || false,
        colorVariations: product.colorVariations || [],
      };
      setFormData(initialData);

      if (initialData.hasColorVariations && initialData.colorVariations.length > 0) {
        const primaryIndex = initialData.colorVariations.findIndex(cv => cv.imageUrl === initialData.baseImageUrl);
        setPrimaryColorIndex(primaryIndex);
      } else {
        setPrimaryColorIndex(-1);
      }

    } else {
      setFormData(initialFormState);
      setPrimaryColorIndex(-1);
    }
  }, [product]);

  const handleSetPrimaryColor = (index: number) => {
    const selectedColorImageUrl = formData.colorVariations?.[index]?.imageUrl;
    if (selectedColorImageUrl) {
        setPrimaryColorIndex(index);
        setFormData(prev => ({
            ...prev,
            baseImageUrl: selectedColorImageUrl,
        }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => {
            const newState = { ...prev, [name]: checked };
            if (name === 'hasColorVariations' && !checked) {
                newState.colorVariations = [];
            }
            return newState;
        });
        return;
    }

    const parsedValue = type === 'number' ? parseInt(value, 10) || 0 : value;

    setFormData(prev => {
        let newState = { ...prev, [name]: parsedValue };
        let finalBrand = newState.brand;
        let finalFabricType = newState.fabricType;
        if (name === 'brand') {
            const newBrand = parsedValue as Brand;
            finalBrand = newBrand;
            const fabricInfo = BRAND_FABRIC_MAP[newBrand];
            const availableTypes = Object.keys(fabricInfo);
            const newFabricType = availableTypes[0];
            finalFabricType = newFabricType;
            newState.fabricType = newFabricType;
            newState.description = fabricInfo[newFabricType] || '';
        } else if (name === 'fabricType') {
            const newFabricType = parsedValue as string;
            finalFabricType = newFabricType;
            const fabricInfo = BRAND_FABRIC_MAP[newState.brand];
            newState.description = fabricInfo[newFabricType] || '';
        }
        if (name === 'brand' || name === 'fabricType') {
            if (finalBrand === Brand.KARSTEN) {
                newState.waterResistance = WaterResistanceLevel.FULL;
            } else if (finalBrand === Brand.DOLHER && finalFabricType === 'Waterhavana') {
                newState.waterResistance = WaterResistanceLevel.FULL;
            } else {
                newState.waterResistance = WaterResistanceLevel.NONE;
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

  const handleOpenImagePicker = (type: 'base' | 'color', index?: number) => {
    setImagePickerTarget({ type, index });
    setIsImagePickerOpen(true);
  };

  const handleImageSelect = async (imageUrl: string) => {
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image')) {
        try { finalImageUrl = await resizeImage(imageUrl); } 
        catch (error) { console.error("Failed to resize image:", error); }
    }
    
    if (imagePickerTarget?.type === 'base') {
        setFormData(prev => ({ ...prev, baseImageUrl: finalImageUrl }));
    } else if (imagePickerTarget?.type === 'color' && imagePickerTarget.index !== undefined) {
        const index = imagePickerTarget.index;
        setFormData(prev => {
            const newColorVariations = [...(prev.colorVariations || [])];
            newColorVariations[index].imageUrl = finalImageUrl;
            return { ...prev, colorVariations: newColorVariations };
        });
    }

    setIsImagePickerOpen(false);
    setIsCameraOpen(false);
    setImagePickerTarget(null);
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
  
  const handleRemoveVariation = (index: number) => {
     setFormData(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== index)}));
  };

  const getAiPromptForSize = (size: CushionSize): string => {
    switch (size) {
        case CushionSize.SQUARE_60: return 'Gere uma imagem fotorrealista de uma sala de estar moderna e bem iluminada. Coloque esta almofada, que é um modelo grande e cheio de 60x60, no chão, encostada elegantemente no pé de uma poltrona. A imagem deve parecer uma foto de catálogo, enfatizando a textura da almofada e, mais importante, mantendo uma perspectiva e escala realistas para que o tamanho grande da almofada seja claramente visível em relação à poltrona.';
        case CushionSize.LUMBAR: return 'Gere uma imagem fotorrealista de uma poltrona aconchegante em uma sala de estar bem iluminada. Coloque esta almofada lombar, que é um travesseiro pequeno e retangular, sobre a poltrona. A imagem deve ser como uma foto de catálogo de produtos, destacando a textura da almofada e mantendo uma perspectiva e escala realistas para mostrar seu tamanho pequeno e formato retangular em relação à poltrona.';
        default: return `Gere uma imagem fotorrealista de uma poltrona moderna em uma sala de estar bem iluminada. Coloque esta almofada sobre a poltrona. A imagem deve ter a qualidade de uma foto de catálogo, com foco na textura do tecido e mantendo uma perspectiva e escala realistas da almofada em relação à poltrona.`;
    }
  };

  const handleGenerateVariationImage = async (index: number) => {
    if (!apiKey) { onRequestApiKey(); return; }
    const variation = formData.variations[index];
    if (!formData.baseImageUrl) { setVariationsAiError("Primeiro, adicione uma imagem base para o produto."); return; }
    setAiGenerating(prev => ({ ...prev, [variation.size]: true }));
    setVariationsAiError(null);
    try {
        const response = await fetch(formData.baseImageUrl);
        if (!response.ok) throw new Error('Falha ao buscar a imagem base.');
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType: blob.type } };
        const textPart = { text: getAiPromptForSize(variation.size) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        const candidate = aiResponse.candidates?.[0];
        const generatedImagePart = candidate?.content?.parts?.find(p => p.inlineData);
        if (generatedImagePart?.inlineData) {
            const newImageUrl = `data:${generatedImagePart.inlineData.mimeType};base64,${generatedImagePart.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);
            const updatedVariations = [...formData.variations];
            updatedVariations[index].imageUrl = resizedImageUrl;
            setFormData(prev => ({ ...prev, variations: updatedVariations }));
        } else { throw new Error(`A IA não retornou uma imagem válida para o tamanho ${variation.size}.`); }
    } catch (error: any) { console.error("AI image generation failed:", error); setVariationsAiError(error.message || "Falha ao gerar imagem com IA."); } 
    finally { setAiGenerating(prev => ({ ...prev, [variation.size]: false })); }
  };

  const generateShowcaseImage = async (sourceImageUrl: string, isColorVariation: boolean, index?: number) => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!sourceImageUrl) { setShowcaseAiError("Adicione uma imagem antes de gerar uma vitrine."); return; }
    
    if (isColorVariation && index !== undefined) { setAiGeneratingColor(prev => ({ ...prev, [index]: true })); } 
    else { setIsGeneratingShowcase(true); }
    setShowcaseAiError(null);

    try {
        const response = await fetch(sourceImageUrl);
        if (!response.ok) throw new Error('Falha ao buscar a imagem base.');
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType: blob.type } };
        const textPart = { text: 'Crie uma imagem de vitrine de alta qualidade para esta almofada, colocando-a sobre um fundo branco liso. A imagem deve ter qualidade de estúdio, com foco total na textura e design do produto, sem distrações.' };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        const candidate = aiResponse.candidates?.[0];
        const imagePartResponse = candidate?.content?.parts?.find(p => p.inlineData);
        if (imagePartResponse?.inlineData) {
            const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);
            if (isColorVariation && index !== undefined) {
                setFormData(prev => {
                    const newColorVariations = [...(prev.colorVariations || [])];
                    newColorVariations[index].imageUrl = resizedImageUrl;
                    return { ...prev, colorVariations: newColorVariations };
                });
            } else {
                setFormData(prev => ({ ...prev, baseImageUrl: resizedImageUrl }));
            }
        } else { throw new Error("A IA não retornou uma imagem válida."); }
    } catch (error: any) { console.error("AI showcase image generation failed:", error); setShowcaseAiError(error.message || "Falha ao gerar imagem de vitrine com IA."); } 
    finally {
        if (isColorVariation && index !== undefined) { setAiGeneratingColor(prev => ({ ...prev, [index]: false })); }
        else { setIsGeneratingShowcase(false); }
    }
  };
  
  const getPromptForBackground = (background: 'Quarto' | 'Sala' | 'Varanda'): string => {
      const prompts = { 'Quarto': 'Coloque esta almofada sobre uma cama bem arrumada em um quarto aconchegante e bem iluminado. O estilo deve ser moderno e convidativo. Qualidade de foto profissional.', 'Sala': 'Coloque esta almofada em um sofá moderno em uma sala de estar elegante com luz natural. O estilo deve ser clean e sofisticado. Qualidade de foto profissional.', 'Varanda': 'Coloque esta almofada em uma confortável cadeira de exterior em uma varanda bonita com algumas plantas verdes ao fundo. A cena deve ser clara e relaxante. Qualidade de foto profissional.' };
      return prompts[background];
  };
  
  const handleGenerateBackgroundImage = async (background: 'Quarto' | 'Sala' | 'Varanda') => {
    if (!apiKey) { onRequestApiKey(); return; }
    if (!formData.baseImageUrl) { setBgGenError("Primeiro, adicione uma imagem base para o produto."); return; }
    const contextKey = background.toLowerCase() as 'quarto' | 'sala' | 'varanda';
    setBgGenerating(prev => ({ ...prev, [contextKey]: true }));
    setBgGenError(null);
    try {
        const response = await fetch(formData.baseImageUrl);
        if (!response.ok) throw new Error('Falha ao buscar a imagem base.');
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const ai = new GoogleGenAI({ apiKey });
        const imagePart = { inlineData: { data: base64Data, mimeType: blob.type } };
        const textPart = { text: getPromptForBackground(background) };
        const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
        const candidate = aiResponse.candidates?.[0];
        const imagePartResponse = candidate?.content?.parts?.find(p => p.inlineData);
        if (imagePartResponse?.inlineData) {
            const newImageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${imagePartResponse.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);
            setFormData(prev => ({ ...prev, backgroundImages: { ...prev.backgroundImages, [contextKey]: resizedImageUrl } }));
        } else { throw new Error(`A IA não retornou uma imagem válida para ${background}.`); }
    } catch (error: any) { console.error(`AI background generation for ${background} failed:`, error); setBgGenError(error.message || `Falha ao gerar fundo para ${background}.`); } 
    finally { setBgGenerating(prev => ({ ...prev, [contextKey]: false })); }
  };

  const handleSelectColor = (color: { name: string; hex: string }) => {
    if (colorPickerTarget === 'main') {
        setFormData(prev => ({ ...prev, mainColor: color }));
    } else { // 'variation'
        if (formData.colorVariations && formData.colorVariations.some(c => c.name === color.name)) return;
        const newColorVariation: ColorVariation = { ...color, imageUrl: '' };
        setFormData(prev => ({ ...prev, colorVariations: [...(prev.colorVariations || []), newColorVariation]}));
    }
    setIsColorPickerOpen(false);
  };

  const handleAddNewColor = () => {
    if (newColor.name.trim() && !allColors.some(c => c.name === newColor.name.trim())) {
      onAddCustomColor(newColor);
      handleSelectColor(newColor);
      setNewColor({ name: '', hex: '#ffffff' });
    }
  };

  const handleRemoveColorVariation = (index: number) => {
    setFormData(prev => ({ ...prev, colorVariations: (prev.colorVariations || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try { await onSave(formData); } 
    catch (error: any) { console.error("Failed to save product:", error); setSaveError(error.message || "Ocorreu um erro desconhecido ao salvar."); } 
    finally { setIsSaving(false); }
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

  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
  const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
  const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200";
  const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
  
  const availableFabricTypes = Object.keys(BRAND_FABRIC_MAP[formData.brand] || {});

  const renderColorPicker = () => (
    <div className={`p-4 rounded-xl border ${cardClasses}`}>
        <div className="flex justify-between items-center mb-3">
            <h4 className={`font-bold ${titleClasses}`}>Selecione uma Cor</h4>
            <button type="button" onClick={() => setIsColorPickerOpen(false)} className={closeBtnClasses + " rounded-full p-1"}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {allColors.map(color => (
                <button type="button" key={color.name} onClick={() => handleSelectColor(color)} style={{ backgroundColor: color.hex }} className={`w-8 h-8 rounded-full border-2 ${isDark ? 'border-gray-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-fuchsia-500`} title={color.name}></button>
            ))}
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


  return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-40 p-4 transition-opacity duration-300" onClick={onClose}>
            <form onSubmit={handleSubmit} className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                <style>{` @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } } .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; } `}</style>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${titleClasses}`}>{product ? 'Editar Produto' : 'Adicionar Produto'}</h2>
                    <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar pr-2 -mr-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Nome do Produto" name="name" value={formData.name} onChange={handleChange} required />
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                            <input list="categories-list" name="category" value={formData.category} onChange={handleChange} required className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                            <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className={`w-32 h-32 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>
                            {formData.baseImageUrl ? <img src={formData.baseImageUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className={`text-xs text-center ${labelClasses}`}>Sem Imagem</span> }
                        </div>
                        <div className="flex-grow">
                             <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Imagem Principal</label>
                            <button type="button" onClick={() => handleOpenImagePicker('base')} disabled={formData.hasColorVariations} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>Alterar Imagem</button>
                            {formData.hasColorVariations && <p className={`text-xs mt-1 ${subtitleClasses}`}>A imagem principal é definida a partir de uma variação de cor.</p>}
                            <button type="button" onClick={() => generateShowcaseImage(formData.baseImageUrl, false)} disabled={isGeneratingShowcase || !formData.baseImageUrl || formData.hasColorVariations} title={!apiKey ? noApiKeyTitle : "Gerar imagem de vitrine com IA"} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                {isGeneratingShowcase ? <ButtonSpinner /> : 'Gerar Vitrine com IA'}
                            </button>
                            {showcaseAiError && <p className="text-xs text-red-500 mt-1">{showcaseAiError}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                            <select name="brand" value={formData.brand} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select>
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
                    
                    {/* Main Color */}
                     <div>
                        <h3 className={`text-lg font-bold mb-2 ${titleClasses}`}>Cor Principal</h3>
                        {isColorPickerOpen && colorPickerTarget === 'main' ? renderColorPicker() : (
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${cardClasses}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: formData.mainColor?.hex, borderColor: isDark ? '#fff' : '#000' }}></div>
                                    <span className={`font-semibold ${titleClasses}`}>{formData.mainColor?.name}</span>
                                </div>
                                <button type="button" onClick={() => { setColorPickerTarget('main'); setIsColorPickerOpen(true); }} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                    Selecionar Cor
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Color Variations */}
                    <div>
                        <h3 className={`text-lg font-bold mb-3 ${titleClasses}`}>Variações de Cor (com Imagem)</h3>
                        <div className="flex items-center">
                            <label htmlFor="hasColorVariations" className={`text-sm font-semibold mr-3 ${labelClasses}`}>Este produto possui outras variações de cor com imagem?</label>
                            <input type="checkbox" id="hasColorVariations" name="hasColorVariations" checked={!!formData.hasColorVariations} onChange={handleChange} className="h-5 w-5 rounded text-fuchsia-600 focus:ring-fuchsia-500" />
                        </div>
                        {formData.hasColorVariations && (
                            <div className={`p-4 mt-3 rounded-xl border ${cardClasses}`}>
                                {isColorPickerOpen && colorPickerTarget === 'variation' ? renderColorPicker() : (
                                    <button type="button" onClick={() => { setColorPickerTarget('variation'); setIsColorPickerOpen(true); }} className={`w-full font-bold py-3 px-4 rounded-lg mb-3 flex items-center justify-center gap-2 transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="url(#paint0_radial_0_1)"/><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="url(#paint1_linear_0_1)"/><defs><radialGradient id="paint0_radial_0_1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12) rotate(90) scale(12)"><stop stopColor="#FF0000"/><stop offset="0.16" stopColor="#FF7A00"/><stop offset="0.33" stopColor="#FFD600"/><stop offset="0.5" stopColor="#00FF00"/><stop offset="0.66" stopColor="#00FFFF"/><stop offset="0.83" stopColor="#0000FF"/><stop offset="1" stopColor="#FF00FF"/></radialGradient><linearGradient id="paint1_linear_0_1" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0.4"/><stop offset="1" stopColor="white" stopOpacity="0.1"/></linearGradient></defs></svg>
                                        Adicionar Variação de Cor
                                    </button>
                                )}

                                <div className="space-y-3 mt-4">
                                    {(formData.colorVariations || []).map((colorVar, i) => (
                                        <div key={i} className={`p-3 rounded-lg border transition-all ${isDark ? 'bg-black/30 border-white/20' : 'bg-white border-gray-300'} ${primaryColorIndex === i ? 'ring-2 ring-fuchsia-500' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: colorVar.hex, borderColor: isDark ? '#fff' : '#000' }}></div>
                                                    <span className={`font-semibold ${titleClasses}`}>{colorVar.name}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveColorVariation(i)} className="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                 <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-100'}`}>
                                                    {colorVar.imageUrl ? <img src={colorVar.imageUrl} alt={colorVar.name} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center">Sem Imagem</span>}
                                                 </div>
                                                 <div className="flex-grow space-y-2">
                                                    <button type="button" onClick={() => handleOpenImagePicker('color', i)} className={`w-full text-center font-bold py-2 px-2 rounded-lg text-xs transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Upar Imagem</button>
                                                    <button type="button" onClick={() => generateShowcaseImage(colorVar.imageUrl, true, i)} disabled={!colorVar.imageUrl || aiGeneratingColor[i]} title={!apiKey ? noApiKeyTitle : "Gerar vitrine para esta cor"} className={`w-full flex items-center justify-center gap-2 text-center font-bold py-2 px-2 rounded-lg text-xs transition-colors ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} disabled:opacity-50`}>
                                                        {aiGeneratingColor[i] ? <ButtonSpinner /> : 'Gerar Vitrine IA'}
                                                    </button>
                                                 </div>
                                            </div>
                                             <button type="button" onClick={() => handleSetPrimaryColor(i)} disabled={!colorVar.imageUrl} className={`w-full mt-2 text-center font-bold py-2 rounded-lg text-xs transition-colors ${primaryColorIndex === i ? 'bg-green-600 text-white cursor-default' : (isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')} disabled:opacity-50`}>
                                                {primaryColorIndex === i ? 'Principal' : 'Definir como Principal'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Size Variations */}
                    <div>
                        <h3 className={`text-lg font-bold mb-3 ${titleClasses}`}>Variações de Tamanho e Estoque</h3>
                        <div className="space-y-3">{formData.variations.map((v, i) => (<div key={i} className={`p-4 rounded-xl border ${cardClasses}`}><div className="flex justify-between items-center mb-3"><h4 className="font-bold text-fuchsia-400">{v.size}</h4><button type="button" onClick={() => handleRemoveVariation(i)} className="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div><div className="grid grid-cols-2 gap-4"><div><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Capa)</label><input type="number" value={v.priceCover} onChange={e => handleVariationChange(i, 'priceCover', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/></div><div><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Cheia)</label><input type="number" value={v.priceFull} onChange={e => handleVariationChange(i, 'priceFull', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/></div>{STORE_NAMES.map(storeName => (<div key={storeName}><label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Estoque ({storeName})</label><input type="number" value={v.stock[storeName]} onChange={e => handleVariationChange(i, `stock-${storeName}`, e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`} /></div>))}</div><div className="mt-3 flex items-center gap-4"><div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-white'}`}>{v.imageUrl ? <img src={v.imageUrl} alt="Var" className="w-full h-full object-cover"/> : <span className="text-xs text-gray-400">Sem IA</span>}</div><button type="button" disabled={aiGenerating[v.size] || !formData.baseImageUrl} onClick={() => handleGenerateVariationImage(i)} title={!apiKey ? noApiKeyTitle : `Gerar imagem para variação ${v.size}`} className={`w-full flex items-center justify-center gap-2 text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'} disabled:opacity-50`}>{aiGenerating[v.size] ? <ButtonSpinner /> : 'Gerar Imagem IA'}</button></div></div>))}</div>
                        {variationsAiError && <p className="text-xs text-red-500 mt-2">{variationsAiError}</p>}
                        <div className={`flex gap-2 mt-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                             <select value={addVariationSize} onChange={e => setAddVariationSize(e.target.value as CushionSize)} className={`flex-grow border-2 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}><option value="" disabled>Selecione um tamanho</option>{Object.values(CushionSize).map(size => (<option key={size} value={size} disabled={formData.variations.some(v => v.size === size)}>{size}</option>))}</select>
                            <button type="button" onClick={handleAddVariation} className="bg-fuchsia-600 text-white font-bold p-3 rounded-lg hover:bg-fuchsia-700 transition-transform transform hover:scale-105"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
                        </div>
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold mb-3 ${titleClasses}`}>Fundos de Vitrine (IA)</h3>
                        <p className={`text-sm mb-3 ${subtitleClasses}`}>Gere imagens do produto em diferentes ambientes. Estas imagens serão salvas e exibidas na vitrine.</p>
                        {bgGenError && <p className="text-xs text-red-500 mb-2">{bgGenError}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{(['Sala', 'Quarto', 'Varanda'] as const).map(bg => { const contextKey = bg.toLowerCase() as 'sala' | 'quarto' | 'varanda'; const imageUrl = formData.backgroundImages?.[contextKey]; const isGenerating = bgGenerating[contextKey]; return (<div key={bg} className="flex flex-col items-center"><div className={`w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden border-2 mb-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>{isGenerating ? (<ButtonSpinner />) : imageUrl ? (<img src={imageUrl} alt={`Fundo de ${bg}`} className="w-full h-full object-cover" />) : (<span className={`text-xs text-center ${labelClasses}`}>Sem Imagem</span>)}</div><button type="button" onClick={() => handleGenerateBackgroundImage(bg)} disabled={isGenerating || !formData.baseImageUrl} title={!apiKey ? noApiKeyTitle : `Gerar fundo de ${bg}`} className={`w-full text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50`}>{isGenerating ? <ButtonSpinner/> : `Gerar ${bg}`}</button></div>);})}</div>
                    </div>
                </div>
                <div className="flex justify-end items-center pt-6 gap-4 border-t border-gray-200 dark:border-white/10 mt-6">{saveError && <p className="text-sm text-red-500 font-semibold flex-grow">{saveError}</p>}<button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>Cancelar</button><button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100">{isSaving ? 'Salvando...' : 'Salvar'}</button></div>
            </form>
        </div>
        {isImagePickerOpen && <ImagePickerModal onSelect={handleImageSelect} onClose={() => setIsImagePickerOpen(false)} onTakePhoto={handleTakePhoto} />}
        {isCameraOpen && <CameraView onCapture={handleImageSelect} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};

export default AddEditProductModal;
