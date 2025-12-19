
import React, { useContext, useMemo, useState } from 'react';
import { Product, SaleRequest, StoreName, ThemeContext, CardFees } from '../types';

interface DiagnosticsScreenProps {
  products: Product[];
  saleRequests: SaleRequest[];
  cardFees: CardFees;
  onMenuClick: () => void;
}

// Helper: Card component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    return (
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200 shadow-sm'} ${className}`}>
            {children}
        </div>
    );
};

const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({ products, saleRequests }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const valueClasses = isDark ? 'text-fuchsia-400' : 'text-purple-600';

    // Filter sale requests based on the selected period
    const filteredSales = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return saleRequests.filter(req => {
            if (req.status !== 'completed' || !req.createdAt || !req.createdAt.toDate) return false;
            const saleDate = req.createdAt.toDate();
            if (period === 'today') return saleDate >= startOfToday;
            if (period === 'week') return saleDate >= startOfWeek;
            return saleDate >= startOfMonth;
        });
    }, [saleRequests, period]);

    // --- Financial Calculations ---
    const financialData = useMemo(() => {
        let grossSales = 0;
        let netSales = 0;
        let totalCost = 0;

        filteredSales.forEach(sale => {
            const saleGross = sale.finalPrice ?? sale.totalPrice;
            grossSales += saleGross;
            
            // Use stored netValue if available, otherwise assume Gross (for legacy)
            const saleNet = sale.netValue !== undefined ? sale.netValue : saleGross;
            netSales += saleNet;

            // Use stored production cost if available
            const saleCost = sale.totalProductionCost !== undefined ? sale.totalProductionCost : 0;
            totalCost += saleCost;
        });

        return {
            grossSales,
            netSales,
            profit: netSales - totalCost,
            margin: netSales > 0 ? ((netSales - totalCost) / netSales) * 100 : 0
        };
    }, [filteredSales]);

    // --- Inventory Summary ---
    const stockSummary = useMemo(() => {
        let totalStock = 0;
        let potentialRevenue = 0;

        products.forEach(product => {
            product.variations.forEach(variation => {
                const tecaStock = variation.stock[StoreName.TECA] || 0;
                const ioneStock = variation.stock[StoreName.IONE] || 0;
                totalStock += tecaStock + ioneStock;
                potentialRevenue += (tecaStock + ioneStock) * (variation.priceFull || 0);
            });
        });

        return { totalStock, potentialRevenue };
    }, [products]);

    // --- Top Sellers & Colors (based on filtered sales) ---
    const performanceData = useMemo(() => {
        const colorCounts: Record<string, number> = {};
        const productCounts: Record<string, number> = {};

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                // Extract base product name
                const name = item.name.split('(')[0].trim();
                productCounts[name] = (productCounts[name] || 0) + item.quantity;

                // Try to find color in item name (simple heuristic matching predefined colors)
                // This is imperfect without storing color ID in cart item, but works for display
                // Better approach: Match itemName to Product List to find Color
                const product = products.find(p => p.id === item.productId);
                if (product && product.colors && product.colors.length > 0) {
                    const colorName = product.colors[0].name;
                    colorCounts[colorName] = (colorCounts[colorName] || 0) + item.quantity;
                }
            });
        });

        const sortedColors = Object.entries(colorCounts).sort(([,a], [,b]) => b - a);
        const topColor = sortedColors.length > 0 ? { name: sortedColors[0][0], count: sortedColors[0][1] } : { name: 'N/A', count: 0 };

        const topProducts = Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return { topColor, topProducts };
    }, [filteredSales, products]);


    const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; highlight?: boolean }> = ({ title, value, subtitle, highlight }) => (
        <div className={`p-4 rounded-xl text-center border transition-all ${isDark ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-100'} ${highlight ? (isDark ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200') : ''}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
            <p className={`text-2xl font-black ${highlight ? 'text-fuchsia-500' : (isDark ? 'text-white' : 'text-gray-800')}`}>{value}</p>
            {subtitle && <p className={`text-xs mt-1 ${subtitleClasses}`}>{subtitle}</p>}
        </div>
    );
    
    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className={`text-3xl font-bold ${titleClasses}`}>Painel de Diagnóstico</h1>
                            <p className={subtitleClasses}>Análise financeira e de estoque.</p>
                        </div>
                        <div className={`flex p-1 rounded-xl self-start ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                            {['today', 'week', 'month'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${period === p ? 'bg-fuchsia-600 text-white shadow-lg' : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}
                                >
                                    {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Financials Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard 
                            title="Vendas Brutas" 
                            value={financialData.grossSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            subtitle={`${filteredSales.length} pedidos`}
                        />
                        <StatCard 
                            title="Valor Líquido Recebido" 
                            value={financialData.netSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            subtitle="Após taxas e descontos"
                            highlight
                        />
                        <StatCard 
                            title="Lucro Real Estimado" 
                            value={financialData.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            subtitle={`Margem: ${financialData.margin.toFixed(1)}%`}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Top Products */}
                        <Card className="lg:col-span-2">
                            <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Top 5 Mais Vendidos</h3>
                            <ul className="space-y-3">
                                {performanceData.topProducts.map((p, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 text-center font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{index + 1}</span>
                                            <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{p.name}</span>
                                        </div>
                                        <span className="font-bold text-fuchsia-500">{p.count} unid.</span>
                                    </li>
                                ))}
                                {performanceData.topProducts.length === 0 && <p className={`text-center py-4 ${subtitleClasses}`}>Sem vendas neste período.</p>}
                            </ul>
                        </Card>

                        {/* Color & Stock */}
                        <div className="space-y-6">
                            <Card>
                                <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Cor do Momento</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xl font-bold text-gray-500">
                                        ?
                                    </div>
                                    <div>
                                        <p className={`text-xl font-bold ${titleClasses}`}>{performanceData.topColor.name}</p>
                                        <p className={subtitleClasses}>{performanceData.topColor.count} unidades</p>
                                    </div>
                                </div>
                            </Card>
                            <Card>
                                <h3 className={`font-bold text-lg mb-2 ${titleClasses}`}>Valor em Estoque</h3>
                                <p className={`text-2xl font-black ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                    {stockSummary.potentialRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                <p className={`text-sm mt-1 ${subtitleClasses}`}>{stockSummary.totalStock} peças disponíveis</p>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DiagnosticsScreen;
