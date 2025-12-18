
import React, { useContext } from 'react';
import { View, ThemeContext } from '../types';

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const CompositionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
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

const DiagnosticsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
            <style>{`
            @keyframes pop-in {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(0.9); opacity: 1; }
            }
            `}</style>
            <div className="relative z-10">
            {children}
            </div>
            <span className={`text-xs font-semibold relative z-10 mt-1 ${isActive ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );
};


const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate, hasItemsToRestock, isAdmin, hasNewSaleRequests }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const navClasses = isDark 
    ? "bg-black/20 backdrop-blur-2xl border-white/10"
    : "bg-white/70 backdrop-blur-2xl border-gray-200/80 shadow-lg";

  return (
    <div className={`fixed bottom-4 left-4 right-4 h-20 rounded-3xl flex justify-around items-center z-30 ${navClasses}`}>
      <NavButton label="Vitrine" view={View.SHOWCASE} isActive={activeView === View.SHOWCASE} onNavigate={onNavigate}>
        <HomeIcon />
      </NavButton>
       <NavButton label="Composições" view={View.COMPOSITIONS} isActive={activeView === View.COMPOSITIONS} onNavigate={onNavigate}>
        <CompositionIcon />
      </NavButton>
       {isAdmin && (
        <NavButton label="Vendas" view={View.SALES} isActive={activeView === View.SALES} onNavigate={onNavigate}>
            <div className="relative">
                <SalesIcon />
                {hasNewSaleRequests && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#1A1129] blinking-dot"></span>
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
