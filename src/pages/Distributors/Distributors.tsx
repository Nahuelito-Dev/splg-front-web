import { useState } from 'react';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import { activeDistributor } from '../../services/api/activeDistributor';
import type { Distributor } from '../../services/api/types';
import { useDeleteDistributor, useDistributors, useUpdateDistributor } from '../../services/queries/distributors';
import { confirm, notify } from '../../utils/notifications';
import { DistributorDetailModal } from './components/DistributorDetailModal';
import { DistributorFormModal } from './components/DistributorFormModal';
import { DistributorsTable } from './components/DistributorsTable';

type FormState = { open: false } | { open: true; distributor: Distributor | null };

/**
 * Gestión de distribuidoras (empresas), sólo para el administrador general.
 * "Ver como" setea el header X-Distributor (localStorage) y recarga: así el
 * panel muestra sólo los datos de esa empresa. "Ver todas" vuelve a la vista global.
 */
export const Distributors = () => {
  const [viewingSlug, setViewingSlug] = useState(() => activeDistributor.get() ?? '');
  const [form, setForm] = useState<FormState>({ open: false });
  const [detail, setDetail] = useState<Distributor | null>(null);
  const { data: distributors, isLoading, isFetching, error, refetch } = useDistributors();
  const updateDistributor = useUpdateDistributor();
  const deleteDistributor = useDeleteDistributor();

  const viewAs = (slug: string) => {
    activeDistributor.set(slug || null);
    setViewingSlug(slug);
    window.location.reload();
  };

  const handleToggleStatus = async (distributor: Distributor) => {
    const suspending = distributor.status === 'active';
    if (suspending) {
      const confirmed = await confirm({
        title: '¿Suspender la empresa?',
        text: `"${distributor.name}" no va a poder operar hasta reactivarla.`,
        confirmText: 'Suspender',
        danger: true,
      });
      if (!confirmed) return;
    }
    updateDistributor.mutate(
      { id: distributor.distributor_id, changes: { status: suspending ? 'suspended' : 'active' } },
      {
        onSuccess: () => notify.success(suspending ? 'Empresa suspendida' : 'Empresa activada'),
        onError: notify.error,
      },
    );
  };

  const handleDelete = async (distributor: Distributor) => {
    const confirmed = await confirm({
      title: `¿Dar de baja "${distributor.name}"?`,
      text:
        'Es una baja lógica: sus choferes, administradores, clientes y pedidos quedan intactos en la base, ' +
        'pero la empresa deja de listarse y de poder resolverse (nuevos pedidos de sus clientes van a fallar). ' +
        'No hay forma de deshacerlo desde el panel.',
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;

    // Si es la que se está "viendo como", el header X-Distributor se saca ANTES
    // de borrar (no después del éxito): la invalidación de la lista dispara un
    // refetch de inmediato, y si todavía manda ese header la API ya no puede
    // resolverlo → 401 → la sesión se cierra sola antes de poder avisar nada.
    // DELETE /distributor/:id no necesita el header (es una acción de
    // plataforma), así que sacarlo antes no afecta el borrado en sí.
    const wasViewingThis = activeDistributor.get() === distributor.slug;
    if (wasViewingThis) activeDistributor.set(null);

    deleteDistributor.mutate(distributor.distributor_id, {
      onSuccess: () => {
        notify.success('Empresa dada de baja');
        if (wasViewingThis) {
          // Mismo criterio que "Ver todas": recarga para que todo el panel
          // (permisos, tenant en memoria) arranque limpio sin esa empresa.
          setViewingSlug('');
          window.location.reload();
        }
      },
      onError: (err) => {
        if (wasViewingThis) activeDistributor.set(distributor.slug);
        notify.error(err);
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Distribuidoras"
        description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo."
        actions={
          <Button icon={<AddBusinessIcon />} onClick={() => setForm({ open: true, distributor: null })}>
            Nueva empresa
          </Button>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-ink">
          Viendo: <span className="font-semibold text-primary-strong">{viewingSlug || 'todas las empresas'}</span>
        </p>
        {viewingSlug && (
          <Button variant="secondary" size="sm" onClick={() => viewAs('')}>
            Ver todas
          </Button>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} resource="Las empresas" onRetry={() => void refetch()} />
        ) : (
          <DistributorsTable
            rows={distributors ?? []}
            loading={isFetching}
            viewingSlug={viewingSlug}
            onViewAs={(distributor) => viewAs(distributor.slug)}
            onView={setDetail}
            onEdit={(distributor) => setForm({ open: true, distributor })}
            onToggleStatus={(distributor) => void handleToggleStatus(distributor)}
            onDelete={(distributor) => void handleDelete(distributor)}
          />
        )}
      </Card>

      <DistributorDetailModal distributor={detail} onClose={() => setDetail(null)} />
      <DistributorFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        distributor={form.open ? form.distributor : null}
      />
    </div>
  );
};
