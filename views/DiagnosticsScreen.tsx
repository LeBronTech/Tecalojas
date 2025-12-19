
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Product, SaleRequest, StoreName, ThemeContext, CardFees } from '../types';

interface DiagnosticsScreenProps {
  products: Product[];
  saleRequests: SaleRequest[];
  cardFees: CardFees;
  onMenuClick: () => void;
}

const WEEKLY_GOAL_STORAGE_KEY = 'pillow-oasis-weekly-goal';

// --- Reusable Chart Components ---

const BarChart: React.FC<{ data: number[]; labels: string[]; title: string; color: string; height?: number }> = ({ data, labels, title, color, height = 150 }) => {
    const maxVal = Math.max(...data, 1); // Avoid division by zero
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
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {val}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Helper Functions ---

// Calculate estimated cost: Sum of (Original Price / 2 * Quantity) for all items
const calculateEstimatedCost = (request: SaleRequest): number => {
    // If request already has stored cost, use it (future proofing)
    if (request.totalProductionCost !== undefined && request.totalProductionCost > 0) return request.totalProductionCost;

    // Otherwise, apply the 50% rule based on gross total price
    // Note: Ideally iterate items, but global 50% of Total Price is the heuristic requested
    return request.totalPrice * 0.5;
};

const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({ products, saleRequests }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    
    // --- State for Goal ---
    const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
        const stored = localStorage.getItem(WEEKLY_GOAL_STORAGE_KEY);
        return stored ? parseFloat(stored) : 0;
    });
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(weeklyGoal.toString());

    // --- Data Processing ---

    // 1. Filter completed sales
    const completedSales = useMemo(() => saleRequests.filter(r => r.status === 'completed'), [saleRequests]);

    // 2. Financial Metrics (Global)
    const metrics = useMemo(() => {
        let gross = 0;
        let net = 0;
        let profit = 0;

        completedSales.forEach(sale => {
            const saleGross = sale.finalPrice ?? sale.totalPrice;
            // Use stored netValue if exists, otherwise fallback to gross (should be rare for new sales)
            const saleNet = sale.netValue !== undefined ? sale.netValue : saleGross;
            const saleCost = calculateEstimatedCost(sale);
            
            gross += saleGross;
            net += saleNet;
            profit += (saleNet - saleCost);
        });

        return { gross, net, profit };
    }, [completedSales]);

    // 3. Payment Method Breakdown
    const paymentStats = useMemo(() => {
        const stats: Record<string, { count: number, gross: number, net: number }> = {
            'Débito': { count: 0, gross: 0, net: 0 },
            'Crédito': { count: 0, gross: 0, net: 0 },
            'PIX': { count: 0, gross: 0, net: 0 },
            'Dinheiro': { count: 0, gross: 0, net: 0 },
            'Cartão (Online)': { count: 0, gross: 0, net: 0 }, // Group online into credit usually
        };

        completedSales.forEach(sale => {
            const method = sale.paymentMethod === 'WhatsApp (Encomenda)' ? 'Cartão (Online)' : sale.paymentMethod;
            // Normalize weird method names if any
            let key = method;
            if (key === 'Cartão (Online)') key = 'Crédito'; // Aggregate online into credit for simplicity or keep separate? 
            // Let's keep separate as requested but map properly
            if (!stats[key]) stats[key] = { count: 0, gross: 0, net: 0 }; // Init if dynamic

            const saleGross = sale.finalPrice ?? sale.totalPrice;
            const saleNet = sale.netValue !== undefined ? sale.netValue : saleGross;

            stats[key].count += 1;
            stats[key].gross += saleGross;
            stats[key].net += saleNet;
        });

        return stats;
    }, [completedSales]);

    // 4. Time Analysis (Day & Hour)
    const timeStats = useMemo(() => {
        const hours = Array(24).fill(0);
        const days = Array(7).fill(0);
        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        completedSales.forEach(sale => {
            if (!sale.createdAt) return;
            const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
            hours[date.getHours()] += 1;
            days[date.getDay()] += 1;
        });

        return { hours, days, dayLabels };
    }, [completedSales]);

    // 5. Weekly & Monthly Sales (History)
    const historyStats = useMemo(() => {
        const now = new Date();
        
        // Last 7 Days
        const last7DaysData = Array(7).fill(0);
        const last7DaysLabels = Array(7).fill('');
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            last7DaysLabels[6-i] = d.getDate().toString() + '/' + (d.getMonth()+1);
            
            // Sum sales for this day
            const dayTotal = completedSales
                .filter(s => {
                    const sDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                    return sDate.getDate() === d.getDate() && sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear();
                })
                .reduce((acc, s) => acc + (s.finalPrice ?? s.totalPrice), 0);
            
            last7DaysData[6-i] = dayTotal;
        }

        // Monthly (Last 4 Weeks rough approx or Calendar Months) - Let's do Calendar Months for cleaner data
        // Last 6 months
        const monthData = Array(6).fill(0);
        const monthLabels = Array(6).fill('');
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('pt-BR', { month: 'short' });
            monthLabels[5-i] = monthName;

            const monthTotal = completedSales
                .filter(s => {
                    const sDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                    return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear();
                })
                .reduce((acc, s) => acc + (s.finalPrice ?? s.totalPrice), 0);
            
            monthData[5-i] = monthTotal;
        }

        return { last7DaysData, last7DaysLabels, monthData, monthLabels };
    }, [completedSales]);

    // 6. Averages
    const averages = useMemo(() => {
        // Simple Average: Total Sales / (Days with First Sale to Now / 7)
        if (completedSales.length === 0) return { weekly: 0, monthly: 0 };

        const sorted = [...completedSales].sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        const firstSale = sorted[0].createdAt.toDate ? sorted[0].createdAt.toDate() : new Date(sorted[0].createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - firstSale.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        
        const totalSales = metrics.gross;
        const weeks = Math.max(1, diffDays / 7);
        const months = Math.max(1, diffDays / 30);

        return {
            weekly: totalSales / weeks,
            monthly: totalSales / months
        };
    }, [completedSales, metrics.gross]);

    // Goal Logic
    const currentWeekSales = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
        startOfWeek.setHours(0,0,0,0);
        
        return completedSales
            .filter(s => {
                const sDate = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return sDate >= startOfWeek;
            })
            .reduce((acc, s) => acc + (s.finalPrice ?? s.totalPrice), 0);
    }, [completedSales]);

    const suggestedGoal = useMemo(() => Math.ceil(averages.weekly * 1.1), [averages.weekly]); // Suggest 10% growth

    const handleSaveGoal = () => {
        const val = parseFloat(tempGoal);
        if (!isNaN(val)) {
            setWeeklyGoal(val);
            localStorage.setItem(WEEKLY_GOAL_STORAGE_KEY, val.toString());
            setIsEditingGoal(false);
        }
    };

    const handleUseSuggestion = () => {
        setTempGoal(suggestedGoal.toString());
        setWeeklyGoal(suggestedGoal);
        localStorage.setItem(WEEKLY_GOAL_STORAGE_KEY, suggestedGoal.toString());
    };

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                <div className="max-w-5xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div>
                        <h1 className={`text-3xl font-bold ${titleClasses}`}>Diagnóstico Financeiro</h1>
                        <p className={subtitleClasses}>Análise detalhada de vendas e lucro.</p>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Vendas Brutas (Total)</p>
                            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {metrics.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-100 shadow-sm'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Valor Líquido (Recebido)</p>
                            <p className={`text-3xl font-black ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                                {metrics.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">Após taxas e descontos</p>
                        </div>
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-100 shadow-sm'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>Lucro Real Estimado</p>
                            <p className={`text-3xl font-black ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                {metrics.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">Margem base de 100% sobre custo</p>
                        </div>
                    </div>

                    {/* Weekly Goal Section */}
                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className={`font-bold text-lg ${titleClasses}`}>Meta Semanal</h3>
                                <p className={`text-sm ${subtitleClasses}`}>Média Semanal de Vendas: <span className="font-bold">{averages.weekly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditingGoal ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={tempGoal} 
                                            onChange={e => setTempGoal(e.target.value)}
                                            className={`w-24 p-2 rounded-lg text-sm border font-bold ${isDark ? 'bg-black/40 border-white/20 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                        />
                                        <button onClick={handleSaveGoal} className="text-green-500 font-bold text-sm">OK</button>
                                        <button onClick={() => setIsEditingGoal(false)} className="text-red-500 font-bold text-sm">X</button>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {weeklyGoal > 0 ? weeklyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '---'}
                                        </p>
                                        <button onClick={() => { setTempGoal(weeklyGoal.toString()); setIsEditingGoal(true); }} className="text-xs text-fuchsia-500 hover:underline">Definir Meta</button>
                                        {weeklyGoal === 0 && averages.weekly > 0 && (
                                            <button onClick={handleUseSuggestion} className="block text-[10px] text-cyan-500 hover:underline mt-1">
                                                Sugerir: {suggestedGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className={`absolute top-0 left-0 h-full transition-all duration-1000 ${currentWeekSales >= weeklyGoal ? 'bg-green-500' : 'bg-fuchsia-500'}`} 
                                style={{ width: `${Math.min((currentWeekSales / (weeklyGoal || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-semibold">
                            <span className={isDark ? 'text-white' : 'text-gray-800'}>{currentWeekSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} vendidos</span>
                            <span className={subtitleClasses}>{Math.round((currentWeekSales / (weeklyGoal || 1)) * 100)}% da meta</span>
                        </div>
                    </div>

                    {/* Charts Row 1: Sales History */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BarChart 
                            title="Vendas da Semana (7 Dias)" 
                            data={historyStats.last7DaysData} 
                            labels={historyStats.last7DaysLabels} 
                            color="bg-fuchsia-500" 
                        />
                        <BarChart 
                            title="Vendas Mensais (6 Meses)" 
                            data={historyStats.monthData} 
                            labels={historyStats.monthLabels} 
                            color="bg-purple-600" 
                        />
                    </div>

                    {/* Charts Row 2: Time Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BarChart 
                            title="Vendas por Dia da Semana" 
                            data={timeStats.days} 
                            labels={timeStats.dayLabels} 
                            color="bg-cyan-500" 
                        />
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className={`font-bold text-sm mb-4 ${titleClasses}`}>Melhores Horários (0h - 23h)</h3>
                            <div className="flex items-end justify-between gap-1 h-[150px]">
                                {timeStats.hours.map((val, idx) => {
                                    const maxVal = Math.max(...timeStats.hours, 1);
                                    return (
                                        <div key={idx} className="flex-1 h-full flex flex-col justify-end group relative">
                                            <div 
                                                className="w-full bg-amber-500 rounded-t-sm hover:bg-amber-400 transition-all"
                                                style={{ height: `${(val / maxVal) * 100}%`, minHeight: val > 0 ? '2px' : '0' }}
                                            ></div>
                                            {/* Tooltip for hour */}
                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                {idx}h: {val}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between text-[10px] mt-2 text-gray-500">
                                <span>00h</span>
                                <span>06h</span>
                                <span>12h</span>
                                <span>18h</span>
                                <span>23h</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Breakdown */}
                    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                            <h3 className={`font-bold ${titleClasses}`}>Detalhamento por Pagamento</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className={`uppercase text-xs ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                    <tr>
                                        <th className="px-6 py-3">Método</th>
                                        <th className="px-6 py-3 text-center">Qtd</th>
                                        <th className="px-6 py-3 text-right">Bruto</th>
                                        <th className="px-6 py-3 text-right">Líquido</th>
                                    </tr>
                                </thead>
                                <tbody className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                    {Object.entries(paymentStats).map(([method, data]: [string, { count: number, gross: number, net: number }]) => (
                                        <tr key={method} className={`border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
                                            <td className="px-6 py-4 font-semibold">{method}</td>
                                            <td className="px-6 py-4 text-center">{data.count}</td>
                                            <td className="px-6 py-4 text-right font-medium">{data.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{data.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DiagnosticsScreen;
