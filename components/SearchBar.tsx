import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PREDEFINED_COLORS } from '../constants';

interface SearchBarProps {
    isFloating?: boolean;
    isSearchOpen: boolean;
    onClose?: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isDark: boolean;
    onFocusChange?: (focused: boolean) => void;
    
    // Estados do Filtro
    categories: string[];
    selectedCategory: string;
    setSelectedCategory: (cat: string) => void;
    
    availableFabrics: string[];
    selectedFabric: string;
    setSelectedFabric: (fab: string) => void;
    
    selectedColors: string[];
    setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>;
    
    sortOrder: 'recent' | 'alpha';
    setSortOrder: React.Dispatch<React.SetStateAction<'recent' | 'alpha'>>;
    
    isFiltersExpanded: boolean;
    setIsFiltersExpanded: (e: boolean) => void;
    isColorFilterOpen: boolean;
    setIsColorFilterOpen: (e: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
    isFloating = false,
    isSearchOpen,
    onClose,
    searchQuery,
    setSearchQuery,
    isDark,
    onFocusChange,
    categories,
    selectedCategory,
    setSelectedCategory,
    availableFabrics,
    selectedFabric,
    setSelectedFabric,
    selectedColors,
    setSelectedColors,
    sortOrder,
    setSortOrder,
    isFiltersExpanded,
    setIsFiltersExpanded,
    isColorFilterOpen,
    setIsColorFilterOpen
}) => {
    const isCategorySelected = selectedCategory !== 'Todas';
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto focus on input when floating opens
    useEffect(() => {
        if (isFloating && isSearchOpen) {
            // Pequeno delay para garantir que a animação iniciou e o elemento está no DOM
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isFloating, isSearchOpen]);

    const handleColorToggle = (colorName: string) => {
        setSelectedColors(prev => 
            prev.includes(colorName) 
                ? prev.filter(c => c !== colorName) 
                : [...prev, colorName]
        );
    };

    const searchInputClasses = isDark 
      ? "bg-black/40 backdrop-blur-sm border-white/10 text-white placeholder:text-gray-400 focus:border-fuchsia-500"
      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-purple-500";

    const hasActiveFilters = selectedCategory !== 'Todas' || selectedFabric !== 'Todos os Tecidos' || selectedColors.length > 0;

    const content = (
        <div className={`w-full ${isFloating ? '' : 'max-w-md mx-auto mb-6'}`}>
            {/* Campo de busca + Botão de Filtro (Estilo mais fino/estreito e compacto) */}
            <div className="flex items-center gap-2 w-full mb-3">
                <div className="relative flex-grow">
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Buscar por almofadas..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (document.activeElement as HTMLElement)?.blur();
                            }
                        }}
                        onFocus={() => onFocusChange?.(true)}
                        onBlur={() => {
                            setTimeout(() => {
                                onFocusChange?.(false);
                            }, 250);
                        }}
                        className={`w-full border rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 text-xs transition-all ${searchInputClasses}`}
                    />
                    {searchQuery ? (
                        <button 
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('Todas');
                                setSelectedFabric('Todos os Tecidos');
                                setSelectedColors([]);
                                inputRef.current?.focus();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-fuchsia-500 p-1 rounded-full transition-colors focus:outline-none"
                            title="Limpar busca"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>

                {/* Botão de Filtro Rápido */}
                <button 
                    onClick={() => {
                        const nextState = !isFiltersExpanded;
                        setIsFiltersExpanded(nextState);
                        if (nextState) {
                            setIsColorFilterOpen(true);
                        }
                    }}
                    className={`h-8 w-8 flex items-center justify-center rounded-full border shadow-sm transition-all focus:outline-none ${
                        hasActiveFilters
                            ? (isDark ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-md shadow-fuchsia-500/35 hover:bg-fuchsia-700' : 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/40 hover:bg-purple-700')
                            : isFiltersExpanded 
                                ? (isDark ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400' : 'bg-purple-100 border-purple-300 text-purple-700')
                                : (isDark ? 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50')
                    }`}
                    title="Exibir filtros e filtros de cores"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </button>

                {/* Botão de Fechar se for Balão Flutuante */}
                {isFloating && onClose && (
                    <button 
                        onClick={onClose}
                        className={`h-8 w-8 flex items-center justify-center rounded-full border shadow-sm transition-all focus:outline-none ${isDark ? 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        title="Fechar Busca"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Painel de Filtros e Categorias Expandido */}
            <AnimatePresence>
                {(isFiltersExpanded || isCategorySelected) && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`overflow-hidden p-4 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'} mb-2`}
                    >
                        {/* Header com Categoria Atual / Título e Botão de Ordenar / Cores */}
                        <div className="flex justify-between items-center mb-3">
                            {isCategorySelected ? (
                                <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={() => {
                                            setSelectedCategory('Todas');
                                            setSelectedFabric('Todos os Tecidos');
                                        }}
                                        className={`p-1 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCategory}</span>
                                </div>
                            ) : (
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Refinar Produto</span>
                            )}
                            
                            <div className="flex items-center gap-1.5">
                                {/* Botão de Ordenar Incorporado nos Filtros */}
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'recent' ? 'alpha' : 'recent')}
                                    className={`px-2 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all ${
                                        isDark 
                                            ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title={sortOrder === 'recent' ? "Mudar para Ordem Alfabética" : "Mudar para Mais Recentes"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                    </svg>
                                    <span>{sortOrder === 'recent' ? "Recentes" : "A-Z"}</span>
                                </button>

                                {/* Filtro por Cor Acionador */}
                                {!isCategorySelected && (
                                    <button
                                        onClick={() => setIsColorFilterOpen(!isColorFilterOpen)}
                                        className={`px-2 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 transition-all ${
                                            isColorFilterOpen
                                                ? (isDark ? 'bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-300' : 'bg-purple-100 border-purple-200 text-purple-700')
                                                : (isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-600')
                                        }`}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 border border-white/20"></div>
                                        <span>Cores</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 1. SEÇÃO DE CORES - NO TOPO DA ABA DE FILTROS E MAIOR COM DESLIZE */}
                        {isColorFilterOpen && !isCategorySelected && (
                            <div className={`mb-4 pb-3 border-b border-dashed ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filtrar por Cor</span>
                                    {selectedColors.length > 0 && (
                                        <button 
                                            onClick={() => setSelectedColors([])}
                                            className="text-[9px] font-bold text-fuchsia-500 hover:underline"
                                        >
                                            Limpar Seleção
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar snap-x scroll-smooth">
                                    {PREDEFINED_COLORS.map(color => {
                                        const isSelected = selectedColors.includes(color.name);
                                        return (
                                            <button
                                                key={color.name}
                                                onClick={() => handleColorToggle(color.name)}
                                                className={`flex-shrink-0 w-11 h-11 rounded-full border-2 transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center snap-start ${
                                                    isSelected 
                                                        ? (isDark ? 'border-fuchsia-400 ring-4 ring-fuchsia-500/35 scale-105 shadow-lg shadow-fuchsia-500/35' : 'border-purple-600 ring-4 ring-purple-500/30 scale-105 shadow-md shadow-purple-500/25') 
                                                        : (isDark ? 'border-white/25 hover:border-white/50' : 'border-gray-200 hover:border-gray-400')
                                                }`}
                                                style={{ backgroundColor: color.hex }}
                                                title={color.name}
                                            >
                                                {isSelected && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${['Branco', 'Bege', 'Amarelo'].includes(color.name) ? 'text-black' : 'text-white'}`} viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. CATEGORY BUTTONS LIST */}
                        {!isCategorySelected && (
                            <div className="mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Filtrar por Categoria</span>
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                                    {categories.map(category => {
                                        if (category === 'Todas') return null;

                                        const categoryActive = selectedCategory === category;
                                        const categoryBtnClasses = categoryActive
                                            ? (isDark ? 'bg-fuchsia-600 text-white shadow-md border-transparent' : 'bg-purple-600 text-white shadow-md border-transparent')
                                            : (isDark ? 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/15' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100');

                                        return (
                                            <button
                                                key={category}
                                                onClick={() => {
                                                    setSelectedCategory(category);
                                                    setSelectedFabric('Todos os Tecidos');
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${categoryBtnClasses}`}
                                            >
                                                {category}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. FABRIC SELECTOR EXPANDED */}
                        {(isCategorySelected || isFiltersExpanded) && availableFabrics.length > 0 && (
                            <div className={`mt-2 ${!isCategorySelected ? `pt-3 border-t border-dashed ${isDark ? 'border-white/10' : 'border-gray-200'}` : ''}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Refinar por Tecido</span>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                                    {availableFabrics.map(fabric => {
                                        const isFabricActive = selectedFabric === fabric;
                                        const fabricBtnClasses = isFabricActive
                                            ? (isDark ? 'bg-cyan-600 text-white border-transparent' : 'bg-teal-500 text-white border-transparent')
                                            : (isDark ? 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100');

                                        return (
                                            <button
                                                key={fabric}
                                                onClick={() => setSelectedFabric(fabric)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all border ${fabricBtnClasses}`}
                                            >
                                                {fabric}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    if (isFloating) {
        return (
            <AnimatePresence>
                {isSearchOpen && (
                    <>
                        {/* Backdrop escurecido sutil para o balão flutuante */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                        />
                        
                        {/* Balão flutuante estilizado logo abaixo do cabeçalho */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className={`fixed top-18 left-4 right-4 md:left-auto md:right-8 md:w-[380px] z-50 p-4 rounded-3xl border shadow-2xl ${
                                isDark 
                                    ? 'bg-[#181124]/95 border-white/10 text-white shadow-fuchsia-950/20' 
                                    : 'bg-white/95 border-gray-100 text-gray-900 shadow-purple-900/10'
                            } backdrop-blur-md`}
                        >
                            {/* Balão Indicador Triângulo para o cabeçalho */}
                            <div className={`absolute -top-1.5 right-12 w-3 h-3 rotate-45 border-t border-l ${
                                isDark ? 'bg-[#181124] border-white/10' : 'bg-white border-gray-100'
                            }`} />

                            {content}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }

    return content;
};

export default SearchBar;
