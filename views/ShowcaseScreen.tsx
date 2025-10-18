import React, { useState, useContext } from 'react';
import { Product, View } from '../types';
import ProductDetailModal from '../components/ProductDetailModal';
import { ThemeContext } from '../App';
import { BRAND_LOGOS, WATER_RESISTANCE_INFO } from '../constants';

const FireIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.828 6.065c.348-.348.348-.913 0-1.261a.89.89 0 0 0-1.261 0c-1.121 1.121-1.859 2.62-1.859 4.289 0 .548.152 1.07.42 1.536l-.805 1.209a.89.89 0 0 0 1.503 1.002l.805-1.209c.466.268.988.42 1.536.42 1.668 0 3.167-.738 4.288-1.86a.89.89 0 0 0 0-1.26c-.347-.348-.912-.348-1.26 0l-1.06 1.06c-.495-.713-.88-1.52-1.077-2.389.336-.264.63-.578.875-.923l1.06 1.061Z" clipRule="evenodd" />
        <path d="M4.172 13.935c-.348.348-.348.913 0 1.261a.89.89 0 0 0 1.261 0c1.121-1.121 1.859-2.62-1.859-4.289 0-.548-.152-1.07-.42-1.536l.805-1.209a.89.89 0 0 0-1.503-1.002l-.805 1.209c-.466-.268-.988-.42-1.536-.42-1.668 0-3.167.738-4.288 1.86a.89.89 0 0 0 0 1.26c.347.348.912.348 1.26 0l1.06-1.06c.495.713.88 1.52 1.077 2.389-.336-.264-.63.578-.875-.923l-1.06 1.061Z" />
    </svg>
);


const ProductCard: React.FC<{ product: Product, index: number, onClick: () => void }> = ({ product, index, onClick }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const cardClasses = isDark 
    ? "bg-black/20 backdrop-blur-xl border-white/10" 
    : "bg-white border-gray-200/80 shadow-md";
  
  const textNameClasses = isDark ? "text-purple-200" : "text-gray-800";
  const textMetaClasses = isDark ? "text-purple-300" : "text-gray-500";
  const imageBgClasses = isDark ? "bg-black/20" : "bg-gray-100";
  
  const waterResistanceDetails = WATER_RESISTANCE_INFO[product.waterResistance];
  
  const getPriceRange = () => {
    if (!product.variations || product.variations.length === 0) {
        return 'R$0,00';
    }
    const prices = product.variations.map(v => v.priceFull);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
        return `R$${minPrice.toFixed(2).replace('.', ',')}`;
    }
    return `R$${minPrice.toFixed(2).replace('.', ',')} - R$${maxPrice.toFixed(2).replace('.', ',')}`;
  };

  return (
    <button 
        onClick={onClick}
        className={`rounded-3xl p-3 shadow-lg flex flex-col items-center text-center border transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${cardClasses} ${isDark ? 'focus:ring-offset-black' : 'focus:ring-offset-white'}`}
        style={{ 
             animation: 'float-in 0.5s ease-out forwards',
             animationDelay: `${index * 50}ms`,
             opacity: 0 
         }}>
        <div className={`w-full h-32 ${imageBgClasses} rounded-2xl mb-3 flex items-center justify-center overflow-hidden relative`}>
             <img src={product.baseImageUrl || 'https://i.imgur.com/gA0Wxkm.png'} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
             {waterResistanceDetails?.showcaseIndicator && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    {waterResistanceDetails.showcaseIndicator}
                </div>
             )}
        </div>
        <h3 className={`font-bold text-sm leading-tight h-10 flex items-center justify-center ${textNameClasses}`}>{product.name}</h3>
        <div className={`flex items-center justify-center flex-wrap gap-x-3 gap-y-2 text-xs mt-2`}>
            <div className={`flex items-center space-x-1 ${textMetaClasses}`}>
                <FireIcon className="w-4 h-4 text-orange-400" />
                <span>{product.unitsSold} vendidos</span>
            </div>
            <div className={`flex items-center gap-1 ${textMetaClasses}`}>
                <img src={BRAND_LOGOS[product.brand]} alt={product.brand} className="w-4 h-4 rounded-full object-contain bg-white p-px shadow-sm" />
                <span className="font-semibold">{product.brand}</span>
            </div>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                {product.fabricType}
            </span>
        </div>
        <span className="text-md font-bold text-fuchsia-500 mt-2">{getPriceRange()}</span>
    </button>
  );
};


interface ShowcaseScreenProps {
  products: Product[];
  onMenuClick: () => void;
  onSaveProduct: (product: Product) => void;
  hasFetchError: boolean;
  apiKey: string | null;
  onRequestApiKey: () => void;
}

const ShowcaseScreen: React.FC<ShowcaseScreenProps> = ({ products, onSaveProduct, hasFetchError, apiKey, onRequestApiKey }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = selectedCategory === 'Todas'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const searchInputClasses = isDark 
    ? "bg-black/30 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400"
    : "bg-white border-gray-300/80 text-gray-900 placeholder:text-gray-500 shadow-sm";
  
  const headerTextClasses = isDark ? "text-purple-300/80" : "text-purple-600/80";
  const titleTextClasses = isDark ? "text-white" : "text-gray-900";
  
  return (
    <>
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

          <main className="flex-grow overflow-y-auto px-6 pt-20 pb-24 md:pb-6 flex flex-col no-scrollbar z-10">
              {hasFetchError && (
                <div className={`p-4 mb-4 rounded-xl text-center font-semibold border ${isDark ? 'bg-red-900/50 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-200'}`}>
                    <p className="font-bold text-lg">Modo de Demonstração Ativo</p>
                    <p className="text-sm">Você está vendo uma vitrine de exemplo. O conteúdo real não pôde ser carregado.</p>
                </div>
              )}
              <div className="relative mb-6">
                  <input type="text" placeholder="Buscar por almofadas..." className={`w-full border rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm transition-shadow shadow-inner ${searchInputClasses}`}/>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
              </div>
              
              <div className="mb-4">
                  <h2 className={`text-sm font-bold tracking-widest ${headerTextClasses}`}>CATÁLOGO</h2>
                  <h3 className={`text-3xl font-bold ${titleTextClasses}`}>Almofadas</h3>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
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
                              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap border transform hover:scale-105 ${
                                  isActive ? activeClasses : inactiveClasses
                              }`}
                          >
                              {category}
                          </button>
                      );
                  })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredProducts.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} onClick={() => setSelectedProduct(product)} />
                  ))}
              </div>
          </main>
      </div>
      {selectedProduct && (
          <ProductDetailModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              apiKey={apiKey}
              onRequestApiKey={onRequestApiKey}
          />
      )}
    </>
  );
};

export default ShowcaseScreen;