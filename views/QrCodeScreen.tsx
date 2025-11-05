// FIX: Import `useMemo` from React to be used for memoizing label calculations.
import React, { useState, useContext, useRef, useEffect, useMemo } from 'react';
import { Product, ThemeContext, CushionSize } from '../types';
import ProductSelectModal from '../components/ProductSelectModal';
import { STORE_IMAGE_URLS } from '../constants';

interface PrintQueueItem {
    product: Product;
    quantities: Record<CushionSize, number>;
}

const PrintLabel: React.FC<{ product: Product, size: CushionSize, isPreview?: boolean }> = ({ product, size, isPreview = false }) => {
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (qrCodeRef.current) {
            qrCodeRef.current.innerHTML = '';
            const data = JSON.stringify({ productId: product.id, variationSize: size });
            new QRCode(qrCodeRef.current, {
                text: data,
                width: 64,
                height: 64,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, [product, size]);

    const labelStyle: React.CSSProperties = {
        width: '5cm',
        height: '4cm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '8px',
        border: isPreview ? (isDark ? '1px solid #4A5568' : '1px solid #E2E8F0') : 'none',
        backgroundColor: isDark ? '#1A202C' : 'white',
        color: isDark ? 'white' : 'black',
        boxSizing: 'border-box',
        overflow: 'hidden',
    };

    return (
        <div style={labelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div ref={qrCodeRef} style={{ flexShrink: 0 }}></div>
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

const QrCodeScreen: React.FC<{ products: Product[] }> = ({ products }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<'generator' | 'print'>('generator');
    const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
    const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
    const [selectedProductForQueue, setSelectedProductForQueue] = useState<Product | null>(null);
    const [quantities, setQuantities] = useState<Record<CushionSize, number>>({} as Record<CushionSize, number>);

    const handleProductSelected = (selectedIds: string[]) => {
        const product = products.find(p => p.id === selectedIds[0]);
        if (product) {
            setSelectedProductForQueue(product);
            const initialQuantities = product.variations.reduce((acc, v) => ({ ...acc, [v.size]: 0 }), {} as Record<CushionSize, number>);
            setQuantities(initialQuantities);
        }
        setIsProductSelectOpen(false);
    };

    const handleAddToQueue = () => {
        if (!selectedProductForQueue) return;
        setPrintQueue(prev => {
            const existingIndex = prev.findIndex(item => item.product.id === selectedProductForQueue.id);
            if (existingIndex > -1) {
                const updatedQueue = [...prev];
                updatedQueue[existingIndex] = { product: selectedProductForQueue, quantities };
                return updatedQueue;
            }
            return [...prev, { product: selectedProductForQueue, quantities }];
        });
        setSelectedProductForQueue(null);
        setQuantities({} as Record<CushionSize, number>);
    };

    const allLabels = useMemo(() => {
        return printQueue.flatMap(item =>
            Object.entries(item.quantities).flatMap(([size, count]) =>
                Array(count).fill(null).map((_, i) => ({
                    id: `${item.product.id}-${size}-${i}`,
                    product: item.product,
                    size: size as CushionSize
                }))
            )
        );
    }, [printQueue]);

    const handleGeneratePdf = () => {
        window.print();
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardClasses = isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm';
    const inputClasses = isDark ? 'bg-black/30 text-white' : 'bg-gray-100 text-black';

    return (
        <>
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    .print-page {
                        width: 210mm;
                        height: 297mm;
                        page-break-after: always;
                        display: flex;
                        flex-wrap: wrap;
                        align-content: flex-start;
                        padding: 0.85cm 0.5cm; /* Margins for A4 */
                        box-sizing: border-box;
                    }
                    .print-page.back-page {
                        padding: 0;
                    }
                }
                `}
            </style>

            <div className="h-full w-full flex flex-col relative overflow-hidden print-hidden">
                <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                    <div className="max-w-4xl mx-auto">
                        <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Gerador de QR Code</h1>
                        <p className={`text-md mb-6 ${subtitleClasses}`}>Crie e imprima etiquetas com QR code para seus produtos.</p>
                        
                        <div className="flex gap-2 mb-6">
                            <button onClick={() => setActiveTab('generator')} className={`flex-1 py-3 text-sm font-bold rounded-lg ${activeTab === 'generator' ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-black/20' : 'bg-gray-200')}`}>Gerador</button>
                            <button onClick={() => setActiveTab('print')} className={`flex-1 py-3 text-sm font-bold rounded-lg relative ${activeTab === 'print' ? 'bg-fuchsia-600 text-white' : (isDark ? 'bg-black/20' : 'bg-gray-200')}`}>
                                Impressão
                                {allLabels.length > 0 && <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{allLabels.length}</span>}
                            </button>
                        </div>

                        {activeTab === 'generator' && (
                            <div className={`p-6 rounded-2xl ${cardClasses}`}>
                                <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>1. Selecionar Produto</h3>
                                {selectedProductForQueue ? (
                                    <div className="flex items-center gap-4 p-2 rounded-lg bg-black/20">
                                        <img src={selectedProductForQueue.baseImageUrl} className="w-16 h-16 rounded-md object-cover" />
                                        <p className="font-semibold flex-grow">{selectedProductForQueue.name}</p>
                                        <button onClick={() => setSelectedProductForQueue(null)} className="text-red-400">Trocar</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsProductSelectOpen(true)} className="w-full bg-purple-600/20 text-purple-300 font-bold py-3 rounded-lg">Selecionar Almofada</button>
                                )}
                                
                                {selectedProductForQueue && (
                                    <div className="mt-6">
                                        <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>2. Definir Quantidades</h3>
                                        <div className="space-y-3">
                                            {selectedProductForQueue.variations.map(v => (
                                                <div key={v.size} className="flex justify-between items-center">
                                                    <label className="font-semibold">{v.size}</label>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        value={quantities[v.size] || 0}
                                                        onChange={(e) => setQuantities(prev => ({...prev, [v.size]: parseInt(e.target.value) || 0}))}
                                                        className={`w-20 p-2 rounded text-center ${inputClasses}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedProductForQueue && (
                                    <button onClick={handleAddToQueue} className="w-full mt-6 bg-fuchsia-600 text-white font-bold py-3 rounded-lg">Adicionar à Fila de Impressão</button>
                                )}
                            </div>
                        )}

                        {activeTab === 'print' && (
                            <div className={`p-6 rounded-2xl ${cardClasses}`}>
                                <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Pré-visualização da Impressão</h3>
                                <div className="flex justify-between items-center mb-4">
                                     <button onClick={() => setPrintQueue([])} className="bg-red-500/20 text-red-300 font-bold py-2 px-4 rounded-lg text-sm">Limpar Fila</button>
                                    <button onClick={handleGeneratePdf} disabled={allLabels.length === 0} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:bg-gray-500">Gerar PDF para Impressão</button>
                                </div>
                                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} overflow-auto`}>
                                    <div className="w-[21cm] h-[29.7cm] transform scale-[0.3] sm:scale-[0.4] md:scale-50 origin-top-left flex flex-wrap content-start p-[0.85cm_0.5cm] box-border" style={{backgroundColor: isDark ? '#374151' : '#F3F4F6'}}>
                                        {allLabels.slice(0, 28).map(label => ( // Show only first page in preview
                                            <PrintLabel key={label.id} product={label.product} size={label.size} isPreview />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {isProductSelectOpen && (
                <ProductSelectModal
                    products={products}
                    onClose={() => setIsProductSelectOpen(false)}
                    onConfirm={handleProductSelected}
                    initialSelectedIds={[]}
                    maxSelection={1}
                />
            )}

            <div id="print-area" className="hidden">
                {Array.from({ length: Math.ceil(allLabels.length / 28) }).map((_, pageIndex) => (
                    <div key={pageIndex} className="print-page">
                        {allLabels.slice(pageIndex * 28, (pageIndex + 1) * 28).map(label => (
                            <PrintLabel key={label.id} product={label.product} size={label.size} />
                        ))}
                    </div>
                ))}
                 <div className="print-page back-page">
                    <img src="https://i.postimg.cc/XqDy2sPn/Cartao-de-Visita-Elegante-Minimalista-Cinza-e-Marrom-1.png" alt="Verso da Etiqueta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>
        </>
    );
};

export default QrCodeScreen;
