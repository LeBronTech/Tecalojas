
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Product, SaleRequest, StoreName, ThemeContext, CardFees } from '../types';
import * as api from '../firebase';

interface DiagnosticsScreenProps {
  products: Product[];
  saleRequests: SaleRequest[];
  cardFees: CardFees;
  onMenuClick: () => void;
}

const BarChart: React.FC<{ data: number[]; labels: string[]; title: string; color: string; height?: number }> = ({ data, labels, title, color, height = 150 }) => {
    const maxVal = Math.max(...data, 1); 
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    return (
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h3 className={`font-bold text-sm mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
            <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
                {data.map((val, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                        <div 
                            className={`w-full rounded-t-md transition-all duration-500 ${color}`}
                            style={{ height: `${(val / maxVal) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                        ></div>
                        <span className={`text-[10px] mt-2 font-medium truncate w-full text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {labels[idx]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({ products, saleRequests }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    const [weeklyGoal, setWeeklyGoal] = useState<number>(0);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState('');

    useEffect(() => {
        const unsub = api.onSettingsUpdate((settings) => {
            if (settings?.weeklyGoal !== undefined) {
                setWeeklyGoal(settings.weeklyGoal);
                setTempGoal(settings.weeklyGoal.toString());
            }
        });
        return () => unsub();
    }, []);

    const completedSales = useMemo(() => saleRequests.filter(r => r.status === 'completed'), [saleRequests]);

    const metrics = useMemo(() => {
        let gross = 0;
        let net = 0;
        completedSales.forEach(sale => {
            gross += sale.finalPrice ?? sale.totalPrice;
            net += sale.netValue ?? (sale.finalPrice ?? sale.totalPrice);
        });
        return { gross, net, profit: net * 0.5 };
    }, [completedSales]);

    const handleSaveGoal = async () => {
        const val = parseFloat(tempGoal);
        if (!isNaN(val)) {
            await api.updateGlobalSettings({ weeklyGoal: val });
            setIsEditingGoal(false);
        }
    };

    const currentWeekSales = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); 
        startOfWeek.setHours(0,0,0,0);
        return completedSales
            .filter(s => (s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt)) >= startOfWeek)
            .reduce((acc, s) => acc + (s.finalPrice ?? s.totalPrice), 0);
    }, [completedSales]);

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-52 md:pb-52 no-scrollbar z-10">
                <div className="max-w-5xl mx-auto space-y-8">
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Diagnóstico Financeiro</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <p className="text-xs font-bold uppercase text-gray-500">Vendas Brutas</p>
                            <p className="text-3xl font-black">{metrics.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50'}`}>
                            <p className="text-xs font-bold uppercase text-purple-700">Valor Líquido</p>
                            <p className="text-3xl font-black text-purple-600">{metrics.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50'}`}>
                            <p className="text-xs font-bold uppercase text-cyan-700">Lucro Estimado</p>
                            <p className="text-3xl font-black text-cyan-600">{metrics.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Meta Semanal</h3>
                            {isEditingGoal ? (
                                <div className="flex gap-2">
                                    <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} className="w-24 p-1 rounded border dark:bg-black/40" />
                                    <button onClick={handleSaveGoal} className="text-green-500 font-bold">OK</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditingGoal(true)} className="text-xs text-fuchsia-500 underline">Definir Meta</button>
                            )}
                        </div>
                        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-fuchsia-500" style={{ width: `${Math.min((currentWeekSales / (weeklyGoal || 1)) * 100, 100)}%` }}></div>
                        </div>
                        <p className="text-xs mt-2 font-bold">{currentWeekSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {weeklyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DiagnosticsScreen;
