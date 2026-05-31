import React, { useContext } from 'react';
import { View, ThemeContext } from '../types';
import { Home, Clock, DollarSign, ClipboardList, Package, ArrowLeft } from 'lucide-react';

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const CompositionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
);

const InventoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);

const ReplacementIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SalesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

interface BottomNavProps {
  activeView: View;
  onNavigate: (view: View) => void;
  hasItemsToRestock: boolean;
  isAdmin: boolean;
  hasNewSaleRequests: boolean;
  hasPendingSales?: boolean;
  hasPendingPreorders?: boolean;
  salesTab?: 'pos' | 'history' | 'pending' | 'preorders';
  onSalesTabChange?: (tab: 'pos' | 'history' | 'pending' | 'preorders') => void;
}

const NavButton: React.FC<{
  label: string;
  view: View;
  isActive: boolean;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}> = ({ label, view, isActive, onNavigate, children }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const activeText = isDark ? 'text-fuchsia-400' : 'text-purple-600';
    const inactiveText = isDark ? 'text-gray-400 hover:text-fuchsia-400' : 'text-gray-500 hover:text-purple-600';
    
    const activeIndicatorClasses = isDark 
        ? 'bg-fuchsia-500/10 border-fuchsia-500/30'
        : 'bg-purple-100/80 border-purple-200';

    return (
        <button
            onClick={() => onNavigate(view)}
            className={`flex-1 flex flex-col items-center justify-center transition-colors duration-300 relative h-16 rounded-2xl ${isActive ? activeText : inactiveText}`}
        >
            {isActive && (
                <span 
                    className={`absolute inset-0 rounded-2xl transition-all duration-300 border ${activeIndicatorClasses}`} 
                    style={{ transform: 'scale(0.9)', opacity: 1, animation: 'pop-in 0.3s forwards' }}
                ></span>
            )}
            <div className="relative z-10">
            {children}
            </div>
            <span className={`text-xs font-semibold relative z-10 mt-1 ${isActive ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ 
    activeView, 
    onNavigate, 
    hasItemsToRestock, 
    isAdmin, 
    hasNewSaleRequests, 
    hasPendingSales, 
    hasPendingPreorders,
    salesTab = 'pos',
    onSalesTabChange
}) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [calculatorCents, setCalculatorCents] = React.useState(0);

  React.useEffect(() => {
    const handleCentsChange = (e: any) => {
      setCalculatorCents(e.detail?.cents || 0);
    };
    window.addEventListener('calculator-cents-changed', handleCentsChange);
    return () => {
      window.removeEventListener('calculator-cents-changed', handleCentsChange);
    };
  }, []);

  const navClasses = isDark 
    ? "bg-black/20 backdrop-blur-2xl border-white/10"
    : "bg-white/70 backdrop-blur-2xl border-gray-200/80 shadow-lg";

  // Check if we are inside the Sales view to render the bespoke rebranded sales menu
  if (activeView === View.SALES && onSalesTabChange) {
    const activeIconClass = isDark ? "text-fuchsia-400" : "text-purple-600";
    const inactiveIconClass = isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-purple-800";

    return (
      <div className={`fixed bottom-4 left-2 right-2 sm:left-4 sm:right-4 h-20 rounded-3xl flex justify-around items-center z-30 transition-all duration-500 animate-slide-up-smooth ${
          isDark ? 'bg-[#180f2b] border border-fuchsia-500/20 shadow-2xl shadow-black/80' : 'bg-white border border-purple-100 shadow-xl shadow-purple-900/10'
      }`}>
        <style>{`
          @keyframes slideUpSmooth {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up-smooth {
            animation: slideUpSmooth 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes waveUp {
            0% { transform: translateY(15px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-wave-item {
            opacity: 0;
            animation: waveUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(162, 28, 175, 0.4), 0 0 20px rgba(162, 28, 175, 0.1); }
            50% { box-shadow: 0 0 18px rgba(162, 28, 175, 0.7), 0 0 35px rgba(162, 28, 175, 0.3); }
          }
          .animate-glow-pulse {
            animation: glow-pulse 2s infinite ease-in-out;
          }
        `}</style>

        {/* 1. Voltar Button (Goes back to showcase tab and restores normal menu) */}
        <button
          onClick={() => onNavigate(View.SHOWCASE)}
          className="flex-1 flex flex-col items-center justify-center relative cursor-pointer group active:scale-95 transition-all duration-200 animate-wave-item"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex flex-col items-center relative transition-transform duration-300 group-hover:-translate-y-1">
            <ArrowLeft className={`h-5 w-5 transition-transform duration-300 ${inactiveIconClass}`} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-gray-500 dark:text-gray-400">Voltar</span>
            {/* Invisible placeholder under Voltar to vertically align structure with items that have status circles */}
            <span className="w-1.5 h-1.5 mt-1 opacity-0 block"></span>
          </div>
        </button>

        {/* 2. Histórico Button */}
        <button
          onClick={() => onSalesTabChange('history')}
          className={`flex-1 flex flex-col items-center justify-center relative cursor-pointer group active:scale-95 transition-all duration-300 animate-wave-item ${
            salesTab === 'history' ? '-translate-y-1.5' : ''
          }`}
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex flex-col items-center relative">
            <Clock className={`h-5 w-5 transition-transform duration-300 ${
              salesTab === 'history' 
                ? `${activeIconClass} -translate-y-0.5` 
                : `${inactiveIconClass} group-hover:-translate-y-0.5`
            }`} />
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider transition-colors duration-300 ${
              salesTab === 'history' ? (isDark ? 'text-fuchsia-400' : 'text-purple-600') : 'text-gray-500'
            }`}>Histórico</span>
            
            {/* Colored "Bolinha" that rises and turns colored */}
            <span className={`w-1.5 h-1.5 rounded-full mt-1 transition-all duration-300 ${
              salesTab === 'history'
                ? 'bg-purple-500 dark:bg-fuchsia-400 scale-125 -translate-y-0.5 cursor-default shadow shadow-purple-500'
                : 'bg-transparent scale-0 translate-y-0'
            }`} />
          </div>
        </button>

        {/* 3. Central & Larger Highlight Venda (PDV / Vender) Button */}
        <div className={`flex justify-center items-center relative -top-4 px-2 transition-all duration-300 animate-wave-item ${
          salesTab === 'pos' ? '-translate-y-1.5' : ''
        }`} style={{ animationDelay: '160ms' }}>
          <button
            onClick={() => {
              if (salesTab === 'pos') {
                window.dispatchEvent(new CustomEvent('add-calculator-value'));
              } else {
                onSalesTabChange('pos');
              }
            }}
            className={`w-[72px] h-[72px] rounded-[22px] flex flex-col items-center justify-center border-2 transition-all duration-300 cursor-pointer active:scale-95 shadow-xl relative ${
              salesTab === 'pos'
                ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 border-fuchsia-300 text-white animate-glow-pulse scale-110'
                : isDark
                  ? 'bg-[#291e45] border-fuchsia-700/40 text-fuchsia-300 hover:scale-105 hover:border-fuchsia-600/60'
                  : 'bg-purple-50 border-purple-200 text-purple-700 hover:scale-105 hover:bg-purple-100 hover:border-purple-300'
            }`}
          >
            <div className={`p-2 flex items-center justify-center transition-colors duration-300 ${
              salesTab === 'pos' ? 'bg-white/20 text-white' : 'bg-fuchsia-500/10 text-fuchsia-400'
            } rounded-xl mb-1`}>
              <DollarSign className="h-5 w-5" />
            </div>
            <span className={`font-extrabold uppercase leading-none ${
              calculatorCents > 0 ? 'text-[7.5px] tracking-tighter' : 'text-[9px] tracking-widest'
            }`}>
              {calculatorCents > 0 ? 'Adicionar' : 'Vender'}
            </span>
          </button>
        </div>

        {/* 4. Pendentes Button */}
        <button
          onClick={() => onSalesTabChange('pending')}
          className={`flex-1 flex flex-col items-center justify-center relative cursor-pointer group active:scale-95 transition-all duration-300 animate-wave-item ${
            salesTab === 'pending' ? '-translate-y-1.5' : ''
          }`}
          style={{ animationDelay: '240ms' }}
        >
          <div className="flex flex-col items-center relative">
            <ClipboardList className={`h-5 w-5 transition-transform duration-300 ${
              salesTab === 'pending' 
                ? 'text-emerald-500 dark:text-emerald-400 -translate-y-0.5' 
                : `${inactiveIconClass} group-hover:-translate-y-0.5`
            }`} />
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider transition-colors duration-300 ${
              salesTab === 'pending' ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-500'
            }`}>Pendentes</span>

            {/* Colored "Bolinha" that rises and turns colored */}
            <span className={`w-1.5 h-1.5 rounded-full mt-1 transition-all duration-300 ${
              salesTab === 'pending'
                ? 'bg-emerald-500 dark:bg-emerald-400 scale-125 -translate-y-0.5 cursor-default shadow shadow-emerald-500'
                : 'bg-transparent scale-0 translate-y-0'
            }`} />

            {/* Glowing warning dot if has pending requests */}
            {hasPendingSales && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1A1129] animate-pulse"></span>
            )}
          </div>
        </button>

        {/* 5. Encomendas Button */}
        <button
          onClick={() => onSalesTabChange('preorders')}
          className={`flex-1 flex flex-col items-center justify-center relative cursor-pointer group active:scale-95 transition-all duration-300 animate-wave-item ${
            salesTab === 'preorders' ? '-translate-y-1.5' : ''
          }`}
          style={{ animationDelay: '320ms' }}
        >
          <div className="flex flex-col items-center relative">
            <Package className={`h-5 w-5 transition-transform duration-300 ${
              salesTab === 'preorders' 
                ? 'text-orange-500 dark:text-orange-400 -translate-y-0.5' 
                : `${inactiveIconClass} group-hover:-translate-y-0.5`
            }`} />
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider transition-colors duration-300 ${
              salesTab === 'preorders' ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500'
            }`}>Encomendas</span>

            {/* Colored "Bolinha" that rises and turns colored */}
            <span className={`w-1.5 h-1.5 rounded-full mt-1 transition-all duration-300 ${
              salesTab === 'preorders'
                ? 'bg-orange-500 dark:bg-orange-400 scale-125 -translate-y-0.5 cursor-default shadow shadow-orange-500'
                : 'bg-transparent scale-0 translate-y-0'
            }`} />

            {/* Glowing warning dot if has preorders */}
            {hasPendingPreorders && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-[#1A1129] animate-pulse"></span>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 h-20 rounded-3xl flex justify-around items-center z-30 ${navClasses}`}>
      <style>{`
        @keyframes blink-dual {
          0%, 100% { background-color: #22c55e; border-color: #22c55e; } /* Green */
          50% { background-color: #f97316; border-color: #f97316; } /* Orange */
        }
        .animate-blink-dual {
            animation: blink-dual 1.5s infinite ease-in-out;
        }
      `}</style>
      <NavButton label="Vitrine" view={View.SHOWCASE} isActive={activeView === View.SHOWCASE} onNavigate={onNavigate}>
        <HomeIcon />
      </NavButton>
       <NavButton label="Combos" view={View.COMPOSITIONS} isActive={activeView === View.COMPOSITIONS} onNavigate={onNavigate}>
        <CompositionIcon />
      </NavButton>
       {isAdmin && (
        <NavButton label="Vendas" view={View.SALES} isActive={activeView === View.SALES} onNavigate={onNavigate}>
            <div className="relative">
                <SalesIcon />
                {hasNewSaleRequests && (
                    <span 
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#1A1129] ${
                            hasPendingSales && hasPendingPreorders ? 'animate-blink-dual' : 
                            hasPendingSales ? 'bg-green-500 blinking-dot' : 
                            hasPendingPreorders ? 'bg-orange-500 blinking-dot' : 'bg-red-500' // Fallback
                        }`}
                    ></span>
                )}
            </div>
        </NavButton>
       )}
      {isAdmin && (
        <NavButton label="Estoque" view={View.STOCK} isActive={activeView === View.STOCK} onNavigate={onNavigate}>
            <InventoryIcon />
        </NavButton>
      )}
      {isAdmin && (
       <NavButton label="Assistente" view={View.ASSISTANT} isActive={activeView === View.ASSISTANT} onNavigate={onNavigate}>
        <div className="relative">
            <ReplacementIcon />
            {hasItemsToRestock && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#1A1129] blinking-dot"></span>
            )}
        </div>
      </NavButton>
      )}
    </div>
  );
};

export default BottomNav;
