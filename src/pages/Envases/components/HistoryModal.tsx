import { useQuery } from '@tanstack/react-query';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import {
  getCylinderHistory,
  PhysicalCylinder,
} from '../../../services/api/physicalCylinders';
import { STATE_BADGE, STATE_LABELS } from '../cylinderStates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cylinder: PhysicalCylinder | null;
}

export const HistoryModal = ({ isOpen, onClose, cylinder }: Props) => {
  const { data: movements = [], isLoading } = useQuery(
    ['cylinder-history', cylinder?.cylinder_id],
    () => getCylinderHistory(cylinder!.cylinder_id),
    { enabled: isOpen && !!cylinder },
  );

  if (!isOpen || !cylinder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HistoryIcon fontSize="small" className="text-slate-400" />
              Historial del envase
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Serial: {cylinder.serial}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-center text-slate-400 py-8">
              Cargando historial...
            </p>
          ) : movements.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Sin movimientos.</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-6">
              {movements.map((m) => (
                <li key={m.movement_id} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-indigo-400 border border-white" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.from_state && (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${STATE_BADGE[m.from_state]}`}
                      >
                        {STATE_LABELS[m.from_state]}
                      </span>
                    )}
                    <span className="text-slate-300">→</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${STATE_BADGE[m.to_state]}`}
                    >
                      {STATE_LABELS[m.to_state]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(m.createdAt).toLocaleString('es-AR')}
                    {m.order_id ? ` · Pedido #${m.order_id.slice(-6)}` : ''}
                  </p>
                  {m.note && (
                    <p className="text-sm text-slate-600 mt-1">{m.note}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};
