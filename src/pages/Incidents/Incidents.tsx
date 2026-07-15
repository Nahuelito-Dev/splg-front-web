import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllIncidents,
  resolveIncident,
  Incident,
  IncidentType,
} from '../../services/api/incidents';
import { ResolveIncidentModal } from './components/ResolveIncidentModal';
import Swal from 'sweetalert2';

// Iconos
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

const TYPE_LABELS: Record<IncidentType, string> = {
  damaged: 'Garrafa dañada',
  out_of_stock: 'Sin stock',
  no_show: 'Cliente ausente',
  other: 'Otro',
};

export const Incidents = () => {
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: incidents = [], isLoading } = useQuery(
    ['incidents'],
    getAllIncidents,
  );

  const resolveMutation = useMutation({
    mutationFn: (resolutionNote: string) =>
      resolveIncident(selectedIncident!.incident_id, resolutionNote),
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      setIsModalOpen(false);
      Swal.fire({
        title: 'Resuelta',
        text: 'La incidencia fue marcada como resuelta.',
        icon: 'success',
        customClass: {
          confirmButton:
            'bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors',
        },
        buttonsStyling: false,
      });
    },
    onError: () =>
      Swal.fire({
        title: 'Error',
        text: 'No se pudo resolver la incidencia.',
        icon: 'error',
        customClass: {
          confirmButton:
            'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors',
        },
        buttonsStyling: false,
      }),
  });

  const handleOpenResolve = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border uppercase text-emerald-600 bg-emerald-50 border-emerald-100">
          <CheckCircleIcon fontSize="inherit" /> Resuelta
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border uppercase text-amber-600 bg-amber-50 border-amber-100">
        <PendingIcon fontSize="inherit" /> Abierta
      </span>
    );
  };

  const openCount = incidents.filter((i) => i.status === 'open').length;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ReportProblemIcon fontSize="large" className="text-slate-400" />{' '}
            Incidencias de reparto
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Problemas reportados por los choferes durante la entrega
            {openCount > 0 ? ` · ${openCount} abierta(s)` : ''}.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              Cargando incidencias...
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="text-emerald-300" fontSize="large" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                Sin incidencias
              </h3>
              <p className="text-slate-500">
                Los choferes no reportaron problemas de reparto.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Cliente / Pedido</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((incident: Incident) => (
                  <tr
                    key={incident.incident_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      #{incident.incident_id.slice(-6)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        {incident.order?.customer?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pedido #{incident.order_id.slice(-6)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">
                        {TYPE_LABELS[incident.type] ?? incident.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 truncate max-w-[220px]">
                        {incident.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(incident.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {incident.status === 'open' ? (
                        <button
                          onClick={() => handleOpenResolve(incident)}
                          className="bg-indigo-600 text-white font-bold hover:bg-indigo-700 px-3 py-1 rounded transition-colors text-xs border border-indigo-600"
                        >
                          Resolver
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <ResolveIncidentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          incident={selectedIncident}
          onResolve={(note) => resolveMutation.mutate(note)}
          isResolving={resolveMutation.isLoading}
        />
      </div>
    </div>
  );
};
