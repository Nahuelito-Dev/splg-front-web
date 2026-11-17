import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Ban, CircleCheck, LogIn, LifeBuoy } from 'lucide-react';
import { Badge, EmptyState, IdentityCell, ResponsiveTable, RowActions } from '../../../common/components/ui';
import type { CompanyListItem } from '../../../services/api/types';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { DISTRIBUTOR_STATUS, labelOf, type Tone } from '../../../utils/statusLabels';
import { OwnedBadge } from '../../Platform/components/OwnedBadge';

interface Actions {
  /** Abre el pedido de acceso de soporte con la empresa elegida. */
  onRequestSupport: (company: CompanyListItem) => void;
  /** Entra a operar la empresa propia (sin pedir acceso de soporte). */
  onEnterOwned: (company: CompanyListItem) => void;
  onView: (company: CompanyListItem) => void;
  onEdit: (company: CompanyListItem) => void;
  onToggleStatus: (company: CompanyListItem) => void;
  onDelete: (company: CompanyListItem) => void;
}

interface Props extends Actions {
  rows: CompanyListItem[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Hay filtros puestos: el vacío lo dice. */
  filtered: boolean;
}

/** El estado y, si es la propia de la plataforma, su marca. */
const CompanyBadges = ({ company }: { company: CompanyListItem }) => (
  <div className="flex flex-col items-start gap-1">
    <Badge label={labelOf(DISTRIBUTOR_STATUS, company.status)} />
    {company.ownedByPlatform && <OwnedBadge />}
  </div>
);

const Activity = ({ company }: { company: CompanyListItem }) => (
  <div className="min-w-0">
    <p className="truncate text-ink">
      {formatNumber(company.metrics.orders)} pedidos · {formatNumber(company.metrics.salesOrders)} ventas
    </p>
    <p className="truncate text-xs text-muted">
      {company.lastActivityAt ? `Última actividad: ${formatDateTime(company.lastActivityAt)}` : 'Sin actividad'}
    </p>
  </div>
);

/** Lo que pide atención: procesos con alerta, una sesión de soporte abierta o pedidos de acceso sin responder. */
const attentionOf = (company: CompanyListItem): { key: string; text: string; tone: Tone }[] => {
  const notes: { key: string; text: string; tone: Tone }[] = [];
  if (company.processAlerts > 0) {
    notes.push({
      key: 'processes',
      text: company.processAlerts === 1 ? '1 proceso con alerta' : `${company.processAlerts} procesos con alerta`,
      tone: 'danger',
    });
  }
  if (company.supportSessionActive) notes.push({ key: 'support', text: 'Soporte activo', tone: 'accent' });
  if (company.supportRequestsPending > 0) {
    notes.push({
      key: 'pending',
      text:
        company.supportRequestsPending === 1
          ? '1 pedido de soporte'
          : `${company.supportRequestsPending} pedidos de soporte`,
      tone: 'warn',
    });
  }
  return notes;
};

const Attention = ({ company }: { company: CompanyListItem }) => {
  const notes = attentionOf(company);
  if (notes.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {notes.map((note) => (
        <Badge key={note.key} label={{ text: note.text, tone: note.tone }} />
      ))}
    </div>
  );
};

const CompanyRowActions = ({ company, actions }: { company: CompanyListItem; actions: Actions }) => (
  <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
    <RowActions
      rowLabel={company.name}
      onView={() => actions.onView(company)}
      onEdit={() => actions.onEdit(company)}
      onDelete={() => actions.onDelete(company)}
      deleteLabel="Dar de baja"
      actions={[
        // A la propia se entra directo; a cualquier otra, con un acceso de soporte que la empresa aprueba.
        company.ownedByPlatform
          ? { label: 'Entrar a la empresa', icon: LogIn, onClick: () => actions.onEnterOwned(company) }
          : { label: 'Pedir acceso de soporte', icon: LifeBuoy, onClick: () => actions.onRequestSupport(company) },
        company.status === 'active'
          ? { label: 'Suspender', icon: Ban, tone: 'danger', onClick: () => actions.onToggleStatus(company) }
          : { label: 'Activar', icon: CircleCheck, onClick: () => actions.onToggleStatus(company) },
      ]}
    />
  </div>
);

/** Las empresas de la plataforma (`GET /v2/platform/companies`): la propia primero, con su marca. */
export const DistributorsTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  filtered,
  ...actions
}: Props) => {
  const { onRequestSupport, onEnterOwned, onView, onEdit, onToggleStatus, onDelete } = actions;
  const columns = useMemo<GridColDef<CompanyListItem>[]>(() => {
    const handlers = { onRequestSupport, onEnterOwned, onView, onEdit, onToggleStatus, onDelete };
    return [
      {
        field: 'name',
        headerName: 'Empresa',
        flex: 1.3,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <IdentityCell title={row.name} subtitle={row.slug} avatarName={row.name} monoSubtitle />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 150,
        sortable: false,
        renderCell: ({ row }) => <CompanyBadges company={row} />,
      },
      {
        field: 'activity',
        headerName: 'Actividad del período',
        flex: 1,
        minWidth: 190,
        sortable: false,
        renderCell: ({ row }) => <Activity company={row} />,
      },
      {
        field: 'alerts',
        headerName: 'Atención',
        flex: 0.9,
        minWidth: 170,
        sortable: false,
        renderCell: ({ row }) => <Attention company={row} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 180,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => <CompanyRowActions company={row} actions={handlers} />,
      },
    ];
  }, [onRequestSupport, onEnterOwned, onView, onEdit, onToggleStatus, onDelete]);

  return (
    <ResponsiveTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      label="empresas"
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      renderCard={(row) => (
        <>
          <div className="flex items-start justify-between gap-2">
            <IdentityCell title={row.name} subtitle={row.slug} avatarName={row.name} monoSubtitle />
            <CompanyBadges company={row} />
          </div>
          <Activity company={row} />
          {attentionOf(row).length > 0 && <Attention company={row} />}
          <CompanyRowActions company={row} actions={actions} />
        </>
      )}
      empty={
        filtered ? (
          <EmptyState title="Sin resultados" description="Ninguna empresa cumple esos filtros." />
        ) : (
          <EmptyState title="Sin empresas" description="Todavía no diste de alta ninguna distribuidora." />
        )
      }
    />
  );
};
