
import React, { useState, useEffect, useMemo } from 'react';
import { View, User, Product, CartItem, SavedComposition, ThemeContext, Theme, CushionSize, Variation, StoreName, SaleRequest, CardFees, CategoryItem, DynamicBrand, CatalogPDF, ProductFamily, Banner } from './types';
import * as api from './firebase';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SideMenu from './components/SideMenu';
import LoginScreen from './views/LoginScreen';
import ShowcaseScreen from './views/ShowcaseScreen';
import StockManagementScreen from './views/StockManagementScreen';
import AssistantScreen from './views/ReplacementScreen';
import SettingsScreen from './views/SettingsScreen';
import CatalogScreen from './views/CatalogScreen';
import CompositionGeneratorScreen from './views/CompositionGeneratorScreen';
import CompositionsScreen from './views/CompositionsScreen';
import DiagnosticsScreen from './views/DiagnosticsScreen';
import CartScreen from './views/CartScreen';
import PaymentScreen from './views/PaymentScreen';
import SalesScreen from './views/SalesScreen';
import QrCodeScreen from './views/QrCodeScreen';
import GenerateKeysScreen from './views/GenerateKeysScreen';
import SignUpModal from './SignUpModal';
import AddEditProductModal from './components/AddEditProductModal';
import ConfirmationModal from './components/ConfirmationModal';
import { BannerEditorModal } from './components/BannerEditorModal';
import { ProductCreationWizard } from './views/ProductCreationWizard';
import { PREDEFINED_SOFA_COLORS } from './constants';

const App: React.FC = () => {
  // Theme - Default to light, manual toggle only
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [brands, setBrands] = useState<DynamicBrand[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogPDF[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [saleRequests, setSaleRequests] = useState<SaleRequest[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<{ cardFees: CardFees, weeklyGoal: number, colors?: {name:string, hex:string}[], sofaColors?: {name:string, hex:string}[], productFamilies?: ProductFamily[] }>({
      cardFees: { debit: 0, credit1x: 0, credit2x: 0, credit3x: 0 },
      weeklyGoal: 0,
      productFamilies: []
  });

  // App State
  const [view, setView] = useState<View>(View.SHOWCASE);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIconOpacity, setSearchIconOpacity] = useState(0);   
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const lastReceivedCompositionsRef = React.useRef<string>("");
  const lastSavedCompositionsRef = React.useRef<string>("");
  
  // Modals & Editing
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lastCreatedProductId, setLastCreatedProductId] = useState<string | null>(null);
  const [initialProductId, setInitialProductId] = useState<string | undefined>();
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Load Data
  useEffect(() => {
    const unsubAuth = api.onAuthStateChanged(setCurrentUser);
    
    // Load ALL products immediately
    const unsubProducts = api.onProductsUpdate(
        (data) => { 
            setProducts(data);
            setProductsLoading(false);
        },
        (err) => { 
            console.error("Load error:", err); 
            setHasFetchError(true); 
            setProductsLoading(false); 
        }
    );

    const unsubBrands = api.onBrandsUpdate(setBrands, console.error);
    const unsubCatalogs = api.onCatalogsUpdate(setCatalogs, console.error);
    const unsubCategories = api.onCategoriesUpdate(setCategories, console.error);
    const unsubBanners = api.onBannersUpdate(setBanners, console.error);
    const unsubSettings = api.onSettingsUpdate(setSettings, console.error);

    // Deep Link
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product_id');
    if (pid) setInitialProductId(pid);

    return () => {
        unsubAuth(); 
        unsubProducts();
        unsubBrands(); unsubCatalogs();
        unsubCategories(); unsubBanners(); unsubSettings();
    };
  }, []);

  // Monitor e carrega as composições salvas do usuário atual baseado no estado de login
  useEffect(() => {
    if (!currentUser) {
      setSavedCompositions([]);
      lastReceivedCompositionsRef.current = "";
      lastSavedCompositionsRef.current = "";
      return;
    }

    const unsubCompositions = api.onSavedCompositionsUpdate(
      currentUser.uid, 
      (data) => {
        const strVal = JSON.stringify(data);
        lastReceivedCompositionsRef.current = strVal;
        setSavedCompositions(data);
      }, 
      console.error
    );

    return () => {
      unsubCompositions();
    };
  }, [currentUser]);

  // Salva alterações de composições no banco de dados de forma segura (previne loop infinito)
  useEffect(() => {
    if (currentUser && savedCompositions.length > 0) {
      const strVal = JSON.stringify(savedCompositions);
      if (strVal === lastReceivedCompositionsRef.current || strVal === lastSavedCompositionsRef.current) {
        return;
      }
      lastSavedCompositionsRef.current = strVal;
      api.saveUserCompositions(currentUser.uid, savedCompositions);
    }
  }, [savedCompositions, currentUser]);

  useEffect(() => {
      if (isAdmin) {
          const unsubSales = api.onSaleRequestsUpdate(setSaleRequests, (error) => {
              console.error("Sales listener error:", error);
          });
          return () => unsubSales();
      } else {
          setSaleRequests([]); // Clear sensitive data if logged out or not admin
      }
  }, [isAdmin]);

  // Handlers
  const handleLogin = async (e: string, p: string) => { await api.signIn(e, p); };
  const handleGoogleLogin = async () => { await api.signInWithGoogle(); };
  const handleSignUp = async (e: string, p: string) => { await api.signUp(e, p); setIsSignUpModalOpen(false); };
  const handleLogout = async () => { await api.signOut(); setIsMenuOpen(false); setCurrentUser(null); };
  
  const handleNavigate = (v: View) => {
      setView(v);
      setIsMenuOpen(false);
      setSearchIconOpacity(0);
      setIsSearchOpen(false);
  };

  const handleAddToCart = (product: Product, variation: Variation, quantity: number, type: 'cover' | 'full', price: number, isPreOrder: boolean = false) => {
      setCart(prev => {
          const existing = prev.find(i => i.productId === product.id && i.variationSize === variation.size && i.type === type && i.isPreOrder === isPreOrder);
          if (existing) {
              return prev.map(i => i === existing ? { ...i, quantity: i.quantity + quantity } : i);
          }
          return [...prev, {
              productId: product.id,
              name: product.name,
              baseImageUrl: product.baseImageUrl,
              variationSize: variation.size,
              quantity,
              type,
              price,
              isPreOrder
          }];
      });
  };

  const handleUpdateCartQuantity = (pid: string, size: CushionSize, type: 'cover' | 'full', qty: number) => {
      if (qty <= 0) handleRemoveFromCart(pid, size, type);
      else setCart(prev => prev.map(i => (i.productId === pid && i.variationSize === size && i.type === type) ? { ...i, quantity: qty } : i));
  };

  const handleRemoveFromCart = (pid: string, size: CushionSize, type: 'cover' | 'full') => {
      setCart(prev => prev.filter(i => !(i.productId === pid && i.variationSize === size && i.type === type)));
  };

  const handlePlaceOrder = async (method: any, msg: string, onSuccess?: () => void) => {
      if (cart.length === 0) return;
      const total = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      try {
          await api.addSaleRequest({ items: cart, totalPrice: total, paymentMethod: method, customerName: 'Cliente App' });
          setCart([]);
          alert(msg);
          if(onSuccess) onSuccess();
          setView(View.SHOWCASE);
      } catch (e: any) {
          alert("Erro: " + e.message);
      }
  };

  const handleUpdateStock = async (pid: string, size: CushionSize, store: StoreName, change: number) => {
      const product = products.find(p => p.id === pid);
      if (!product) return;
      const variations = product.variations.map(v => {
          if (v.size === size) {
              return { ...v, stock: { ...v.stock, [store]: Math.max(0, (v.stock[store] || 0) + change) } };
          }
          return v;
      });
      await api.updateProductData(pid, { variations });
  };

  const activeSofaColors = useMemo(() => (settings.sofaColors && settings.sofaColors.length > 0) ? settings.sofaColors : PREDEFINED_SOFA_COLORS, [settings.sofaColors]);

  const renderView = () => {
      if (!currentUser && [View.STOCK, View.SETTINGS, View.ASSISTANT, View.SALES, View.QR_CODES].includes(view)) {
          return (
              <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
                  <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onOpenSignUp={() => setIsSignUpModalOpen(true)} />
              </div>
          );
      }

      switch (view) {
          case View.SHOWCASE:
              return <ShowcaseScreen 
                  products={products} 
                  isLoading={productsLoading} 
                  initialProductId={initialProductId} 
                  hasFetchError={hasFetchError} 
                  canManageStock={isAdmin} 
                  onEditProduct={setEditingProduct} 
                  brands={brands} 
                  onNavigate={handleNavigate} 
                  savedCompositions={savedCompositions} 
                  setSavedCompositions={setSavedCompositions} 
                  onAddToCart={handleAddToCart} 
                  sofaColors={activeSofaColors} 
                  cart={cart} 
                  productFamilies={settings.productFamilies || []} 
                  isSearchOpen={isSearchOpen}
                  setIsSearchOpen={setIsSearchOpen}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setSearchIconOpacity={setSearchIconOpacity}
                  banners={banners}
              />;
          case View.STOCK:
              return <StockManagementScreen 
                products={products} 
                onEditProduct={setEditingProduct} 
                onDeleteProduct={setDeletingProductId} 
                onAddProduct={() => setIsWizardOpen(true)} 
                onUpdateStock={handleUpdateStock} 
                onMenuClick={() => setIsMenuOpen(true)} 
                canManageStock={isAdmin} 
                hasFetchError={hasFetchError} 
                brands={brands} 
                highlightProductId={lastCreatedProductId}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setSearchIconOpacity={setSearchIconOpacity}
            />;
          case View.ASSISTANT:
              return <AssistantScreen products={products} onEditProduct={setEditingProduct} onDeleteProduct={setDeletingProductId} canManageStock={isAdmin} onMenuClick={() => setIsMenuOpen(true)} />;
          case View.SETTINGS:
              return <SettingsScreen 
                onAddNewBrand={async (name, file, url) => {
                    let finalUrl = url || '';
                    if (file) {
                        const { promise } = api.uploadFile(`brands/${file.name}`, file);
                        finalUrl = await promise;
                    }
                    await api.addBrand({name, logoUrl: finalUrl});
                }} 
                onMenuClick={() => setIsMenuOpen(true)} 
                canManageStock={isAdmin} 
                brands={brands}
                allColors={settings.colors || []}
                onAddColor={(c) => api.updateGlobalSettings({ colors: [...(settings.colors || []), c] })}
                onDeleteColor={(n) => api.updateGlobalSettings({ colors: (settings.colors || []).filter(c => c.name !== n) })}
                cardFees={settings.cardFees}
                onSaveCardFees={(f) => api.updateGlobalSettings({ cardFees: f })}
                sofaColors={activeSofaColors}
                onAddSofaColor={(c) => api.updateGlobalSettings({ sofaColors: [...activeSofaColors, c] })}
                onDeleteSofaColor={(n) => api.updateGlobalSettings({ sofaColors: activeSofaColors.filter(c => c.name !== n) })}
                categories={categories}
                onAddCategory={async (name, type) => { await api.addCategory({name, type}); }}
                onDeleteCategory={(id) => api.deleteCategory(id)}
                productFamilies={settings.productFamilies || []}
                onAddProductFamily={(name, isCollection) => {
                    const newFamily: ProductFamily = { id: `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name, isCollection };
                    api.updateGlobalSettings({ productFamilies: [...(settings.productFamilies || []), newFamily] });
                }}
                onUpdateProductFamily={(id, data) => {
                    const currentFamilies = settings.productFamilies || [];
                    const updatedFamilies = currentFamilies.map(f => f.id === id ? { ...f, ...data } : f);
                    api.updateGlobalSettings({ productFamilies: updatedFamilies });

                    const family = updatedFamilies.find(f => f.id === id);
                    if (family && data.isCollection) {
                        const familyProducts = products.filter(p => (p.familyIds || []).includes(family.id));
                        if (familyProducts.length > 0) {
                            const newComposition: SavedComposition = {
                                id: `comp_fam_${family.id}`,
                                name: family.name,
                                products: familyProducts,
                                familyId: family.id,
                            };
                            setSavedCompositions(prev => {
                                const existing = prev.find(c => c.familyId === family.id);
                                if (existing) {
                                    return prev.map(c => c.familyId === family.id ? newComposition : c);
                                }
                                return [...prev, newComposition];
                            });
                        }
                    } else if (family && data.isCollection === false) {
                        setSavedCompositions(prev => prev.filter(c => c.familyId !== family.id));
                    }
                }}
                onDeleteProductFamily={async (id) => {
                    const currentFamilies = settings.productFamilies || [];
                    const newFamilies = currentFamilies.filter(f => f.id !== id);
                    try {
                        await api.updateGlobalSettings({ productFamilies: newFamilies });
                    } catch (error) {
                        console.error("Erro ao excluir família:", error);
                        alert("Não foi possível excluir a família. Tente novamente.");
                    }
                }}
                products={products}
                onUpdateProduct={(id, data) => api.updateProductData(id, data)}
                banners={banners}
                onAddBanner={(b) => api.addBanner(b)}
                onDeleteBanner={(id) => api.deleteBanner(id)}
                onAddBannerClick={() => {
                    setEditingBanner(null);
                    setShowBannerModal(true);
                }}
                onEditBannerClick={(banner) => {
                    setEditingBanner(banner);
                    setShowBannerModal(true);
                }}
              />;
          case View.CATALOG:
              return <CatalogScreen 
                catalogs={catalogs} 
                onUploadCatalog={async (brand, file, progress) => {
                    const upload = api.uploadFile(`catalogs/${file.name}`, file, progress);
                    const flowPromise = upload.promise.then(async (url) => {
                        await api.addCatalog({ brandName: brand, fileName: file.name, pdfUrl: url });
                    });
                    return { promise: flowPromise, cancel: upload.cancel };
                }}
                onMenuClick={() => setIsMenuOpen(true)} 
                canManageStock={isAdmin} 
                brands={brands} 
              />;
          case View.COMPOSITION_GENERATOR:
              return <CompositionGeneratorScreen products={products} onNavigate={handleNavigate} savedCompositions={savedCompositions} onSaveComposition={(c) => setSavedCompositions(prev => [...prev, { ...c, id: Date.now().toString() }])} setSavedCompositions={setSavedCompositions} />;
          case View.COMPOSITIONS:
              return <CompositionsScreen savedCompositions={savedCompositions} setSavedCompositions={setSavedCompositions} onNavigate={handleNavigate} products={products} onEditProduct={setEditingProduct} onSaveComposition={(c) => setSavedCompositions(prev => [...prev, { ...c, id: Date.now().toString() }])} />;
          case View.DIAGNOSTICS:
              return <DiagnosticsScreen products={products} saleRequests={saleRequests} cardFees={settings.cardFees} onMenuClick={() => setIsMenuOpen(true)} weeklyGoal={settings.weeklyGoal} onUpdateWeeklyGoal={(g) => api.updateGlobalSettings({ weeklyGoal: g })} />;
          case View.CART:
              return <CartScreen cart={cart} products={products} onUpdateQuantity={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onNavigate={handleNavigate} saleRequests={saleRequests} />;
          case View.PAYMENT:
              return <PaymentScreen cart={cart} totalPrice={cart.reduce((a,b)=>a+(b.price*b.quantity),0)} onPlaceOrder={handlePlaceOrder} onNavigate={handleNavigate} onPixClick={() => {}} customerName="" />;
          case View.SALES:
              return <SalesScreen saleRequests={saleRequests} onCompleteSaleRequest={api.completeSaleRequest} products={products} onMenuClick={() => setIsMenuOpen(true)} error={null} cardFees={settings.cardFees} />;
          case View.QR_CODES:
              return <QrCodeScreen products={products} />;
          case View.GENERATE_KEYS:
              return <GenerateKeysScreen onMenuClick={() => setIsMenuOpen(true)} />;
          default:
              return <ShowcaseScreen 
                  products={products} 
                  isLoading={productsLoading} 
                  initialProductId={initialProductId} 
                  hasFetchError={hasFetchError} 
                  canManageStock={isAdmin} 
                  onEditProduct={setEditingProduct} 
                  brands={brands} 
                  onNavigate={handleNavigate} 
                  savedCompositions={savedCompositions} 
                  setSavedCompositions={setSavedCompositions} 
                  onAddToCart={handleAddToCart} 
                  sofaColors={activeSofaColors} 
                  cart={cart} 
                  productFamilies={settings.productFamilies || []} 
                  isSearchOpen={isSearchOpen}
                  setIsSearchOpen={setIsSearchOpen}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setSearchIconOpacity={setSearchIconOpacity}
              />;
      }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {productsLoading ? (
          <div className={`h-screen w-full flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-[#130b1f]' : 'bg-gray-50'}`}>
              <img
                  src={theme === 'dark' ? 'https://i.postimg.cc/qvgmgRpN/Cabe-alho-escuro.png' : 'https://i.postimg.cc/QtcYsyhQ/Cabe-alho-claro.png'}
                  alt="Logo Têca & Ione"
                  className="h-24 w-auto mb-8 animate-pulse"
              />
              <div className="w-64 h-2 bg-fuchsia-200 dark:bg-fuchsia-900 rounded-full overflow-hidden">
                  <div className="h-full bg-fuchsia-500 animate-loading-bar"></div>
              </div>
              <p className={`mt-4 font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Bem vindo a <span className="font-semibold text-purple-700 dark:text-purple-400 whitespace-nowrap">Têca Decorações</span>
              </p>
          </div>
      ) : (
      <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#130b1f] text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header 
            onMenuClick={() => setIsMenuOpen(true)} 
            cartItemCount={cart.reduce((a, b) => a + b.quantity, 0)} 
            onCartClick={() => setView(View.CART)} 
            activeView={view} 
            onNavigate={handleNavigate} 
            isAdmin={isAdmin}
            isLoggedIn={!!currentUser}
            hasPendingPreorders={saleRequests.some(r => r.status === 'pending' && r.type === 'preorder')}
            isSearchOpen={isSearchOpen}
            onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
            searchIconOpacity={searchIconOpacity}
        />
        
        <SideMenu 
            isOpen={isMenuOpen} 
            onClose={() => setIsMenuOpen(false)} 
            onNavigate={handleNavigate} 
            onLogout={handleLogout}
            isAdmin={isAdmin}
            activeView={view}
        />
        
        {renderView()}
        
        <BottomNav 
            activeView={view} 
            onNavigate={handleNavigate} 
            hasItemsToRestock={products.some(p => p.variations.reduce((a,v) => a + (v.stock[StoreName.TECA]||0) + (v.stock[StoreName.IONE]||0), 0) <= 1)} 
            isAdmin={isAdmin}
            hasNewSaleRequests={saleRequests.some(r => r.status === 'pending')}
            hasPendingSales={saleRequests.some(r => r.status === 'pending' && r.type !== 'preorder')}
            hasPendingPreorders={saleRequests.some(r => r.status === 'pending' && r.type === 'preorder')}
        />

        {isSignUpModalOpen && <SignUpModal onClose={() => setIsSignUpModalOpen(false)} onSignUp={handleSignUp} />}
        
        {showBannerModal && (
            <BannerEditorModal 
                onClose={() => {
                    setShowBannerModal(false);
                    setEditingBanner(null);
                }} 
                onSave={async (b) => {
                    if (b.id) {
                        await api.updateBanner(b.id, {
                            name: b.name,
                            cushionProductIds: b.cushionProductIds,
                            imageUrl: b.imageUrl,
                            objectPositionX: b.objectPositionX,
                            objectPositionY: b.objectPositionY,
                            zoomScale: b.zoomScale
                        });
                    } else {
                        await api.addBanner(b);
                    }
                }} 
                products={products} 
                banner={editingBanner || undefined}
            />
        )}
        
        {editingProduct && (
            <AddEditProductModal 
                product={editingProduct} 
                products={products}
                onClose={() => setEditingProduct(null)} 
                onSave={async (p, options) => { 
                    await api.updateProductData(p.id, p); 
                    if (options?.closeModal !== false) {
                        setEditingProduct(null); 
                    }
                    return p; 
                }} 
                onCreateVariations={async (parent, colors) => { 
                    let groupId = parent.variationGroupId;
                    if (!groupId) {
                        groupId = parent.id;
                        await api.updateProductData(parent.id, { variationGroupId: groupId });
                    }
                    
                    const createdProducts: Product[] = [];
                    for (const color of colors) {
                        const newProductData: Omit<Product, 'id'> = {
                            name: parent.name,
                            baseImageUrl: parent.baseImageUrl,
                            unitsSold: 0,
                            category: parent.category,
                            subCategory: parent.subCategory,
                            fabricType: parent.fabricType,
                            description: parent.description,
                            waterResistance: parent.waterResistance,
                            brand: parent.brand,
                            isMultiColor: parent.isMultiColor,
                            colors: [color],
                            variationGroupId: groupId,
                            originalId: parent.id,
                            variations: parent.variations.map(v => ({
                                ...v,
                                stock: { [StoreName.TECA]: 0, [StoreName.IONE]: 0 }
                            })),
                            backgroundImages: {}
                        };
                        const newProduct = await api.addProductData(newProductData);
                        createdProducts.push(newProduct);
                    }
                    return createdProducts;
                }}
                onSwitchProduct={setEditingProduct}
                onRequestDelete={async (id) => { await api.deleteProduct(id); setEditingProduct(null); }}
                onDuplicate={async (p) => { const newProduct = await api.addProductData(p); return newProduct; }}
                categories={categories.map(c => c.name)}
                allColors={settings.colors || []}
                onAddColor={(c) => api.updateGlobalSettings({ colors: [...(settings.colors || []), c] })}
                onDeleteColor={(n) => api.updateGlobalSettings({ colors: (settings.colors || []).filter(c => c.name !== n) })}
                brands={brands}
                sofaColors={activeSofaColors}
                productFamilies={settings.productFamilies || []}
                onAddProductFamily={(name) => {
                    const newFamily = { id: `fam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name };
                    api.updateGlobalSettings({ productFamilies: [...(settings.productFamilies || []), newFamily] });
                    return newFamily;
                }}
                onUpdateProduct={(id, data) => api.updateProductData(id, data)}
            />
        )}

        {isWizardOpen && (
            <ProductCreationWizard 
                onClose={() => setIsWizardOpen(false)}
                onConfigure={(newProducts, first) => {
                    Promise.all(newProducts.map(p => api.addProductData(p))).then((results) => {
                        if (results.length > 0 && results[0]) {
                            setLastCreatedProductId(results[0].id);
                            // Clear the highlight after some time
                            setTimeout(() => setLastCreatedProductId(null), 5000);
                        }
                        setIsWizardOpen(false);
                    });
                }}
                allColors={settings.colors || []}
                onAddColor={(c) => api.updateGlobalSettings({ colors: [...(settings.colors || []), c] })}
                categories={categories.map(c => c.name)}
                products={products}
                brands={brands}
            />
        )}

        {deletingProductId && (
            <ConfirmationModal 
                isOpen={!!deletingProductId} 
                onClose={() => setDeletingProductId(null)} 
                onConfirm={async () => { if(deletingProductId) await api.deleteProduct(deletingProductId); setDeletingProductId(null); }} 
                title="Excluir Produto" 
                message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita." 
            />
        )}
      </div>
      )}
    </ThemeContext.Provider>
  );
};

export default App;
