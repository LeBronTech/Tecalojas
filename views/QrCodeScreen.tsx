import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { Product, ThemeContext, CushionSize, Variation } from '../types';
import { STORE_IMAGE_URLS } from '../constants';

const PrintLabel: React.FC<{ product: Product, size: CushionSize, qrCodeUrl: string, isPreview?: boolean }> = ({ product, size, qrCodeUrl, isPreview = false }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const labelStyle: React.CSSProperties = {
        width: '4cm',
        height: '5cm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '8px',
        border: isPreview ? (isDark ? '1px solid #4A5568' : '1px solid #E2E8F0') : 'none',
        backgroundColor: 'white', // Force white background for printing
        color: 'black', // Force black text for printing
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

const LABELS_PER_PAGE = 25;

const QrCodeScreen: React.FC<{ products: Product[] }> = ({ products }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [quantities, setQuantities] = useState<Record<string, number | ''>>({});

    useEffect(() => {
        const handleAfterPrint = () => document.body.classList.remove('printing');
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

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

    const allLabels = useMemo(() => {
        return productsWithQr.flatMap(product =>
            product.variations.flatMap(variation => {
                const key = `${product.id}-${variation.size}`;
                const count = Number(quantities[key] || 0);
                if (!variation.qrCodeUrl || count === 0) return [];

                return Array(count).fill(null).map((_, i) => ({
                    id: `${key}-${i}`,
                    product: product,
                    size: variation.size,
                    qrCodeUrl: variation.qrCodeUrl!
                }));
            })
        );
    }, [productsWithQr, quantities]);


    const handleGeneratePdf = () => {
        document.body.classList.add('printing');
        setTimeout(() => window.print(), 50); // Small timeout to ensure styles are applied
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const inputClasses = isDark ? 'bg-black/30 text-white text-center' : 'bg-gray-100 text-black text-center';

    return (
        <>
            <div className="h-full w-full flex flex-col relative overflow-hidden print-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                    <div className="max-w-4xl mx-auto">
                        <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Etiquetas QR Code</h1>
                        <p className={`text-md mb-6 ${subtitleClasses}`}>Defina as quantidades e imprima as etiquetas para seus produtos.</p>
                        
                         <div className={`sticky top-20 z-10 flex flex-col sm:flex-row justify-between items-center mb-4 p-4 rounded-lg gap-4 ${cardClasses}`}>
                             <div className="text-center sm:text-left">
                                <span className={`font-bold text-lg ${titleClasses}`}>Fila de Impressão</span>
                                <p className={`text-sm ${subtitleClasses}`}>Total de {allLabels.length} etiquetas</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setQuantities({})} className="bg-red-500/20 text-red-300 font-bold py-2 px-4 rounded-lg text-sm">Limpar Tudo</button>
                                <button onClick={handleGeneratePdf} disabled={allLabels.length === 0} className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-sm disabled:bg-gray-500">Imprimir Fila</button>
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
                                            return (
                                                <div key={key} className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-lg ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1 bg-white rounded-md flex-shrink-0">
                                                          <img src={variation.qrCodeUrl} alt="QR Code" className="w-12 h-12"/>
                                                        </div>
                                                        <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-black'}`}>Tamanho: {variation.size}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className={`font-semibold text-sm ${subtitleClasses}`}>Quantidade:</label>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            placeholder=""
                                                            value={quantities[key] || ''}
                                                            onChange={e => handleQuantityChange(key, e.target.value)}
                                                            className={`w-24 p-2 rounded ${inputClasses}`}
                                                        />
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
            
             <div className="print-area">
                {Array.from({ length: Math.ceil(allLabels.length / LABELS_PER_PAGE) }).map((_, pageIndex) => (
                    <div key={pageIndex} className="print-page">
                        {allLabels.slice(pageIndex * LABELS_PER_PAGE, (pageIndex + 1) * LABELS_PER_PAGE).map(label => (
                            <PrintLabel key={label.id} product={label.product} size={label.size} qrCodeUrl={label.qrCodeUrl!} />
                        ))}
                    </div>
                ))}
                {allLabels.length > 0 && (
                 <div className="print-page back-page">
                    <img src="https://i.postimg.cc/XqDy2sPn/Cartao-de-Visita-Elegante-Minimalista-Cinza-e-Marrom-1.png" alt="Verso da Etiqueta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                )}
            </div>
        </>
    );
};

export default QrCodeScreen;