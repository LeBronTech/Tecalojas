import React, { useState, useCallback, createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Product, View, Theme, User, StoreName, Variation, CushionSize, DynamicBrand, CatalogPDF, SavedComposition, ThemeContext, ThemeContextType, CartItem, SaleRequest, CardFees, CategoryItem } from './types';
import { INITIAL_PRODUCTS, PREDEFINED_COLORS, PREDEFINED_SOFA_COLORS, SOFA_COLORS_STORAGE_KEY } from './constants';
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
    AppInventor?: {
      setWebViewString: (message: string) => void;
    };
    completeGoogleSignIn?: (idToken: string | null, errorMsg: string | null) => void;
    handleLoginToken?: (idToken: string) => void;
  }
  interface Navigator {
    connection: any;
    camera: any;
  }
  var Connection: any;
  var Camera: any;
}

const THEME_STORAGE_KEY = 'pillow-oasis-theme';
const SAVED_COMPOSITIONS_STORAGE_KEY = 'pillow-oasis-saved-compositions';
const CART_STORAGE_KEY = 'pillow-oasis-cart';

const ConfigurationRequiredModal = () => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const modalBg = isDark ? 'bg-[#1A1129]' : 'bg-gray-50';
    const cardBg = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200';
    const textColor = isDark ? 'text-gray-300' : 'text-gray-700';
    const titleColor = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${modalBg}`}>
            <div className={`rounded-3xl shadow-2xl w-full max-w-2xl p-8 border ${cardBg}`}>
                <div className="text-center">
                    <svg className={`mx-auto h-12 w-12 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className={`text-2xl font-bold mt-4 ${titleColor}`}>Ação Necessária: Configure o Firebase</h1>
                    <p className={`mt-2 ${textColor}`}>O aplicativo não pode se conectar ao banco de dados porque a configuração do Firebase não foi definida.</p>
                </div>
                <div className="mt-8 text-center">
                    <button onClick={() => window.location.reload()} className="bg-fuchsia-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-fuchsia-700 transition">
                        Recarregar Aplicativo
                    </button>
                </div>
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
  const [productsLoading, setProductsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  
  // FIX: Initialize with constants so the UI never starts empty
  const [allColors, setAllColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_COLORS);
  const [sofaColors, setSofaColors] = useState<{ name: string; hex: string }[]>(PREDEFINED_SOFA_COLORS);
  
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleRequests, setSaleRequests] = useState<SaleRequest[]>([]);
  const [saleRequestError, setSaleRequestError] = useState<string | null>(null);
  const loginRedirect = useRef<View | null>(null);
  const notifiedRequestIds = useRef(new Set<string>());
  const isFirstRequestsLoad = useRef(true);
  const [cardFees, setCardFees] = useState<CardFees>({ debit: 1.0, credit1x: 1.5, credit2x: 2.0, credit3x: 4.0 });
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0);

  const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [toastNotification, setToastNotification] = useState<{ message: string; sub: string; type: 'sale' | 'preorder' } | null>(null);
  const [infoModalState, setInfoModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm?: () => void; }>({ isOpen: false, title: '', message: '' });

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  useEffect(() => {
    if (!firebaseConfig.apiKey) return;
    const unsubscribe = api.onSettingsUpdate((settings) => {
        if (settings?.cardFees) setCardFees(settings.cardFees);
        if (settings?.weeklyGoal !== undefined) setWeeklyGoal(settings.weeklyGoal);
        if (settings?.colors && settings.colors.length > 0) setAllColors(settings.colors);
        if (settings?.sofaColors && settings.sofaColors.length > 0) setSofaColors(settings.sofaColors);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch (e) { console.error("Failed to load cart", e); }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const handleSaveProduct = useCallback(async (productToSave: Product, options?: { closeModal?: boolean }): Promise<Product> => {
    try {
        if (!productToSave.name?.trim()) throw new Error("Nome é obrigatório.");
        
        let productForBackgroundUpload: Product;
        if (productToSave.id) {
            const { id, ...productData } = productToSave;
            await api.updateProductData(id, productData);
            productForBackgroundUpload = productToSave;
        } else {
            const { id, ...productData } = productToSave;
            productForBackgroundUpload = await api.addProductData(productData);
        }
        
        // Trigger Meta Catalog update immediately after saving price/data
        const updatedProductList = products.map(p => p.id === productForBackgroundUpload.id ? productForBackgroundUpload : p);
        if (!productToSave.id) updatedProductList.push(productForBackgroundUpload);
        api.updateMetaCatalogFeed(updatedProductList).catch(err => console.error("Meta Feed sync failed:", err));

        api.processImageUploadsForProduct(productForBackgroundUpload).catch(err => console.error("Background uploads failed:", err));
        
        if (options?.closeModal !== false) setEditingProduct(null);
        return productForBackgroundUpload;
    } catch (error: any) {
        throw error;
    }
  }, [products]);

  const handleNavigate = useCallback((newView: View) => {
    const protectedViews = [View.STOCK, View.SETTINGS, View.CATALOG, View.ASSISTANT, View.DIAGNOSTICS, View.SALES, View.QR_CODES];
    if (protectedViews.includes(newView) && !currentUser) {
        loginRedirect.current = newView;
        setView(View.STOCK); // Redirect to logic that handles auth
    } else {
        setView(newView);
    }
  }, [currentUser]);

  const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_REAL_API_KEY_HERE";

  useEffect(() => {
    if (!isConfigValid) { setAuthLoading(false); return; }
    const unsubscribe = api.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isConfigValid]);

  useEffect(() => {
    if (!isConfigValid) {
        setProducts(INITIAL_PRODUCTS);
        setProductsLoading(false);
        setHasFetchError(true);
        return;
    }
    setProductsLoading(true);
    const unsubProducts = api.onProductsUpdate(
        (updatedProducts) => { setProducts(updatedProducts); setProductsLoading(false); setHasFetchError(false); },
        () => { setHasFetchError(true); setProductsLoading(false); }
    );
    const unsubBrands = api.onBrandsUpdate((updatedBrands) => setBrands(updatedBrands), () => {});
    const unsubCatalogs = api.onCatalogsUpdate((updatedCatalogs) => setCatalogs(updatedCatalogs), () => {});
    const unsubCategories = api.onCategoriesUpdate((updatedCategories) => setCategories(updatedCategories), () => {});
    return () => { unsubProducts(); unsubBrands(); unsubCatalogs(); unsubCategories(); };
  }, [isConfigValid]);

  const handleUpdateStock = useCallback(async (productId: string, variationSize: CushionSize, store: StoreName, change: number) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate) return;
    const updatedProduct = JSON.parse(JSON.stringify(productToUpdate));
    const variation = updatedProduct.variations.find((v: Variation) => v.size === variationSize);
    if (!variation) return;
    variation.stock[store] = Math.max(0, variation.stock[store] + change);
    try { 
        await api.updateProductData(productId, updatedProduct); 
        const updatedList = products.map(p => p.id === productId ? updatedProduct : p);
        api.updateMetaCatalogFeed(updatedList).catch(e => console.error(e));
    } catch (error: any) { alert('Falha ao atualizar o estoque.'); }
  }, [products]);

  const renderView = () => {
    if (productsLoading || authLoading) return <div className="flex-grow flex items-center justify-center text-current">Carregando...</div>;
    
    switch (view) {
      case View.SHOWCASE:
        return <ShowcaseScreen products={products} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={() => {}} sofaColors={sofaColors} cart={cart} />;
      case View.STOCK:
        if (!currentUser) return <LoginScreen onLogin={api.signIn} onGoogleLogin={api.signInWithGoogle} onOpenSignUp={() => setIsSignUpModalOpen(true)} />;
        return <StockManagementScreen products={products} onEditProduct={setEditingProduct} onAddProduct={() => setIsWizardOpen(true)} onDeleteProduct={setDeletingProductId} onUpdateStock={handleUpdateStock} canManageStock={isAdmin} hasFetchError={hasFetchError} brands={brands} onMenuClick={() => setIsMenuOpen(true)} />;
      case View.SETTINGS:
        return <SettingsScreen canManageStock={isAdmin} brands={brands} allColors={allColors} onAddColor={(c) => api.updateGlobalSettings({colors: [...allColors, c]})} onDeleteColor={(n) => api.updateGlobalSettings({colors: allColors.filter(c => c.name !== n)})} onMenuClick={() => setIsMenuOpen(true)} cardFees={cardFees} onSaveCardFees={(f) => api.updateGlobalSettings({cardFees: f})} sofaColors={sofaColors} onAddSofaColor={(c) => api.updateGlobalSettings({sofaColors: [...sofaColors, c]})} onDeleteSofaColor={(n) => api.updateGlobalSettings({sofaColors: sofaColors.filter(c => c.name !== n)})} categories={categories} onAddCategory={api.addCategory} onDeleteCategory={api.deleteCategory} onAddNewBrand={api.addBrand} />;
      default:
        return <ShowcaseScreen products={products} hasFetchError={hasFetchError} canManageStock={isAdmin} onEditProduct={setEditingProduct} brands={brands} onNavigate={handleNavigate} savedCompositions={savedCompositions} onAddToCart={() => {}} sofaColors={sofaColors} cart={cart} />;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1A1129] text-white' : 'bg-white text-gray-900'}`}>
            {!isConfigValid && <ConfigurationRequiredModal />}
            <Header onMenuClick={() => setIsMenuOpen(true)} cartItemCount={cart.length} onCartClick={() => setView(View.CART)} activeView={view} onNavigate={handleNavigate} isAdmin={isAdmin} />
            {renderView()}
            <BottomNav activeView={view} onNavigate={handleNavigate} hasItemsToRestock={false} isAdmin={isAdmin} hasNewSaleRequests={false} />
            {editingProduct && (
                <AddEditProductModal 
                    product={editingProduct} 
                    products={products}
                    onClose={() => setEditingProduct(null)} 
                    onSave={handleSaveProduct} 
                    onCreateVariations={async () => {}}
                    onSwitchProduct={setEditingProduct}
                    onRequestDelete={setDeletingProductId}
                    categories={Array.from(new Set(products.map(p => p.category)))}
                    allColors={allColors}
                    onAddColor={(c) => api.updateGlobalSettings({colors: [...allColors, c]})}
                    onDeleteColor={(n) => api.updateGlobalSettings({colors: allColors.filter(c => c.name !== n)})}
                    brands={brands}
                    sofaColors={sofaColors}
                />
            )}
        </div>
    </ThemeContext.Provider>
  );
}