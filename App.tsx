
import React, { useState, useCallback, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Product, View, Theme, User, StoreName, Variation, CushionSize, DynamicBrand, CatalogPDF, SavedComposition, ThemeContext, ThemeContextType, CartItem, SaleRequest, CardFees, CategoryItem } from './types';
import { INITIAL_PRODUCTS, PREDEFINED_COLORS, PREDEFINED_SOFA_COLORS } from './constants';
import LoginScreen from './views/LoginScreen';
import ShowcaseScreen from './views/ShowcaseScreen';
import StockManagementScreen from './views/StockManagementScreen';
import SettingsScreen from './views/SettingsScreen';
import CatalogScreen from './views/CatalogScreen';
import CompositionGeneratorScreen from './views/CompositionGeneratorScreen';
import CompositionsScreen from './views/CompositionsScreen';
import AssistantScreen from './views/ReplacementScreen';
import DiagnosticsScreen from './views/DiagnosticsScreen';
import CartScreen from './views/CartScreen';
import PaymentScreen from './views/PaymentScreen';
import SalesScreen from './views/SalesScreen';
import QrCodeScreen from './views/QrCodeScreen';
import AddEditProductModal from './components/AddEditProductModal';
import SignUpModal from './SignUpModal';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ConfirmationModal from './components/ConfirmationModal';
import { ProductCreationWizard } from './views/ProductCreationWizard';
import * as api from './firebase';
import { firebaseConfig } from './firebaseConfig';

declare global {
  interface Window {
    cordova?: any;
    plugins?: any;
    completeGoogleSignIn?: (idToken: string | null, errorMsg: string | null) => void;
  }
}

const THEME_STORAGE_KEY = 'pillow-oasis-theme';
const CART_STORAGE_KEY = 'pillow-oasis-cart';

// --- ICONS AND SIDEMENU ---
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const CompositionIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>);
const InventoryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>);
const ReplacementIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const DiagnosticsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const SalesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const CatalogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const PixIcon = () => <img src="https://i.postimg.cc/6qF1dkk4/5.png" alt="PIX" className="h-5 w-5 object-contain" />;
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const LoginIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);

interface SideMenuProps { isOpen: boolean; onClose: () => void; onLogout: () => void; onLoginClick: () => void; onPixClick: () => void; activeView: View; onNavigate: (view: View) => void; isLoggedIn: boolean; isAdmin: boolean; hasItemsToRestock: boolean; hasNewSaleRequests: boolean; }
const MenuButton = ({ icon, label, isActive, onClick, hasNotification }: any) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${isActive ? (isDark ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' : 'bg-purple-100 text-purple-700 border-purple-200') : (isDark ? 'text-gray-400 hover:bg-white/5 border-transparent' : 'text-gray-600 hover:bg-gray-50 border-transparent')}`}>
            <div className="flex items-center gap-3"><span className={isActive ? (isDark ? 'text-fuchsia-400' : 'text-purple-700') : 'text-gray-400'}>{icon}</span><span className="font-bold text-sm">{label}</span></div>
            {hasNotification && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
        </button>
    );
};
const SideMenu = ({ isOpen, onClose, onLogout, onLoginClick, onPixClick, activeView, onNavigate, isLoggedIn, isAdmin, hasItemsToRestock, hasNewSaleRequests }: SideMenuProps) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`absolute top-0 left-0 w-80 max-w-[85%] h-full flex flex-col transition-transform duration-300 ease-out border-r ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center"><h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h2><button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <div className="flex-grow overflow-y-auto p-4 space-y-1 no-scrollbar">
                    <div className="pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Navegação</div>
                    <MenuButton icon={<HomeIcon />} label="Vitrine" isActive={activeView === View.SHOWCASE} onClick={() => { onNavigate(View.SHOWCASE); onClose(); }} />
                    <MenuButton icon={<CompositionIcon />} label="Composições" isActive={activeView === View.COMPOSITIONS} onClick={() => { onNavigate(View.COMPOSITIONS); onClose(); }} />
                    {isAdmin && (<><div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Administração</div><MenuButton icon={<SalesIcon />} label="Vendas" isActive={activeView === View.SALES} onClick={() => { onNavigate(View.SALES); onClose(); }} hasNotification={hasNewSaleRequests} /><MenuButton icon={<InventoryIcon />} label="Estoque" isActive={activeView === View.STOCK} onClick={() => { onNavigate(View.STOCK); onClose(); }} /><MenuButton icon={<ReplacementIcon />} label="Assistente" isActive={activeView === View.ASSISTANT} onClick={() => { onNavigate(View.ASSISTANT); onClose(); }} hasNotification={hasItemsToRestock} /><MenuButton icon={<DiagnosticsIcon />} label="Diagnósticos" isActive={activeView === View.DIAGNOSTICS} onClick={() => { onNavigate(View.DIAGNOSTICS); onClose(); }} /><MenuButton icon={<CatalogIcon />} label="Catálogos" isActive={activeView === View.CATALOG} onClick={() => { onNavigate(View.CATALOG); onClose(); }} /><MenuButton icon={<SettingsIcon />} label="Configurações" isActive={activeView === View.SETTINGS} onClick={() => { onNavigate(View.SETTINGS); onClose(); }} /></>)}
                    <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Ações</div><MenuButton icon={<PixIcon />} label="Pagamento via PIX" onClick={() => { onPixClick(); onClose(); }} />
                </div>
                <div className="p-4 border-t border-white/10">{isLoggedIn ? (<button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 font-bold hover:bg-red-500/10 transition-colors"><LogoutIcon />Sair da Conta</button>) : (<button onClick={onLoginClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-fuchsia-600 text-white font-bold shadow-lg hover:bg-fuchsia-700 transition-colors"><LoginIcon />Acessar Sistema</button>)}</div>
            </div>
        </div>
    );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>(View.SHOWCASE);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<DynamicBrand[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogPDF[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(THEME_STORAGE_KEY) as Theme || 'light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleRequests, setSaleRequests] = useState<SaleRequest[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);
  
  // Settings from Firestore
  const [allColors, setAllColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_COLORS);
  const [sofaColors, setSofaColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_SOFA_COLORS);
  const [cardFees, setCardFees] = useState<CardFees>({ debit: 1.0, credit1x: 1.5, credit2x: 2.0, credit3x: 4.0 });
  const [weeklyGoal, setWeeklyGoal] = useState(0);

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  useEffect(() => {
    const unsubscribe = api.onSettingsUpdate((settings) => {
        if (settings) {
            if (settings.allColors) setAllColors(settings.allColors);
            if (settings.sofaColors) setSofaColors(settings.sofaColors);
            if (settings.cardFees) setCardFees(settings.cardFees);
            if (settings.weeklyGoal !== undefined) setWeeklyGoal(settings.weeklyGoal);
        }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateGlobalSettings = useCallback(async (newData: any) => {
      await api.updateGlobalSettings(newData);
  }, []);

  const handleAddColor = useCallback((c: {name: string, hex: string}) => {
      handleUpdateGlobalSettings({ allColors: [...allColors, c] });
  }, [allColors, handleUpdateGlobalSettings]);

  const handleDeleteColor = useCallback((n: string) => {
      handleUpdateGlobalSettings({ allColors: allColors.filter(c => c.name !== n) });
  }, [allColors, handleUpdateGlobalSettings]);

  const handleAddSofaColor = useCallback((c: {name: string, hex: string}) => {
      handleUpdateGlobalSettings({ sofaColors: [...sofaColors, c] });
  }, [sofaColors, handleUpdateGlobalSettings]);

  const handleDeleteSofaColor = useCallback((n: string) => {
      handleUpdateGlobalSettings({ sofaColors: sofaColors.filter(c => c.name !== n) });
  }, [sofaColors, handleUpdateGlobalSettings]);

  const handleUpdateStock = useCallback(async (productId: string, variationSize: CushionSize, store: StoreName, change: number) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate) return;
    const updatedProduct = JSON.parse(JSON.stringify(productToUpdate));
    const variationToUpdate = updatedProduct.variations.find((v: Variation) => v.size === variationSize);
    if (!variationToUpdate) return;
    variationToUpdate.stock[store] = Math.max(0, variationToUpdate.stock[store] + change);
    const { id, ...productData } = updatedProduct;
    try { await api.updateProductData(id, productData); } catch (e) {}
  }, [products]);

  const handleSaveProduct = useCallback(async (p: Product) => {
      try {
          if (p.id) await api.updateProductData(p.id, p);
          else await api.addProductData(p);
          setEditingProduct(null);
      } catch (e) { alert("Erro ao salvar produto."); }
  }, []);

  useEffect(() => {
    const unsubProducts = api.onProductsUpdate((items) => setProducts(items), () => {});
    const unsubBrands = api.onBrandsUpdate((items) => setBrands(items), () => {});
    const unsubCatalogs = api.onCatalogsUpdate((items) => setCatalogs(items), () => {});
    const unsubCategories = api.onCategoriesUpdate((items) => setCategories(items), () => {});
    const unsubscribeAuth = api.onAuthStateChanged((user) => { setCurrentUser(user); setAuthLoading(false); });
    const unsubscribeSales = api.onSaleRequestsUpdate((reqs) => setSaleRequests(reqs), () => {});
    return () => { unsubProducts(); unsubBrands(); unsubCatalogs(); unsubCategories(); unsubscribeAuth(); unsubscribeSales(); };
  }, []);

  const toggleTheme = useCallback(() => setTheme(p => p === 'light' ? 'dark' : 'light'), []);
  const handleNavigate = useCallback((v: View) => setView(v), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1A1129] text-white' : 'bg-white text-gray-900'}`}>
            <Header onMenuClick={() => setIsMenuOpen(true)} cartItemCount={cart.length} onCartClick={() => setView(View.CART)} activeView={view} onNavigate={handleNavigate} isAdmin={isAdmin} />
            
            {view === View.SHOWCASE && <ShowcaseScreen products={products} hasFetchError={false} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={() => {}} sofaColors={sofaColors} cart={cart} />}
            {view === View.STOCK && <StockManagementScreen products={products} onEditProduct={setEditingProduct} onAddProduct={() => setIsWizardOpen(true)} onDeleteProduct={setDeletingProductId} onUpdateStock={handleUpdateStock} canManageStock={isAdmin} hasFetchError={false} brands={brands} onMenuClick={() => setIsMenuOpen(true)} />}
            {view === View.SALES && <SalesScreen saleRequests={saleRequests} onCompleteSaleRequest={api.completeSaleRequest} products={products} onMenuClick={() => setIsMenuOpen(true)} cardFees={cardFees} />}
            {view === View.DIAGNOSTICS && <DiagnosticsScreen products={products} saleRequests={saleRequests} cardFees={cardFees} onMenuClick={() => setIsMenuOpen(true)} />}
            {view === View.SETTINGS && <SettingsScreen canManageStock={isAdmin} brands={brands} allColors={allColors} onAddColor={handleAddColor} onDeleteColor={handleDeleteColor} onMenuClick={() => setIsMenuOpen(true)} cardFees={cardFees} onSaveCardFees={(f) => handleUpdateGlobalSettings({cardFees: f})} sofaColors={sofaColors} onAddSofaColor={handleAddSofaColor} onDeleteSofaColor={handleDeleteSofaColor} categories={categories} onAddCategory={api.addCategory} onDeleteCategory={api.deleteCategory} onAddNewBrand={api.addBrand as any} />}
            {view === View.ASSISTANT && <AssistantScreen products={products} onEditProduct={setEditingProduct} onDeleteProduct={setDeletingProductId} canManageStock={isAdmin} onMenuClick={() => setIsMenuOpen(true)} />}
            {view === View.QR_CODES && <QrCodeScreen products={products} />}

            <BottomNav activeView={view} onNavigate={handleNavigate} hasItemsToRestock={false} isAdmin={isAdmin} hasNewSaleRequests={false} />
            <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onLogout={api.signOut} onLoginClick={() => setView(View.STOCK)} onPixClick={() => setIsPixModalOpen(true)} activeView={view} onNavigate={handleNavigate} isLoggedIn={!!currentUser} isAdmin={isAdmin} hasItemsToRestock={false} hasNewSaleRequests={false} />
            
            {editingProduct && <AddEditProductModal product={editingProduct} products={products} onClose={() => setEditingProduct(null)} onSave={handleSaveProduct as any} onCreateVariations={() => Promise.resolve()} onSwitchProduct={setEditingProduct} onRequestDelete={setDeletingProductId} categories={[]} allColors={allColors} onAddColor={handleAddColor} onDeleteColor={handleDeleteColor} brands={brands} sofaColors={sofaColors} />}
            {isWizardOpen && <ProductCreationWizard onClose={() => setIsWizardOpen(false)} onConfigure={async (newPs, configP) => { await Promise.all(newPs.map(p => api.addProductData(p))); setIsWizardOpen(false); }} allColors={allColors} onAddColor={handleAddColor} categories={[]} products={products} brands={brands} />}
            <ConfirmationModal isOpen={!!deletingProductId} onClose={() => setDeletingProductId(null)} onConfirm={async () => { if(deletingProductId) await api.deleteProduct(deletingProductId); setDeletingProductId(null); }} title="Excluir" message="Tem certeza?" />
        </div>
    </ThemeContext.Provider>
  );
}
