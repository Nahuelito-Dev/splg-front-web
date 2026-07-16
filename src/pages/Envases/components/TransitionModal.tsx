import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  CylinderState,
  PhysicalCylinder,
} from '../../../services/api/physicalCylinders';
import { NEXT_STATES, STATE_BADGE, STATE_LABELS } from '../cylinderStates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cylinder: PhysicalCylinder | null;
  onTransition: (toState: CylinderState, note?: string) => void;
  isSaving: boolean;
}

export const TransitionModal = ({
  isOpen,
  onClose,
  cylinder,
  onTransition,
  isSaving,
}: Props) => {
  const [toState, setToState] = useState<CylinderState | ''>('');
  const [note, setNote] = useState('');

  const options = cylinder ? NEXT_STATES[cylinder.state] : [];

  useEffect(() => {
    if (isOpen && cylinder) {
      setToState(NEXT_STATES[cylinder.state][0] ?? '');
      setNote('');
    }
  }, [isOpen, cylinder]);

  if (!isOpen || !cylinder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Mover envase</h3>
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

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${STATE_BADGE[cylinder.state]}`}
            >
              {STATE_LABELS[cylinder.state]}
            </span>
            <ArrowForwardIcon className="text-slate-300" fontSize="small" />
            <select
              value={toState}
              onChange={(e) => setToState(e.target.value as CylinderState)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: recargada en planta / entregada al cliente..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving || !toState}
              onClick={() =>
                toState && onTransition(toState as CylinderState, note)
              }
              className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
