import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
// FIX: Add DynamicBrand to imports to be used in component props.
import { Product, StoreName, View, Brand, CushionSize, DynamicBrand, ThemeContext } from '../types';
import { BRAND_LOGOS } from '../constants';

// --- StockControl Sub-component ---
const StockControl: React.FC<{
    store: StoreName;
    stock: number;
    onUpdate: (change: number) => void;
    disabled: boolean;
}> = ({ store, stock, onUpdate, disabled }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const buttonClasses = isDark ? "bg-gray-700/50 text-gray-200 hover:bg-purple-900/50" : "bg-gray-200 text-gray-700 hover:bg-gray-300";
    const disabledButtonClasses = isDark ? "bg-gray-800/50 text-gray-500 cursor-not-allowed" : "bg-gray-200/50 text-gray-400 cursor-not-allowed";
    const stockTextClasses = isDark ? "text-cyan-300" : "text-blue-600";
    
    return (
         <div className="flex items-center space-x-3">
            <span className={`font-semibold text-sm w-20 text-right ${isDark ? 'text-purple-300/80' : 'text-gray-500'}`}>{store}:</span>
            <button
                onClick={(e) => { e.stopPropagation(); onUpdate(-1); }}
                disabled={disabled || stock <= 0}
                className={`w-12 h-12 rounded-lg font-bold text-4xl flex items-center justify-center transition-colors ${disabled || stock <= 0 ? disabledButtonClasses : buttonClasses}`}
                aria-label={`Diminuir estoque de ${store}`}
            >
                -
            </button>
            <span className={`font-bold w-10 text-center text-xl ${stockTextClasses}`}>{stock}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onUpdate(1); }}
                disabled={disabled}
                className={`w-12 h-12 rounded-lg font-bold text-4xl flex items-center justify-center transition-colors ${disabled ? disabledButtonClasses : buttonClasses}`}
                aria-label={`Aumentar estoque de ${store}`}
            >
                +
            </button>
        </div>
    );
}

// --- StockItem Component ---
interface StockItemProps {
    product: Product;
    index: number;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onUpdateStock: (productId: string, variationSize: CushionSize, store: StoreName, change: number) => void;
    canManageStock: boolean;
    selectedVariation: CushionSize;
    onSelectVariation: (productId: string, size: CushionSize) => void;
}

const StockItem: React.FC<StockItemProps> = ({ product, index, onEdit, onDelete, onUpdateStock, canManageStock, selectedVariation, onSelectVariation }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const currentVariation = product.variations.find(v => v.size === selectedVariation);

    const tecaStock = currentVariation?.stock[StoreName.TECA] ?? 0;
    const ioneStock = currentVariation?.stock[StoreName.IONE] ?? 0;
    const totalStock = tecaStock + ioneStock;

    const cardClasses = isDark
        ? "bg-black/20 backdrop-blur-2xl border-white/10 hover:bg-black/30"
        : "bg-white border-gray-200/80 hover:bg-gray-50/80 shadow-md";
    const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
    const textMetaClasses = isDark ? "text-purple-300/80" : "text-gray-500";
    const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
    const actionBtnClasses = isDark
        ? "text-gray-300 hover:text-cyan-400 hover:bg-cyan-500/10"
        : "text-gray-500 hover:text-blue-600 hover:bg-blue-500/10";
    const deleteBtnClasses = isDark
        ? "text-gray-300 hover:text-red-500 hover:bg-red-500/10"
        : "text-gray-500 hover:text-red-600 hover:bg-red-500/10";
    const disabledBtnClasses = isDark ? "text-gray-500 opacity-50 cursor-not-allowed" : "text-gray-400 opacity-50 cursor-not-allowed";
    const selectClasses = isDark ? "bg-gray-700/50 text-gray-200 border-white/10" : "bg-gray-100 text-gray-700 border-gray-200";


    return (
        <div 
            onClick={() => canManageStock && onEdit(product)}
            className={`rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 border ${cardClasses} ${canManageStock ? 'cursor-pointer' : ''}`}
            style={{ 
                animation: 'float-in 0.3s ease-out forwards',
                animationDelay: `${index * 50}ms`,
                opacity: 0
            }}
        >
            <div className="flex items-start space-x-4">
                <div className={`w-20 h-20 ${imageBgClasses} rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md`}>
                    {product.baseImageUrl ? (
                        <img src={product.baseImageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center relative ${imageBgClasses}`}>
                            <img 
                                src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" 
                                alt="Sem Imagem" 
                                className="w-1/2 h-1/2 object-contain opacity-20" 
                            />
                        </div>
                    )}
                </div>
                <div className="flex-grow min-w-0">
                     <div className="flex justify-between items-start gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className={`font-bold text-lg leading-tight ${textNameClasses}`}>{product.name}</h4>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-black ${totalStock <= 1 ? (isDark ? 'text-red-400' : 'text-red-600') : 'text-fuchsia-500'}`}>{totalStock}</span>
                                    {totalStock <= 1 && <div className="w-3 h-3 bg-red-500 rounded-full blinking-dot"></div>}
                                    {totalStock === 2 && <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>}
                                </div>
                            </div>
                            <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
                                    <span className={`text-xs font-semibold ${textMetaClasses}`}>{product.brand}</span>
                                </div>
                                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                                    {product.fabricType}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                                disabled={!canManageStock}
                                className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${canManageStock ? actionBtnClasses : disabledBtnClasses}`}
                                aria-label={`Editar ${product.name}`}
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                                </svg>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                                disabled={!canManageStock}
                                className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${canManageStock ? deleteBtnClasses : disabledBtnClasses}`}
                                aria-label={`Excluir ${product.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className={`mt-4 pt-4 flex flex-col items-center justify-center gap-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200/80'}`}>
                {product.variations && product.variations.length > 1 && (
                    <div className="mb-2 w-full flex justify-center">
                         <select
                            value={selectedVariation}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => onSelectVariation(product.id, e.target.value as CushionSize)}
                            className={`text-xs p-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${selectClasses}`}
                            disabled={!canManageStock}
                        >
                            {product.variations.map(v => (
                                <option key={v.size} value={v.size}>
                                    Ver estoque: {v.size}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                 <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    <StockControl 
                        store={StoreName.TECA} 
                        stock={tecaStock} 
                        onUpdate={(change) => onUpdateStock(product.id, selectedVariation, StoreName.TECA, change)} 
                        disabled={!canManageStock || !currentVariation}
                    />
                    <StockControl 
                        store={StoreName.IONE} 
                        stock={ioneStock} 
                        onUpdate={(change) => onUpdateStock(product.id, selectedVariation, StoreName.IONE, change)} 
                        disabled={!canManageStock || !currentVariation}
                    />
                </div>
            </div>
        </div>
    );
};


interface StockManagementScreenProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
  onUpdateStock: (productId: string, variationSize: CushionSize, store: StoreName, change: number) => void;
  onMenuClick: () => void;
  canManageStock: boolean;
  hasFetchError: boolean;
  // FIX: Add the 'brands' property to align with the props passed in App.tsx, resolving the TypeScript error.
  brands: DynamicBrand[];
}

const StockManagementScreen: React.FC<StockManagementScreenProps> = ({ products, onEditProduct, onDeleteProduct, onAddProduct, onUpdateStock, onMenuClick, canManageStock, hasFetchError, brands }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [selectedVariations, setSelectedVariations] = useState<Record<string, CushionSize>>({});
  const [showWarning, setShowWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');
  const [isFilterHeaderOpen, setIsFilterHeaderOpen] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const currentScrollY = scrollContainerRef.current.scrollTop;

        if (currentScrollY > 100) { // Threshold to start hiding
            if (currentScrollY > lastScrollY.current) {
                // Scrolling Down
                if (isHeaderVisible) setIsHeaderVisible(false);
                if (isFilterHeaderOpen) setIsFilterHeaderOpen(false); // Collapse filters
            } else {
                // Scrolling Up
                if (!isHeaderVisible) setIsHeaderVisible(true);
            }
        } else {
            // Always show header when near the top
            if (!isHeaderVisible) setIsHeaderVisible(true);
        }
        
        lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
    }
  };
  
  useEffect(() => {
    if (hasFetchError) {
      setShowWarning(true);
    }
  }, [hasFetchError]);


    useEffect(() => {
        // This effect now preserves existing selections and only sets defaults for new products.
        // This prevents the user's selection from being reset on every data refresh.
        setSelectedVariations(prevSelections => {
            const newSelections = { ...prevSelections };
            let hasChanged = false;
    
            products.forEach(p => {
                // If a product doesn't have a selected variation yet, set a default one.
                if (!newSelections[p.id] && p.variations && p.variations.length > 0) {
                    const defaultVar = p.variations.find(v => v.size === CushionSize.SQUARE_40) || p.variations[0];
                    newSelections[p.id] = defaultVar.size;
                    hasChanged = true;
                }
            });
            
            // Only update state if there are new products to add, to avoid unnecessary re-renders.
            return hasChanged ? newSelections : prevSelections;
        });
    }, [products]);

    const handleSelectVariation = (productId: string, size: CushionSize) => {
        setSelectedVariations(prev => ({ ...prev, [productId]: size }));
    };
    
    const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category)))], [products]);
    
    const filteredProducts = useMemo(() => {
        return products
            .filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                (selectedCategory === 'Todas' || product.category === selectedCategory)
            )
            .sort((a, b) => {
                if (sortOrder === 'alpha') {
                    return a.name.localeCompare(b.name);
                } else { // 'recent'
                    const timeA = parseInt(a.id.split('-')[0], 10) || 0;
                    const timeB = parseInt(b.id.split('-')[0], 10) || 0;
                    return timeB - timeA;
                }
            });
    }, [products, searchQuery, selectedCategory, sortOrder]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-80 overflow-hidden">
           {isDark ? (
            <>
              <div className="absolute -top-20 -left-40 w-96 h-96 bg-fuchsia-600/30 rounded-full filter blur-3xl transform rotate-45 opacity-50"></div>
              <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl transform -rotate-45 opacity-40"></div>
              <div className="absolute top-1/2 -right-20 w-72 h-72 bg-cyan-400/20 rounded-full filter blur-2xl opacity-60"></div>
            </>
           ) : (
            <>
              <div className="absolute -top-20 -left-40 w-96 h-96 bg-purple-200/50 rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-24 -right-20 w-96 h-96 bg-fuchsia-200/50 rounded-full filter blur-3xl"></div>
            </>
           )}
       </div>

        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto no-scrollbar">
            <div className={`sticky top-0 z-10 pt-20 pb-4 transition-transform duration-300 ease-in-out ${isDark ? 'bg-[#1A1129]/80 backdrop-blur-md' : 'bg-gray-50/80 backdrop-blur-md'} ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="pb-4 px-6 text-center">
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Gerenciamento de Estoque</h1>
                    <p className={`text-md ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                        {searchQuery || selectedCategory !== 'Todas' ? `Mostrando ${filteredProducts.length} de ${products.length} produtos` : `${products.length} produtos cadastrados`}
                    </p>
                </div>
                <div className="text-center px-6">
                    <button
                        onClick={() => setIsFilterHeaderOpen(!isFilterHeaderOpen)}
                        className={`inline-flex items-center justify-center font-semibold py-2 px-4 rounded-lg transition-colors text-sm ${isDark ? 'bg-black/20 text-gray-300 hover:bg-black/40' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        aria-expanded={isFilterHeaderOpen}
                        aria-controls="filters-panel"
                    >
                        Filtros & Busca
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-2 transition-transform duration-300 ${isFilterHeaderOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                <div id="filters-panel" className={`transition-all duration-500 ease-in-out overflow-hidden ${isFilterHeaderOpen ? 'max-h-[500px] opacity-100 pt-4' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 flex items-center gap-4">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full border rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow shadow-inner ${isDark ? 'bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400' : 'bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm'}`}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'recent' | 'alpha')}
                            className={`border rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow appearance-none ${isDark ? 'bg-black/30 backdrop-blur-sm border-white/10 text-white' : 'bg-white border-gray-300/80 text-gray-900 shadow-sm'}`}
                        >
                            <option value="recent">Mais Recentes</option>
                            <option value="alpha">Ordem Alfabética</option>
                        </select>
                    </div>
                    
                    <div className="px-4 flex flex-wrap gap-2 mt-4">
                        {categories.map(category => {
                            const isActive = selectedCategory === category;
                            const activeClasses = isDark 
                                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30 border-transparent hover:bg-fuchsia-500' 
                                : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 border-transparent hover:bg-purple-700';
                            const inactiveClasses = isDark 
                                ? 'bg-black/20 backdrop-blur-md text-gray-200 border-white/10 hover:bg-black/40' 
                                : 'bg-white text-gray-700 border-gray-300/80 hover:bg-gray-100 hover:border-gray-400';

                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap border transform hover:scale-105 ${
                                        isActive ? activeClasses : inactiveClasses
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <main className="px-4 space-y-3 pb-44 md:pb-6 z-0">
                {canManageStock && showWarning && (
                    <div className={`relative border-l-4 p-4 rounded-lg shadow-md ${isDark ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-red-100 border-red-500 text-red-800'}`}>
                        <button 
                            onClick={() => setShowWarning(false)}
                            className={`absolute top-2 right-2 p-1 rounded-full ${isDark ? 'text-red-300 hover:bg-red-800/60' : 'text-red-800 hover:bg-red-200'}`}
                            aria-label="Fechar aviso"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <p className="font-bold">Ação Necessária: Configuração de Permissões</p>
                        <p className="text-sm mt-1">
                            A vitrine para visitantes está mostrando dados de demonstração porque as regras de segurança do seu banco de dados estão bloqueando o acesso público.
                        </p>
                        <a 
                            href="https://console.firebase.google.com/project/meu-estoque-b1fbe/firestore/rules" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`inline-block mt-2 text-sm font-bold underline ${isDark ? 'text-red-100 hover:text-red-300' : 'text-red-900 hover:text-red-700'}`}
                        >
                            Clique aqui para corrigir as regras do Firebase e exibir a vitrine real.
                        </a>
                    </div>
                )}

                {filteredProducts.map((product, index) => (
                <StockItem 
                    key={product.id} 
                    product={product} 
                    index={index} 
                    onEdit={onEditProduct} 
                    onDelete={onDeleteProduct} 
                    onUpdateStock={onUpdateStock}
                    canManageStock={canManageStock}
                    selectedVariation={selectedVariations[product.id]}
                    onSelectVariation={handleSelectVariation}
                />
                ))}
            </main>
        </div>

       <div 
         className="absolute bottom-24 md:bottom-6 left-0 right-0 p-6 z-20" 
         style={{
           background: `linear-gradient(to top, ${isDark ? '#1A1129f0' : '#fffffff0'}, transparent)`
         }}
       >
        {canManageStock ? (
            <button onClick={onAddProduct} className="w-full bg-fuchsia-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-fuchsia-600/30 hover:bg-fuchsia-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                ADICIONAR NOVO ITEM
            </button>
        ) : (
            <div className={`text-center p-4 rounded-2xl ${isDark ? 'bg-black/20 text-gray-400' : 'bg-yellow-100 text-yellow-800'}`}>
                <p className="font-semibold">Modo somente leitura</p>
                <p className="text-sm">Você não tem permissão para gerenciar o estoque.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StockManagementScreen;