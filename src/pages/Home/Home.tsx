import { SalesStats } from './views/SalesStats'; // <--- NUEVO
import { FleetStatus } from './views/FleetStatus'; // <--- YA LO TENÍAS
import { DashboardStats } from './views/DashboardStats'; // <--- EL QUE HICIMOS ANTES (CLIENTES/STOCK)

// Iconos
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { RecentOrdersWidget } from './views/RecentOrdersWidget';

export const Home = () => {
  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard General
            </h1>
            <p className="text-slate-500 mt-1">
              Resumen de operaciones en tiempo real.
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-600">
            <NotificationsActiveIcon
              className="text-amber-500"
              fontSize="small"
            />
            Sistema Operativo
          </div>
        </div>

        {/* 1. SECCIÓN FINANCIERA Y OPERATIVA (VENTAS) */}
        <SalesStats />

        <DashboardStats />

        {/* 3. SECCIÓN DIVIDIDA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Izquierda: Accesos Directos y Avisos */}
          <div className="lg:col-span-2 space-y-6">
            <RecentOrdersWidget />
          </div>

          {/* Derecha: ESTADO DE FLOTA (REAL) */}
          <div className="h-full">
            <FleetStatus />
          </div>
        </div>
      </div>
    </div>
  );
};
