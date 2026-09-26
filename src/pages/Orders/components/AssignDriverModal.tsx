import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllDeliveries } from '../../../services/api/deliveries';
import Swal from 'sweetalert2';

// Iconos
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveryId: string) => void;
  isAssigning: boolean;
}

export const AssignDriverModal = ({
  isOpen,
  onClose,
  onConfirm,
  isAssigning,
}: Props) => {
  const [selectedDriver, setSelectedDriver] = useState('');

  // Traer choferes (Solo activos)
  // Nota: Podrías usar el endpoint /delivery/active si lo tienes, sino filtramos aquí
  const { data, isLoading } = useQuery(['activeDrivers'], () =>
    getAllDeliveries(0, 100),
  );

  // Filtramos visualmente para el admin
  const drivers = data?.rows?.filter((d: any) => d.isActive) || [];

  const handleConfirm = () => {
    if (!selectedDriver)
      return Swal.fire('Atención', 'Selecciona un chofer', 'warning');
    onConfirm(selectedDriver);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            Asignación Manual
          </h3>
          <p className="text-xs text-slate-500">
            Sobreescribir asignación automática
          </p>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-center text-slate-400 py-4">Buscando flota...</p>
          ) : drivers.length === 0 ? (
            <p className="text-center text-rose-500 py-4">
              No hay choferes activos disponibles.
            </p>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver: any) => (
                <label
                  key={driver.delivery_id}
                  className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedDriver === driver.delivery_id
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-indigo-500 shadow-sm">
                      <TwoWheelerIcon fontSize="small" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700">
                        {driver.user?.full_name}
                      </p>
                      <span className="text-xs text-slate-500">
                        Disponible
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="driver_select"
                    value={driver.delivery_id}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isAssigning || !selectedDriver}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 disabled:opacity-70 transition-all"
          >
            {isAssigning ? 'Asignando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
