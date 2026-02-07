import { useEffect, useState } from 'react';
import { getAllCars } from '../../../services/api/cars';
import { getAllDeliveries } from '../../../services/api/deliveries';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

export const FleetStatus = () => {
  const [stats, setStats] = useState({
    totalCars: 0,
    motos: 0,
    autos: 0,
    camionetas: 0,
    activeDrivers: 0,
    totalDrivers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [carsData, deliveriesData] = await Promise.all([
          getAllCars(),
          getAllDeliveries(0, 100), // Traemos los deliveries para ver activos
        ]);

        // 1. Procesar Autos (Array directo)
        const cars = Array.isArray(carsData) ? carsData : [];

        // 2. Procesar Drivers (Objeto con rows)
        const drivers = deliveriesData.rows || [];

        setStats({
          totalCars: cars.length,
          motos: cars.filter((c) => c.type_car?.toLowerCase().includes('moto'))
            .length,
          autos: cars.filter((c) => c.type_car?.toLowerCase().includes('auto'))
            .length,
          camionetas: cars.filter((c) =>
            c.type_car?.toLowerCase().includes('camion'),
          ).length,
          activeDrivers: drivers.filter((d: any) => d.isActive).length,
          totalDrivers: drivers.length,
        });
      } catch (error) {
        console.error('Error cargando flota:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg h-full animate-pulse">
        <div className="h-6 w-1/2 bg-slate-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg shadow-slate-200 h-full flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <LocalShippingIcon className="text-emerald-400" /> Estado de Flota
        </h3>

        <div className="space-y-4">
          {/* Métricas Reales */}
          <div className="flex justify-between items-center border-b border-slate-600 pb-2">
            <span className="text-slate-300">Choferes Activos</span>
            <span className="font-bold text-emerald-400 text-lg">
              {stats.activeDrivers}{' '}
              <span className="text-slate-500 text-sm">
                / {stats.totalDrivers}
              </span>
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">
              Composición Vehículos
            </p>

            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <TwoWheelerIcon fontSize="small" /> Motos
              </span>
              <span className="font-bold">{stats.motos}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <DirectionsCarIcon fontSize="small" /> Autos
              </span>
              <span className="font-bold">{stats.autos}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <LocalShippingIcon fontSize="small" /> Camionetas
              </span>
              <span className="font-bold">{stats.camionetas}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 text-center">
        <p className="text-slate-400 text-xs">
          Total Unidades:{' '}
          <b className="text-white text-sm">{stats.totalCars}</b>
        </p>
      </div>
    </div>
  );
};
