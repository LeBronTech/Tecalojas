import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Product, StoreName, Variation, CushionSize, Brand, WaterResistanceLevel } from '../types';
import { IMAGE_BANK_URLS, VARIATION_DEFAULTS, BRAND_FABRIC_MAP, STORE_NAMES, BRANDS, WATER_RESISTANCE_INFO } from '../constants';
import { ThemeContext } from '../App';
import { GoogleGenAI, Modality } from '@google/genai';

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
};

const Spinner = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
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
            
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (error) => {
            reject(error);
        };
    });
};


const AddEditProductModal: React.FC<AddEditProductModalProps> = ({ product, onClose, onSave, categories }) => {
  const [formData, setFormData] = useState<Product>(initialFormState);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<Record<string, boolean>>({});
  const [variationsAiError, setVariationsAiError] = useState<string | null>(null);
  const [isGeneratingShowcase, setIsGeneratingShowcase] = useState(false);
  const [showcaseAiError, setShowcaseAiError] = useState<string | null>(null);
  const [addVariationSize, setAddVariationSize] = useState<CushionSize | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData(initialFormState);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseInt(value, 10) || 0 : value;

    setFormData(prev => {
        // Start with the basic state update
        let newState = { ...prev, [name]: parsedValue };

        // --- Handle dependent fields ---

        let finalBrand = newState.brand;
        let finalFabricType = newState.fabricType;

        // 1. If BRAND changed, update fabric type and description
        if (name === 'brand') {
            const newBrand = parsedValue as Brand;
            finalBrand = newBrand; // update for water resistance check
            const fabricInfo = BRAND_FABRIC_MAP[newBrand];
            const availableTypes = Object.keys(fabricInfo);
            
            // Reset fabric to the first of the new brand
            const newFabricType = availableTypes[0];
            finalFabricType = newFabricType; // update for water resistance check

            newState.fabricType = newFabricType;
            newState.description = fabricInfo[newFabricType] || '';
        }
        
        // 2. If FABRIC TYPE changed, just update description
        else if (name === 'fabricType') {
            const newFabricType = parsedValue as string;
            finalFabricType = newFabricType; // update for water resistance check
            const fabricInfo = BRAND_FABRIC_MAP[newState.brand];
            newState.description = fabricInfo[newFabricType] || '';
        }

        // 3. If BRAND or FABRIC TYPE changed, update water resistance
        if (name === 'brand' || name === 'fabricType') {
            if (finalBrand === Brand.KARSTEN) {
                newState.waterResistance = WaterResistanceLevel.FULL;
            } else if (finalBrand === Brand.DOLHER && finalFabricType === 'Waterhavana') {
                newState.waterResistance = WaterResistanceLevel.FULL;
            } else {
                // For any other combination, reset to None.
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
      variation.stock = {
        ...variation.stock,
        [store]: parseInt(value) || 0,
      };
    }
    
    updatedVariations[index] = variation;
    setFormData(prev => ({ ...prev, variations: updatedVariations }));
  };

  const handleImageSelect = async (imageUrl: string) => {
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:image')) {
        try {
            finalImageUrl = await resizeImage(imageUrl);
        } catch (error) {
            console.error("Failed to resize image:", error);
        }
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
      stock: {
        [StoreName.TECA]: 0,
        [StoreName.IONE]: 0,
      },
    };
    
    setFormData(prev => ({ ...prev, variations: [...prev.variations, newVariation]}));
    setAddVariationSize('');
  };
  
  const handleRemoveVariation = (index: number) => {
     setFormData(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== index)}));
  };

  const getAiPromptForSize = (size: CushionSize): string => {
    switch (size) {
        case CushionSize.SQUARE_60:
            return 'Gere uma imagem fotorrealista de uma sala de estar moderna e bem iluminada. Coloque esta almofada, que é um modelo grande e cheio de 60x60, no chão, encostada elegantemente no pé de uma poltrona. A imagem deve parecer uma foto de catálogo, enfatizando a textura da almofada e, mais importante, mantendo uma perspectiva e escala realistas para que o tamanho grande da almofada seja claramente visível em relação à poltrona.';
        case CushionSize.LUMBAR:
            return 'Gere uma imagem fotorrealista de uma poltrona aconchegante em uma sala de estar bem iluminada. Coloque esta almofada lombar, que é um travesseiro pequeno e retangular, sobre a poltrona. A imagem deve ser como uma foto de catálogo de produtos, destacando a textura da almofada e mantendo uma perspectiva e escala realistas para mostrar seu tamanho pequeno e formato retangular em relação à poltrona.';
        default: // SQUARE_40, SQUARE_45, SQUARE_50
            return `Gere uma imagem fotorrealista de uma poltrona moderna em uma sala de estar bem iluminada. Coloque esta almofada sobre a poltrona. A imagem deve ter a qualidade de uma foto de catálogo, com foco na textura do tecido e mantendo uma perspectiva e escala realistas da almofada em relação à poltrona.`;
    }
  };

  const handleGenerateVariationImage = async (index: number) => {
    const variation = formData.variations[index];
    if (!formData.baseImageUrl) {
        setVariationsAiError("Primeiro, adicione uma imagem base para o produto.");
        return;
    }

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

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = { inlineData: { data: base64Data, mimeType: blob.type } };
        const textPart = { text: getAiPromptForSize(variation.size) };

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const firstPart = aiResponse.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.inlineData) {
            const newImageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);
            const updatedVariations = [...formData.variations];
            updatedVariations[index].imageUrl = resizedImageUrl;
            setFormData(prev => ({ ...prev, variations: updatedVariations }));
        } else {
            throw new Error(`A IA não retornou uma imagem válida para o tamanho ${variation.size}.`);
        }
    } catch (error: any) {
        console.error("AI image generation failed:", error);
        setVariationsAiError(error.message || "Falha ao gerar imagem com IA.");
    } finally {
        setAiGenerating(prev => ({ ...prev, [variation.size]: false }));
    }
  };

  const generateShowcaseImage = async () => {
    if (!formData.baseImageUrl) {
        setShowcaseAiError("Adicione uma imagem base antes de gerar uma vitrine.");
        return;
    }
    setIsGeneratingShowcase(true);
    setShowcaseAiError(null);

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

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = { inlineData: { data: base64Data, mimeType: blob.type } };
        const textPart = { text: 'Crie uma imagem de vitrine de alta qualidade para esta almofada, colocando-a sobre um fundo branco liso. A imagem deve ter qualidade de estúdio, com foco total na textura e design do produto, sem distrações.' };

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const firstPart = aiResponse.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.inlineData) {
            const newImageUrl = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
            const resizedImageUrl = await resizeImage(newImageUrl);
            setFormData(prev => ({ ...prev, baseImageUrl: resizedImageUrl }));
        } else {
            throw new Error("A IA não retornou uma imagem válida.");
        }
    } catch (error: any) {
        console.error("AI showcase image generation failed:", error);
        setShowcaseAiError(error.message || "Falha ao gerar imagem de vitrine com IA.");
    } finally {
        setIsGeneratingShowcase(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
        await onSave(formData);
    } catch (error: any) {
        console.error("Failed to save product:", error);
        setSaveError(error.message || "Ocorreu um erro desconhecido ao salvar.");
    } finally {
        setIsSaving(false);
    }
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

  return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-40 p-4 transition-opacity duration-300" onClick={onClose}>
            <form 
                onSubmit={handleSubmit}
                className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>

                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${titleClasses}`}>{product ? 'Editar Produto' : 'Adicionar Produto'}</h2>
                    <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar pr-2 -mr-2 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput label="Nome do Produto" name="name" value={formData.name} onChange={handleChange} required />
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                            <input
                                list="categories-list"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}
                            />
                            <datalist id="categories-list">
                                {categories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="flex items-start gap-4">
                        <div className={`w-32 h-32 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>
                            {formData.baseImageUrl ? 
                                <img src={formData.baseImageUrl} alt="Preview" className="w-full h-full object-cover" /> :
                                <span className={`text-xs text-center ${labelClasses}`}>Sem Imagem</span>
                            }
                        </div>
                        <div className="flex-grow">
                             <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Imagem Principal</label>
                            <button type="button" onClick={() => setIsImagePickerOpen(true)} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                                Alterar Imagem
                            </button>
                            <button type="button" onClick={generateShowcaseImage} disabled={isGeneratingShowcase || !formData.baseImageUrl} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} disabled:opacity-50`}>
                                {isGeneratingShowcase ? <Spinner /> : 'Gerar Vitrine com IA'}
                            </button>
                            {showcaseAiError && <p className="text-xs text-red-500 mt-1">{showcaseAiError}</p>}
                        </div>
                    </div>
                    
                    {/* Product Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                            <select name="brand" value={formData.brand} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>
                                {BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tipo de Tecido</label>
                            <select name="fabricType" value={formData.fabricType} onChange={handleChange} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>
                                {availableFabricTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Proteção contra líquidos</label>
                        <div className="space-y-2">
                             <label className="flex items-center cursor-pointer">
                                <input type="radio" name="waterResistance" value={WaterResistanceLevel.NONE} checked={formData.waterResistance === WaterResistanceLevel.NONE} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" />
                                <span className={`ml-3 text-sm font-medium ${labelClasses}`}>Nenhum</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="waterResistance" value={WaterResistanceLevel.SEMI} checked={formData.waterResistance === WaterResistanceLevel.SEMI} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" />
                                <span className={`ml-3 text-sm font-medium ${labelClasses}`}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.SEMI]?.label}</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="waterResistance" value={WaterResistanceLevel.FULL} checked={formData.waterResistance === WaterResistanceLevel.FULL} onChange={handleChange} className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300" />
                                <span className={`ml-3 text-sm font-medium ${labelClasses}`}>{WATER_RESISTANCE_INFO[WaterResistanceLevel.FULL]?.label}</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Descrição do Tecido</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}></textarea>
                    </div>

                    {/* Variations */}
                    <div>
                        <h3 className={`text-lg font-bold mb-3 ${titleClasses}`}>Variações de Tamanho e Estoque</h3>
                        <div className="space-y-3">
                            {formData.variations.map((v, i) => (
                                <div key={i} className={`p-4 rounded-xl border ${cardClasses}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-fuchsia-400">{v.size}</h4>
                                        <button type="button" onClick={() => handleRemoveVariation(i)} className="text-red-500 hover:text-red-700">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                         {/* Price */}
                                        <div>
                                            <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Capa)</label>
                                            <input type="number" value={v.priceCover} onChange={e => handleVariationChange(i, 'priceCover', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/>
                                        </div>
                                        <div>
                                            <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Preço (Cheia)</label>
                                            <input type="number" value={v.priceFull} onChange={e => handleVariationChange(i, 'priceFull', e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`}/>
                                        </div>
                                         {/* Stock */}
                                         {STORE_NAMES.map(storeName => (
                                            <div key={storeName}>
                                                <label className={`text-xs font-semibold block mb-1 ${labelClasses}`}>Estoque ({storeName})</label>
                                                <input type="number" value={v.stock[storeName]} onChange={e => handleVariationChange(i, `stock-${storeName}`, e.target.value)} className={`w-full text-sm p-2 rounded ${inputClasses}`} />
                                            </div>
                                         ))}
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-white'}`}>
                                            {v.imageUrl ? <img src={v.imageUrl} alt="Var" className="w-full h-full object-cover"/> : <span className="text-xs text-gray-400">Sem IA</span>}
                                        </div>
                                        <button type="button" disabled={aiGenerating[v.size] || !formData.baseImageUrl} onClick={() => handleGenerateVariationImage(i)} className={`w-full flex items-center justify-center gap-2 text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40' : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'} disabled:opacity-50`}>
                                            {aiGenerating[v.size] ? <Spinner /> : 'Gerar Imagem IA'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {variationsAiError && <p className="text-xs text-red-500 mt-2">{variationsAiError}</p>}
                        <div className={`flex gap-2 mt-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                             <select value={addVariationSize} onChange={e => setAddVariationSize(e.target.value as CushionSize)} className={`flex-grow border-2 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>
                                <option value="" disabled>Selecione um tamanho</option>
                                {Object.values(CushionSize).map(size => (
                                    <option key={size} value={size} disabled={formData.variations.some(v => v.size === size)}>{size}</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddVariation} className="bg-fuchsia-600 text-white font-bold p-3 rounded-lg hover:bg-fuchsia-700 transition-transform transform hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center pt-6 gap-4 border-t border-gray-200 dark:border-white/10 mt-6">
                    {saveError && <p className="text-sm text-red-500 font-semibold flex-grow">{saveError}</p>}
                    <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100">
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
        {isImagePickerOpen && <ImagePickerModal onSelect={handleImageSelect} onClose={() => setIsImagePickerOpen(false)} onTakePhoto={() => { setIsImagePickerOpen(false); setIsCameraOpen(true); }} />}
        {isCameraOpen && <CameraView onCapture={handleImageSelect} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};

export default AddEditProductModal;