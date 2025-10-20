import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, Brand, CushionSize, StoreName, WaterResistanceLevel, DynamicBrand } from '../types';
import { ThemeContext } from '../App';
import { BRAND_FABRIC_MAP, PREDEFINED_COLORS, VARIATION_DEFAULTS } from '../constants';
import ColorSelector from './ColorSelector';
import { GoogleGenAI } from '@google/genai';

// --- Cordova/TypeScript Declarations ---
declare var navigator: any;
declare var Camera: any;


// --- Helper Components & Functions (copied from AddEditProductModal) ---

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
    <div className="fixed inset-0 bg-black z-[70] flex flex-col items-center justify-center">
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


interface ImagePickerModalProps {
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
  onTakePhoto: () => void;
}
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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-end justify-center z-[60] p-4 transition-opacity duration-300">
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


// --- Main Component ---
const ButtonSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface WizardData {
    brand: string;
    fabricType: string;
    category: string;
    baseName: string;
    colors: { name: string; hex: string }[];
    baseImageUrl: string | null;
}

interface ProductCreationWizardProps {
    products: Product[];
    onClose: () => void;
    onConfigure: (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => Promise<void>;
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
    
    // Step 1 State
    const [brand, setBrand] = useState<string>(Brand.MARCA_PROPRIA);
    const [fabricType, setFabricType] = useState<string>(Object.keys(BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA])[0]);
    const [category, setCategory] = useState('');
    const [baseName, setBaseName] = useState('');
    const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isExtractingColors, setIsExtractingColors] = useState(false);
    const [extractedColors, setExtractedColors] = useState<{ hex: string, name: string }[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const allBrandNames = useMemo(() => {
        const dynamicNames = brands.map(b => b.name);
        const staticNames = Object.values(Brand);
        return [...new Set([...dynamicNames, ...staticNames])];
    }, [brands]);

    const allFabricTypes = useMemo(() => {
        const fabricMap = BRAND_FABRIC_MAP[brand];
        if (fabricMap) return Object.keys(fabricMap);
        const all = new Set<string>();
        Object.values(BRAND_FABRIC_MAP).forEach(map => Object.keys(map).forEach(type => all.add(type)));
        return Array.from(all).sort();
    }, [brand]);

    const allColors = useMemo(() => [...PREDEFINED_COLORS, ...customColors].filter(
        (color, index, self) => index === self.findIndex((c) => c.name.toLowerCase() === color.name.toLowerCase())
    ), [customColors]);
    
    useEffect(() => {
        setBaseName('');
        setSelectedColors([]);
        setError(null);
    }, [brand, fabricType, category]);

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setBrand(e.target.value);
    };

    useEffect(() => {
        if (allFabricTypes.length > 0) {
            setFabricType(allFabricTypes[0]);
        }
    }, [allFabricTypes]);
    
    const existingFamilyProducts = useMemo(() => {
        if (!category || !fabricType || !brand) return [];
        return products.filter(p => p.category === category && p.fabricType === fabricType && p.brand === brand);
    }, [products, category, fabricType, brand]);

    const usedColorNamesInFamily = useMemo(() => {
        if (!baseName.trim()) return [];
        return existingFamilyProducts
            .filter(p => {
                if (!p.mainColor?.name) return false;
                const regex = new RegExp(`\\b${p.mainColor.name}\\b`, 'i');
                const pBaseName = p.name.replace(regex, '').trim().replace(/\s\s+/g, ' ');
                return pBaseName.toLowerCase() === baseName.trim().toLowerCase();
            })
            .map(p => p.mainColor!.name);
    }, [existingFamilyProducts, baseName]);

    const handleImageSelect = async (imageUrl: string) => {
        let finalImageUrl = imageUrl;
        if (imageUrl.startsWith('data:image')) {
            try { finalImageUrl = await resizeImage(imageUrl); } 
            catch (error) { console.error("Failed to resize image:", error); }
        }
        setMainImage(finalImageUrl);
        setIsImagePickerOpen(false);
        setIsCameraOpen(false);
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

    const handleExtractColors = async () => {
        if (!mainImage) { setError("Adicione uma imagem primeiro."); return; }
        setIsExtractingColors(true);
        setError(null);
        try {
            const { base64Data, mimeType } = await getBase64FromImageUrl(mainImage);
            const ai = new GoogleGenAI({ apiKey: "AIzaSyAX1XcWqVjlnYVpHaaQNh91LgT2ge19Z4Q"});
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            const textPart = { text: 'Você é um especialista em paletas de cores. Extraia as 5 cores mais proeminentes e distintas desta imagem. Sua resposta DEVE ser um objeto JSON válido com uma única chave "colors", que é um array de strings representando os códigos hexadecimais das cores extraídas (ex: "#FFFFFF").' };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] }, config: { responseMimeType: 'application/json' } });
            
            const resultJson = JSON.parse(response.text.trim());
            if (resultJson.colors && Array.isArray(resultJson.colors)) {
                setExtractedColors(resultJson.colors.map((hex: string) => ({ hex, name: '' })));
            } else {
                throw new Error("Formato de resposta da IA inválido.");
            }
        } catch (e: any) {
            console.error("AI Color Extraction Failed:", e);
            setError("Falha ao extrair cores com IA.");
        } finally {
            setIsExtractingColors(false);
        }
    };

    const handleSaveExtractedColor = (index: number) => {
        if (!extractedColors) return;
        const color = extractedColors[index];
        if (color.name.trim()) {
            const colorToAdd = { name: color.name.trim(), hex: color.hex };
            onAddCustomColor(colorToAdd);
            setSelectedColors(prev => [...prev, colorToAdd]);
            setExtractedColors(prev => prev!.filter((_, i) => i !== index));
        }
    };

    const createProductPayloads = (data: WizardData) => {
        const groupId = `var_${Date.now()}`;
        const pluralizedCategory = pluralizeCategory(data.category);
        const capitalizedBaseName = data.baseName.charAt(0).toUpperCase() + data.baseName.slice(1);

        return data.colors.map(color => {
            const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
            const productName = `${capitalizedBaseName} (${capitalizedColorName})`;
            const fabricDescription = BRAND_FABRIC_MAP[data.brand]?.[data.fabricType] || BRAND_FABRIC_MAP[Brand.MARCA_PROPRIA]?.[data.fabricType] || '';

            return {
                name: productName,
                brand: data.brand,
                fabricType: data.fabricType,
                category: pluralizedCategory,
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
    
    const handleProceed = async () => {
        setError(null);
        if (!category.trim() || !fabricType.trim() || !baseName.trim()) {
            setError('Categoria, tecido e nome base são obrigatórios.');
            return;
        }
        if (selectedColors.length === 0) {
            setError('Selecione pelo menos uma cor.');
            return;
        }
        
        const capitalizedBaseName = baseName.trim().charAt(0).toUpperCase() + baseName.trim().slice(1);
        const proposedNames = selectedColors.map(color => {
            const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
            return `${capitalizedBaseName} (${capitalizedColorName})`.toLowerCase();
        });
        const existingFullNames = products.map(p => p.name.toLowerCase());
        
        const duplicate = proposedNames.find(pName => existingFullNames.includes(pName));
        if(duplicate){
            setError(`O nome "${duplicate}" já existe. Escolha um nome base ou cor diferente.`);
            return;
        }
        
        const currentWizardData: WizardData = {
            brand, fabricType,
            category: category.trim(),
            baseName: baseName.trim(),
            colors: selectedColors,
            baseImageUrl: mainImage
        };
        
        const productsToCreate = createProductPayloads(currentWizardData);

        if (selectedColors.length === 1 && productsToCreate.length > 0) {
            if (mainImage) productsToCreate[0].baseImageUrl = mainImage;
            setIsLoading(true);
            try { await onConfigure(productsToCreate, productsToCreate[0]); } 
            catch (err: any) { setError(err.message); } 
            finally { setIsLoading(false); }
        } else {
            setWizardData(currentWizardData);
            setStep(2);
        }
    };
    
    const handleStartConfiguration = async (colorToConfigure: { name: string; hex: string }) => {
        if (!wizardData) return;
        
        const productsToCreate = createProductPayloads(wizardData);
        const productToConfigure = productsToCreate.find(p => p.mainColor.name === colorToConfigure.name);
        
        if (productToConfigure) {
            if (wizardData.baseImageUrl) productToConfigure.baseImageUrl = wizardData.baseImageUrl;
            setIsLoading(true);
            setError(null);
            try { await onConfigure(productsToCreate, productToConfigure); } 
            catch (err: any) { setError(err.message); } 
            finally { setIsLoading(false); }
        }
    };

    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
    const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
    
    const toggleColorSelection = (color: { name: string; hex: string }) => {
        setSelectedColors(prev => 
            prev.some(c => c.name === color.name)
                ? prev.filter(c => c.name !== color.name)
                : [...prev, color]
        );
    };
    
    const areDetailsFilled = category.trim() && fabricType.trim() && baseName.trim() && brand.trim();

    const renderStep1 = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${titleClasses}`}>Novo Produto (Etapa 1/2)</h2>
                <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Defina as características da nova família de produtos.
                </p>
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
                <div>
                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Nome Base da Almofada</label>
                    <input type="text" value={baseName} onChange={e => setBaseName(e.target.value)} required placeholder="Ex: Lisa, Floral Moderno" className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                </div>
                
                {areDetailsFilled && (
                  <div className="border-t pt-4 space-y-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                      <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Imagem Principal (Opcional)</label>
                      <div className="flex items-center gap-4">
                          <div className={`relative w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>
                             {mainImage ? <img src={mainImage} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 px-2 text-center">Sem Imagem</span>}
                          </div>
                          <div className="flex-grow space-y-2">
                               <button type="button" onClick={() => setIsImagePickerOpen(true)} className={`w-full text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Adicionar Imagem</button>
                               <button type="button" onClick={handleExtractColors} disabled={!mainImage || isExtractingColors} className={`w-full text-center font-bold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'} disabled:opacity-50`}>
                                 {isExtractingColors ? <ButtonSpinner /> : 'Analisar Cores com IA'}
                              </button>
                          </div>
                      </div>
                      {extractedColors && extractedColors.length > 0 && (
                          <div className="space-y-2">
                              <h4 className={`text-sm font-semibold ${labelClasses}`}>Cores sugeridas pela IA:</h4>
                              {extractedColors.map((color, index) => (
                                   <div key={index} className="flex items-center gap-2 p-2 bg-black/10 rounded-lg">
                                      <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-md border border-white/10 flex-shrink-0" />
                                      <input type="text" placeholder="Nome da Cor" value={color.name} onChange={e => setExtractedColors(prev => { const next = [...prev!]; next[index].name = e.target.value; return next; })} className={`flex-grow text-sm p-2 rounded ${inputClasses}`}/>
                                      <button type="button" onClick={() => handleSaveExtractedColor(index)} className="bg-cyan-600 text-white font-bold p-2 text-xs rounded-lg hover:bg-cyan-700 transition">Salvar e Usar</button>
                                  </div>
                              ))}
                          </div>
                      )}
                      <div>
                          <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Selecione as cores para criar</label>
                          <ColorSelector allColors={allColors} multiSelect selectedColors={selectedColors} onToggleColor={toggleColorSelection} onAddCustomColor={onAddCustomColor} disabledColors={usedColorNamesInFamily} />
                      </div>
                  </div>
                )}
            </div>
            <div className="flex justify-end items-center pt-6 gap-4 border-t border-gray-200 dark:border-white/10 mt-auto">
                 {error && <p className="text-sm text-red-500 font-semibold text-left flex-grow">{error}</p>}
                 <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>Cancelar</button>
                 <button type="button" onClick={handleProceed} disabled={isLoading} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                    {isLoading ? <ButtonSpinner /> : (selectedColors.length <= 1 ? 'Configurar Produto' : 'Próximo')}
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
             {error && <p className="text-sm text-red-500 font-semibold text-center mb-4">{error}</p>}
             <div className="space-y-3 max-h-64 overflow-y-auto">
                 {wizardData?.colors.map(color => (
                     <div key={color.name} className={`p-3 rounded-xl flex items-center justify-between border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-full border border-black/20 flex-shrink-0"></div>
                             <span className={`font-semibold ${titleClasses}`}>{color.name} {wizardData.baseName}</span>
                         </div>
                         <button onClick={() => handleStartConfiguration(color)} disabled={isLoading} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-cyan-700 transition text-sm disabled:bg-gray-500 flex items-center justify-center min-w-[100px]">
                            {isLoading ? <ButtonSpinner/> : 'Configurar'}
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
            <div className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 relative flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()} style={{ height: '90vh', maxHeight: '700px' }}>
                {step === 1 ? renderStep1() : renderStep2()}
                {isImagePickerOpen && <ImagePickerModal onSelect={handleImageSelect} onClose={() => setIsImagePickerOpen(false)} onTakePhoto={handleTakePhoto} />}
                {isCameraOpen && <CameraView onCapture={handleImageSelect} onClose={() => setIsCameraOpen(false)} />}
            </div>
        </div>
    );
};

export default ProductCreationWizard;