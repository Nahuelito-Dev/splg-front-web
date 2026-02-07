import { useForm } from 'react-hook-form';
import { Claim } from '../../../services/api/claims';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  onResolve: (data: { resolution: string; status: string }) => void;
  isResolving: boolean;
}

export const ResolveClaimModal = ({
  isOpen,
  onClose,
  claim,
  onResolve,
  isResolving,
}: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  if (!isOpen || !claim) return null;

  const onSubmit = (data: any) => {
    onResolve(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Gestionar Reclamo
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              ID: #{claim.claim_id.slice(-6)} • Pedido: #
              {claim.order.order_id.slice(-6)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <CloseIcon className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Cliente y Motivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                <PersonIcon fontSize="small" /> Cliente
              </h4>
              <p className="font-bold text-slate-800">
                {claim.customer.full_name}
              </p>
              <p className="text-sm text-slate-600">
                {claim.customer.phone_number}
              </p>
              <p className="text-xs text-slate-500">{claim.customer.email}</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                <DescriptionIcon fontSize="small" /> Motivo
              </h4>
              <p className="font-bold text-slate-800">{claim.reason}</p>
              <p className="text-sm text-slate-600 italic mt-1">
                "{claim.description}"
              </p>
            </div>
          </div>

          {/* Evidencia Fotográfica */}
          {claim.photoUrl ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs font-bold text-slate-500 flex items-center gap-2">
                <PhotoCameraIcon fontSize="small" /> Evidencia Adjunta
              </div>
              <img
                src={claim.photoUrl}
                alt="Evidencia"
                className="w-full h-64 object-cover object-center bg-slate-100"
              />
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
              Sin foto adjunta
            </div>
          )}

          {/* Formulario de Resolución */}
          <form
            id="resolve-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pt-4 border-t border-slate-100"
          >
            <h4 className="font-bold text-slate-800">Resolución del Caso</h4>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Nota de Resolución (Visible internamente)
              </label>
              <textarea
                {...register('resolution', {
                  required: 'Escribe una nota de resolución',
                })}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                placeholder="Ej: Se contactó al cliente y se acordó reposición del producto mañana..."
              ></textarea>
              {errors.resolution && (
                <span className="text-xs text-rose-500">Requerido</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Nuevo Estado
              </label>
              <select
                {...register('status', { required: true })}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="resolved">✅ Resuelto (Cerrar caso)</option>
                <option value="in_process">
                  ⏳ En Proceso (Seguir investigando)
                </option>
                <option value="rejected">❌ Rechazado (No procede)</option>
              </select>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="resolve-form"
            disabled={isResolving}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md disabled:opacity-70"
          >
            {isResolving ? 'Guardando...' : 'Confirmar Resolución'}
          </button>
        </div>
      </div>
    </div>
  );
};
