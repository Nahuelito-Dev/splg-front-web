import { useNavigate } from 'react-router-dom';
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Select } from '../../common/components/ui';
import { FROM_LIST_STATE, useUrlParams } from '../../hooks';
import type { CylinderVencimiento } from '../../services/api/types';
import { useExpiringCylinders } from '../../services/queries/physicalCylinders';
import { SerialLookupCard } from './components/SerialLookupCard';
import { ExpiringCylindersTable } from './components/ExpiringCylindersTable';
import { WINDOW_DAYS, windowDaysOf } from './inspection';

interface SectionProps {
  title: string;
  description: string;
  rows: CylinderVencimiento[];
  /** Total del grupo en la API; mayor que `rows` si el grupo no entró en la página. */
  total: number;
  loading: boolean;
  emptyTitle: string;
  onView: (cylinder: CylinderVencimiento) => void;
}

const Section = ({ title, description, rows, total, loading, emptyTitle, onView }: SectionProps) => (
  <Card className="mb-6 overflow-hidden">
    <div className="border-b border-outline p-4">
      <h2 className="text-base font-semibold text-ink">
        {title} <span className="font-normal text-muted">({total})</span>
      </h2>
      <p className="text-[13px] text-muted">{description}</p>
      {total > rows.length && (
        <p className="mt-1 text-[13px] text-warn" role="status">
          Se muestran los primeros {rows.length} de {total}: acotá la ventana para ver el resto.
        </p>
      )}
    </div>
    <ExpiringCylindersTable
      rows={rows}
      loading={loading}
      onView={onView}
      empty={<EmptyState title={emptyTitle} description="Nada para revisar en este grupo." />}
    />
  </Card>
);

/** Qué envases hay que mandar a revisar: vencidos, próximos a vencer en la ventana que elige el admin y sin fecha. */
export const CylinderExpirations = () => {
  const navigate = useNavigate();
  const [{ days: daysParam }, setFilters] = useUrlParams({ days: '30' });
  const days = windowDaysOf(daysParam);
  const { data, isPending, isFetching, error, refetch } = useExpiringCylinders(days);
  const view = (cylinder: CylinderVencimiento) =>
    navigate(`/physical-cylinders/${cylinder.cylinderId}`, { state: FROM_LIST_STATE });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Vencimientos de envases"
        description="La revisión periódica de cada garrafa: los vencidos no se pueden despachar."
        actions={
          <Select
            label="Ventana"
            options={WINDOW_DAYS.map((d) => ({ value: String(d), label: `Próximos ${d} días` }))}
            value={String(days)}
            onChange={(e) => setFilters({ days: e.target.value })}
          />
        }
      />
      <SerialLookupCard />
      {isPending ? (
        <ListSkeleton />
      ) : error || !data ? (
        <ErrorState error={error} resource="Los vencimientos" onRetry={() => void refetch()} />
      ) : (
        <>
          <Section
            title="Vencidos"
            description="Fuera de circulación: el sistema rechaza asignarlos a un pedido."
            rows={data.expired}
            total={data.totals.expired}
            loading={isFetching}
            emptyTitle="No hay envases vencidos"
            onView={view}
          />
          <Section
            title={`Vencen en los próximos ${days} días`}
            description="Del más urgente al menos: mandalos a revisar antes de que queden fuera de circulación."
            rows={data.expiring}
            total={data.totals.expiring}
            loading={isFetching}
            emptyTitle="Ningún envase vence en esta ventana"
            onView={view}
          />
          <Section
            title="Sin revisión registrada"
            description="No tienen fecha con la cual comparar. Pueden estar en regla y sin el dato cargado: no se bloquean."
            rows={data.unverified}
            total={data.totals.unverified}
            loading={isFetching}
            emptyTitle="Todos los envases tienen su revisión cargada"
            onView={view}
          />
        </>
      )}
    </div>
  );
};
