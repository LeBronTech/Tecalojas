import React, { useContext, useMemo, useState } from 'react';
import { Product, StoreName, ThemeContext } from '../types';

interface DiagnosticsScreenProps {
  products: Product[];
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

const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({ products }) => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';
    const [salesPeriod, setSalesPeriod] = useState<'monthly' | 'weekly'>('monthly');

    const titleClasses = isDark ? 'text-white' : 'text-gray-900';
    const subtitleClasses = isDark ? 'text-gray-400' : 'text-gray-600';
    const valueClasses = isDark ? 'text-fuchsia-400' : 'text-purple-600';

    // --- Data Calculations ---
    const summary = useMemo(() => {
        let totalStock = 0;
        let potentialRevenue = 0;
        let totalUnitsSold = 0;

        products.forEach(product => {
            totalUnitsSold += product.unitsSold || 0;
            product.variations.forEach(variation => {
                const tecaStock = variation.stock[StoreName.TECA] || 0;
                const ioneStock = variation.stock[StoreName.IONE] || 0;
                totalStock += tecaStock + ioneStock;
                potentialRevenue += (tecaStock + ioneStock) * (variation.priceFull || 0);
            });
        });

        return {
            totalProducts: products.length,
            totalStock,
            potentialRevenue,
            totalUnitsSold
        };
    }, [products]);

    const totalRevenue = useMemo(() => {
        return products.reduce((total, product) => {
            if (!product.variations || product.variations.length === 0) {
                return total;
            }
            const averagePrice = product.variations.reduce((sum, v) => sum + v.priceFull, 0) / product.variations.length;
            const productRevenue = (product.unitsSold || 0) * averagePrice;
            return total + productRevenue;
        }, 0);
    }, [products]);
    
    const salesEvolutionData = useMemo(() => {
        const totalSalesValue = totalRevenue;
        const emptyData = {
            monthly: Array(12).fill(0).map((_, i) => ({ label: `M-${i + 1}`, value: 0 })),
            weekly: Array(8).fill(0).map((_, i) => ({ label: `S-${i + 1}`, value: 0 })),
            maxMonthly: 0,
            maxWeekly: 0,
        };

        if (totalSalesValue === 0) return emptyData;

        // Simulate Monthly Data
        const monthWeights = Array.from({ length: 12 }, () => Math.random() * 0.8 + 0.2);
        const totalMonthWeight = monthWeights.reduce((sum, w) => sum + w, 0);
        const monthlySales = monthWeights.map(w => (w / totalMonthWeight) * totalSalesValue);

        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentMonth = new Date().getMonth();
        const orderedMonthLabels = [...monthLabels.slice(currentMonth + 1), ...monthLabels.slice(0, currentMonth + 1)];

        // Simulate Weekly Data
        const weeklyTotalValue = totalSalesValue * (8 / 52); // Approximate revenue of last 8 weeks
        const weekWeights = Array.from({ length: 8 }, () => Math.random() * 0.8 + 0.2);
        const totalWeekWeight = weekWeights.reduce((sum, w) => sum + w, 0);
        const weeklySales = weekWeights.map(w => (w / totalWeekWeight) * weeklyTotalValue);

        return {
            monthly: orderedMonthLabels.map((label, i) => ({ label, value: monthlySales[i] || 0 })),
            weekly: weeklySales.map((value, i) => ({ label: `S-${8 - i}`, value })).reverse(),
            maxMonthly: Math.max(...monthlySales, 1), // Avoid division by zero
            maxWeekly: Math.max(...weeklySales, 1), // Avoid division by zero
        };
    }, [totalRevenue]);


    const favoriteColor = useMemo(() => {
        const colorSales: { [key: string]: { count: number; hex: string } } = {};

        products.forEach(product => {
            if (product.unitsSold > 0 && product.colors && product.colors.length > 0) {
                const color = product.colors[0]; // Assuming primary color is the first one
                if (!colorSales[color.name]) {
                    colorSales[color.name] = { count: 0, hex: color.hex };
                }
                colorSales[color.name].count += product.unitsSold;
            }
        });
        
        const sortedColors = Object.entries(colorSales).sort(([, a], [, b]) => b.count - a.count);

        if (sortedColors.length === 0) {
            return { name: 'N/A', hex: '#808080', count: 0 };
        }

        const [name, data] = sortedColors[0];
        return { name, ...data };
    }, [products]);

    const topSellers = useMemo(() => {
        return [...products]
            .filter(p => p.unitsSold > 0)
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 5);
    }, [products]);

    const brandPerformance = useMemo(() => {
        const brandSales: { [key: string]: number } = {};
        products.forEach(p => {
            brandSales[p.brand] = (brandSales[p.brand] || 0) + p.unitsSold;
        });
        const sorted = Object.entries(brandSales)
            .sort(([, a], [, b]) => b - a)
            .map(([name, sales]) => ({ name, sales }));
        
        const maxSales = sorted.length > 0 ? sorted[0].sales : 0;
        
        return { sorted, maxSales };
    }, [products]);

    const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
        <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-black/30' : 'bg-gray-50'}`}>
            <p className={`text-sm font-semibold ${subtitleClasses}`}>{title}</p>
            <p className={`text-2xl font-bold ${valueClasses}`}>{value}</p>
        </div>
    );
    
    const currentChartData = salesPeriod === 'monthly' ? salesEvolutionData.monthly : salesEvolutionData.weekly;
    const currentTotalValue = currentChartData.reduce((sum, data) => sum + data.value, 0);
    const formattedTotalValue = currentTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            <main className="flex-grow overflow-y-auto px-6 pt-24 pb-36 md:pb-6 no-scrollbar z-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className={`text-3xl font-bold mb-2 ${titleClasses}`}>Painel de Diagnóstico</h1>
                    <p className={`text-md mb-8 ${subtitleClasses}`}>Uma visão geral do desempenho da sua loja.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard title="Total de Produtos" value={summary.totalProducts} />
                        <StatCard title="Itens em Estoque" value={summary.totalStock} />
                        <StatCard title="Receita Potencial" value={`R$ ${summary.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                        <StatCard title="Unidades Vendidas" value={summary.totalUnitsSold} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`font-bold text-lg ${titleClasses}`}>Evolução de Vendas</h3>
                                    <p className={`text-sm ${subtitleClasses}`}>
                                        Total {salesPeriod === 'monthly' ? 'Anual (Simulado)' : '8 Semanas (Simulado)'}: <span className="font-bold">{formattedTotalValue}</span>
                                    </p>
                                </div>
                                <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                                    <button onClick={() => setSalesPeriod('monthly')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${salesPeriod === 'monthly' ? 'bg-fuchsia-600 text-white' : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200')}`}>Mensal</button>
                                    <button onClick={() => setSalesPeriod('weekly')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${salesPeriod === 'weekly' ? 'bg-fuchsia-600 text-white' : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200')}`}>Semanal</button>
                                </div>
                            </div>
                            <div className="h-64 flex items-end justify-between gap-2">
                               { currentChartData.map((data, index) => {
                                    const maxValue = salesPeriod === 'monthly' ? salesEvolutionData.maxMonthly : salesEvolutionData.maxWeekly;
                                    const height = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                                    const formattedValue = data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                            <div 
                                                className="w-full bg-gradient-to-t from-purple-500 to-fuchsia-500 rounded-t-md transition-all duration-300" 
                                                style={{ height: `${height}%` }}
                                                title={`Vendas: ${formattedValue}`}
                                            >
                                               <div className={`absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded-md text-xs font-bold text-white shadow-lg ${isDark ? 'bg-black' : 'bg-gray-900'}`}>{formattedValue}</div>
                                            </div>
                                            <span className={`text-xs mt-2 ${subtitleClasses}`}>{data.label}</span>
                                        </div>
                                    );
                               }) }
                            </div>
                        </Card>
                        <Card className="lg:col-span-1">
                            <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Cor Favorita</h3>
                            <div className="flex items-center gap-4">
                                <div style={{ backgroundColor: favoriteColor.hex }} className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
                                <div>
                                    <p className={`text-3xl font-bold ${valueClasses}`}>{favoriteColor.name}</p>
                                    <p className={subtitleClasses}>{favoriteColor.count} unidades vendidas</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="lg:col-span-2">
                            <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Top 5 Mais Vendidos</h3>
                            <ul className="space-y-4">
                                {topSellers.map((product, index) => (
                                    <li key={product.id} className="flex items-center gap-4">
                                        <span className={`font-bold text-lg w-6 text-center ${subtitleClasses}`}>{index + 1}</span>
                                        <img src={product.baseImageUrl || "https://i.postimg.cc/CKhft4jg/Logo-lojas-teca-20251017-210317-0000.png"} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                                        <div className="flex-grow">
                                            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{product.name}</p>
                                            <p className="text-sm text-fuchsia-500">{product.unitsSold} vendidos</p>
                                        </div>
                                    </li>
                                ))}
                                {topSellers.length === 0 && <p className={subtitleClasses}>Nenhuma venda registrada.</p>}
                            </ul>
                        </Card>
                         <Card className="lg:col-span-1">
                            <h3 className={`font-bold text-lg mb-4 ${titleClasses}`}>Vendas por Marca</h3>
                            <div className="space-y-4">
                                {brandPerformance.sorted.map(({ name, sales }) => (
                                    <div key={name}>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className={`font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{name}</p>
                                            <p className={`font-bold text-sm ${valueClasses}`}>{sales}</p>
                                        </div>
                                        <div className={`h-2.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2.5 rounded-full"
                                                style={{ width: `${brandPerformance.maxSales > 0 ? (sales / brandPerformance.maxSales) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {brandPerformance.sorted.length === 0 && <p className={subtitleClasses}>Nenhuma venda registrada.</p>}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DiagnosticsScreen;
