import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getSalesChart } from '../../services/api/stats';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import { useEffect } from 'react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export const Reports = () => {
  const [viewType, setViewType] = useState<'day' | 'month'>('day');
  
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
    }, 1000);

    return () => clearTimeout(handler);
  }, [tempStartDate, tempEndDate]);

  // 1. Cargar Métricas Generales
  const { data: stats, isLoading: loadingStats } = useQuery(
    ['reportsStats', startDate, endDate],
    () => getDashboardStats(startDate, endDate),
  );

  // 2. Cargar Datos del Gráfico (Real)
  const { data: salesData, isLoading: loadingChart } = useQuery(
    ['salesChart', viewType, startDate, endDate],
    () => getSalesChart(viewType, startDate, endDate),
  );

  if (loadingStats || loadingChart) {
    return (
      <div className="p-10 text-center text-slate-400">
        Generando reportes...
      </div>
    );
  }

  // Preparamos datos para la torta de Pagos
  const paymentData = [
    { name: 'Efectivo', value: Number(stats?.paymentMethods?.cash || 0) },
    {
      name: 'MercadoPago',
      value: Number(stats?.paymentMethods?.mercadopago || 0),
    },
  ];

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <AssessmentIcon fontSize="large" className="text-slate-400" />{' '}
              Reportes Operativos
            </h1>
            <p className="text-slate-500 mt-1 ml-11">
              {startDate && endDate 
                ? `Análisis del periodo: ${new Date(startDate).toLocaleDateString()} al ${new Date(endDate).toLocaleDateString()}`
                : 'Análisis de rendimiento y ventas de la última semana.'}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                Desde:
                <input
                  type="date"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors outline-none"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                Hasta:
                <input
                  type="date"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors outline-none"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                />
              </label>
            </div>
            <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm">
              <DownloadIcon fontSize="small" /> Exportar Data
            </button>
          </div>
        </div>

        {/* Tarjetas de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Facturación del Mes
            </p>
            <h3 className="text-3xl font-black text-slate-800">
              $ {Number(stats?.sales?.month || 0).toLocaleString()}
            </h3>
            <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded mt-2 inline-block">
              {startDate && endDate ? 'Rango Filtrado' : 'Mes en curso'}
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Pedidos Totales Entregados
            </p>
            <h3 className="text-3xl font-black text-slate-800">
              {stats?.ordersSummary?.totalDelivered || 0}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Histórico acumulado</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Ticket Promedio
            </p>
            <h3 className="text-3xl font-black text-indigo-600">
              ${' '}
              {Math.round(
                stats?.performance?.avgOrderValue || 0,
              ).toLocaleString()}
            </h3>
            <p className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded mt-2 inline-block">
              {startDate && endDate ? 'Promedio en el rango' : 'Por pedido entregado en el mes'}
            </p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Evolución de Ventas (Barras) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">
                {viewType === 'day' ? 'Ventas Diarias (Últimos 7 días)' : 'Ventas Mensuales (Último Año)'}
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewType('day')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    viewType === 'day'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
                  }`}
                >
                  Diario
                </button>
                <button
                  onClick={() => setViewType('month')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    viewType === 'month'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
                  }`}
                >
                  Mensual
                </button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              {salesData && salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickFormatter={(val) => `$${val / 1000}k`}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      // 👇 CORRECCIÓN AQUÍ: Usamos 'any' o 'number | undefined' y convertimos a Number()
                      formatter={(value: any) => [
                        `$ ${Number(value || 0).toLocaleString()}`,
                        'Ventas',
                      ]}
                    />
                    <Bar
                      dataKey="sales"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No hay datos suficientes aún.
                </div>
              )}
            </div>
          </div>

          {/* 2. Métodos de Pago (Torta) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">
              Distribución de Pagos
            </h3>
            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
              {paymentData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm">
                  No hay transacciones registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
