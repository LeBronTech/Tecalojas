import React, { useState, useRef } from 'react';
import { Product, Banner } from '../types';
import { uploadFile } from '../firebase';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const uploadToExpressAPI = async (filename: string, base64Data: string): Promise<string> => {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, base64Data })
    });
    if (!response.ok) {
      throw new Error(`Erro na resposta do servidor: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.imageUrl) {
      return data.imageUrl;
    }
    throw new Error(data.error || 'Erro desconhecido ao ler URL de imagem');
  } catch (err: any) {
    console.error("Falha no upload de fallback do Express:", err);
    throw err;
  }
};

const ENVIRONMENT_TEMPLATES = {
  sofa: (cushions: string) => 
    `A elegant living room sofa. Arrange exactly these decorative cushions on the seat: [${cushions}]. Beautiful interior decoration, bright cozy ambient lighting, luxury fabrics, photorealistic, 16:9 aspect ratio.`,
  bed: (cushions: string) => 
    `A luxury double bed neatly made with clean premium sheets. Beautifully compose these decorative pillows at the headboard: [${cushions}]. Cozy master bedroom, soft morning sunshine, realistic fabric folds, 16:9 aspect ratio.`,
  balcony: (cushions: string) => 
    `A modern outdoor patio armchair on a green lush balcony. Place these patio pillows together on the armchair cushion: [${cushions}]. Beautiful plants and soft sunset natural light in the background, realistic textures, 16:9 aspect ratio.`,
  pool: (cushions: string) => 
    `A luxurious pool lounger next to a glassy clean swimming pool under summer sun. Arrange these poolside waterproof pillows neatly along the chair: [${cushions}]. Refreshing summer aesthetic, natural highlights, photorealistic detail, 16:9 aspect ratio.`
};

interface BannerEditorModalProps {
  onClose: () => void;
  onSave: (banner: any) => void;
  products: Product[];
  banner?: Banner;
}

export const BannerEditorModal: React.FC<BannerEditorModalProps> = ({ onClose, onSave, products, banner }) => {
  const [name, setName] = useState(banner ? banner.name : '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    banner && banner.cushionProductIds 
      ? Array.from(new Set(banner.cushionProductIds)) 
      : []
  );
  const [bgType, setBgType] = useState<'gallery' | 'ai' | 'url'>(banner ? 'url' : 'gallery');
  const [environment, setEnvironment] = useState<'sofa' | 'bed' | 'balcony' | 'pool'>('sofa');
  const [imageUrl, setImageUrl] = useState(banner ? banner.imageUrl : '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(banner ? banner.imageUrl : '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cushionSearch, setCushionSearch] = useState('');
  
  const [objectPositionX, setObjectPositionX] = useState<number>(banner?.objectPositionX !== undefined ? banner.objectPositionX : 50);
  const [objectPositionY, setObjectPositionY] = useState<number>(banner?.objectPositionY !== undefined ? banner.objectPositionY : 50);
  const [zoomScale, setZoomScale] = useState<number>(banner?.zoomScale !== undefined ? banner.zoomScale : 100);

  const imgStyle = {
    objectPosition: `${objectPositionX}% ${objectPositionY}%`,
    transform: `scale(${zoomScale / 100})`,
    transformOrigin: 'center',
    transition: 'transform 0.1s ease-out, object-position 0.1s ease-out'
  };
  
  // Auto-generate prompt based on environment and selected products (if not custom edited)
  React.useEffect(() => {
    if (bgType === 'ai' && !isPromptCustomized) {
      const selectedProductNames = products
        .filter(p => selectedProductIds.includes(p.id))
        .map(p => p.name)
        .join(', ');
      
      const cushionsText = selectedProductNames || 'almofadas selecionadas';
      const templateFn = ENVIRONMENT_TEMPLATES[environment] || ENVIRONMENT_TEMPLATES.sofa;
      setAiPrompt(templateFn(cushionsText));
    }
  }, [bgType, environment, selectedProductIds, products, isPromptCustomized]);

  const handleEnvironmentChange = (env: 'sofa' | 'bed' | 'balcony' | 'pool') => {
    setEnvironment(env);
    setIsPromptCustomized(false); // Reset custom status so new environment template is loaded
  };

  const handleGenerateAI = async () => {
    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
    if (selectedProducts.length === 0) {
      alert('Selecione pelo menos uma almofada na lista abaixo para que a IA possa colocá-la no cenário!');
      return;
    }

    setIsGenerating(true);
    try {
        const response = await fetch('/api/generate-banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: aiPrompt,
                productImages: selectedProducts.map(p => p.baseImageUrl)
            })
        });
        const data = await response.json();
        if (data.imageUrl) {
            setImageUrl(data.imageUrl);
        } else {
            alert('Erro ao gerar imagem: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao chamar gerador de IA');
    } finally {
        setIsGenerating(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Desduplicar produtos apenas por ID para garantir chaves do React únicas sem remover produtos legítimos de nomes similares
  const uniqueProducts = React.useMemo(() => {
    const seenIds = new Set<string>();
    return products.filter(p => {
      if (!p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
  }, [products]);

  const filteredProducts = uniqueProducts.filter(p => p.name.toLowerCase().includes(cushionSearch.toLowerCase()));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFileObj(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const base64ToBlob = (base64Data: string, contentType = 'image/jpeg'): Blob => {
    const parts = base64Data.split(',');
    const base64 = parts.length > 1 ? parts[1] : parts[0];
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: contentType });
  };

  const handleSave = async () => {
    if (!name) {
      alert('Por favor, defina um nome para o banner/composição');
      return;
    }
    if (selectedProductIds.length === 0) {
      alert('Selecione ao menos uma almofada para associar ao banner/composição');
      return;
    }

    let finalImageUrl = imageUrl;

    if (bgType === 'gallery') {
      if (uploadFileObj) {
        setIsUploading(true);
        setUploadProgress(30);
        try {
          finalImageUrl = await fileToBase64(uploadFileObj);
          setUploadProgress(100);
        } catch (e) {
          console.error("Erro ao converter arquivo para base64:", e);
          alert("Falha ao processar arquivo de imagem");
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      } else if (!imageUrl) {
        alert('Selecione uma foto da galeria ou insira uma URL para a imagem final');
        return;
      }
    } else {
      if (!imageUrl) {
        if (bgType === 'ai') {
          alert('Por favor, clique em "Gerar Imagem com IA" para criar o cenário do banner antes de salvar!');
        } else {
          alert('Por favor, insira uma URL de imagem válida');
        }
        return;
      }
      finalImageUrl = imageUrl;
    }

    onSave({ 
      ...(banner?.id ? { id: banner.id } : {}),
      name, 
      cushionProductIds: Array.from(new Set(selectedProductIds)), 
      imageUrl: finalImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png",
      objectPositionX,
      objectPositionY,
      zoomScale
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[110] p-4">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      {/* Scroll-safe dialog box */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl shadow-2xl relative border dark:border-white/10 flex flex-col max-h-[85vh] z-10 animate-fade-in-scale">
        
        {/* Title Header - Fixed */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-black dark:text-white">Adicionar Novo Banner</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Monte um banner promocional para a sua vitrine</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow no-scrollbar">
          
          {/* Banner Name input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold dark:text-gray-200">Nome do Banner / Composição</label>
            <input 
              className="w-full border-2 border-gray-200 dark:border-white/10 dark:bg-black/30 dark:text-white p-3 rounded-xl focus:border-fuchsia-500 focus:outline-none transition text-sm" 
              placeholder="Ex: Coleção Harmonia Real Vinho e Ouro" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          {/* Background selection & Preview Container */}
          <div className="p-4 border border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-black/20 space-y-4">
            <div>
              <label className="block text-sm font-bold dark:text-gray-100">Imagem de Fundo</label>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Selecione de onde virá o fundo do banner</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBgType('gallery')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 ${
                  bgType === 'gallery' 
                    ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-md' 
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                }`}
              >
                🖼️ Galeria
              </button>
              <button
                type="button"
                onClick={() => setBgType('ai')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 ${
                  bgType === 'ai' 
                    ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-md' 
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                }`}
              >
                🤖 Gerar IA
              </button>
              <button
                type="button"
                onClick={() => setBgType('url')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 ${
                  bgType === 'url' 
                    ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-md' 
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                }`}
              >
                🔗 Link URL
              </button>
            </div>

            {/* Source Specific Inputs */}
            {bgType === 'gallery' && (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {/* Dynamically Sized Visualizer - Matches Home Banner size (w-full h-36 sm:h-44 md:h-52) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-36 sm:h-44 md:h-52 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-fuchsia-500 hover:bg-fuchsia-500/5 transition overflow-hidden group"
                >
                  {imagePreviewUrl ? (
                    <>
                      <img src={imagePreviewUrl} alt="Preview do Banner" className="w-full h-full object-cover" style={imgStyle} />
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">
                        <span>📷 Alterar Foto da Galeria</span>
                        <span className="text-xs text-gray-300 font-normal mt-1">Clique para carregar outro arquivo</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center px-6">
                      <span className="text-4xl mb-2 block">📁</span>
                      <span className="text-sm font-bold text-fuchsia-600 block group-hover:underline">Importar do seu Dispositivo</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Carregue qualquer imagem de alta qualidade para servir de fundo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {bgType === 'ai' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Monte o cenário ideal</label>
                  <select 
                    className="w-full border border-gray-200 dark:border-white/10 p-3 rounded-xl bg-white dark:bg-zinc-800 dark:text-white font-medium text-sm focus:border-fuchsia-500 focus:outline-none" 
                    value={environment} 
                    onChange={e => handleEnvironmentChange(e.target.value as any)}
                  >
                    <option value="sofa">🛋️ Sofá da Sala de Estar</option>
                    <option value="bed">🛏️ Cama de Casal Organizada</option>
                    <option value="balcony">🌿 Poltrona na Varanda / Área Verde</option>
                    <option value="pool">🏊 Espeguicadeira da Piscina</option>
                  </select>
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between items-center mb-0.5">
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Prompt da IA (Edite se desejar)</label>
                     {isPromptCustomized && (
                       <button 
                         type="button" 
                         onClick={() => setIsPromptCustomized(false)} 
                         className="text-[10px] text-fuchsia-600 hover:underline font-bold"
                       >
                         🔄 Restaurar Manual
                       </button>
                     )}
                   </div>
                   <textarea 
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-black/30 dark:text-white p-3 rounded-xl text-xs focus:border-fuchsia-500 focus:outline-none" 
                    rows={4}
                    value={aiPrompt} 
                    onChange={e => {
                      setAiPrompt(e.target.value);
                      setIsPromptCustomized(true);
                    }} 
                   />
                </div>
                <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="w-full bg-fuchsia-600 text-white font-bold py-2 rounded-xl text-sm"
                >
                    {isGenerating ? "Gerando..." : "Gerar Imagem com IA"}
                </button>
                
                {/* Visualizer */}
                <div className="relative w-full h-36 sm:h-44 md:h-52 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-black/30">
                  {imageUrl ? (
                    <img src={imageUrl} alt="AI Generated Preview" className="w-full h-full object-cover" style={imgStyle} />
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">A imagem gerada aparecerá aqui</p>
                  )}
                </div>
              </div>
            )}

            {bgType === 'url' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Insira um link direto de imagem pública</label>
                  <input 
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-black/30 dark:text-white p-3 rounded-xl text-xs focus:border-fuchsia-500 focus:outline-none" 
                    placeholder="https://images.unsplash.com/photo-..." 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)} 
                  />
                </div>

                {/* Direct Link Preview matching banner proportions */}
                <div className="relative w-full h-36 sm:h-44 md:h-52 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-black/30">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="URL link preview" 
                      className="w-full h-full object-cover"
                      style={imgStyle}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"
                      }}
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center">
                      <span className="text-2xl mb-1">🔗</span>
                      <span>Cole uma URL de alta definição para carregar o preview aqui</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="mt-2 bg-white dark:bg-zinc-800 p-3 rounded-xl border dark:border-white/10 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-fuchsia-600 mb-1.5">
                  <span>Enviando foto ao banco de dados...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-fuchsia-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Image Adjustment Control Panel */}
            {((bgType === 'gallery' && imagePreviewUrl) || (bgType !== 'gallery' && imageUrl)) && (
              <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <span>📐 Ajustes de Enquadramento da Imagem</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vertical Alignment (Y Axis) */}
                  <div className="space-y-1 bg-white dark:bg-zinc-800 p-3 rounded-xl border dark:border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold dark:text-gray-300">Posição Vertical (Y)</span>
                      <span className="text-xs font-mono bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400 px-2 py-0.5 rounded font-bold">{objectPositionY}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">Topo</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={objectPositionY} 
                        onChange={e => setObjectPositionY(Number(e.target.value))}
                        className="flex-grow accent-fuchsia-600 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-gray-400">Base</span>
                    </div>
                  </div>

                  {/* Horizontal Alignment (X Axis) */}
                  <div className="space-y-1 bg-white dark:bg-zinc-800 p-3 rounded-xl border dark:border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold dark:text-gray-300">Posição Horizontal (X)</span>
                      <span className="text-xs font-mono bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400 px-2 py-0.5 rounded font-bold">{objectPositionX}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">Esquerda</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={objectPositionX} 
                        onChange={e => setObjectPositionX(Number(e.target.value))}
                        className="flex-grow accent-fuchsia-600 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-gray-400">Direita</span>
                    </div>
                  </div>

                  {/* Zoom (Scale Slider) */}
                  <div className="space-y-1 bg-white dark:bg-zinc-800 p-3 rounded-xl border dark:border-white/5 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold dark:text-gray-300">Zoom / Escala da Imagem</span>
                      <span className="text-xs font-mono bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400 px-2 py-0.5 rounded font-bold">{zoomScale}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">100% (Normal)</span>
                      <input 
                        type="range" 
                        min="100" 
                        max="300" 
                        value={zoomScale} 
                        onChange={e => setZoomScale(Number(e.target.value))}
                        className="flex-grow accent-fuchsia-600 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-gray-400">300% (Aproximado)</span>
                    </div>
                  </div>
                </div>

                {/* Reset button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setObjectPositionX(50);
                      setObjectPositionY(50);
                      setZoomScale(100);
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-fuchsia-600 flex items-center gap-1 transition-colors"
                  >
                    🔄 Redefinir Ajustes para o Padrão
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Associated Cushions / Almofadas Selector */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-bold dark:text-gray-200">
                Almofadas desta Composição ({selectedProductIds.length} selecionadas)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Vincule as almofadas que pertencem a este conjunto decorativo</p>
            </div>
            
            <input 
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-black/30 dark:text-white px-4 py-2.5 rounded-xl text-sm focus:border-fuchsia-500 focus:outline-none" 
              placeholder="🔍 Pesquisar almofadas por nome..." 
              value={cushionSearch} 
              onChange={e => setCushionSearch(e.target.value)} 
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-2xl p-3 bg-gray-50/50 dark:bg-black/10 no-scrollbar">
              {filteredProducts.map(p => {
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                      <div 
                          key={p.id} 
                          className={`cursor-pointer border-2 rounded-xl p-2 transition-all text-center flex flex-col justify-between items-center ${
                            isSelected 
                              ? 'border-fuchsia-500 bg-fuchsia-500/5 dark:bg-fuchsia-500/15' 
                              : 'border-transparent bg-white dark:bg-zinc-850 hover:border-gray-200 dark:hover:border-zinc-800'
                          }`}
                          onClick={() => {
                              setSelectedProductIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                          }}
                      >
                          <img src={p.baseImageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-lg mb-1.5 shadow" />
                          <p className="text-[10px] font-bold line-clamp-2 leading-tight dark:text-gray-200">{p.name}</p>
                      </div>
                  );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions - Docked fixed footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex gap-4 bg-gray-50/50 dark:bg-zinc-950/20 rounded-b-3xl">
          <button 
            type="button"
            className="flex-1 bg-gray-100 dark:bg-zinc-800 dark:text-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition" 
            onClick={onClose}
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button 
            type="button"
            className="flex-1 bg-fuchsia-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-fuchsia-700 shadow-xl shadow-fuchsia-500/20 transition disabled:bg-gray-500" 
            onClick={handleSave}
            disabled={isUploading}
          >
            {isUploading ? `Enviando (${uploadProgress}%)` : 'Salvar Banner'}
          </button>
        </div>
      </div>
    </div>
  );
};
