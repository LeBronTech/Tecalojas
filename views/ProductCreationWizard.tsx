import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, Brand, CushionSize, StoreName, WaterResistanceLevel, DynamicBrand, ThemeContext, Variation } from '../types';
import { BRAND_FABRIC_MAP, PREDEFINED_COLORS, VARIATION_DEFAULTS } from '../constants';
import ColorSelector from '../components/ColorSelector';

// --- Cordova/TypeScript Declarations ---
declare var navigator: any;
declare var Camera: any;


// --- Helper Components & Functions ---

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


// --- Wizard Props Interface ---
interface ProductCreationWizardProps {
  onClose: () => void;
  onConfigure: (productsToCreate: Omit<Product, 'id'>[], productToConfigure: Omit<Product, 'id'>) => Promise<void>;
  allColors: { name: string; hex: string }[];
  onAddColor: (color: { name: string; hex: string }) => void;
  categories: string[];
  products: Product[];
  brands: DynamicBrand[];
}

export const ProductCreationWizard: React.FC<ProductCreationWizardProps> = ({ onClose, onConfigure, allColors, onAddColor, categories, products, brands }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [baseName, setBaseName] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [brand, setBrand] = useState<Brand | string>(Brand.MARCA_PROPRIA);
    const [fabricType, setFabricType] = useState('');
    const [baseImageUrl, setBaseImageUrl] = useState('');
    const [selectedColors, setSelectedColors] = useState<{name: string, hex: string}[]>([]);
    const [mainColor, setMainColor] = useState<{name: string, hex: string} | null>(null);

    // UI State
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    
    const allBrandNames = useMemo(() => {
        const dynamicNames = brands.map(b => b.name);
        const staticNames = Object.values(Brand);
        return [...new Set([...dynamicNames, ...staticNames])];
    }, [brands]);

    const availableFabricTypes = useMemo(() => Object.keys(BRAND_FABRIC_MAP[brand] || {}), [brand]);

    useEffect(() => {
        if (availableFabricTypes.length > 0) {
            setFabricType(availableFabricTypes[0]);
        } else {
            setFabricType('');
        }
    }, [brand, availableFabricTypes]);

    const handleNextStep = () => {
        if (step === 1 && (!baseName.trim() || !category.trim() || !fabricType)) {
            setError("Por favor, preencha nome, categoria e tipo de tecido.");
            return;
        }
        if (step === 2 && selectedColors.length === 0) {
            setError("Selecione pelo menos uma cor.");
            return;
        }
        setError(null);
        setStep(s => s + 1);
    };
    
    const handlePrevStep = () => setStep(s => s - 1);
    
    const handleImageSelect = async (imageUrl: string) => {
        let finalImageUrl = imageUrl;
        if (imageUrl.startsWith('data:image')) {
            try { finalImageUrl = await resizeImage(imageUrl); } 
            catch (error) { console.error("Failed to resize image:", error); }
        }
        setBaseImageUrl(finalImageUrl);
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
    
    const handleToggleColor = (color: { name: string; hex: string }) => {
        setSelectedColors(prev => {
            const isSelected = prev.some(c => c.name === color.name);
            if (isSelected) {
                const newColors = prev.filter(c => c.name !== color.name);
                if (mainColor?.name === color.name) {
                    setMainColor(newColors.length > 0 ? newColors[0] : null);
                }
                return newColors;
            } else {
                const newColors = [...prev, color];
                if (!mainColor) {
                    setMainColor(color);
                }
                return newColors;
            }
        });
    };
    
    const handleSubmit = async () => {
        if (!mainColor) {
            setError("Por favor, selecione uma cor principal para configurar.");
            return;
        }

        setError(null);
        setIsSubmitting(true);
        
        try {
            const variationGroupId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const capitalizedBaseName = baseName.trim().charAt(0).toUpperCase() + baseName.trim().slice(1);
            
            const productsToCreate: Omit<Product, 'id'>[] = selectedColors.map(color => {
                const capitalizedColorName = color.name.charAt(0).toUpperCase() + color.name.slice(1);
                const newName = `${capitalizedBaseName} (${capitalizedColorName})`;
                const variations: Variation[] = Object.values(CushionSize).map(size => ({
                    size,
                    imageUrl: '',
                    priceCover: VARIATION_DEFAULTS[size].priceCover,
                    priceFull: VARIATION_DEFAULTS[size].priceFull,
                    stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 },
                }));

                return {
                    name: newName,
                    baseImageUrl,
                    category: pluralizeCategory(category),
                    subCategory: pluralizeCategory(subCategory),
                    brand,
                    fabricType,
                    description: BRAND_FABRIC_MAP[brand]?.[fabricType] || '',
                    colors: [color],
                    unitsSold: 0,
                    waterResistance: WaterResistanceLevel.NONE,
                    variations,
                    variationGroupId,
                    isMultiColor: false,
                    backgroundImages: {},
                };
            });

            const productToConfigure = productsToCreate.find(p => p.colors[0].name === mainColor.name)!;
            await onConfigure(productsToCreate, productToConfigure);

        } catch (err: any) {
            setError(err.message || 'Falha ao criar produtos.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const inputClasses = isDark ? "bg-black/20 text-white border-white/10" : "bg-gray-100 text-gray-900 border-gray-300";
    const labelClasses = isDark ? "text-gray-400" : "text-gray-600";
    
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col ${modalBgClasses}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-2xl font-bold ${titleClasses}`}>Novo Produto (Passo {step}/3)</h2>
                    <button type="button" onClick={onClose} className={`rounded-full p-2 transition-colors z-10 ${isDark ? 'text-gray-400 hover:text-white bg-black/20' : 'text-gray-500 hover:text-gray-800 bg-gray-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-2">
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className={subtitleClasses}>Defina as informações básicas que serão compartilhadas entre todas as variações de cor.</p>
                            <div>
                                <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Nome Base (sem cor)</label>
                                <input type="text" value={baseName} onChange={e => setBaseName(e.target.value)} required placeholder="Ex: Suede Liso" className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Categoria</label>
                                    <input list="categories-list" value={category} onChange={e => setCategory(e.target.value)} required className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                                    <datalist id="categories-list">{categories.map(cat => <option key={cat} value={cat} />)}</datalist>
                                </div>
                                 <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Sub-categoria (Opcional)</label>
                                    <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="Ex: Lisas, Florais" className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`} />
                                </div>
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Marca</label>
                                    <select value={brand} onChange={e => setBrand(e.target.value)} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{allBrandNames.map(b => <option key={b} value={b}>{b}</option>)}</select>
                                </div>
                                <div>
                                    <label className={`text-sm font-semibold mb-1 block ${labelClasses}`}>Tipo de Tecido</label>
                                    <select value={fabricType} onChange={e => setFabricType(e.target.value)} className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${inputClasses}`}>{availableFabricTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>
                                </div>
                            </div>
                           
                            <div className="flex items-start gap-4">
                                <div className={`relative w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-100'}`}>
                                    {baseImageUrl ? <img src={baseImageUrl} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500">Sem Imagem</span>}
                                </div>
                                <div>
                                    <label className={`text-sm font-semibold mb-2 block ${labelClasses}`}>Imagem Base</label>
                                    <button type="button" onClick={() => setIsImagePickerOpen(true)} className={`w-full text-center font-bold py-3 px-4 rounded-lg transition-colors ${isDark ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>Escolher Imagem</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                             <p className={subtitleClasses}>Selecione todas as cores para as quais deseja criar um produto.</p>
                             <ColorSelector 
                                allColors={allColors}
                                multiSelect
                                selectedColors={selectedColors}
                                onToggleColor={handleToggleColor}
                                onAddCustomColor={onAddColor}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                             <p className={`${subtitleClasses} mb-4`}>Revise os detalhes. Você criará {selectedColors.length} produto(s). Qual deles você deseja configurar primeiro?</p>
                             <div className="space-y-2">
                                {selectedColors.map(color => (
                                    <button key={color.name} type="button" onClick={() => setMainColor(color)} className={`w-full flex items-center p-2 rounded-lg border-2 transition-colors ${mainColor?.name === color.name ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-transparent'}`}>
                                        <div style={{backgroundColor: color.hex}} className="w-8 h-8 rounded-md mr-3 border border-black/20"></div>
                                        <span className={titleClasses}>{`${baseName} (${color.name})`}</span>
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                    <div>
                        {step > 1 && <button type="button" onClick={handlePrevStep} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>Voltar</button>}
                    </div>
                     <div className="flex items-center gap-4">
                        {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
                        {step < 3 && <button type="button" onClick={handleNextStep} className="bg-fuchsia-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700">Próximo</button>}
                        {step === 3 && <button type="button" onClick={handleSubmit} disabled={isSubmitting || !mainColor} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-cyan-700 disabled:bg-gray-400">{isSubmitting ? 'Criando...' : `Criar e Configurar`}</button>}
                    </div>
                </div>
            </div>
        </div>
        {isImagePickerOpen && <ImagePickerModal onSelect={handleImageSelect} onClose={() => setIsImagePickerOpen(false)} onTakePhoto={handleTakePhoto} />}
        {isCameraOpen && <CameraView onCapture={handleImageSelect} onClose={() => setIsCameraOpen(false)} />}
      </>
    );
};