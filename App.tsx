import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { Product, View, Theme, User, StoreName } from './types';
import { INITIAL_PRODUCTS, PIX_QR_CODE_URLS } from './constants';
import LoginScreen from './views/LoginScreen';
import ShowcaseScreen from './views/ShowcaseScreen';
import StockManagementScreen from './views/StockManagementScreen';
import AddEditProductModal from './components/AddEditProductModal';
import SignUpModal from './components/SignUpModal';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import * as api from './firebase';

// --- Constants for localStorage keys ---
const THEME_STORAGE_KEY = 'pillow-oasis-theme';

// --- Theme Context ---
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

// --- PIX Payment Modal ---
interface PixPaymentModalProps {
  onClose: () => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ onClose }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const modalBgClasses = isDark ? "bg-[#1A1129] border-white/10" : "bg-white border-gray-200";
    const titleClasses = isDark ? "text-gray-200" : "text-gray-900";
    const subtitleClasses = isDark ? "text-gray-400" : "text-gray-500";
    const closeBtnClasses = isDark ? "text-gray-400 hover:text-white bg-black/20" : "text-gray-500 hover:text-gray-800 bg-gray-100";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col ${modalBgClasses}`} 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                 <style>{`
                    @keyframes fade-in-scale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards; }
                `}</style>
                <button onClick={onClose} className={`absolute top-4 right-4 rounded-full p-2 transition-colors z-20 ${closeBtnClasses}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-center mb-4">
                     <h2 className={`text-2xl font-bold ${titleClasses}`}>Pagamento via PIX</h2>
                     <p className={`mt-1 ${subtitleClasses}`}>Aponte a câmera para o QR Code da loja.</p>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar space-y-4">
                     <div className="w-full">
                        <h3 className={`text-lg font-bold text-center mb-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Têca Decorações</h3>
                        <img src={PIX_QR_CODE_URLS.teca} alt="QR Code PIX para Têca Decorações" className="rounded-lg shadow-lg w-full" />
                    </div>
                    <div className="w-full">
                        <h3 className={`text-lg font-bold text-center mb-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Ione Lourenço</h3>
                        <img src={PIX_QR_CODE_URLS.ione} alt="QR Code PIX para Ione Lourenço" className="rounded-lg shadow-lg w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const InventoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);


// --- Side Menu Component ---
interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onPixClick: () => void;
  activeView: View;
  onNavigate: (view: View) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onLogout, onPixClick, activeView, onNavigate }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const menuBgColor = theme === 'dark' ? 'bg-[#1A1129]' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const itemBgHover = theme === 'dark' ? 'hover:bg-purple-900/50' : 'hover:bg-gray-100';
  const borderColor = theme === 'dark' ? 'border-r-purple-500/20' : 'border-r-gray-200';

  const NavItem: React.FC<{ label: string; view: View; icon: React.ReactNode }> = ({ label, view, icon }) => {
    const isActive = activeView === view;
    const activeClasses = theme === 'dark' ? 'bg-purple-900/50 text-fuchsia-300' : 'bg-gray-100 text-purple-600';
    return (
      <button 
        onClick={() => { onNavigate(view); onClose(); }}
        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover} ${isActive ? activeClasses : ''}`}
      >
        <span className="mr-3">{icon}</span>
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 left-0 h-full w-72 ${menuBgColor} shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r ${borderColor} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`p-6 ${textColor}`}>
          <h2 className="text-2xl font-bold text-fuchsia-500 mb-8">Menu</h2>
          <nav className="flex flex-col space-y-2">
            <NavItem label="Vitrine" view={View.SHOWCASE} icon={<HomeIcon />} />
            <NavItem label="Estoque" view={View.STOCK} icon={<InventoryIcon />} />
            
            <div className={`border-b pt-2 my-2 ${theme === 'dark' ? 'border-purple-500/20' : 'border-gray-200'}`}></div>

            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
            >
              <span className="mr-3">
                {theme === 'dark' 
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                }
              </span>
              <span className="font-semibold">
                Mudar para Tema {theme === 'dark' ? 'Claro' : 'Escuro'}
              </span>
            </button>
            <button 
              onClick={() => { onPixClick(); onClose(); }}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
            >
              <span className="mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 12v1m0 1v1m0 1v1m0 0h.01M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
              </span>
              <span className="font-semibold">Pagamento PIX</span>
            </button>
            <button 
              onClick={onLogout}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${itemBgHover}`}
            >
              <span className="mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </span>
              <span className="font-semibold">Sair</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};


export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>(View.SHOWCASE);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  // Effect for handling auth state changes
  useEffect(() => {
    const unsubscribe = api.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // Effect for listening to real-time product updates
  useEffect(() => {
    // If there is no user, we show local data.
    if (!currentUser) {
      setProducts(INITIAL_PRODUCTS);
      setProductsLoading(false);
      return;
    }

    // If the user is a visitor (anonymous), also show local data.
    const isVisitor = currentUser.email === null;
    if (isVisitor) {
      setProducts(INITIAL_PRODUCTS);
      setProductsLoading(false);
      return;
    }

    // For registered users, try to fetch from Firestore.
    setProductsLoading(true);
    const unsubscribe = api.onProductsUpdate(
      (updatedProducts) => {
        setProducts(updatedProducts);
        setProductsLoading(false);
      },
      (error) => {
        // If there's a permission error, fall back to local data.
        console.warn("Firestore permission error. Falling back to local data.", error);
        setProducts(INITIAL_PRODUCTS);
        setProductsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);


  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);
  
  const handleNavigate = (newView: View) => {
    setView(newView);
  };
  
  const handleLogin = async (email: string, pass: string) => {
      await api.signIn(email, pass);
      setView(View.SHOWCASE);
  };
  
  const handleSignUp = async (email: string, pass: string) => {
      await api.signUp(email, pass);
      setIsSignUpModalOpen(false);
      setView(View.SHOWCASE);
  };

  const handleGoogleLogin = async () => {
      await api.signInWithGoogle();
      setView(View.SHOWCASE);
  };
  
  const handleVisitorLogin = async () => {
      await api.signInAsVisitor();
      setView(View.SHOWCASE);
  };

  const handleLogout = () => {
    api.signOut();
    setCurrentUser(null);
    setIsMenuOpen(false);
  };

  const handleSaveProduct = useCallback(async (productToSave: Product) => {
    try {
      if (productToSave.id) { // Existing product with a real ID
        const { id, ...productData } = productToSave;
        await api.updateProduct(id, productData);
      } else { // New product, ID is empty string
        const { id, ...productData } = productToSave;
        await api.addProduct(productData as Omit<Product, 'id'>);
      }
      setEditingProduct(null); // Close modal on success
    } catch (error) {
      console.error("Failed to save product:", error);
      // Re-throw error to be caught by the modal for displaying a message
      throw error;
    }
  }, []);
  
  const handleUpdateStock = useCallback(async (productId: string, store: StoreName, change: number) => {
    const productToUpdate = products.find(p => p.id === productId);
    if (!productToUpdate || productToUpdate.variations.length === 0) {
        console.error("Product not found or has no variations to update.");
        return;
    }

    // Create a deep copy to avoid direct state mutation before API call
    const updatedProduct = JSON.parse(JSON.stringify(productToUpdate));
    
    // Modify the stock of the first variation, as the quick-add UI doesn't specify which one
    const firstVariation = updatedProduct.variations[0];
    const currentStock = firstVariation.stock[store];
    const newStock = Math.max(0, currentStock + change); // Ensure stock doesn't go below 0

    if (newStock === currentStock) return; // No change needed

    firstVariation.stock[store] = newStock;
    
    const { id, ...productData } = updatedProduct;
    try {
        await api.updateProduct(id, productData);
    } catch (error) {
        console.error("Failed to update stock:", error);
        window.alert('Falha ao atualizar o estoque.');
    }
  }, [products]);


  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto? A ação não pode ser desfeita.")) {
      try {
        await api.deleteProduct(productId);
      } catch (error: any) {
        console.error("Failed to delete product:", error);
        if (error.code === 'permission-denied') {
            window.alert('Permissão negada. Você não tem autorização para excluir produtos.');
        } else {
            window.alert('Falha ao excluir o produto. Tente novamente.');
        }
      }
    }
  }, []);

  const uniqueCategories = [...new Set(products.map(p => p.category))];
  
  // Determine if the user has management permissions based on their role.
  const canManageStock = currentUser?.role === 'admin';

  const renderView = () => {
    const mainScreenProps = {
      onMenuClick: () => setIsMenuOpen(true),
    };
    
    if (productsLoading) {
      return <div className="flex-grow flex items-center justify-center"><p className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>Carregando estoque...</p></div>
    }

    switch (view) {
      case View.SHOWCASE:
        return <ShowcaseScreen products={products} onSaveProduct={handleSaveProduct} {...mainScreenProps} />;
      case View.STOCK:
        return (
          <StockManagementScreen
            products={products}
            onEditProduct={setEditingProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddProduct={() => setEditingProduct('new')}
            onUpdateStock={handleUpdateStock}
            canManageStock={canManageStock}
            {...mainScreenProps}
          />
        );
      default:
        return <ShowcaseScreen products={products} onSaveProduct={handleSaveProduct} {...mainScreenProps} />;
    }
  };

  const bgClass = theme === 'dark' ? 'bg-[#1A1129]' : 'bg-gray-50';
  const mainContainerBgClass = theme === 'dark' ? 'bg-gradient-to-br from-[#2D1F49] to-[#1A1129]' : 'bg-white';
  
  if (authLoading) {
    return (
       <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4 font-sans`}>
          <p className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>Carregando sessão...</p>
       </div>
    );
  }
  
  if (!currentUser) {
      return (
          <ThemeContext.Provider value={{ theme, toggleTheme }}>
               <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4 font-sans`}>
                  <div className={`w-full max-w-sm h-[95vh] max-h-[844px] ${mainContainerBgClass} rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative`}>
                    <LoginScreen 
                        onLogin={handleLogin}
                        onGoogleLogin={handleGoogleLogin}
                        onVisitorLogin={handleVisitorLogin}
                        onOpenSignUp={() => setIsSignUpModalOpen(true)}
                    />
                  </div>
                  {isSignUpModalOpen && (
                      <SignUpModal 
                          onClose={() => setIsSignUpModalOpen(false)}
                          onSignUp={handleSignUp}
                      />
                  )}
              </div>
          </ThemeContext.Provider>
      );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`min-h-screen ${bgClass} font-sans`}>
        <div className={`w-full max-w-6xl mx-auto h-screen ${mainContainerBgClass} md:rounded-[40px] md:shadow-2xl flex flex-col relative md:my-4 md:h-[calc(100vh-2rem)] max-h-[1200px]`}>
          <Header onMenuClick={() => setIsMenuOpen(true)} />
          {renderView()}
          
          <SideMenu 
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onLogout={handleLogout}
            onPixClick={() => setIsPixModalOpen(true)}
            activeView={view}
            onNavigate={handleNavigate}
          />
          <div className="md:hidden">
            <BottomNav activeView={view} onNavigate={handleNavigate} />
          </div>
        </div>

        {editingProduct && (
          <AddEditProductModal
            product={editingProduct === 'new' ? null : editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={handleSaveProduct}
            categories={uniqueCategories}
          />
        )}

        {isPixModalOpen && <PixPaymentModal onClose={() => setIsPixModalOpen(false)} />}
      </div>
    {/* FIX: Corrected typo in closing tag for ThemeContext.Provider */}
    </ThemeContext.Provider>
  );
}
