import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Product, StoreName, Variation, CushionSize } from '../types';
import { IMAGE_BANK_URLS, VARIATION_DEFAULTS, FABRIC_TYPES, FABRIC_DESCRIPTIONS } from '../constants';
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

const initialFormState: Product = {
  id: '',
  name: '',
  baseImageUrl: '',
  unitsSold: 0,
  category: '',
  fabricType: '',
  description: '',
  isWaterproof: false,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const isNumeric = type === 'number';
    const parsedValue = isNumeric ? parseInt(value, 10) || 0 : value;

    setFormData(prev => {
        const newState = { ...prev, [name]: parsedValue };
        if (name === 'fabricType') {
            newState.description = FABRIC_DESCRIPTIONS[value] || '';
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
      // FIX: State was being mutated directly. This creates a new stock object
      // to ensure immutability and correct type inference.
      variation.stock = {
        ...variation.stock,
        [store]: parseInt(value) || 0,
      };
    }
    
    updatedVariations[index] = variation;
    setFormData(prev => ({ ...prev, variations: updatedVariations }));
  };

  const handleImageSelect = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, baseImageUrl: imageUrl }));
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
            return 'Coloque esta almofada grande e bem cheia de 60x60 no chão, encostada elegantemente no pé de uma poltrona, em uma sala de estar moderna e bem iluminada. A imagem deve ter qualidade de foto de catálogo, com foco na textura da almofada e respeitando a escala real da almofada em relação à poltrona.';
        case CushionSize.LUMBAR:
            return 'Coloque esta almofada lombar, que é um travesseiro pequeno em formato retangular, sobre uma poltrona aconchegante. O ambiente deve ser uma sala de estar bem iluminada. A imagem deve parecer uma foto de catálogo de produtos, com um close-up que destaque a almofada e sua textura, respeitando sua escala real.';
        default: // SQUARE_40, SQUARE_45, SQUARE_50
            return `Coloque esta almofada de tamanho ${size} em uma poltrona aconchegante, em um close-up que destaque a almofada. O ambiente deve ser uma sala de estar bem iluminada. A imagem deve parecer uma foto de catálogo de produtos, respeitando a escala real da almofada em relação à poltrona.`;
    }
  };

  const generateSingleAiImage = async (base64Data: string, mimeType: string, variation: Variation, index: number) => {
      setAiGenerating(prev => ({ ...prev, [variation.size]: true }));
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: getAiPromptForSize(variation.size) };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.inlineData) {
            const newBase64Data = firstPart.inlineData.data;
            const newMimeType = firstPart.inlineData.mimeType;
            const newImageUrl = `data:${newMimeType};base64,${newBase64Data}`;

            setFormData(prev => {
                const newVariations = [...prev.variations];
                newVariations[index].imageUrl = newImageUrl;
                return { ...prev, variations: newVariations };
            });
        } else {
            throw new Error(`A IA não retornou uma imagem válida para o tamanho ${variation.size}.`);
        }
    } finally {
        setAiGenerating(prev => ({ ...prev, [variation.size]: false }));
    }
  };
  
  const handleGenerateAllAiImages = async () => {
    if (!formData.baseImageUrl) {
        setVariationsAiError('Por favor, escolha uma imagem principal primeiro.');
        return;
    }
    setVariationsAiError(null);

    try {
        let base64Data: string;
        let mimeType = 'image/jpeg';

        if (formData.baseImageUrl.startsWith('data:')) {
            const parts = formData.baseImageUrl.split(',');
            mimeType = parts[0].split(':')[1].split(';')[0];
            base64Data = parts[1];
        } else {
            const response = await fetch(formData.baseImageUrl);
            if (!response.ok) throw new Error('Falha ao buscar a imagem da URL.');
            const blob = await response.blob();
            mimeType = blob.type;
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            base64Data = dataUrl.split(',')[1];
        }

        const generationPromises = formData.variations.map((variation, index) => 
            generateSingleAiImage(base64Data, mimeType, variation, index)
        );

        await Promise.all(generationPromises);

    } catch (error: any) {
        console.error("AI image generation failed:", error);
        setVariationsAiError(`Falha ao gerar imagens: ${error.message}`);
    }
  };
  
  const handleGenerateShowcaseImage = async () => {
        if (!formData.baseImageUrl) {
            setShowcaseAiError("O produto não tem uma imagem principal para usar como base.");
            return;
        }
        setIsGeneratingShowcase(true);
        setShowcaseAiError(null);

        try {
            let base64Data: string;
            let mimeType = 'image/jpeg';

            if (formData.baseImageUrl.startsWith('data:')) {
                const parts = formData.baseImageUrl.split(',');
                mimeType = parts[0].split(':')[1].split(';')[0];
                base64Data = parts[1];
            } else {
                const response = await fetch(formData.baseImageUrl);
                if (!response.ok) throw new Error('Falha ao buscar a imagem da URL.');
                const blob = await response.blob();
                mimeType = blob.type;
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                base64Data = dataUrl.split(',')[1];
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imagePart = { inlineData: { data: base64Data, mimeType } };
            const textPart = { text: "um close-up desta almofada, em uma foto de alta qualidade sobre um fundo branco puro e limpo, estilo foto de produto, destacando a textura." };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart?.inlineData) {
                const newBase64Data = firstPart.inlineData.data;
                const newMimeType = firstPart.inlineData.mimeType;
                const newImageUrl = `data:${newMimeType};base64,${newBase64Data}`;
                
                setFormData(prev => ({ ...prev, baseImageUrl: newImageUrl }));
            } else {
                throw new Error("A IA não retornou uma imagem válida.");
            }

        } catch (error: any) {
            console.error("AI showcase image generation failed:", error);
            setShowcaseAiError(`Falha na geração de imagem: ${error.message}`);
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
      // onSave will close the modal if successful
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setSaveError('Permissão negada. Você não tem autorização para salvar produtos.');
      } else {
        setSaveError('Falha ao salvar o produto. Tente novamente.');
      }
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
  const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
  const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
  const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";
  const cancelBtnClasses = isDark ? "text-gray-300 hover:bg-black/20" : "text-gray-600 hover:bg-gray-100";
  const sectionBgClasses = isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200";

  const availableSizes = Object.values(CushionSize).filter(
      size => !formData.variations.some(v => v.size === size)
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-40 p-4 transition-opacity duration-300">
        <div className={`border rounded-3xl shadow-2xl w-full max-w-md p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale max-h-[90vh] overflow-y-auto no-scrollbar ${modalBgClasses}`}>
          <style>{`
            @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
          `}</style>
          
          <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-10 ${closeBtnClasses}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <h2 className={`text-2xl font-bold mb-2 text-center ${titleClasses}`}>{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</h2>
          <p className={`text-center mb-6 ${subtitleClasses}`}>Atualize os detalhes do item do seu inventário.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Nome do Produto" type="text" name="name" value={formData.name} onChange={handleChange} required />
            
            <div>
              <label className={`text-sm font-semibold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Imagem Principal</label>
              <div className="flex items-center gap-4 mb-3">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img 
                        src={formData.baseImageUrl || 'https://i.imgur.com/gA0Wxkm.png'} 
                        alt="Pré-visualização" 
                        className={`w-full h-full rounded-lg object-cover border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}
                    />
                    {isGeneratingShowcase && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg"><Spinner /></div>}
                  </div>
                  <button type="button" onClick={() => setIsImagePickerOpen(true)} className={`flex-1 font-bold py-3 px-4 rounded-lg transition text-sm ${isDark ? 'bg-black/20 border border-white/10 text-gray-200 hover:bg-black/40' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'}`}>
                    Alterar Imagem Principal
                  </button>
              </div>
               <button onClick={handleGenerateShowcaseImage} disabled={isGeneratingShowcase || !formData.baseImageUrl} type="button" className={`w-full font-bold py-3 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${isDark ? 'bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/40' : 'bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-200'}`}>
                    {isGeneratingShowcase ? <Spinner/> : '✨ Gerar Imagem de Vitrine (fundo branco)'}
                </button>
                {showcaseAiError && <p className="text-red-500 text-xs mt-2 text-center">{showcaseAiError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Categoria</label>
                <input
                    list="categories-datalist"
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <datalist id="categories-datalist">
                    {categories.sort().map(category => <option key={category} value={category} />)}
                </datalist>
              </div>
               <div>
                <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tipo de Tecido</label>
                <input
                    list="fabric-types-datalist"
                    type="text"
                    name="fabricType"
                    value={formData.fabricType}
                    onChange={handleChange}
                    required
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <datalist id="fabric-types-datalist">
                    {FABRIC_TYPES.map(fabric => <option key={fabric} value={fabric} />)}
                </datalist>
              </div>
            </div>

            <div>
                <label className={`text-sm font-semibold mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`}>Descrição</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                    rows={3}
                    className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
                <FormInput label="Almofadas Vendidas" type="number" name="unitsSold" value={formData.unitsSold} onChange={handleChange} required />
                
                <div className="flex items-center justify-center pt-6">
                    <input
                        type="checkbox"
                        id="isWaterproof"
                        name="isWaterproof"
                        checked={formData.isWaterproof}
                        onChange={(e) => setFormData(p => ({ ...p, isWaterproof: e.target.checked }))}
                        className="h-5 w-5 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
                    />
                    <label htmlFor="isWaterproof" className={`ml-3 text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Impermeável
                    </label>
                </div>
            </div>


            {/* Variations Section */}
            <div className={`p-4 rounded-lg border space-y-4 ${sectionBgClasses}`}>
              <h3 className={`font-bold ${titleClasses}`}>Variações</h3>
              
              {formData.variations.map((variation, index) => (
                <div key={variation.size} className={`p-3 rounded-md border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200/80 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}`}>{variation.size}</p>
                    <button type="button" onClick={() => handleRemoveVariation(index)} className={`text-xs font-semibold ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}`}>Remover</button>
                  </div>
                  
                  <div className="flex gap-3 mb-3">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img src={variation.imageUrl || 'https://i.imgur.com/gA0Wxkm.png'} alt={`${variation.size} preview`} className={`w-full h-full rounded-lg object-cover border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`} />
                      {aiGenerating[variation.size] && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg"><Spinner /></div>}
                    </div>
                    <div className="text-xs text-gray-400 flex-1">Imagem gerada por IA para esta variação. Use o botão abaixo para gerar imagens para todas as variações de uma vez.</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-400">Preço Capa (R$)</label>
                        <input type="number" value={variation.priceCover} onChange={e => handleVariationChange(index, 'priceCover', e.target.value)} className={`w-full mt-1 border-2 rounded-lg px-2 py-1.5 text-sm ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300'}`} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400">Preço Cheia (R$)</label>
                        <input type="number" value={variation.priceFull} onChange={e => handleVariationChange(index, 'priceFull', e.target.value)} className={`w-full mt-1 border-2 rounded-lg px-2 py-1.5 text-sm ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300'}`} />
                      </div>
                  </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-400">Estoque {StoreName.TECA}</label>
                        <input type="number" value={variation.stock[StoreName.TECA]} onChange={e => handleVariationChange(index, `stock-${StoreName.TECA}`, e.target.value)} className={`w-full mt-1 border-2 rounded-lg px-2 py-1.5 text-sm ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300'}`} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400">Estoque {StoreName.IONE}</label>
                        <input type="number" value={variation.stock[StoreName.IONE]} onChange={e => handleVariationChange(index, `stock-${StoreName.IONE}`, e.target.value)} className={`w-full mt-1 border-2 rounded-lg px-2 py-1.5 text-sm ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-300'}`} />
                      </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                  <select value={addVariationSize} onChange={e => setAddVariationSize(e.target.value as CushionSize)} className={`flex-1 border-2 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} disabled={availableSizes.length === 0}>
                      <option value="" disabled>{availableSizes.length > 0 ? 'Selecione um tamanho' : 'Todos os tamanhos adicionados'}</option>
                      {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                  <button type="button" onClick={handleAddVariation} disabled={!addVariationSize} className="font-bold py-2 px-4 rounded-lg bg-cyan-600 text-white disabled:bg-gray-500 transition">Adicionar</button>
              </div>
              <button type="button" onClick={handleGenerateAllAiImages} disabled={!formData.baseImageUrl || formData.variations.length === 0 || Object.values(aiGenerating).some(v => v)} className={`w-full font-bold py-3 px-4 rounded-lg transition text-sm flex items-center justify-center gap-2 ${isDark ? 'bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-600/40 disabled:bg-gray-600/50 disabled:text-gray-400' : 'bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-200 disabled:bg-gray-200 disabled:text-gray-400'}`}>
                ✨ Gerar Todas as Imagens com IA
              </button>
              {variationsAiError && <p className="text-red-500 text-xs mt-2 text-center">{variationsAiError}</p>}
            </div>

            {saveError && <p className="text-red-500 text-sm text-center -mt-2 mb-4 font-semibold">{saveError}</p>}
            <div className="flex justify-end items-center pt-4 gap-4">
              <button type="button" onClick={onClose} className={`font-bold py-3 px-6 rounded-lg transition ${cancelBtnClasses}`}>
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:bg-gray-400 disabled:shadow-none disabled:scale-100 min-w-[180px]">
                {isSaving ? 'Salvando...' : (product ? 'Salvar Alterações' : 'Adicionar Produto')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isImagePickerOpen && (
        <ImagePickerModal 
          onClose={() => setIsImagePickerOpen(false)}
          onSelect={handleImageSelect}
          onTakePhoto={() => {
            setIsImagePickerOpen(false);
            setIsCameraOpen(true);
          }}
        />
      )}

      {isCameraOpen && (
        <CameraView
          onCapture={handleImageSelect}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </>
  );
};

export default AddEditProductModal;