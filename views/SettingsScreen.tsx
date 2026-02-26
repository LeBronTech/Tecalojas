
import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import { ThemeContext, DynamicBrand, Brand, CardFees, CategoryItem, Product } from '../types';
import { BRANDS, BRAND_LOGOS } from '../constants';
import * as api from '../firebase';

interface SettingsScreenProps {
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
  categories: CategoryItem[];
  onAddCategory: (name: string, type: 'category' | 'subcategory') => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  productFamilies: {id: string, name: string}[];
  onAddProductFamily: (name: string) => void;
  onDeleteProductFamily: (id: string) => void;
  products: Product[];
  onUpdateProduct: (id: string, data: Partial<Product>) => Promise<void>;
}

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

const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    onAddNewBrand, onMenuClick, canManageStock, brands, 
    allColors, onAddColor, onDeleteColor, 
    cardFees, onSaveCardFees,
    sofaColors, onAddSofaColor, onDeleteSofaColor,
    categories, onAddCategory, onDeleteCategory,
    productFamilies, onAddProductFamily, onDeleteProductFamily,
    products, onUpdateProduct
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  // Safety check for cardFees
  const safeCardFees = cardFees || { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 };

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
  const [fees, setFees] = useState(safeCardFees);
  const [feesSaved, setFeesSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('Notification' in window ? Notification.permission : 'denied');
  
  const [categoryTab, setCategoryTab] = useState<'category' | 'subcategory'>('category');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  const [isUpdatingFeed, setIsUpdatingFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string>("Carregando link...");
  const [copySuccess, setCopySuccess] = useState(false);

  // Families state
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [familySearchTerm, setFamilySearchTerm] = useState('');

  useEffect(() => {
     setFees(safeCardFees);
  }, [cardFees]);

  // Generate the fixed Feed URL on component mount (it's predictable based on storage bucket)
  useEffect(() => {
      // Standard Firebase Storage URL pattern:
      // https://firebasestorage.googleapis.com/v0/b/[BUCKET]/o/[PATH]?alt=media
      const bucket = "teca-54f58.appspot.com"; 
      const path = encodeURIComponent("catalogs/meta_feed.csv");
      setFeedUrl(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`);
  }, []);

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
       setBrandError('Nome da marca e logo são obrigatórios.');
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
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            if (permission === 'granted') {
                new Notification("Notificações Ativadas!", {
                    body: "Você agora receberá alertas de novas vendas.",
                    icon: "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"
                });
            }
        });
    }
};

const testNotification = () => {
    if (notificationPermission === 'granted') {
        new Notification("Teste de Venda", {
            body: "Este é um alerta de teste para confirmar o som e vibração.",
            icon: "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"
        });
    } else {
        handleRequestNotificationPermission();
    }
};

const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryError(null);
    try {
        await onAddCategory(newCategoryName, categoryTab);
        setNewCategoryName('');
    } catch (e: any) {
        setCategoryError(e.message);
    }
};

const handleForceUpdateFeed = async () => {
    setIsUpdatingFeed(true);
    const unsubscribe = api.onProductsUpdate((products: Product[]) => {
        api.updateMetaCatalogFeed(products).then((url) => {
            setFeedUrl(url);
            alert("Feed atualizado com sucesso!");
            setIsUpdatingFeed(false);
            unsubscribe();
        }).catch(err => {
            console.error(err);
            alert("Erro ao atualizar feed.");
            setIsUpdatingFeed(false);
            unsubscribe();
        });
    }, (err) => {
        console.error(err);
        setIsUpdatingFeed(false);
    });
};

const copyFeedUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
}

const handleAddFamily = () => {
    if (!newFamilyName.trim()) return;
    onAddProductFamily(newFamilyName.trim());
    setNewFamilyName('');
};

const handleToggleProductFamily = async (product: Product, familyId: string) => {
    const currentFamilies = product.familyIds || [];
    const isMember = currentFamilies.includes(familyId);

    if (isMember) {
        // Remove from family
        await onUpdateProduct(product.id, { familyIds: currentFamilies.filter(id => id !== familyId) });
    } else {
        // Add to family
        if (currentFamilies.length > 0) {
            const confirm = window.confirm(`O produto "${product.name}" já pertence a outra(s) família(s). Deseja mudar a família (OK) ou adicionar a uma segunda família (Cancelar)?`);
            if (confirm) {
                // Change family (replace)
                await onUpdateProduct(product.id, { familyIds: [familyId] });
            } else {
                // Add to second family
                await onUpdateProduct(product.id, { familyIds: [...currentFamilies, familyId] });
            }
        } else {
            await onUpdateProduct(product.id, { familyIds: [familyId] });
        }
    }
};

 const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
 
 return (
     <div className="h-full w-full flex flex-col relative overflow-hidden">
     <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
       <div className="max-w-4xl mx-auto space-y-8">
         <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Configurações</h1>
         
         <Card className={isDark ? 'border-fuchsia-500/30' : 'border-purple-200'}>
            <div className="flex items-center justify-between">
                <div>
                    <SectionTitle>Status da Conta</SectionTitle>
                    <p className={subtitleClasses}>Verificação de privilégios do sistema.</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 ${canManageStock ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${canManageStock ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></div>
                    {canManageStock ? 'Administrador' : 'Usuário Comum'}
                </div>
            </div>
         </Card>

         {!canManageStock ? (
             <Card>
                 <p className={subtitleClasses}>Você não tem permissão para gerenciar as configurações avançadas.</p>
             </Card>
         ) : (
           <>
             <Card>
                <SectionTitle>Automação de Catálogo (Meta/Facebook)</SectionTitle>
                <p className={`mb-4 ${subtitleClasses}`}>Gerencie a conexão automática com a sacolinha do Instagram e Facebook.</p>
                
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-500 rounded-full p-1 text-white">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Link do Feed Vivo (Live Feed)</h3>
                    </div>
                    <p className={`text-sm mb-4 ${subtitleClasses}`}>
                        Este link contém seus produtos atualizados em tempo real. Cole-o no Gerenciador de Comércio do Facebook (Fontes de Dados &gt; Feed Programado).
                    </p>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            readOnly 
                            value={feedUrl} 
                            className={`flex-grow text-xs p-3 rounded-lg border focus:outline-none ${isDark ? 'bg-black/40 border-white/10 text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}
                        />
                        <button 
                            onClick={copyFeedUrl}
                            className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${copySuccess ? 'bg-green-500 text-white' : (isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800')}`}
                        >
                            {copySuccess ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <p>O feed é atualizado automaticamente ao editar produtos.</p>
                        <button onClick={handleForceUpdateFeed} disabled={isUpdatingFeed} className="text-fuchsia-500 hover:underline">
                            {isUpdatingFeed ? 'Atualizando...' : 'Forçar Atualização Agora'}
                        </button>
                    </div>
                </div>
             </Card>

             <Card>
                <SectionTitle>Notificações de Venda</SectionTitle>
                <p className={subtitleClasses}>Receba alertas no seu dispositivo quando um cliente solicitar um pedido.</p>
                <div className="flex flex-wrap gap-3 mt-4">
                    <button
                        onClick={handleRequestNotificationPermission}
                        className={`font-bold py-2 px-6 rounded-lg transition ${notificationPermission === 'granted' ? 'bg-green-600 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'}`}
                    >
                        {notificationPermission === 'granted' ? 'Permissão Concedida ✓' : 'Ativar Notificações'}
                    </button>
                    {notificationPermission === 'granted' && (
                        <button
                            onClick={testNotification}
                            className={`font-bold py-2 px-6 rounded-lg border-2 ${isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                        >
                            Testar Alerta
                        </button>
                    )}
                </div>
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
                 <SectionTitle>Gerenciar Categorias</SectionTitle>
                 <div className={`flex p-1 rounded-lg mb-4 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                     <button onClick={() => setCategoryTab('category')} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${categoryTab === 'category' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>Categorias</button>
                     <button onClick={() => setCategoryTab('subcategory')} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${categoryTab === 'subcategory' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>Sub-categorias</button>
                 </div>
                 
                 <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto p-2 rounded-lg bg-black/5">
                     {categories.filter(c => c.type === categoryTab).map(cat => (
                         <div key={cat.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                             <span className="text-sm font-semibold">{cat.name}</span>
                             <button onClick={() => onDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                         </div>
                     ))}
                 </div>

                 <div className="flex gap-2">
                     <Input 
                        placeholder={categoryTab === 'category' ? "Nova Categoria..." : "Nova Sub-categoria..."} 
                        value={newCategoryName} 
                        onChange={e => setNewCategoryName(e.target.value)} 
                     />
                     <button onClick={handleAddCategorySubmit} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-cyan-700 transition">
                         Adicionar
                     </button>
                 </div>
                 {categoryError && <p className="text-sm text-red-500 mt-2">{categoryError}</p>}
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
             </Card>

             <Card>
                 <SectionTitle>Gerenciar Famílias</SectionTitle>
                 <div className="flex items-end gap-3 mb-6">
                     <div className="flex-grow">
                         <label className={`text-sm font-semibold mb-1 block ${subtitleClasses}`}>Nome da nova família</label>
                         <Input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Ex: Família Floral" />
                     </div>
                     <button onClick={handleAddFamily} className="bg-fuchsia-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">Adicionar</button>
                 </div>

                 {productFamilies && productFamilies.length > 0 && (
                     <div className="mb-6">
                         <label className={`text-sm font-semibold mb-2 block ${subtitleClasses}`}>Selecione uma família para gerenciar</label>
                         <div className="flex flex-wrap gap-2">
                             {productFamilies.map(family => (
                                 <div key={family.id} className="flex items-center gap-1">
                                     <button
                                         type="button"
                                         onClick={() => setSelectedFamilyId(family.id === selectedFamilyId ? null : family.id)}
                                         className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedFamilyId === family.id ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-black/30 text-gray-300 hover:bg-black/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}`}
                                     >
                                         {family.name}
                                     </button>
                                     <button 
                                        type="button"
                                        title="Excluir Família"
                                        style={{ minWidth: '44px', minHeight: '44px', zIndex: 50 }}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log("CLICK DETECTED on trash icon for family:", family.id);
                                          
                                          if (!onDeleteProductFamily) {
                                              console.error("onDeleteProductFamily is UNDEFINED");
                                              return;
                                          }

                                          const confirmed = window.confirm(`Deseja realmente EXCLUIR a família "${family.name}"?`);
                                          if(confirmed) {
                                              console.log("User confirmed deletion of:", family.id);
                                              onDeleteProductFamily(family.id);
                                              if (selectedFamilyId === family.id) setSelectedFamilyId(null);
                                          } else {
                                              console.log("User cancelled deletion.");
                                          }
                                      }} className="flex-shrink-0 flex items-center justify-center p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all active:scale-90">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     </button>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 {selectedFamilyId && (
                     <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex justify-between items-center mb-4">
                             <h3 className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                 Produtos na família: {productFamilies.find(f => f.id === selectedFamilyId)?.name}
                             </h3>
                             <Input 
                                 placeholder="Buscar produtos..." 
                                 value={familySearchTerm} 
                                 onChange={e => setFamilySearchTerm(e.target.value)} 
                                 className="max-w-xs"
                             />
                         </div>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2 scrollbar-thin">
                             {products.filter(p => p.name.toLowerCase().includes(familySearchTerm.toLowerCase())).map(product => {
                                 const isMember = (product.familyIds || []).includes(selectedFamilyId);
                                 return (
                                     <div 
                                         key={product.id} 
                                         onClick={() => handleToggleProductFamily(product, selectedFamilyId)}
                                         className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${isMember ? 'border-fuchsia-500 shadow-md shadow-fuchsia-500/20' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                                     >
                                         <img src={product.baseImageUrl} alt={product.name} className="w-full aspect-square object-cover" />
                                         <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm">
                                             <p className="text-white text-xs font-semibold truncate text-center">{product.name}</p>
                                         </div>
                                         {isMember && (
                                             <div className="absolute top-2 right-2 bg-fuchsia-500 text-white rounded-full p-1">
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 )}
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
   </div>
 );
};

export default SettingsScreen;
