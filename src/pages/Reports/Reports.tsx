import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getSalesByDriver,
  getSalesByProduct,
  getSalesByPayment,
  getSalesEvolution,
} from '../../services/api/reports';
import { rowsToCsv, downloadCsv } from '../../utils/csv';
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
  LineChart,
  Line,
} from 'recharts';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  mercadopago: 'MercadoPago',
};

export const Reports = () => {
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

  // Los 3 reportes reales que expone el backend (/reports/*). Sin from/to el
  // backend usa por defecto "hoy 00:00 hasta ahora".
  const { data: byDriver = [], isLoading: loadingDriver } = useQuery(
    ['reportsSalesByDriver', startDate, endDate],
    () => getSalesByDriver(startDate || undefined, endDate || undefined),
  );

  const { data: byProduct = [], isLoading: loadingProduct } = useQuery(
    ['reportsSalesByProduct', startDate, endDate],
    () => getSalesByProduct(startDate || undefined, endDate || undefined),
  );

  const { data: byPayment = [], isLoading: loadingPayment } = useQuery(
    ['reportsSalesByPayment', startDate, endDate],
    () => getSalesByPayment(startDate || undefined, endDate || undefined),
  );

  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const { data: evolution = [] } = useQuery(
    ['reportsSalesEvolution', startDate, endDate, granularity],
    () =>
      getSalesEvolution(
        startDate || undefined,
        endDate || undefined,
        granularity,
      ),
  );

  const evolutionData = evolution.map((p) => ({
    period:
      granularity === 'month'
        ? new Date(p.period).toLocaleDateString('es-AR', {
            month: 'short',
            year: '2-digit',
          })
        : new Date(p.period).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
          }),
    totalSales: p.totalSales,
    totalOrders: p.totalOrders,
  }));

  const isLoading = loadingDriver || loadingProduct || loadingPayment;

  if (isLoading) {
    return (
      <div className="p-10 text-center text-slate-400">
        Generando reportes...
      </div>
    );
  }

  // KPIs derivados de las ventas por método de pago (cubre el 100% de los
  // pedidos entregados en el rango, sin importar quién los entregó).
  const totalSales = byPayment.reduce((acc, p) => acc + Number(p.totalSales || 0), 0);
  const totalOrders = byPayment.reduce((acc, p) => acc + Number(p.totalOrders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const paymentData = byPayment.map((p) => ({
    name: PAYMENT_LABELS[p.method] || p.method || 'Sin especificar',
    value: Number(p.totalSales || 0),
  }));

  const driverChartData = byDriver
    .map((d) => ({ name: d.driverName || 'Sin nombre', sales: Number(d.totalSales || 0) }))
    .sort((a, b) => b.sales - a.sales);

  const handleExport = () => {
    const rangeLabel =
      startDate && endDate ? `${startDate}_a_${endDate}` : 'periodo-actual';

    const sections = [
      rowsToCsv(
        ['Chofer', 'Pedidos entregados', 'Ventas totales'],
        byDriver.map((d) => [d.driverName, d.totalOrders, d.totalSales]),
      ),
      '',
      'Ventas por producto',
      rowsToCsv(
        ['Tipo', 'Descripción', 'Cantidad vendida', 'Ventas totales'],
        byProduct.map((p) => [p.productType, p.description, p.totalQuantity, p.totalSales]),
      ),
      '',
      'Ventas por método de pago',
      rowsToCsv(
        ['Método', 'Pedidos', 'Ventas totales'],
        byPayment.map((p) => [PAYMENT_LABELS[p.method] || p.method, p.totalOrders, p.totalSales]),
      ),
    ];

    const content = ['Ventas por chofer', ...sections].join('\n');
    downloadCsv(`reporte-jennygas-${rangeLabel}.csv`, content);
  };

  const hasAnyData = byDriver.length > 0 || byProduct.length > 0 || byPayment.length > 0;

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
                : 'Análisis de ventas entregadas del día de hoy.'}
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
            <button
              onClick={handleExport}
              disabled={!hasAnyData}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DownloadIcon fontSize="small" /> Exportar Data
            </button>
          </div>
        </div>

        {/* Tarjetas de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Facturación del período
            </p>
            <h3 className="text-3xl font-black text-slate-800">
              $ {totalSales.toLocaleString()}
            </h3>
            <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded mt-2 inline-block">
              {startDate && endDate ? 'Rango Filtrado' : 'Hoy'}
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Pedidos Entregados
            </p>
            <h3 className="text-3xl font-black text-slate-800">
              {totalOrders}
            </h3>
            <p className="text-xs text-slate-400 mt-2">En el período seleccionado</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs font-bold uppercase mb-2">
              Ticket Promedio
            </p>
            <h3 className="text-3xl font-black text-indigo-600">
              $ {Math.round(avgOrderValue).toLocaleString()}
            </h3>
            <p className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded mt-2 inline-block">
              Promedio por pedido entregado
            </p>
          </div>
        </div>

        {/* Evolución temporal de ventas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[380px] flex flex-col mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Evolución de ventas</h3>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['day', 'month'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    granularity === g
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {g === 'day' ? 'Diario' : 'Mensual'}
                </button>
              ))}
            </div>
          </div>
          {evolutionData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Sin ventas en el período.
            </div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString('es-AR')}`,
                      'Facturación',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalSales"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="totalSales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Ventas por Chofer */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Ventas por Repartidor</h3>
            </div>
            <div className="flex-1 w-full min-h-0">
              {driverChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={driverChartData}
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
                  No hay ventas entregadas en el período.
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
                    <RechartsTooltip
                      formatter={(value: any) => [`$ ${Number(value || 0).toLocaleString()}`, 'Ventas']}
                    />
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

        {/* 3. Ventas por Producto (tabla) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Ventas por Producto</h3>
          </div>
          {byProduct.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No hay ventas de productos en el período.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Descripción</th>
                  <th className="px-6 py-3 text-right">Cantidad vendida</th>
                  <th className="px-6 py-3 text-right">Ventas totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byProduct.map((p, idx) => (
                  <tr key={`${p.productType}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-700">{p.productType}</td>
                    <td className="px-6 py-3 text-slate-500">{p.description}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{p.totalQuantity}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-800">
                      $ {Number(p.totalSales || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
