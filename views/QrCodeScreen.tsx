
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product, ThemeContext, CushionSize, Variation } from '../types';
import { STORE_IMAGE_URLS } from '../constants';

const PrintLabel: React.FC<{ product: Product, size: CushionSize, qrCodeUrl: string, isPreview?: boolean }> = ({ product, size, qrCodeUrl, isPreview = false }) => {
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

    return (
        <div style={labelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '64px', height: '64px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <img src={STORE_IMAGE_URLS.teca} alt="Teca Logo" style={{ height: '20px', objectFit: 'contain' }} />
                    <img src={STORE_IMAGE_URLS.ione} alt="Ione Logo" style={{ height: '20px', objectFit: 'contain' }} />
                </div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', fontSize: '10px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                <p style={{ fontSize: '9px', margin: 0 }}>Tamanho: {size}</p>
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
    labels: Array<{ id: string; product: Product; size: CushionSize; qrCodeUrl: string }>;
    onClose: () => void;
    onPrint: () => void;
    isDark: boolean;
}> = ({ labels, onClose, onPrint, isDark }) => {
    const totalPages = Math.ceil(labels.length / LABELS_PER_PAGE);
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={onClose}>
            <div 
                className={`border rounded-3xl shadow-2xl w-full max-w-2xl p-6 flex flex-col ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '90vh' }}
            >
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Pré-visualização da Fila
                </h2>
                <div className="flex justify-between items-center mb-4">
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        Total de <span className="font-bold">{labels.length}</span> etiquetas em <span className="font-bold">{totalPages}</span> página(s) de frente e <span className="font-bold">{totalPages}</span> de verso.
                    </p>
                </div>
                
                <div className={`flex-grow overflow-y-auto p-4 rounded-lg purple-scrollbar ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                    <p className="font-bold text-center mb-2">Frente</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                        {labels.map(label => (
                             <div key={label.id}>
                                <PrintLabel 
                                    product={label.product} 
                                    size={label.size} 
                                    qrCodeUrl={label.qrCodeUrl} 
                                    isPreview={true}
                                />
                            </div>
                        ))}
                    </div>
                     <p className="font-bold text-center mb-2 border-t pt-4" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>Verso</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                         {labels.map(label => (
                             <div key={`preview-back-${label.id}`}>
                                <PrintBackLabel isPreview={true} isDark={isDark} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 mt-4 border-t" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                    <button onClick={onClose} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                        Cancelar
                    </button>
                    <button onClick={onPrint} className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-cyan-700">
                        Confirmar Impressão
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
    const [printQueue, setPrintQueue] = useState<Array<{ id: string; product: Product; size: CushionSize; qrCodeUrl: string }>>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [addConfirmation, setAddConfirmation] = useState<Record<string, boolean>>({});


    const productsWithQr = useMemo(() => {
        return products
            .map(product => ({
                ...product,
                variations: product.variations.filter(v => v.qrCodeUrl)
            }))
            .filter(product => product.variations.length > 0);
    }, [products]);

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

        const newLabels = Array(count).fill(null).map((_, i) => ({
            id: `${key}-${Date.now()}-${i}`,
            product: product,
            size: variation.size,
            qrCodeUrl: variation.qrCodeUrl!
        }));

        setPrintQueue(prev => [...prev, ...newLabels]);
        handleQuantityChange(key, ''); 
        
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
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const inputClasses = isDark ? 'bg-black/30 text-white text-center' : 'bg-gray-100 text-black text-center';

    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
                    <div className="max-w-4xl mx-auto">
                        <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Etiquetas QR Code</h1>
                        <p className={`text-md mb-6 ${subtitleClasses}`}>Defina as quantidades e imprima as etiquetas para seus produtos.</p>
                        
                         <div className={`sticky top-20 z-10 flex flex-col sm:flex-row justify-between items-center mb-4 p-4 rounded-lg gap-4 ${cardClasses}`}>
                             <div className="text-center sm:text-left">
                                <span className={`font-bold text-lg ${titleClasses}`}>Fila de Impressão</span>
                                <p className={`text-sm ${subtitleClasses}`}>Total de {printQueue.length} etiquetas</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setPrintQueue([]); setQuantities({})}} className="bg-red-500/20 text-red-300 font-bold py-2 px-4 rounded-lg text-sm">Limpar Fila</button>
                                <button onClick={() => setIsPreviewing(true)} disabled={printQueue.length === 0} className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-sm disabled:bg-gray-500">Ver e Imprimir</button>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {productsWithQr.map(product => (
                                <div key={product.id} className={`p-4 rounded-xl ${cardClasses}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <img src={product.baseImageUrl} alt={product.name} className="w-16 h-16 rounded-md object-cover" />
                                        <h3 className={`font-bold ${titleClasses}`}>{product.name}</h3>
                                    </div>
                                    <div className="space-y-3 pl-0 sm:pl-20">
                                        {product.variations.map(variation => {
                                            const key = `${product.id}-${variation.size}`;
                                            const quantity = Number(quantities[key] || 0);
                                            const isButtonActive = quantity > 0;
                                            
                                            return (
                                                <div key={key} className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1 bg-white rounded-md flex-shrink-0">
                                                          <img src={variation.qrCodeUrl} alt="QR Code" className="w-12 h-12"/>
                                                        </div>
                                                        <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-black'}`}>Tamanho: {variation.size}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className={`font-semibold text-sm ${subtitleClasses}`}>Qtde:</label>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            value={quantities[key] || ''}
                                                            onChange={e => handleQuantityChange(key, e.target.value)}
                                                            className={`w-20 p-2 rounded ${inputClasses}`}
                                                        />
                                                        {addConfirmation[key] ? (
                                                             <div className="flex items-center justify-center w-[101px] h-[40px] bg-green-500/20 rounded-lg">
                                                                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        ) : (
                                                             <button
                                                                onClick={() => handleAddToQueue(product, variation)}
                                                                disabled={!isButtonActive}
                                                                className={`font-bold py-2 px-3 rounded-lg text-sm transition-all duration-200 w-[101px] ${
                                                                    isButtonActive
                                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                                                    : (isDark ? 'bg-black/20 text-gray-500' : 'bg-gray-200 text-gray-400')
                                                                }`}
                                                            >
                                                                Adicionar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                              {productsWithQr.length === 0 && (
                                <div className={`text-center py-16 rounded-lg ${cardClasses}`}>
                                    <p className={`text-lg font-semibold ${titleClasses}`}>Nenhuma etiqueta encontrada</p>
                                    <p className={`mt-2 ${subtitleClasses}`}>Vá para a tela de Estoque, edite um produto e gere um QR Code para uma de suas variações.</p>
                                </div>
                            )}
                        </div>
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
                                <PrintLabel key={label.id} product={label.product} size={label.size} qrCodeUrl={label.qrCodeUrl!} />
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
