import { useState } from 'react';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { Card, EmptyState, PageHeader } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useAllUserAddresses } from '../../services/queries/userAddresses';
import { AddressesTable } from './components/AddressesTable';

/**
 * Las direcciones de entrega de todos los clientes (`GET /user-address`, sólo administrador general).
 * La API no busca ni filtra: ignora `term` y `role`, por eso la página no ofrece buscador.
 */
export const Addresses = () => {
  const { isSuperAdmin } = usePermissions();
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const { data, isFetching } = useAllUserAddresses(pagination, { enabled: isSuperAdmin });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Direcciones"
        description="Las direcciones de entrega que cargaron los clientes, la predeterminada primero."
      />
      {!isSuperAdmin ? (
        <Card>
          <EmptyState
            title="Sólo para el administrador general"
            description="El listado completo de direcciones no está disponible para un administrador de empresa. Cada cliente muestra las suyas en su ficha."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-end border-b border-outline p-4">
            <p className="text-sm text-muted" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? 'dirección' : 'direcciones'}` : ''}
            </p>
          </div>
          <AddressesTable
            rows={data?.rows ?? []}
            total={data?.total ?? 0}
            loading={isFetching}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        </Card>
      )}
    </div>
  );
};
