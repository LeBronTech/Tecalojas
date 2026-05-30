
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product, ThemeContext, CushionSize, Variation } from '../types';
import { STORE_IMAGE_URLS } from '../constants';

const PrintLabel: React.FC<{ product: Product, size: CushionSize, qrCodeUrl: string, isPreview?: boolean, showPrice?: boolean }> = ({ product, size, qrCodeUrl, isPreview = false, showPrice = true }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const labelStyle: React.CSSProperties = {
        width: '4cm',
        height: '4cm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '8px',
        border: isPreview ? (isDark ? '1px solid #4A5568' : '1px solid #E2E8F0') : 'none',
        backgroundColor: 'white', 
        color: 'black', 
        boxSizing: 'border-box',
        overflow: 'hidden',
    };

    const variation = product.variations?.find(v => v.size === size);
    const priceCover = variation?.priceCover ?? 0;
    const priceFull = variation?.priceFull ?? 0;

    const formatPriceWithColon = (val: number) => {
        const formatted = val.toFixed(2).replace('.', ',');
        return `R$: ${formatted}`;
    };

    return (
        <div style={labelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <img src={qrCodeUrl} alt="QR Code" style={{ width: '64px', height: '64px', display: 'block' }} />
                    {showPrice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px', textAlign: 'left', lineHeight: '1.1' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#666', fontSize: '5.5px', letterSpacing: '0.05em' }}>Capa</span>
                                <span style={{ fontWeight: 'black', fontSize: '8px', color: '#000', whiteSpace: 'nowrap' }}>{formatPriceWithColon(priceCover)}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1px' }}>
                                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#666', fontSize: '5.5px', letterSpacing: '0.05em' }}>Cheia</span>
                                <span style={{ fontWeight: 'black', fontSize: '8px', color: '#000', whiteSpace: 'nowrap' }}>{formatPriceWithColon(priceFull)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: showPrice ? '12px' : '0px' }}>
                    <img src={STORE_IMAGE_URLS.teca} alt="Teca Logo" style={{ height: '18px', objectFit: 'contain' }} />
                    <img src={STORE_IMAGE_URLS.ione} alt="Ione Logo" style={{ height: '18px', objectFit: 'contain' }} />
                </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '3px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '9px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#555', margin: 0 }}>Tamanho: {size}</p>
            </div>
        </div>
    );
};

const PrintBackLabel: React.FC<{ isPreview?: boolean, isDark?: boolean }> = ({ isPreview = false, isDark = false }) => {
    const backImageUrl = "https://i.postimg.cc/XqDy2sPn/Cartao-de-Visita-Elegante-Minimalista-Cinza-e-Marrom-1.png";

    const labelStyle: React.CSSProperties = {
        width: '4cm',
        height: '4cm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: isPreview ? (isDark ? '1px solid #4A5568' : '1px solid #E2E8F0') : 'none',
        backgroundColor: 'white',
    };

    return (
        <div style={labelStyle}>
            <img src={backImageUrl} alt="Verso da Etiqueta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
    );
};


const LABELS_PER_PAGE = 35;

const PrintPreviewModal: React.FC<{
    labels: Array<{ id: string; product: Product; size: CushionSize; qrCodeUrl: string; showPrice: boolean }>;
    onClose: () => void;
    onPrint: () => void;
    isDark: boolean;
}> = ({ labels, onClose, onPrint, isDark }) => {
    const totalPages = Math.ceil(labels.length / LABELS_PER_PAGE);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

    const pageLabels = labels.slice(currentPageIndex * LABELS_PER_PAGE, (currentPageIndex + 1) * LABELS_PER_PAGE);

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[150] p-2 md:p-4" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-5xl p-4 md:p-6 flex flex-col ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'} h-[94vh] max-h-[94vh]`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                    <div>
                        <h2 className={`text-base md:text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Pré-visualização da Folha A4 (Tamanho Real)
                        </h2>
                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-650'}`}>
                            Total de <span className="font-extrabold text-fuchsia-500">{labels.length}</span> etiquetas distribuídas em <span className="font-extrabold text-purple-600 dark:text-purple-400">{totalPages}</span> página(s) de 21cm x 29.7cm.
                        </p>
                    </div>
                    
                    {/* Controles para Alternar Frente / Verso */}
                    <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                        <button 
                            onClick={() => setActiveSide('front')}
                            className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                activeSide === 'front' 
                                    ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20' 
                                    : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                            }`}
                        >
                            Ver Frente (QR Codes)
                        </button>
                        <button 
                            onClick={() => setActiveSide('back')}
                            className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                activeSide === 'back' 
                                    ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/20' 
                                    : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                            }`}
                        >
                            Ver Verso (Estilo)
                        </button>
                    </div>
                </div>

                {/* Switcher de página */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mb-3 py-1 px-3 rounded-lg max-w-xs mx-auto bg-black/5 dark:bg-white/5 flex-shrink-0">
                        <button 
                            disabled={currentPageIndex === 0}
                            onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                            className={`p-1 px-2.5 rounded-lg text-[10px] font-black transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-20' : 'bg-gray-200 hover:bg-gray-350 text-gray-700 disabled:opacity-30'}`}
                        >
                            Anterior
                        </button>
                        <span className="text-xs font-bold font-mono">Folha {currentPageIndex + 1} de {totalPages}</span>
                        <button 
                            disabled={currentPageIndex === totalPages - 1}
                            onClick={() => setCurrentPageIndex(p => Math.min(totalPages - 1, p + 1))}
                            className={`p-1 px-2.5 rounded-lg text-[10px] font-black transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-20' : 'bg-gray-200 hover:bg-gray-355 text-gray-700 disabled:opacity-30'}`}
                        >
                            Próxima
                        </button>
                    </div>
                )}
                
                {/* Visualizador de Folha A4 em Escala Real Centrado */}
                <div className="flex-grow overflow-auto p-4 md:p-6 rounded-2xl flex justify-start md:justify-center items-start border border-gray-100 dark:border-white/5 bg-gray-100 dark:bg-black/50 purple-scrollbar">
                    <div 
                        className="relative bg-white shadow-2xl border border-gray-300 mx-auto transition-all flex-shrink-0"
                        style={{
                            width: '21cm',
                            height: '29.7cm',
                            padding: '0.85cm 0.5cm',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignContent: 'flex-start',
                            justifyContent: 'flex-start',
                            gap: '0px'
                        }}
                    >
                        {Array.from({ length: 35 }).map((_, slotIdx) => {
                            const label = pageLabels[slotIdx];
                            return (
                                <div 
                                    key={slotIdx} 
                                    style={{
                                        width: '4cm',
                                        height: '4cm',
                                        boxSizing: 'border-box',
                                        border: '1px dashed rgba(236, 72, 153, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        backgroundColor: '#fafafa',
                                        position: 'relative'
                                    }}
                                >
                                    {label ? (
                                        activeSide === 'back' ? (
                                            <PrintBackLabel isPreview={true} isDark={false} />
                                        ) : (
                                            <PrintLabel 
                                                product={label.product} 
                                                size={label.size} 
                                                qrCodeUrl={label.qrCodeUrl} 
                                                isPreview={false}
                                                showPrice={label.showPrice}
                                            />
                                        )
                                    ) : (
                                        <div className="text-[9px] text-gray-300/80 font-bold font-mono text-center select-none">
                                            {slotIdx + 1}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3.5 mt-3 border-t" style={{borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}>
                    <button onClick={onClose} className={`font-bold py-1.5 px-4 rounded-xl text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-gray-300 bg-white/5' : 'hover:bg-gray-100 text-gray-650 bg-gray-50 border'}`}>
                        Fechar
                    </button>
                    <button onClick={onPrint} className="bg-cyan-600 text-white font-bold py-1.5 px-5 rounded-xl text-xs shadow-lg hover:bg-cyan-700 transition-colors flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir Etiqueta(s)
                    </button>
                </div>
            </div>
        </div>
    );
};

const QrCodeScreen: React.FC<{ products: Product[] }> = ({ products }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [quantities, setQuantities] = useState<Record<string, number | ''>>({});
    const [printQueue, setPrintQueue] = useState<Array<{ id: string; product: Product; size: CushionSize; qrCodeUrl: string; showPrice: boolean }>>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [addConfirmation, setAddConfirmation] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [priceSelections, setPriceSelections] = useState<Record<string, boolean>>({});


    const productsWithQr = useMemo(() => {
        return products
            .map(product => ({
                ...product,
                variations: product.variations.filter(v => v.qrCodeUrl)
            }))
            .filter(product => product.variations.length > 0);
    }, [products]);

    const filteredProductsWithQr = useMemo(() => {
        if (!searchQuery.trim()) return productsWithQr;
        const query = searchQuery.toLowerCase().trim();
        return productsWithQr.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.variations.some(v => v.size.toLowerCase().includes(query))
        );
    }, [productsWithQr, searchQuery]);

    const handleQuantityChange = (key: string, value: string) => {
        const numValue = parseInt(value, 10);
        setQuantities(prev => ({
            ...prev,
            [key]: isNaN(numValue) ? '' : Math.max(0, numValue)
        }));
    };

    const handleAddToQueue = (product: Product, variation: Variation) => {
        const key = `${product.id}-${variation.size}`;
        const count = Number(quantities[key] || 0);
        if (count === 0 || !variation.qrCodeUrl) return;

        const showPriceForVar = priceSelections[key] !== false; // por padrão true

        const newLabels = Array(count).fill(null).map((_, i) => ({
            id: `${key}-${Date.now()}-${i}`,
            product: product,
            size: variation.size,
            qrCodeUrl: variation.qrCodeUrl!,
            showPrice: showPriceForVar
        }));

        setPrintQueue(prev => [...prev, ...newLabels]);
        handleQuantityChange(key, ''); 
        
        setPriceSelections(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

        setAddConfirmation(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setAddConfirmation(prev => ({ ...prev, [key]: false }));
        }, 1200);
    };

    const handlePrint = () => {
        if (printQueue.length === 0) return;
        
        setIsPreviewing(false);

        setTimeout(() => {
            window.print();
        }, 500); 
    };


    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-500';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-205 shadow-sm';

    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                {/* Área de Rolagem Unificada */}
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10 w-full animate-fadeIn">
                    <div className="max-w-4xl mx-auto">
                        {/* Título e Descrição que agora rolam para cima */}
                        <div className="mb-3.5">
                            <h1 className={`text-lg font-black tracking-tight mb-0.5 ${titleClasses}`}>Etiquetas QR Code</h1>
                            <p className={`text-[11px] ml-0.5 mb-1 ${subtitleClasses}`}>Gere e imprima etiquetas em rolo ou páginas oficiais para os seus produtos.</p>
                        </div>
                        
                        {/* Barra Unificada de Pesquisa e Fila que fica FIXA (Sticky) no topo correto abaixo do Header global */}
                        <div className={`sticky top-[0.1px] z-30 flex flex-row items-center justify-between gap-3 mb-4 py-2 px-3 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 ${isDark ? 'bg-black/85 border-white/10 shadow-black/40' : 'bg-white/95 border-fuchsia-100/40 shadow-fuchsia-200/10'}`}>
                            
                            {/* Campo de Pesquisa Unificado */}
                            <div className={`relative transition-all duration-300 ${isSearchFocused ? 'w-full' : 'w-[45%] md:w-[40%]'}`}>
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-450 dark:text-gray-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => {
                                        // Pequeno timeout para permitir cliques em botões (ex: limpar pesquisa)
                                        setTimeout(() => setIsSearchFocused(false), 200);
                                    }}
                                    className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-xl focus:outline-none transition-all ${
                                        isDark 
                                            ? 'bg-black/30 placeholder-gray-500 text-white focus:bg-black/45 border border-white/5 focus:border-fuchsia-500/50' 
                                            : 'bg-gray-50 placeholder-gray-400 text-black shadow-inner border border-gray-150 focus:border-purple-500/50'
                                    }`}
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-450 hover:text-gray-650 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Fila de Impressão (Fica oculta se focado, de forma super suave) */}
                            {!isSearchFocused && (
                                <div className="flex flex-row items-center justify-end gap-1.5 md:gap-3 flex-grow transition-all duration-300">
                                    <div className="flex items-center gap-1">
                                        <span className={`font-black text-[10px] md:text-xs whitespace-nowrap ${titleClasses}`}>Fila</span>
                                        <span className="bg-fuchsia-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                            {printQueue.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {printQueue.length > 0 && (
                                            <button 
                                                onClick={() => { setPrintQueue([]); setQuantities({})}} 
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-extrabold py-1 px-1.5 rounded-lg text-[9px] transition-colors"
                                            >
                                                Limpar
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsPreviewing(true)} 
                                            disabled={printQueue.length === 0} 
                                            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-extrabold py-1 px-2 md:px-3 rounded-lg text-[9px] transition-all disabled:cursor-not-allowed shadow-md"
                                        >
                                            Ver e Imprimir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Listagem em Grid Lado a Lado (Otimizada para menos espaço e alta densidade) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {filteredProductsWithQr.map((product, index) => {
                                const isEven = index % 2 === 0;
                                const customCardBg = isDark
                                    ? (isEven ? 'bg-black/35 border-white/10' : 'bg-fuchsia-950/15 border-fuchsia-500/20 xr-shadow shadow-purple-950/5')
                                    : (isEven ? 'bg-pink-50/70 border-pink-100 shadow-sm shadow-pink-100/10' : 'bg-white border-gray-200 shadow-sm');
                                
                                return (
                                    <div key={product.id} className={`p-3 rounded-2xl flex flex-col ${customCardBg} border transition-all duration-300 hover:shadow-md`}>
                                        <div className="flex items-center gap-3 mb-2.5 pb-2 border-b border-gray-100 dark:border-white/5">
                                            <img src={product.baseImageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            <h3 className={`font-extrabold text-xs leading-tight line-clamp-2 ${titleClasses}`}>{product.name}</h3>
                                        </div>
                                        <div className="space-y-1.5 flex-grow">
                                            {product.variations.map(variation => {
                                                const key = `${product.id}-${variation.size}`;
                                                const quantity = Number(quantities[key] || 0);
                                                const isButtonActive = quantity > 0;
                                                const showPriceForVar = priceSelections[key] !== false;
                                                
                                                return (
                                                    <div key={key} className={`flex items-center justify-between gap-2 p-1.5 rounded-xl ${isDark ? 'bg-black/25' : 'bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-0.5 bg-white rounded flex-shrink-0">
                                                              <img src={variation.qrCodeUrl} alt="QR" className="w-7 h-7"/>
                                                            </div>
                                                            <span className={`font-black text-xs ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{variation.size}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1.5">
                                                            {/* Seletor de Quantidade Incremental (- e +) */}
                                                            <div className="flex items-center border border-gray-300 dark:border-white/10 rounded-lg overflow-hidden bg-white/50 dark:bg-black/20 h-7">
                                                                <button 
                                                                    onClick={() => {
                                                                        const currentVal = Number(quantities[key] || 0);
                                                                        if (currentVal > 0) {
                                                                            handleQuantityChange(key, String(currentVal - 1));
                                                                        }
                                                                    }}
                                                                    type="button"
                                                                    className={`w-6 h-full flex items-center justify-center font-black text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-gray-700'}`}
                                                                >
                                                                    -
                                                                </button>
                                                                <input 
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={quantities[key] || ''}
                                                                    placeholder="0"
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val === '') {
                                                                            setQuantities(prev => ({ ...prev, [key]: '' }));
                                                                        } else if (/^\d+$/.test(val)) {
                                                                            handleQuantityChange(key, val);
                                                                        }
                                                                    }}
                                                                    className="w-7 text-center font-extrabold text-[11px] bg-transparent border-none outline-none focus:ring-0 p-0"
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        const currentVal = Number(quantities[key] || 0);
                                                                        handleQuantityChange(key, String(currentVal + 1));
                                                                    }}
                                                                    type="button"
                                                                    className={`w-6 h-full flex items-center justify-center font-black text-xs transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-gray-700'}`}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
    
                                                            {addConfirmation[key] ? (
                                                                 <div className="flex items-center justify-center w-14 h-7 bg-green-500/25 rounded-lg border border-green-500/30">
                                                                    <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            ) : (
                                                                 <>
                                                                    {isButtonActive && (
                                                                        <label className="flex items-center gap-1 cursor-pointer select-none py-1 px-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-[10px] font-black h-7 shrink-0 animate-fadeIn">
                                                                            <input 
                                                                                type="checkbox"
                                                                                checked={showPriceForVar}
                                                                                onChange={e => setPriceSelections(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                                className="rounded border-gray-300 dark:border-white/20 text-fuchsia-600 focus:ring-fuchsia-500 w-3 h-3 cursor-pointer accent-fuchsia-600 focus:ring-0 focus:ring-offset-0"
                                                                            />
                                                                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Preço</span>
                                                                        </label>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleAddToQueue(product, variation)}
                                                                        disabled={!isButtonActive}
                                                                        className={`font-black rounded-lg text-[10px] transition-all duration-200 w-14 h-7 flex items-center justify-center shrink-0 ${
                                                                            isButtonActive
                                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow shadow-purple-600/20'
                                                                            : (isDark ? 'bg-black/10 text-gray-600' : 'bg-gray-200 text-gray-400')
                                                                        }`}
                                                                    >
                                                                        Add
                                                                    </button>
                                                                 </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {filteredProductsWithQr.length === 0 && (
                            <div className={`text-center py-16 rounded-xl ${cardClasses}`}>
                                <p className={`text-sm font-black ${titleClasses}`}>Nenhuma etiqueta encontrada para os termos digitados</p>
                                <p className={`mt-1 text-xs ${subtitleClasses}`}>Tente buscar novamente ou certifique-se de que os produtos possuem QR Code.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            {isPreviewing && (
                <PrintPreviewModal
                    labels={printQueue}
                    onClose={() => setIsPreviewing(false)}
                    onPrint={handlePrint}
                    isDark={isDark}
                />
            )}
 
             {createPortal(
                <div className="print-area">
                    {Array.from({ length: Math.ceil(printQueue.length / LABELS_PER_PAGE) }).map((_, pageIndex) => (
                        <div key={`front-${pageIndex}`} className="print-page">
                            {printQueue.slice(pageIndex * LABELS_PER_PAGE, (pageIndex + 1) * LABELS_PER_PAGE).map(label => (
                                <PrintLabel key={label.id} product={label.product} size={label.size} qrCodeUrl={label.qrCodeUrl!} showPrice={label.showPrice} />
                            ))}
                        </div>
                    ))}
                    
                    {printQueue.length > 0 && Array.from({ length: Math.ceil(printQueue.length / LABELS_PER_PAGE) }).map((_, pageIndex) => (
                        <div key={`back-${pageIndex}`} className="print-page">
                            {printQueue.slice(pageIndex * LABELS_PER_PAGE, (pageIndex + 1) * LABELS_PER_PAGE).map(label => (
                                <PrintBackLabel key={`back-${label.id}`} />
                            ))}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default QrCodeScreen;
