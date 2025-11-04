import React, { useState, useContext, useMemo } from 'react';
import { Product, StoreName, ThemeContext, Variation } from '../types';
import { BRAND_LOGOS } from '../constants';

type AlertType = 'lowStock' | 'noColor' | 'noVariations' | 'noImage' | 'missingPrice';

interface AssistantScreenProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  canManageStock: boolean;
  onMenuClick: () => void;
}

const FABRIC_PURCHASED_STORAGE_KEY = 'pillow-oasis-fabric-purchased';

const getIconForAlert = (alertType: AlertType, isDark: boolean) => {
    const color = isDark ? 'text-purple-300' : 'text-purple-600';
    switch (alertType) {
        case 'lowStock': return <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>;
        case 'noColor': return <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
        case 'noVariations': return <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
        case 'noImage': return <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        default: return <div />;
    }
};

const AlertCard: React.FC<{ count: number; title: string; description: string; alertType: AlertType; onClick: () => void; theme: 'light' | 'dark' }> = ({ count, title, description, alertType, onClick, theme }) => {
    const isDark = theme === 'dark';
    const cardClasses = isDark ? "bg-black/20 border-white/10 hover:bg-black/40" : "bg-white border-gray-200/80 hover:bg-gray-50/80 shadow-sm";
    return (
        <button onClick={onClick} disabled={count === 0} className={`relative p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 ${cardClasses} ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
             {count > 0 && (
                <span className="absolute top-3 right-3 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-black/20 blinking-dot" />
            )}
            <div>
                <div className="flex justify-between items-start">
                    {getIconForAlert(alertType, isDark)}
                    <span className="text-4xl font-bold text-fuchsia-500">{count}</span>
                </div>
                <h3 className={`mt-3 font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
        </button>
    );
};

const GenericAlertList: React.FC<{ products: Product[]; title: string; onEditProduct: (product: Product) => void; theme: 'light' | 'dark' }> = ({ products, title, onEditProduct, theme }) => {
    const isDark = theme === 'dark';
    return (
        <div className="space-y-3">
            {products.map((product, index) => (
                <div key={product.id} className={`p-3 rounded-xl flex items-center justify-between border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`} style={{ animation: `float-in 0.3s ease-out forwards`, animationDelay: `${index * 30}ms`, opacity: 0 }}>
                    <div className="flex items-center gap-4">
                        <img src={product.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div>
                            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{product.name}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{product.category}</p>
                        </div>
                    </div>
                    <button onClick={() => onEditProduct(product)} className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2 ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/40' : 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200'}`}>
                        Corrigir
                    </button>
                </div>
            ))}
        </div>
    );
};

interface LowStockListProps {
    products: Product[];
    onDeleteProduct: (id: string) => void;
    purchasedFabricIds: string[];
    onToggleFabricPurchased: (productId: string) => void;
    theme: 'light' | 'dark';
}

const LowStockList: React.FC<LowStockListProps> = ({ products, onDeleteProduct, purchasedFabricIds, onToggleFabricPurchased, theme }) => {
    const isDark = theme === 'dark';
    const [discontinuedProducts, setDiscontinuedProducts] = useState<Record<string, boolean>>({});

    return (
        <div className="space-y-4">
            {products.map((product, index) => {
                const isDiscontinued = !!discontinuedProducts[product.id];
                const isFabricPurchased = purchasedFabricIds.includes(product.id);
                const totalStock = product.variations.reduce((sum, v) => sum + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0);
                return (
                    <div key={product.id} className={`rounded-3xl p-5 shadow-lg transition-all duration-300 border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200/80 shadow-md'}`} style={{ animation: `float-in 0.3s ease-out forwards`, animationDelay: `${index * 50}ms`, opacity: 0 }}>
                        <div className="flex items-start space-x-4">
                            <div className={`w-20 h-20 ${isDark ? 'bg-black/20' : 'bg-gray-100'} rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md`}>
                                <img src={product.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-bold text-lg leading-tight ${isDark ? 'text-purple-200' : 'text-gray-800'}`}>{product.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>{totalStock}</span>
                                        <div className="w-3 h-3 bg-red-500 rounded-full blinking-dot"></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
                                    <span className={`text-xs font-semibold ${isDark ? 'text-purple-300/80' : 'text-gray-500'}`}>{product.brand}</span>
                                </div>
                            </div>
                        </div>
                        <div className={`mt-4 pt-4 border-t flex flex-col gap-4 ${isDark ? 'border-white/10' : 'border-gray-200/80'}`}>
                             <label className={`flex items-center cursor-pointer p-3 rounded-lg transition-colors ${isFabricPurchased ? (isDark ? 'bg-green-900/50 border border-green-500/30' : 'bg-green-100 border border-green-200') : (isDark ? 'bg-black/10' : 'bg-gray-50')}`}>
                                <input type="checkbox" checked={isFabricPurchased} onChange={() => onToggleFabricPurchased(product.id)} className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                <span className={`ml-3 font-semibold ${isFabricPurchased ? (isDark ? 'text-green-300' : 'text-green-800') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}>Tecido já comprado</span>
                            </label>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isDiscontinued} onChange={() => setDiscontinuedProducts(prev => ({...prev, [product.id]: !prev[product.id]}))} className="h-5 w-5 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500" />
                                    <span className={`ml-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Essa almofada saiu de linha?</span>
                                </label>
                                {isDiscontinued && (
                                    <div className="flex items-center gap-2" style={{animation: 'float-in 0.3s forwards', opacity: 0}}>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Deseja excluir?</p>
                                        <button onClick={() => onDeleteProduct(product.id)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-red-600/20 hover:bg-red-700 transition">Sim, excluir</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AssistantScreen: React.FC<AssistantScreenProps> = ({ products, onEditProduct, onDeleteProduct }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);

  const [purchasedFabricIds, setPurchasedFabricIds] = useState<string[]>(() => {
    try {
        const stored = localStorage.getItem(FABRIC_PURCHASED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse purchased fabric IDs from localStorage:", e);
        return [];
    }
  });

  const handleToggleFabricPurchased = (productId: string) => {
    setPurchasedFabricIds(prev => {
        const newIds = prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId];
        localStorage.setItem(FABRIC_PURCHASED_STORAGE_KEY, JSON.stringify(newIds));
        return newIds;
    });
  };

  const [lowStockFilter, setLowStockFilter] = useState<'all' | 'purchased'>('all');

  const lowStockProducts = useMemo(() => products.filter(p => p.variations.reduce((acc, v) => acc + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0) <= 1), [products]);
  const noColorProducts = useMemo(() => products.filter(p => !p.colors || p.colors.length === 0 || p.colors.some(c => c.name === 'Indefinida')), [products]);
  const noVariationsProducts = useMemo(() => products.filter(p => !p.variations || p.variations.length === 0), [products]);
  const noImageProducts = useMemo(() => products.filter(p => !p.baseImageUrl), [products]);
  
  const filteredLowStockProducts = useMemo(() => {
    if (lowStockFilter === 'all') {
        return lowStockProducts;
    }
    return lowStockProducts.filter(p => purchasedFabricIds.includes(p.id));
  }, [lowStockProducts, lowStockFilter, purchasedFabricIds]);


  const alertConfig: { type: AlertType; title: string; description: string; products: Product[] }[] = [
    { type: 'lowStock', title: 'Está na hora de repor!', description: 'Itens que precisam de reposição urgente.', products: lowStockProducts },
    { type: 'noColor', title: 'Cor Indefinida', description: 'Produtos sem uma cor específica atribuída.', products: noColorProducts },
    { type: 'noVariations', title: 'Sem Variações', description: 'Produtos sem variações de tamanho ou preço.', products: noVariationsProducts },
    { type: 'noImage', title: 'Sem Imagem', description: 'Produtos sem imagem principal.', products: noImageProducts },
  ];
  
  const currentAlert = selectedAlert ? alertConfig.find(c => c.type === selectedAlert) : null;

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
        <div className="max-w-4xl mx-auto">
            {!currentAlert ? (
                <>
                    <h1 className={`text-3xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Assistente de Estoque</h1>
                    <p className={`text-md text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avisos para manter seu catálogo organizado.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alertConfig.map(alert => (
                            <AlertCard key={alert.type} count={alert.products.length} title={alert.title} description={alert.description} alertType={alert.type} onClick={() => setSelectedAlert(alert.type)} theme={theme} />
                        ))}
                    </div>
                </>
            ) : (
                <div>
                     <div className="flex items-center mb-6">
                        <button onClick={() => setSelectedAlert(null)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className={`text-2xl font-bold ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentAlert.title}</h1>
                    </div>
                    {currentAlert.type === 'lowStock' ? (
                        <>
                            <div className="mb-4 flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Filtro:</span>
                                <button
                                    onClick={() => setLowStockFilter('all')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${lowStockFilter === 'all' ? (isDark ? 'bg-fuchsia-600 text-white border-transparent' : 'bg-purple-600 text-white border-transparent') : (isDark ? 'bg-black/20 text-gray-300 border-white/10' : 'bg-white text-gray-700 border-gray-300')}`}
                                >
                                    Todos ({lowStockProducts.length})
                                </button>
                                <button
                                    onClick={() => setLowStockFilter('purchased')}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${lowStockFilter === 'purchased' ? (isDark ? 'bg-fuchsia-600 text-white border-transparent' : 'bg-purple-600 text-white border-transparent') : (isDark ? 'bg-black/20 text-gray-300 border-white/10' : 'bg-white text-gray-700 border-gray-300')}`}
                                >
                                    Tecidos Comprados ({lowStockProducts.filter(p => purchasedFabricIds.includes(p.id)).length})
                                </button>
                            </div>
                            <LowStockList 
                                products={filteredLowStockProducts} 
                                onDeleteProduct={onDeleteProduct} 
                                theme={theme}
                                purchasedFabricIds={purchasedFabricIds}
                                onToggleFabricPurchased={handleToggleFabricPurchased}
                            />
                        </>
                    ) : (
                        <GenericAlertList products={currentAlert.products} title={currentAlert.title} onEditProduct={onEditProduct} theme={theme} />
                    )}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default AssistantScreen;
