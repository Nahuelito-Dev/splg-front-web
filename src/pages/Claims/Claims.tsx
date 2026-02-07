import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllClaims, resolveClaim, Claim } from '../../services/api/claims';
import { ResolveClaimModal } from './components/ResolveClaimModal';
import Swal from 'sweetalert2';

// Iconos
import FeedbackIcon from '@mui/icons-material/Feedback';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

export const Claims = () => {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Query
  const { data: claims = [], isLoading } = useQuery(['claims'], getAllClaims);

  // Mutation
  const resolveMutation = useMutation({
    mutationFn: (data: { resolution: string; status: string }) =>
      resolveClaim(selectedClaim!.claim_id, data.resolution, data.status),
    onSuccess: () => {
      queryClient.invalidateQueries(['claims']);
      setIsModalOpen(false);
      Swal.fire('Guardado', 'El reclamo ha sido actualizado.', 'success');
    },
    onError: () => Swal.fire('Error', 'No se pudo actualizar.', 'error'),
  });

  const handleOpenResolve = (claim: Claim) => {
    setSelectedClaim(claim);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: {
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        icon: <PendingIcon fontSize="inherit" />,
        label: 'Pendiente',
      },
      in_process: {
        color: 'text-blue-600 bg-blue-50 border-blue-100',
        icon: <HourglassEmptyIcon fontSize="inherit" />,
        label: 'En Proceso',
      },
      resolved: {
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        icon: <CheckCircleIcon fontSize="inherit" />,
        label: 'Resuelto',
      },
      rejected: {
        color: 'text-rose-600 bg-rose-50 border-rose-100',
        icon: <CancelIcon fontSize="inherit" />,
        label: 'Rechazado',
      },
    };
    const style = config[status] || config.pending;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border uppercase ${style.color}`}
      >
        {style.icon} {style.label}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FeedbackIcon fontSize="large" className="text-slate-400" /> Gestión
            de Reclamos
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Atención y resolución de incidencias post-venta.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              Cargando reclamos...
            </div>
          ) : claims.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon
                  className="text-emerald-300"
                  fontSize="large"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                ¡Todo en orden!
              </h3>
              <p className="text-slate-500">
                No hay reclamos pendientes de atención.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ID Reclamo</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Cliente / Pedido</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim: Claim) => (
                  <tr
                    key={claim.claim_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      #{claim.claim_id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        {claim.customer.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pedido #{claim.order.order_id.slice(-6)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">
                        {claim.reason}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {claim.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenResolve(claim)}
                        className="text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1 rounded transition-colors text-xs border border-indigo-200"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Modal */}
        <ResolveClaimModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          claim={selectedClaim}
          onResolve={(data) => resolveMutation.mutate(data)}
          isResolving={resolveMutation.isLoading}
        />
      </div>
    </div>
  );
};
