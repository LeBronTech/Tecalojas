
import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import { ThemeContext, DynamicBrand, Brand, CardFees } from '../types';
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
  cardFees: CardFees;
  onSaveCardFees: (fees: CardFees) => void;
  sofaColors: { name: string; hex: string }[];
  onAddSofaColor: (color: { name: string; hex: string }) => void;
  onDeleteSofaColor: (colorName: string) => void;
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

const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    onSaveApiKey, onAddNewBrand, onMenuClick, canManageStock, brands, 
    allColors, onAddColor, onDeleteColor, 
    cardFees, onSaveCardFees,
    sofaColors, onAddSofaColor, onDeleteSofaColor
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogoUrl, setNewBrandLogoUrl] = useState('');
  const [newBrandLogoFile, setNewBrandLogoFile] = useState<File | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProductColor, setNewProductColor] = useState({ name: '', hex: '#ffffff' });
  const [productColorNameError, setProductColorNameError] = useState<string|null>(null);

  const [newSofaColor, setNewSofaColor] = useState({ name: '', hex: '#ffffff' });
  const [sofaColorNameError, setSofaColorNameError] = useState<string|null>(null);

  const [fees, setFees] = useState(cardFees);
  const [feesSaved, setFeesSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('Notification' in window ? Notification.permission : 'denied');


  useEffect(() => {
     setFees(cardFees);
  }, [cardFees]);


  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     setFees(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
     if(feesSaved) setFeesSaved(false);
 };

 const handleSaveFees = () => {
     onSaveCardFees(fees);
     setFeesSaved(true);
     setTimeout(() => setFeesSaved(false), 2000);
 };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
         setNewBrandLogoFile(e.target.files[0]);
         setNewBrandLogoUrl('');
     }
 };
  const handleAddBrand = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newBrandName.trim() || (!newBrandLogoUrl.trim() && !newBrandLogoFile)) {
       setBrandError('Nome da marca e logo (URL ou arquivo) são obrigatórios.');
       return;
     }
     setIsSavingBrand(true);
     setBrandError(null);
     try {
       await onAddNewBrand(newBrandName, newBrandLogoFile || undefined, newBrandLogoUrl);
       setNewBrandName('');
       setNewBrandLogoUrl('');
       setNewBrandLogoFile(null);
       if (fileInputRef.current) fileInputRef.current.value = '';
     } catch (err: any) {
       setBrandError(err.message);
     } finally {
       setIsSavingBrand(false);
     }
   };
 
 const handleAddProductColor = () => {
     if (!newProductColor.name.trim()) {
         setProductColorNameError("O nome da cor é obrigatório.");
         return;
     }
     if (allColors.some(c => c.name.toLowerCase() === newProductColor.name.trim().toLowerCase())) {
         setProductColorNameError("Esta cor já existe.");
         return;
     }
     onAddColor({ name: newProductColor.name.trim(), hex: newProductColor.hex });
     setNewProductColor({ name: '', hex: '#ffffff' });
     setProductColorNameError(null);
 };

 const handleAddSofaColor = () => {
    if (!newSofaColor.name.trim()) {
        setSofaColorNameError("O nome da cor é obrigatório.");
        return;
    }
    if (sofaColors.some(c => c.name.toLowerCase() === newSofaColor.name.trim().toLowerCase())) {
        setSofaColorNameError("Esta cor já existe.");
        return;
    }
    onAddSofaColor({ name: newSofaColor.name.trim(), hex: newSofaColor.hex });
    setNewSofaColor({ name: '', hex: '#ffffff' });
    setSofaColorNameError(null);
};

const handleRequestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
        });
    }
};


 const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
 
 return (
     <div className="h-full w-full flex flex-col relative overflow-hidden">
     <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
       <div className="max-w-4xl mx-auto space-y-8">
         <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Configurações</h1>
         
         {!canManageStock ? (
             <Card>
                 <p className={subtitleClasses}>Você não tem permissão para acessar esta área.</p>
             </Card>
         ) : (
           <>
             <Card>
                 <SectionTitle>Chave de API (Gemini)</SectionTitle>
                 <p className={subtitleClasses}>Necessária para recursos de Inteligência Artificial, como geração de imagens.</p>
                 <button onClick={() => setIsApiKeyModalOpen(true)} className="mt-4 bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                     Gerenciar Chave de API
                 </button>
             </Card>

             <Card>
                <SectionTitle>Notificações</SectionTitle>
                <p className={subtitleClasses}>Receba um alerta no seu dispositivo quando uma nova venda for solicitada.</p>
                <button
                    onClick={handleRequestNotificationPermission}
                    disabled={notificationPermission !== 'default'}
                    className="mt-4 bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {notificationPermission === 'granted' && 'Notificações Ativadas'}
                    {notificationPermission === 'denied' && 'Permissão Negada'}
                    {notificationPermission === 'default' && 'Ativar Notificações'}
                </button>
            </Card>

             <Card>
                 <SectionTitle>Gerenciar Marcas</SectionTitle>
                 <div className="flex flex-wrap gap-4 mb-6">
                     {brands.map(brand => (
                         <div key={brand.id} className={`p-2 rounded-lg flex items-center gap-2 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                             <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 rounded-full object-contain bg-white p-1" />
                             <span className="font-semibold">{brand.name}</span>
                         </div>
                     ))}
                 </div>
                 <form onSubmit={handleAddBrand} className="space-y-4">
                     <Input placeholder="Nome da nova marca" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                     <Input placeholder="URL do logo" value={newBrandLogoUrl} onChange={e => { setNewBrandLogoUrl(e.target.value); setNewBrandLogoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
                     <p className={`text-sm text-center ${subtitleClasses}`}>ou</p>
                     <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className={`w-full text-sm rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'text-gray-400 file:bg-gray-700 file:text-gray-200' : 'text-gray-600 file:bg-gray-100 file:text-gray-800'}`} />
                     {brandError && <p className="text-sm text-red-500">{brandError}</p>}
                     <button type="submit" disabled={isSavingBrand} className="bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition disabled:bg-gray-500">
                         {isSavingBrand ? 'Salvando...' : 'Adicionar Marca'}
                     </button>
                 </form>
             </Card>

             <Card>
                 <SectionTitle>Gerenciar Cores de Produtos</SectionTitle>
                 <div className="flex flex-wrap gap-3 mb-6 max-h-48 overflow-y-auto p-2 rounded-lg bg-black/10">
                     {allColors.map(color => (
                         <div key={color.name} className="flex flex-col items-center group relative">
                             <div style={{ backgroundColor: color.hex }} className="w-12 h-12 rounded-full border border-black/20"></div>
                             <span className={`text-xs mt-1 text-center truncate w-16 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{color.name}</span>
                             <button onClick={() => onDeleteColor(color.name)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                         </div>
                     ))}
                 </div>
                  <div className="flex items-end gap-3">
                     <div className="flex-grow">
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Nome da nova cor</label>
                         <Input value={newProductColor.name} onChange={e => setNewProductColor(prev => ({...prev, name: e.target.value}))} />
                     </div>
                     <div>
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Cor</label>
                         <input type="color" value={newProductColor.hex} onChange={e => setNewProductColor(prev => ({...prev, hex: e.target.value}))} className="w-12 h-12 p-1 rounded-lg bg-transparent border-0 cursor-pointer" />
                     </div>
                     <button onClick={handleAddProductColor} className="bg-fuchsia-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">Adicionar</button>
                 </div>
                  {productColorNameError && <p className="text-sm text-red-500 mt-2">{productColorNameError}</p>}
             </Card>
             
             <Card>
                 <SectionTitle>Gerenciar Cores de Mobília (Sofá/Cama)</SectionTitle>
                 <p className={`text-sm -mt-3 mb-4 ${subtitleClasses}`}>Essas cores serão usadas para gerar os fundos com IA.</p>
                 <div className="flex flex-wrap gap-3 mb-6 max-h-48 overflow-y-auto p-2 rounded-lg bg-black/10">
                     {sofaColors.map(color => (
                         <div key={color.name} className="flex flex-col items-center group relative">
                             <div style={{ backgroundColor: color.hex }} className="w-12 h-12 rounded-full border border-black/20"></div>
                             <span className={`text-xs mt-1 text-center truncate w-16 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{color.name}</span>
                             <button onClick={() => onDeleteSofaColor(color.name)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                         </div>
                     ))}
                 </div>
                  <div className="flex items-end gap-3">
                     <div className="flex-grow">
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Nome da nova cor de mobília</label>
                         <Input value={newSofaColor.name} onChange={e => setNewSofaColor(prev => ({...prev, name: e.target.value}))} />
                     </div>
                     <div>
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Cor</label>
                         <input type="color" value={newSofaColor.hex} onChange={e => setNewSofaColor(prev => ({...prev, hex: e.target.value}))} className="w-12 h-12 p-1 rounded-lg bg-transparent border-0 cursor-pointer" />
                     </div>
                     <button onClick={handleAddSofaColor} className="bg-fuchsia-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">Adicionar</button>
                 </div>
                  {sofaColorNameError && <p className="text-sm text-red-500 mt-2">{sofaColorNameError}</p>}
             </Card>

              <Card>
                 <SectionTitle>Taxas do Cartão (%)</SectionTitle>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Débito</label>
                         <Input type="number" name="debit" value={fees.debit || ''} onChange={handleFeeChange} placeholder="0.00" />
                     </div>
                     <div>
                          <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Crédito 1x</label>
                         <Input type="number" name="credit1x" value={fees.credit1x || ''} onChange={handleFeeChange} placeholder="0.00" />
                     </div>
                     <div>
                          <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Crédito 2x</label>
                         <Input type="number" name="credit2x" value={fees.credit2x || ''} onChange={handleFeeChange} placeholder="0.00" />
                     </div>
                      <div>
                          <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Crédito 3x</label>
                         <Input type="number" name="credit3x" value={fees.credit3x || ''} onChange={handleFeeChange} placeholder="0.00" />
                     </div>
                 </div>
                 <div className="flex items-center gap-4 mt-4">
                     <button onClick={handleSaveFees} className="bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">Salvar Taxas</button>
                     {feesSaved && <p className="text-sm text-green-500">Salvo com sucesso!</p>}
                 </div>
             </Card>
           </>
         )}
       </div>
     </main>
     {isApiKeyModalOpen && (
         <ApiKeyModal
             onClose={() => setIsApiKeyModalOpen(false)}
             onSave={(key) => { onSaveApiKey(key); setIsApiKeyModalOpen(false); }}
         />
     )}
   </div>
 );
};

export default SettingsScreen;
