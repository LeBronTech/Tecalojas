import React, { useContext } from 'react';
import { Product, StoreName, View, Brand } from '../types';
import { ThemeContext } from '../App';
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
         <div className="flex items-center space-x-1.5">
            <span className={`font-semibold text-xs w-10 text-right ${isDark ? 'text-purple-300/80' : 'text-gray-500'}`}>{store}:</span>
            <button
                onClick={() => onUpdate(-1)}
                disabled={disabled || stock <= 0}
                className={`w-6 h-6 rounded-md font-bold text-lg flex items-center justify-center transition-colors ${disabled || stock <= 0 ? disabledButtonClasses : buttonClasses}`}
                aria-label={`Diminuir estoque de ${store}`}
            >
                -
            </button>
            <span className={`font-bold w-6 text-center ${stockTextClasses}`}>{stock}</span>
            <button
                onClick={() => onUpdate(1)}
                disabled={disabled}
                className={`w-6 h-6 rounded-md font-bold text-lg flex items-center justify-center transition-colors ${disabled ? disabledButtonClasses : buttonClasses}`}
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
    onUpdateStock: (productId: string, store: StoreName, change: number) => void;
    canManageStock: boolean;
}

const StockItem: React.FC<StockItemProps> = ({ product, index, onEdit, onDelete, onUpdateStock, canManageStock }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const tecaStock = product.variations.reduce((acc, v) => acc + v.stock[StoreName.TECA], 0);
    const ioneStock = product.variations.reduce((acc, v) => acc + v.stock[StoreName.IONE], 0);
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

    return (
        <div 
            className={`rounded-3xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl transition-all duration-300 border ${cardClasses}`}
            style={{ 
                animation: 'float-in 0.3s ease-out forwards',
                animationDelay: `${index * 50}ms`,
                opacity: 0
            }}
        >
            <div className="flex items-center space-x-4 flex-grow min-w-0">
                <div className={`w-16 h-16 ${imageBgClasses} rounded-xl flex-shrink-0 overflow-hidden shadow-md`}>
                    <img src={product.baseImageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow min-w-0">
                    <h4 className={`font-bold text-base leading-tight truncate ${textNameClasses}`} title={product.name}>{product.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                        <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
                        <span className={`text-xs font-semibold ${textMetaClasses}`}>{product.brand}</span>
                    </div>
                     <div className={`flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1.5 ${textMetaClasses}`}>
                        <StockControl 
                            store={StoreName.TECA} 
                            stock={tecaStock} 
                            onUpdate={(change) => onUpdateStock(product.id, StoreName.TECA, change)} 
                            disabled={!canManageStock}
                        />
                         <div className="mt-1 sm:mt-0">
                            <StockControl 
                                store={StoreName.IONE} 
                                stock={ioneStock} 
                                onUpdate={(change) => onUpdateStock(product.id, StoreName.IONE, change)} 
                                disabled={!canManageStock}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-2 ml-4 flex-shrink-0">
                <div className="text-center">
                    <span className="text-3xl font-black text-fuchsia-500">{totalStock}</span>
                    <p className="text-xs text-fuchsia-500/80 font-semibold -mt-1">TOTAL</p>
                </div>
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => onEdit(product)}
                        disabled={!canManageStock}
                        className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${canManageStock ? actionBtnClasses : disabledBtnClasses}`}
                        aria-label={`Editar ${product.name}`}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => onDelete(product.id)}
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
    );
};


interface StockManagementScreenProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
  onUpdateStock: (productId: string, store: StoreName, change: number) => void;
  onMenuClick: () => void;
  canManageStock: boolean;
}

const StockManagementScreen: React.FC<StockManagementScreenProps> = ({ products, onEditProduct, onDeleteProduct, onAddProduct, onUpdateStock, canManageStock }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

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

      <div className="relative z-10">
        <div className="px-6 pt-20 pb-4 text-center">
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Gerenciamento de Estoque</h1>
            <p className={`text-md ${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1`}>{products.length} produtos cadastrados</p>
        </div>
      </div>
      
      <main className="flex-grow overflow-y-auto px-4 space-y-3 pb-24 md:pb-6 z-10 no-scrollbar">
        {products.map((product, index) => (
          <StockItem 
            key={product.id} 
            product={product} 
            index={index} 
            onEdit={onEditProduct} 
            onDelete={onDeleteProduct} 
            onUpdateStock={onUpdateStock}
            canManageStock={canManageStock} 
          />
        ))}
      </main>

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