import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import PropaneTankIcon from '@mui/icons-material/PropaneTank';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  CylinderState,
  PhysicalCylinder,
  createPhysicalCylinder,
  getPhysicalCylinders,
  transitionPhysicalCylinder,
} from '../../services/api/physicalCylinders';
import { ALL_STATES, STATE_BADGE, STATE_LABELS } from './cylinderStates';
import { CreateEnvaseModal } from './components/CreateEnvaseModal';
import { TransitionModal } from './components/TransitionModal';
import { HistoryModal } from './components/HistoryModal';

const errorSwal = (text: string) =>
  Swal.fire({
    title: 'Error',
    text,
    icon: 'error',
    customClass: {
      confirmButton:
        'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors',
    },
    buttonsStyling: false,
  });

export const Envases = () => {
  const queryClient = useQueryClient();
  const [stateFilter, setStateFilter] = useState<CylinderState | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] =
    useState<PhysicalCylinder | null>(null);
  const [historyTarget, setHistoryTarget] = useState<PhysicalCylinder | null>(
    null,
  );

  const { data: cylinders = [], isLoading } = useQuery(
    ['physical-cylinders', stateFilter],
    () =>
      getPhysicalCylinders(
        stateFilter === 'all' ? undefined : stateFilter,
      ),
  );

  const createMutation = useMutation({
    mutationFn: createPhysicalCylinder,
    onSuccess: () => {
      queryClient.invalidateQueries(['physical-cylinders']);
      setCreateOpen(false);
    },
    onError: (e: any) =>
      errorSwal(
        e?.response?.data?.message ?? 'No se pudo crear el envase.',
      ),
  });

  const transitionMutation = useMutation({
    mutationFn: ({
      id,
      toState,
      note,
    }: {
      id: string;
      toState: CylinderState;
      note?: string;
    }) => transitionPhysicalCylinder(id, toState, note),
    onSuccess: () => {
      queryClient.invalidateQueries(['physical-cylinders']);
      setTransitionTarget(null);
    },
    onError: (e: any) =>
      errorSwal(
        e?.response?.data?.message ?? 'No se pudo mover el envase.',
      ),
  });

  // Conteo por estado para las pills del filtro (sobre lo cargado en "all").
  const total = cylinders.length;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <PropaneTankIcon fontSize="large" className="text-slate-400" />
              Envases físicos
            </h1>
            <p className="text-slate-500 mt-1 ml-11">
              Garrafas serializadas y su ciclo de vida (depósito → llenado →
              reparto → cliente → retorno).
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <AddIcon fontSize="small" /> Nuevo envase
          </button>
        </header>

        {/* Filtro por estado */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStateFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              stateFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>
          {ALL_STATES.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                stateFilter === s
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {STATE_LABELS[s]}
            </button>
          ))}
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              Cargando envases...
            </div>
          ) : cylinders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <PropaneTankIcon className="text-slate-300" fontSize="large" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                Sin envases
              </h3>
              <p className="text-slate-500">
                {stateFilter === 'all'
                  ? 'Todavía no diste de alta ningún envase físico.'
                  : `No hay envases en estado "${STATE_LABELS[stateFilter]}".`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Serial</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 font-semibold">Garantía</th>
                    <th className="px-6 py-3 font-semibold">Pedido actual</th>
                    <th className="px-6 py-3 font-semibold text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cylinders.map((c) => (
                    <tr key={c.cylinder_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-medium text-slate-800">
                        {c.serial}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${STATE_BADGE[c.state]}`}
                        >
                          {STATE_LABELS[c.state]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {Number(c.deposit) > 0
                          ? `$${Number(c.deposit).toLocaleString('es-AR')}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-500">
                        {c.current_order_id
                          ? `#${c.current_order_id.slice(-6)}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setTransitionTarget(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            <SwapHorizIcon fontSize="inherit" /> Mover
                          </button>
                          <button
                            onClick={() => setHistoryTarget(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                          >
                            <HistoryIcon fontSize="inherit" /> Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 text-xs text-slate-400 border-t border-slate-100">
                {total} envase(s)
              </div>
            </div>
          )}
        </section>
      </div>

      <CreateEnvaseModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(payload) => createMutation.mutate(payload)}
        isSaving={createMutation.isLoading}
      />

      <TransitionModal
        isOpen={!!transitionTarget}
        onClose={() => setTransitionTarget(null)}
        cylinder={transitionTarget}
        onTransition={(toState, note) =>
          transitionTarget &&
          transitionMutation.mutate({
            id: transitionTarget.cylinder_id,
            toState,
            note,
          })
        }
        isSaving={transitionMutation.isLoading}
      />

      <HistoryModal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        cylinder={historyTarget}
      />
    </div>
  );
};
