import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Incident, IncidentType } from '../../../services/api/incidents';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  onResolve: (resolutionNote: string) => void;
  isResolving: boolean;
}

const TYPE_LABELS: Record<IncidentType, string> = {
  damaged: 'Garrafa dañada',
  out_of_stock: 'Sin stock',
  no_show: 'Cliente ausente',
  other: 'Otro',
};

export const ResolveIncidentModal = ({
  isOpen,
  onClose,
  incident,
  onResolve,
  isResolving,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ resolutionNote: string }>();

  useEffect(() => {
    if (isOpen && incident) {
      reset({ resolutionNote: incident.resolution_note || '' });
    }
  }, [isOpen, incident, reset]);

  if (!isOpen || !incident) return null;

  const onSubmit = (data: { resolutionNote: string }) => {
    onResolve(data.resolutionNote);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Resolver incidencia
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              ID: #{incident.incident_id.slice(-6)} • Pedido: #
              {incident.order_id.slice(-6)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                <PersonIcon fontSize="small" /> Cliente
              </h4>
              <p className="font-bold text-slate-800">
                {incident.order?.customer?.full_name ?? '—'}
              </p>
              <p className="text-sm text-slate-600">
                {incident.order?.customer?.phone_number ?? ''}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                <DescriptionIcon fontSize="small" /> Problema
              </h4>
              <p className="font-bold text-slate-800">
                {TYPE_LABELS[incident.type] ?? incident.type}
              </p>
              <p className="text-sm text-slate-600">{incident.description}</p>
            </div>
          </div>

          {incident.photo_url && (
            <img
              src={incident.photo_url}
              alt="Evidencia"
              className="max-h-48 rounded-xl border border-slate-200"
            />
          )}

          {/* Nota de resolución */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nota de resolución
            </label>
            <textarea
              {...register('resolutionNote', {
                required: 'Escribí cómo se resolvió la incidencia.',
              })}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Se reprogramó la entrega / se repuso la garrafa dañada..."
            />
            {errors.resolutionNote && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.resolutionNote.message}
              </p>
            )}
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
              type="submit"
              disabled={isResolving}
              className="bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isResolving ? 'Guardando...' : 'Marcar como resuelta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
