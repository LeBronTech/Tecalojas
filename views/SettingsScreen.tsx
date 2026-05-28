
import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import { ThemeContext, DynamicBrand, Brand, CardFees, CategoryItem, Product, ProductFamily } from '../types';
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
  productFamilies: ProductFamily[];
  onAddProductFamily: (name: string, isCollection?: boolean) => void;
  onUpdateProductFamily: (id: string, data: Partial<ProductFamily>) => void;
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
    productFamilies, onAddProductFamily, onDeleteProductFamily, onUpdateProductFamily,
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
  const [newFamilyIsCollection, setNewFamilyIsCollection] = useState(false);
  const [editingFamilyIsCollection, setEditingFamilyIsCollection] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  const [familyIdToDelete, setFamilyIdToDelete] = useState<string | null>(null);

  // States of composition creator / family management
  const [familyTabState, setFamilyTabState] = useState<'create' | 'manage'>('create');
  const [selectedCushionsForNewFamily, setSelectedCushionsForNewFamily] = useState<string[]>([]);
  const [cushionSearchQuery, setCushionSearchQuery] = useState('');

  const displayedCategories = useMemo(() => {
    const isSub = categoryTab === 'subcategory';
    const dbItems = categories.filter(c => c.type === categoryTab);
    const dbNames = dbItems.map(c => c.name.toLowerCase());
    
    // Also extract categories/subcategories from products
    const productNames = products
      .map(p => isSub ? p.subCategory : p.category)
      .filter((c): c is string => !!c && c.trim() !== '');
      
    const uniqueProductNames = [...new Set(productNames)];
    
    // Combine them
    const combined: { id?: string, name: string, origin: 'db' | 'products' | 'both' }[] = [];
    
    // Add DB ones
    dbItems.forEach(item => {
      const hasOnProduct = uniqueProductNames.some(pn => pn.toLowerCase() === item.name.toLowerCase());
      combined.push({
        id: item.id,
        name: item.name,
        origin: hasOnProduct ? 'both' : 'db'
      });
    });
    
    // Add product ones that are not in DB
    uniqueProductNames.forEach(pn => {
      if (!dbNames.includes(pn.toLowerCase())) {
        combined.push({
          name: pn,
          origin: 'products'
        });
      }
    });
    
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products, categoryTab]);

  const handleDeleteCategoryCombined = async (item: { id?: string, name: string, origin: 'db' | 'products' | 'both' }) => {
    const isSub = categoryTab === 'subcategory';
    const confirmMessage = `Tem certeza que deseja excluir a ${isSub ? 'Sub-categoria' : 'Categoria'} "${item.name}"?` + 
      (item.origin !== 'db' ? ` Isso também irá remover esta categoria de todos os produtos associados no catálogo.` : '');
      
    if (!window.confirm(confirmMessage)) return;
    
    try {
      // 1. Delete from DB if present
      if (item.id) {
        await onDeleteCategory(item.id);
      }
      
      // 2. Clear from products in catalog if origin is 'products' or 'both'
      if (item.origin === 'products' || item.origin === 'both') {
        const matchingProducts = products.filter(p => 
          isSub 
            ? p.subCategory?.toLowerCase() === item.name.toLowerCase()
            : p.category?.toLowerCase() === item.name.toLowerCase()
        );
        
        for (const p of matchingProducts) {
          const updateData = isSub ? { subCategory: '' } : { category: '' };
          await onUpdateProduct(p.id, updateData);
        }
      }
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    }
  };

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
    onAddProductFamily(newFamilyName.trim(), newFamilyIsCollection);
    setNewFamilyName('');
    setNewFamilyIsCollection(false);
};

const handleCreateFamilyComposition = async () => {
    if (!newFamilyName.trim()) {
        alert("Por favor, digite um nome para a composição!");
        return;
    }
    if (selectedCushionsForNewFamily.length < 2) {
        alert("Por favor, selecione 2 ou mais almofadas para a composição!");
        return;
    }
    
    try {
        const familyId = `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newFamily: ProductFamily = {
            id: familyId,
            name: newFamilyName.trim(),
            isCollection: true
        };
        
        const updatedFamilies = [...productFamilies, newFamily];
        await api.updateGlobalSettings({ productFamilies: updatedFamilies });
        
        for (const pId of selectedCushionsForNewFamily) {
            const prod = products.find(p => p.id === pId);
            if (prod) {
                const currentFamilies = prod.familyIds || [];
                if (!currentFamilies.includes(familyId)) {
                    await onUpdateProduct(prod.id, { familyIds: [...currentFamilies, familyId] });
                }
            }
        }
        
        alert(`Composição "${newFamilyName}" criada com sucesso contendo ${selectedCushionsForNewFamily.length} almofadas!`);
        
        setNewFamilyName('');
        setSelectedCushionsForNewFamily([]);
        setCushionSearchQuery('');
        setFamilyTabState('manage');
        setSelectedFamilyId(familyId);
    } catch (err: any) {
        alert("Erro ao criar composição: " + err.message);
    }
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
                 <p className={`text-xs -mt-3 mb-4 ${subtitleClasses}`}>Mostra as categorias configuradas no site e nos produtos cadastrados.</p>
                 <div className={`flex p-1 rounded-lg mb-4 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                     <button onClick={() => setCategoryTab('category')} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${categoryTab === 'category' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>Categorias</button>
                     <button onClick={() => setCategoryTab('subcategory')} className={`flex-1 py-2 rounded-md font-bold text-sm transition ${categoryTab === 'subcategory' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>Sub-categorias</button>
                 </div>
                 
                 <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto p-2 rounded-lg bg-black/5 flex-grow">
                     {displayedCategories.length === 0 ? (
                         <p className="text-xs text-center text-gray-500 w-full py-4">Nenhuma categoria encontrada nesta aba.</p>
                     ) : (
                         displayedCategories.map(cat => (
                             <div key={cat.id || cat.name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                                 <span className="text-xs font-semibold">{cat.name}</span>
                                 {cat.origin !== 'db' && (
                                     <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-400 font-bold" title="Definido em produto cadastrado">
                                         Produto
                                     </span>
                                 )}
                                 <button onClick={() => handleDeleteCategoryCombined(cat)} className="text-red-500 hover:text-red-700 p-0.5" title="Excluir Categoria">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                 </button>
                             </div>
                         ))
                     )}
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
                 <SectionTitle>Gerenciar Famílias / Composições</SectionTitle>
                 <p className={`text-xs -mt-3 mb-4 ${subtitleClasses}`}>Associe 2 ou mais almofadas para criar composições integradas, visualizadas juntas no site.</p>
                 
                 {/* Abas Internas */}
                 <div className={`flex p-1 rounded-lg mb-6 ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                     <button 
                         type="button" 
                         onClick={() => setFamilyTabState('create')} 
                         className={`flex-1 py-1.5 rounded-md font-bold text-xs transition ${familyTabState === 'create' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}
                     >
                         Criar Nova Composição
                     </button>
                     <button 
                         type="button" 
                         onClick={() => setFamilyTabState('manage')} 
                         className={`flex-1 py-1.5 rounded-md font-bold text-xs transition ${familyTabState === 'manage' ? 'bg-fuchsia-600 text-white shadow' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}
                     >
                         Gerenciar Existentes ({productFamilies ? productFamilies.length : 0})
                     </button>
                 </div>
                 
                  {/* ABA 1: CRIAR NOVA COMPOSIÇÃO */}
                  {familyTabState === 'create' && (
                      <div className="space-y-4 mb-6">
                          <div className="flex flex-col sm:flex-row gap-3 items-end">
                              <div className="flex-grow w-full">
                                  <label className="text-xs font-bold mb-1 block text-gray-700 dark:text-gray-300">
                                      Nome da Composição / Família
                                  </label>
                                  <Input 
                                      value={newFamilyName} 
                                      onChange={e => setNewFamilyName(e.target.value)} 
                                      placeholder="Ex: Trio de Veludos Neutros..." 
                                  />
                              </div>
                              <button 
                                  type="button"
                                  onClick={handleCreateFamilyComposition} 
                                  className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition active:scale-95 text-xs flex-shrink-0"
                              >
                                  Salvar Composição ({selectedCushionsForNewFamily.length})
                              </button>
                          </div>

                          {/* Filtro de Busca de Almofadas */}
                          <div className="pt-2 border-t border-dashed border-gray-200 dark:border-white/10">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                      Selecione as Almofadas (Mínimo 2)
                                  </span>
                                  <Input 
                                      placeholder="Procurar almofada por nome..." 
                                      value={cushionSearchQuery} 
                                      onChange={e => setCushionSearchQuery(e.target.value)} 
                                      className="py-1 px-3 text-xs w-2/3 sm:max-w-xs"
                                  />
                              </div>

                              {/* Grid de Seleção Simplificada */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-2 border rounded-xl bg-black/5 no-scrollbar">
                                  {products.filter(p => p.name.toLowerCase().includes(cushionSearchQuery.toLowerCase())).map(product => {
                                      const isSelected = selectedCushionsForNewFamily.includes(product.id);
                                      return (
                                          <div 
                                              key={product.id}
                                              onClick={() => {
                                                  setSelectedCushionsForNewFamily(prev => 
                                                      prev.includes(product.id) 
                                                          ? prev.filter(id => id !== product.id)
                                                          : [...prev, product.id]
                                                  );
                                              }}
                                              className={`flex gap-2.5 p-2 items-center cursor-pointer rounded-xl border-2 transition-all ${
                                                  isSelected 
                                                      ? 'bg-fuchsia-600/10 border-fuchsia-500 shadow-md shadow-fuchsia-500/15 scale-[1.01]' 
                                                      : 'bg-white/40 border-gray-200/50 hover:border-gray-400 dark:bg-black/10 dark:border-white/5 dark:hover:border-white/20'
                                              }`}
                                          >
                                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-black/20 border border-gray-200/20">
                                                  <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              </div>
                                              <div className="flex-grow min-w-0">
                                                  <p className="text-[11px] font-bold truncate text-gray-800 dark:text-gray-200">{product.name}</p>
                                                  <p className="text-[9px] text-gray-500 font-medium truncate">{product.category || 'Sem categoria'}</p>
                                              </div>
                                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                  isSelected ? 'bg-fuchsia-600 border-transparent text-white' : 'border-gray-300 dark:border-white/20'
                                              }`}>
                                                  {isSelected && (
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                      </svg>
                                                  )}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* ABA 2: GERENCIAR COMPOSIÇÕES EXISTENTES */}
                  {familyTabState === 'manage' && (
                      <div className="space-y-6">
                          {/* Lista Horizontal de Composições Cadastradas */}
                          <div>
                              <label className="text-[10px] font-black uppercase tracking-wider mb-2 block text-gray-500 dark:text-gray-400">
                                  Selecione a Composição para Gerenciar
                              </label>
                              {(!productFamilies || productFamilies.length === 0) ? (
                                  <p className="text-xs text-gray-500 text-center py-4 bg-black/5 rounded-xl border border-dashed border-gray-200 dark:border-white/5">Nenhuma composição criada ainda.</p>
                              ) : (
                                  <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto no-scrollbar py-1">
                                      {productFamilies.map(family => {
                                          const familyCushions = products.filter(p => (p.familyIds || []).includes(family.id));
                                          const isSelected = selectedFamilyId === family.id;
                                          return (
                                              <div key={family.id} className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1.5 rounded-xl border border-transparent hover:border-fuchsia-500/20 transition-all">
                                                  <button
                                                      type="button"
                                                      onClick={() => setSelectedFamilyId(isSelected ? null : family.id)}
                                                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                                          isSelected 
                                                              ? 'bg-fuchsia-600 text-white shadow-sm' 
                                                              : 'text-gray-700 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'
                                                      }`}
                                                  >
                                                      <span className="truncate max-w-44">{family.name}</span>
                                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-500 dark:text-gray-400'}`}>
                                                          {familyCushions.length}
                                                      </span>
                                                  </button>
                                                  <button 
                                                      type="button"
                                                      onClick={() => {
                                                          if (familyIdToDelete === family.id) {
                                                              onDeleteProductFamily(family.id);
                                                              if (selectedFamilyId === family.id) setSelectedFamilyId(null);
                                                              setFamilyIdToDelete(null);
                                                          } else {
                                                              setFamilyIdToDelete(family.id);
                                                              setTimeout(() => setFamilyIdToDelete(null), 4000);
                                                          }
                                                      }}
                                                      className={`p-1.5 rounded-lg transition-all flex-shrink-0 flex items-center gap-1 ${
                                                          familyIdToDelete === family.id 
                                                              ? 'bg-red-600 text-white hover:bg-red-700 font-extrabold text-[10px] animate-pulse px-2 py-1 shadow-sm' 
                                                              : 'text-red-500 hover:text-red-700 hover:bg-red-500/10'
                                                      }`}
                                                      title={familyIdToDelete === family.id ? "Clique novamente para CONFIRMAR" : "Excluir Composição"}
                                                  >
                                                      {familyIdToDelete === family.id ? (
                                                          <span className="font-extrabold uppercase animate-pulse">Confirmar?</span>
                                                      ) : (
                                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                          </svg>
                                                      )}
                                                  </button>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>

                          {/* Editor Completo da Composição Selecionada */}
                          {selectedFamilyId && (() => {
                              const family = productFamilies.find(f => f.id === selectedFamilyId);
                              if (!family) return null;
                              
                              const members = products.filter(p => (p.familyIds || []).includes(selectedFamilyId));
                              const nonMembers = products.filter(p => !(p.familyIds || []).includes(selectedFamilyId) && p.name.toLowerCase().includes(familySearchTerm.toLowerCase()));
                              
                              return (
                                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'} space-y-4`}>
                                      {/* Cabecalho de Edição */}
                                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2.5 border-b border-dashed border-gray-200 dark:border-white/10">
                                          <div>
                                              <label className="text-[10px] font-black uppercase text-fuchsia-600 dark:text-fuchsia-400 tracking-wider block mb-1">Nome da Composição</label>
                                              <input 
                                                  type="text" 
                                                  value={family.name} 
                                                  onChange={(e) => onUpdateProductFamily(family.id, { name: e.target.value })}
                                                  className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border-2 transition focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:border-transparent ${isDark ? 'bg-black/40 text-white border-white/10' : 'bg-white text-gray-900 border-gray-200'}`}
                                                  placeholder="Nome da composição"
                                              />
                                              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1 block">Contém {members.length} almofada(s) vinculada(s)</span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                              <input 
                                                  type="checkbox" 
                                                  id="isCollectionEdit" 
                                                  checked={family.isCollection || false} 
                                                  onChange={(e) => onUpdateProductFamily(selectedFamilyId, { isCollection: e.target.checked })}
                                                  className="h-4 w-4 text-fuchsia-600 border-gray-400 rounded focus:ring-fuchsia-500 cursor-pointer"
                                              />
                                              <label htmlFor="isCollectionEdit" className={`text-xs font-semibold cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                  Coleção Integrada?
                                              </label>
                                          </div>
                                      </div>

                                      {/* 1. Almofadas Atualmente Vinculadas (Com Exclusão Direta) */}
                                      <div>
                                          <span className="text-[10px] font-black uppercase tracking-wider block mb-2 text-gray-750 dark:text-gray-300">
                                              Almofadas Atualmente Vinculadas ({members.length})
                                          </span>
                                          {members.length === 0 ? (
                                              <p className="text-xs text-center text-gray-500 py-4 bg-black/5 rounded-xl border border-dashed border-gray-250 dark:border-white/5">Esta composição está vazia. Vincule almofadas abaixo!</p>
                                          ) : (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                  {members.map(product => (
                                                      <div key={product.id} className="flex gap-2.5 p-2 items-center rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5">
                                                          <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-black/20" referrerPolicy="no-referrer" />
                                                          <div className="flex-grow min-w-0">
                                                              <p className="text-[11px] font-bold truncate text-gray-800 dark:text-gray-200">{product.name}</p>
                                                              <p className="text-[9px] text-gray-500 truncate font-medium">{product.category}</p>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => handleToggleProductFamily(product, selectedFamilyId)}
                                                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                                                              title="Excluir Almofada da Composição"
                                                          >
                                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                              </svg>
                                                          </button>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>

                                      {/* 2. Incluir Outras Almofadas do Catálogo */}
                                      <div className="pt-2 border-t border-dashed border-gray-200 dark:border-white/10">
                                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                  Incluir Outras Almofadas do Catálogo
                                              </span>
                                              <Input 
                                                  placeholder="Filtrar catálogo para incluir..." 
                                                  value={familySearchTerm} 
                                                  onChange={e => setFamilySearchTerm(e.target.value)} 
                                                  className="py-1 px-3 text-xs w-full sm:max-w-xs"
                                              />
                                          </div>
                                          {nonMembers.length === 0 ? (
                                              <p className="text-xs text-center text-gray-500 py-3 block">Nenhum outro produto correspondente no catálogo.</p>
                                          ) : (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1.5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-black/5 no-scrollbar">
                                                  {nonMembers.map(product => (
                                                      <button
                                                          type="button"
                                                          key={product.id}
                                                          onClick={() => handleToggleProductFamily(product, selectedFamilyId)}
                                                          className="flex gap-2.5 p-1.5 items-center rounded-lg border border-transparent hover:border-fuchsia-500/30 bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-left transition-all text-xs"
                                                      >
                                                          <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-black/20" referrerPolicy="no-referrer" />
                                                          <div className="flex-grow min-w-0">
                                                              <p className="text-[11px] font-bold truncate text-gray-800 dark:text-gray-200">{product.name}</p>
                                                              <p className="text-[9px] text-gray-500 truncate font-medium">{product.category}</p>
                                                          </div>
                                                          <span className="text-fuchsia-500 text-[10px] font-black p-1 hover:bg-fuchsia-500/10 rounded flex items-center justify-center font-mono">
                                                              + Incluir
                                                          </span>
                                                      </button>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })()}
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
