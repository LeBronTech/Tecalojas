import React, { useState, useMemo, useContext } from 'react';
import { Product } from '../types';
import { ThemeContext } from '../types';

interface ProductSelectModalProps {
    products: Product[];
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    initialSelectedIds: string[];
    maxSelection: number;
}

const ProductSelectModal: React.FC<ProductSelectModalProps> = ({ products, onClose, onConfirm, initialSelectedIds, maxSelection }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }, [products, search]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pId => pId !== id);
            }
            if (prev.length < maxSelection) {
                return [...prev, id];
            }
            return prev;
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className={`border rounded-3xl shadow-2xl w-full max-w-lg p-6 flex flex-col ${isDark ? 'bg-[#1A1129] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Selecione até {maxSelection} Almofadas</h2>
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${isDark ? 'bg-black/20 text-white border-white/10' : 'bg-gray-100 text-gray-900 border-gray-300'}`}
                />
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                    {filteredProducts.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <button key={p.id} onClick={() => toggleSelection(p.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all border-2 ${isSelected ? 'border-fuchsia-500 bg-fuchsia-500/10' : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50')}`}>
                                <img src={p.baseImageUrl || 'https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png'} alt={p.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{p.name}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 pt-4 mt-4 border-t" style={{borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}>
                    <button onClick={onClose} className={`font-bold py-2 px-6 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>Cancelar</button>
                    <button onClick={() => onConfirm(selectedIds)} className="bg-fuchsia-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-fuchsia-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default ProductSelectModal;