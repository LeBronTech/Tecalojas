import React, { useState, useContext, useMemo } from 'react';
import { Product, StoreName, ThemeContext, Variation } from '../types';
import { BRAND_LOGOS } from '../constants';

interface ReplacementItemProps {
  product: Product;
  onDelete: (productId: string) => void;
  onEdit: (product: Product) => void;
  theme: 'light' | 'dark';
  index: number;
}

const ReplacementItem: React.FC<ReplacementItemProps> = ({ product, onDelete, onEdit, theme, index }) => {
  const isDark = theme === 'dark';
  const [isDiscontinued, setIsDiscontinued] = useState(false);
  
  const cardClasses = isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200/80 shadow-md";
  const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
  const textMetaClasses = isDark ? "text-purple-300/80" : "text-gray-500";
  const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
  const totalStock = useMemo(() => product.variations.reduce((sum, v: Variation) => sum + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0), [product.variations]);

  return (
    <div 
      onClick={() => onEdit(product)}
      className={`rounded-3xl p-5 shadow-lg transition-all duration-300 border cursor-pointer ${cardClasses}`}
      style={{ animation: `float-in 0.3s ease-out forwards`, animationDelay: `${index * 50}ms`, opacity: 0 }}
    >
      <div className="flex items-start space-x-4">
        <div className={`w-20 h-20 ${imageBgClasses} rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md`}>
          {product.baseImageUrl ? (
            <img src={product.baseImageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center relative ${imageBgClasses}`}>
              <img src="https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png" alt="Sem Imagem" className="w-1/2 h-1/2 object-contain opacity-20" />
            </div>
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-lg leading-tight ${textNameClasses}`}>{product.name}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>{totalStock}</span>
              <div className="w-3 h-3 bg-red-500 rounded-full blinking-dot"></div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px" />
            <span className={`text-xs font-semibold ${textMetaClasses}`}>{product.brand}</span>
          </div>
        </div>
      </div>
      <div className={`mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'border-white/10' : 'border-gray-200/80'}`} onClick={e => e.stopPropagation()}>
        <label className="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={isDiscontinued} 
            onChange={(e) => setIsDiscontinued(e.target.checked)} 
            className="h-5 w-5 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
          />
          <span className={`ml-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Essa almofada saiu de linha?</span>
        </label>
        {isDiscontinued && (
          <div className="flex items-center gap-2 animate-fade-in">
            <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Deseja excluir?</p>
            <button 
              onClick={() => onDelete(product.id)} 
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-red-600/20 hover:bg-red-700 transition"
            >
              Sim, excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ReplacementScreenProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  canManageStock: boolean;
  onMenuClick: () => void;
}

const ReplacementScreen: React.FC<ReplacementScreenProps> = ({ products, onEditProduct, onDeleteProduct }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const productsToRestock = useMemo(() => {
    return products.filter(p => {
      const totalStock = p.variations.reduce((acc, v) => acc + (v.stock[StoreName.TECA] || 0) + (v.stock[StoreName.IONE] || 0), 0);
      return totalStock <= 1;
    });
  }, [products]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
        <h1 className={`text-3xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Está na hora de repor!</h1>
        <p className={`text-md text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {productsToRestock.length > 0
            ? `Você tem ${productsToRestock.length} item(ns) com estoque baixo.`
            : 'Nenhum item precisando de reposição no momento.'
          }
        </p>
        
        <div className="space-y-4 max-w-2xl mx-auto">
          {productsToRestock.length > 0 ? (
            productsToRestock.map((product, index) => (
              <ReplacementItem 
                key={product.id} 
                product={product} 
                onDelete={onDeleteProduct}
                onEdit={onEditProduct}
                theme={theme}
                index={index}
              />
            ))
          ) : (
            <div className={`text-center p-12 rounded-2xl border-2 border-dashed ${isDark ? 'border-green-500/30 bg-green-900/20' : 'border-green-300 bg-green-50'}`}>
                <span className="text-5xl">🎉</span>
                <p className={`mt-4 text-xl font-bold ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                    Parabéns, seu estoque está atualizado!
                </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReplacementScreen;
