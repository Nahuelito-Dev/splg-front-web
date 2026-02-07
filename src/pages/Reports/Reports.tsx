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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export const Reports = () => {
  // 1. Cargar Métricas Generales
  const { data: stats, isLoading: loadingStats } = useQuery(
    ['reportsStats'],
    getDashboardStats,
  );

  // 2. Cargar Datos del Gráfico (Real)
  const { data: salesData, isLoading: loadingChart } = useQuery(
    ['salesChart'],
    getSalesChart,
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
              Análisis de rendimiento y ventas de la última semana.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm">
            <DownloadIcon fontSize="small" /> Exportar Data
          </button>
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
              Mes en curso
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Pedidos Totales
            </p>
            <h3 className="text-3xl font-black text-slate-800">
              {stats?.sales?.total || 0}
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
            <p className="text-xs text-slate-400 mt-2">Por pedido entregado</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Evolución de Ventas (Barras) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">
              Ventas Diarias (Últimos 7 días)
            </h3>
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
