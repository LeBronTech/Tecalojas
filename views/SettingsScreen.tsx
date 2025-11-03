import React, { useState, useContext, useRef, useMemo } from 'react';
import { ThemeContext } from '../types';
import { DynamicBrand, Brand } from '../types';
import ApiKeyModal from '../components/ApiKeyModal';
import { BRANDS, BRAND_LOGOS } from '../constants';

interface SettingsScreenProps {
  onSaveApiKey: (key: string) => void;
  onAddNewBrand: (brandName: string, logoFile?: File, logoUrl?: string) => Promise<void>;
  onMenuClick: () => void;
  canManageStock: boolean;
  brands: DynamicBrand[];
  allColors: { name: string; hex: string }[];
  onAddColor: (color: { name: string; hex: string }) => void;
  onDeleteColor: (colorName: string) => void;
}

// --- Helper Components (Moved Outside to prevent re-rendering bugs) ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'} ${className}`}>
            {children}
        </div>
    );
};
  
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{children}</h2>
    );
};
  
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <input 
            ref={ref}
            {...props}
            className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
        />
    );
});

// --- Main Component ---

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSaveApiKey, onAddNewBrand, onMenuClick, canManageStock, brands, allColors, onAddColor, onDeleteColor }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogoUrl, setNewBrandLogoUrl] = useState('');
  const [newBrandLogoFile, setNewBrandLogoFile] = useState<File | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newColor, setNewColor] = useState({ name: '', hex: '#ffffff' });
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleAddNewColor = () => {
    if (newColor.name.trim() && !allColors.some(c => c.name.toLowerCase() === newColor.name.trim().toLowerCase())) {
        onAddColor({ name: newColor.name.trim(), hex: newColor.hex });
        setNewColor({ name: '', hex: '#ffffff' });
    }
  };

  const allBrandsToDisplay = useMemo(() => {
    const dynamicBrands = brands;
    const staticBrandObjects: DynamicBrand[] = BRANDS.map(brandName => ({
      id: brandName,
      name: brandName,
      logoUrl: BRAND_LOGOS[brandName] || ''
    }));

    const combined = [...dynamicBrands];
    staticBrandObjects.forEach(staticBrand => {
      if (!combined.some(dynamicBrand => dynamicBrand.name === staticBrand.name)) {
        combined.push(staticBrand);
      }
    });
    
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [brands]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewBrandLogoFile(file);
      setNewBrandLogoUrl(''); // Clear URL if file is selected
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
        setBrandError("O nome da marca é obrigatório.");
        return;
    }
    if (!newBrandLogoFile && !newBrandLogoUrl.trim()) {
        setBrandError("É necessário adicionar um logo (arquivo ou URL).");
        return;
    }
    setBrandError(null);
    setIsSavingBrand(true);
    try {
        await onAddNewBrand(newBrandName, newBrandLogoFile || undefined, newBrandLogoUrl);
        // Reset form
        setNewBrandName('');
        setNewBrandLogoUrl('');
        setNewBrandLogoFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';

    } catch(error: any) {
        setBrandError(error.message || "Falha ao adicionar marca.");
    } finally {
        setIsSavingBrand(false);
    }
  };

  return (
    <>
      <div className="h-full w-full flex flex-col relative overflow-hidden">
        <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
            <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Configurações</h1>
            <div className="space-y-8 max-w-2xl mx-auto">
                <Card>
                    <SectionTitle>Chave de API (Inteligência Artificial)</SectionTitle>
                    <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Para usar os recursos de IA para gerar imagens e descrições, é necessário uma chave de API do Google AI Studio.
                    </p>
                    <button onClick={() => setIsApiKeyModalOpen(true)} className="bg-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                        Gerenciar Chave de API
                    </button>
                </Card>

                {canManageStock && (
                    <Card>
                        <SectionTitle>Gerenciamento de Cores</SectionTitle>
                        <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Adicione ou remova as cores disponíveis em todo o aplicativo.
                        </p>
                        <div className={`flex items-end gap-2 mb-4 p-3 rounded-lg border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <div className="flex-grow">
                                <label className={`text-xs font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Nome da Cor</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Azul Royal"
                                    value={newColor.name}
                                    onChange={e => setNewColor(c => ({...c, name: e.target.value}))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddNewColor();
                                        }
                                    }}
                                    className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                                />
                            </div>
                             <div className="relative">
                                <button 
                                    type="button" 
                                    onClick={() => colorInputRef.current?.click()}
                                    style={{
                                      background: newColor.hex === '#ffffff' 
                                        ? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' 
                                        : newColor.hex,
                                      borderColor: isDark ? '#4B5563' : '#D1D5DB'
                                    }}
                                    className="w-10 h-10 p-1 rounded-md cursor-pointer border-2"
                                />
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    value={newColor.hex}
                                    onChange={e => setNewColor(c => ({...c, hex: e.target.value}))}
                                    className="absolute top-0 left-0 w-0 h-0 opacity-0"
                                />
                            </div>
                            <button onClick={handleAddNewColor} className="bg-cyan-600 text-white font-bold h-10 px-4 rounded-lg hover:bg-cyan-700 transition">
                                Adicionar
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {allColors.map(color => (
                                <div key={color.name} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div style={{ backgroundColor: color.hex }} className="w-8 h-8 rounded-md border border-black/20" />
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{color.name}</span>
                                            <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{color.hex}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onDeleteColor(color.name)} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                
                {canManageStock && (
                    <Card>
                        <SectionTitle>Gerenciamento de Marcas</SectionTitle>
                        <div className="space-y-4">
                            <div>
                                <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Nome da Nova Marca</label>
                                <Input type="text" placeholder="Ex: Döhler®" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                            </div>
                            <div>
                                <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Logo da Marca (Arquivo)</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className={`w-full text-sm rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'text-gray-400 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600' : 'text-gray-600 file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200'}`} />
                            </div>
                            <div className="relative flex py-2 items-center">
                                <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}></div>
                                <span className={`flex-shrink mx-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>OU</span>
                                <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}></div>
                            </div>
                            <div>
                                 <label className={`text-sm font-semibold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Logo da Marca (URL)</label>
                                <Input type="text" placeholder="https://exemplo.com/logo.png" value={newBrandLogoUrl} onChange={e => { setNewBrandLogoUrl(e.target.value); setNewBrandLogoFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} />
                            </div>
                            
                            {brandError && <p className="text-sm text-red-500 font-semibold">{brandError}</p>}
                            
                            <button onClick={handleAddBrand} disabled={isSavingBrand} className="w-full mt-2 bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-cyan-700 transition disabled:bg-gray-500">
                                {isSavingBrand ? 'Salvando...' : 'Adicionar Nova Marca'}
                            </button>
                        </div>
                        <div className="border-t pt-4 mt-6" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                             <h3 className={`font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Marcas existentes</h3>
                             <div className="flex flex-wrap gap-4">
                                {allBrandsToDisplay.map(brand => (
                                    <div key={brand.id} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                                        <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 rounded-full object-contain bg-white p-1" />
                                        <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{brand.name}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </Card>
                )}
            </div>
        </main>
      </div>
       {isApiKeyModalOpen && (
          <ApiKeyModal
              onClose={() => setIsApiKeyModalOpen(false)}
              onSave={onSaveApiKey}
          />
      )}
    </>
  );
};

export default SettingsScreen;