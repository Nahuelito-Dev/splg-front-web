import type { GridColDef } from '@mui/x-data-grid';
import { Scissors, XCircle } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  DateRangeFilter,
  Drawer,
  EmptyState,
  ErrorState,
  IdentityCell,
  LoadingState,
  PageContainer,
  PageHeader,
  ReasonModal,
  ResponsiveTable,
  RowActions,
  Select,
  TableToolbar,
} from '../../common/components/ui';
import { useUrlPagedParams } from '../../hooks/useUrlParam';
import { useSupportSession } from '../../hooks/useSupportSession';
import { errorMessage, toApiError } from '../../services/api/errors';
import type { SupportStatus } from '../../services/api/supportSessions';
import type { SupportSession } from '../../services/api/types';
import {
  useCutSupportSession,
  useSupportSessionDetail,
  useSupportSessionEntries,
  useSupportSessions,
} from '../../services/queries/supportSessions';
import { confirm, notify } from '../../utils/notifications';
import { formatDateTime, formatDay } from '../../utils/format';
import { labelOf, SUPPORT_SESSION_STATUS } from '../../utils/statusLabels';
import { SupportSessionDetails } from '../SupportAccess/components/SupportSessionDrawer';
import { AccountPicker } from './components/AccountPicker';
import { CompanySelect } from './components/CompanySelect';
import { cutReasonCounter, cutReasonError } from './components/cutReason';

/** `byName` sólo viaja para el chip: el filtro es el id elegido en el selector. `session`: la ficha abierta. */
const FILTERS = { status: '', company: '', by: '', byName: '', from: '', to: '', session: '' };
type Filters = typeof FILTERS;
type ChipKey = Exclude<keyof Filters, 'byName' | 'session'>;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...(Object.keys(SUPPORT_SESSION_STATUS) as SupportStatus[]).map((status) => ({
    value: status,
    label: SUPPORT_SESSION_STATUS[status].text,
  })),
];

const isStatus = (value: string): value is SupportStatus => value in SUPPORT_SESSION_STATUS;

const chipsOf = (filters: Filters) => {
  const chips: { key: ChipKey; label: string }[] = [];
  if (isStatus(filters.status)) chips.push({ key: 'status', label: SUPPORT_SESSION_STATUS[filters.status].text });
  if (filters.company) chips.push({ key: 'company', label: 'Una empresa' });
  if (filters.by) chips.push({ key: 'by', label: `Pedida por ${filters.byName || 'una persona'}` });
  if (filters.from) chips.push({ key: 'from', label: `Desde ${formatDay(filters.from)}` });
  if (filters.to) chips.push({ key: 'to', label: `Hasta ${formatDay(filters.to)}` });
  return chips;
};

const StatusBadges = ({ row }: { row: SupportSession }) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
    <Badge label={labelOf(SUPPORT_SESSION_STATUS, row.status)} />
    {row.kind === 'emergency' && <Badge label={{ text: 'Emergencia', tone: 'danger' }} />}
  </span>
);

/** Quién pidió el acceso, con su foto (`requestedBy.photoUrl` firmada de la API); sin foto, sus iniciales. */
const Who = ({ row, withReason = true }: { row: SupportSession; withReason?: boolean }) => (
  <IdentityCell
    title={row.requestedBy.fullName ?? 'Administrador general'}
    subtitle={withReason ? row.reason : undefined}
    avatarName={row.requestedBy.fullName ?? 'A'}
    photo={{ kind: 'user', id: row.requestedBy.userId, url: row.requestedBy.photoUrl }}
  />
);

/** Lo que se puede terminar desde acá: una sesión activa (se corta) o un pedido pendiente (se cancela). */
const canEnd = (session: SupportSession) => session.status === 'active' || session.status === 'pending';

/** Los textos de cada caso: cortar una sesión activa o cancelar un pedido pendiente. */
const endTexts = (session: SupportSession) =>
  session.status === 'pending'
    ? {
        action: 'Cancelar pedido',
        done: 'Pedido de acceso cancelado',
        ownTitle: '¿Cancelar tu pedido de acceso?',
        ownText: `${session.distributorName} deja de verlo pendiente. Si lo necesitás de nuevo, tenés que pedir otro acceso.`,
        otherTitle: 'Cancelar el pedido de acceso',
        otherText: `${session.requestedBy.fullName ?? 'Otro administrador general'} pidió acceso a ${session.distributorName}: el pedido queda retirado y la empresa ya no lo ve pendiente. El motivo queda registrado en la auditoría.`,
        placeholder: 'Por ejemplo: el pedido se hizo sobre la empresa equivocada',
      }
    : {
        action: 'Cortar sesión',
        done: 'Sesión de soporte cortada',
        ownTitle: '¿Cortar tu sesión de soporte?',
        ownText: `Dejás de ver ${session.distributorName}. Si lo necesitás de nuevo, tenés que pedir otro acceso.`,
        otherTitle: 'Cortar la sesión de soporte',
        otherText: `${session.requestedBy.fullName ?? 'Otro administrador general'} deja de ver ${session.distributorName} en su próxima consulta. El motivo queda registrado en la auditoría.`,
        placeholder: 'Por ejemplo: la empresa pidió por teléfono que se corte el acceso',
      };

/** El nombre de la acción para una fila: «Cortar sesión» (activa) o «Cancelar pedido» (pendiente). */
const endActionLabel = (session: SupportSession) => endTexts(session).action;

/**
 * Terminar una sesión activa o un pedido pendiente (`DELETE /v2/support-sessions/:id`). Lo propio se termina con una
 * confirmación y sin motivo; lo de otro administrador general pide el motivo (la API lo exige y lo deja en la
 * auditoría). Un 409 (ya había terminado) se muestra en la pantalla con el mensaje de la API; otro error de la API
 * queda en el modal del motivo.
 */
const useEndFlow = () => {
  const end = useCutSupportSession();
  const { session: mine } = useSupportSession();
  const [target, setTarget] = useState<SupportSession | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const start = async (session: SupportSession) => {
    setPageError(null);
    const texts = endTexts(session);
    // La API informa como sesión actual la activa propia o, si no hay, el pedido pendiente propio más nuevo.
    if (mine?.id === session.id) {
      const confirmed = await confirm({
        title: texts.ownTitle,
        text: texts.ownText,
        confirmText: texts.action,
        danger: true,
      });
      if (!confirmed) return;
      end.mutate(
        { id: session.id },
        { onSuccess: () => notify.success(texts.done), onError: (error) => setPageError(errorMessage(error)) },
      );
      return;
    }
    setServerError(null);
    setTarget(session);
  };

  const confirmOther = (reason: string) => {
    if (!target) return;
    const texts = endTexts(target);
    setServerError(null);
    end.mutate(
      { id: target.id, body: { reason } },
      {
        onSuccess: () => {
          setTarget(null);
          notify.success(texts.done);
        },
        onError: (error) => {
          if (toApiError(error).status === 409) {
            setTarget(null);
            setPageError(errorMessage(error));
            return;
          }
          setServerError(errorMessage(error));
        },
      },
    );
  };

  const texts = target ? endTexts(target) : null;
  const modal = (
    <ReasonModal
      open={target !== null}
      onClose={() => setTarget(null)}
      onConfirm={confirmOther}
      title={texts?.otherTitle ?? ''}
      description={texts?.otherText ?? ''}
      placeholder={texts?.placeholder}
      confirmLabel={texts?.action ?? ''}
      validateReason={cutReasonError}
      reasonHint={cutReasonCounter}
      serverError={serverError}
      onReasonChange={() => setServerError(null)}
      loading={end.isPending}
    />
  );

  const alert = pageError && (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
    >
      {pageError}
      <button type="button" onClick={() => setPageError(null)} className="text-xs underline">
        Cerrar
      </button>
    </div>
  );

  return { start, modal, alert, isPending: end.isPending };
};

interface PanelProps {
  id: string;
  /** La fila de la lista, si está: se muestra mientras llega la ficha. */
  fallback: SupportSession | null;
  onClose: () => void;
  onCut: (session: SupportSession) => void;
  cutting: boolean;
  /** El error de un corte hecho desde la ficha: se ve arriba del detalle (la ficha tapa la pantalla). */
  alert?: ReactNode;
}

/** La ficha de una sesión (`GET /v2/support-sessions/:id`) con lo que miró y, si sigue activa o pendiente, el corte. */
const SessionPanel = ({ id, fallback, onClose, onCut, cutting, alert }: PanelProps) => {
  const detail = useSupportSessionDetail(id || undefined);
  const session = detail.data ?? (detail.error ? null : fallback);
  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      size="lg"
      title="Sesión de soporte"
      description={session ? `Pedida por ${session.requestedBy.fullName ?? 'un administrador general'}` : undefined}
      footer={
        session && canEnd(session) ? (
          <Button
            variant="danger"
            loading={cutting}
            icon={session.status === 'active' ? <Scissors /> : <XCircle />}
            onClick={() => onCut(session)}
          >
            {endActionLabel(session)}
          </Button>
        ) : undefined
      }
    >
      {alert && <div className="mb-4">{alert}</div>}
      {session ? (
        <SupportSessionDetails session={session} useEntries={useSupportSessionEntries} showCompany />
      ) : detail.error ? (
        <ErrorState
          error={detail.error}
          resource="La sesión"
          notFoundDescription="La sesión no existe o ya no está disponible."
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <LoadingState label="Cargando la sesión…" />
      )}
    </Drawer>
  );
};

/**
 * «Sesiones de soporte» de la plataforma: el historial de todos los accesos de soporte a las empresas (quién, a cuál,
 * por qué y cómo terminó), con lo que se miró y el corte de una sesión activa.
 */
export const SupportSessions = () => {
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams<keyof Filters>(FILTERS, 25);
  const { data, isPending, isFetching, error, refetch } = useSupportSessions({
    status: isStatus(filters.status) ? filters.status : '',
    distributorId: filters.company,
    requestedBy: filters.by,
    from: filters.from,
    to: filters.to,
    limit: pagination.pageSize,
    offset: pagination.page * pagination.pageSize,
  });
  const cutFlow = useEndFlow();
  const chips = chipsOf(filters);
  const rows = useMemo(() => data?.items ?? [], [data]);
  const open = (session: SupportSession) => setFilters({ session: session.id }, { keepPage: true });

  const columns: GridColDef<SupportSession>[] = [
    {
      field: 'requestedBy',
      headerName: 'Quién y por qué',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => <Who row={row} />,
    },
    {
      field: 'distributorName',
      headerName: 'Empresa',
      flex: 0.9,
      minWidth: 150,
      sortable: false,
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 190,
      sortable: false,
      renderCell: ({ row }) => <StatusBadges row={row} />,
    },
    {
      field: 'createdAt',
      headerName: 'Pedida',
      width: 160,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.createdAt),
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`sesión de ${row.requestedBy.fullName ?? 'soporte'} en ${row.distributorName}`}
          onView={() => open(row)}
          actions={
            canEnd(row)
              ? [
                  {
                    label: endActionLabel(row),
                    icon: row.status === 'active' ? Scissors : XCircle,
                    tone: 'danger',
                    onClick: () => void cutFlow.start(row),
                  },
                ]
              : []
          }
        />
      ),
    },
  ];

  return (
    <PageContainer stack>
      <PageHeader
        title="Sesiones de soporte"
        description="Cada vez que alguien de la plataforma pidió mirar una empresa: por qué, quién lo aprobó, cómo terminó y qué miró. Una sesión activa se puede cortar y un pedido pendiente, cancelar."
      />
      {!filters.session && cutFlow.alert}
      <Card>
        <TableToolbar
          filters={
            <>
              <Select
                label="Estado"
                value={filters.status}
                onChange={(event) => setFilters({ status: event.target.value })}
                options={STATUS_OPTIONS}
              />
              <CompanySelect
                value={filters.company}
                onChange={(company) => setFilters({ company })}
                emptyLabel="Todas"
              />
              <div className="sm:w-72">
                <AccountPicker
                  label="Quién la pidió"
                  selected={null}
                  onSelect={(user) =>
                    setFilters({ by: user?.user_id ?? '', byName: user?.full_name ?? user?.email ?? '' })
                  }
                />
              </div>
              <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => setFilters(range)} />
            </>
          }
          chips={chips}
          onRemoveChip={(key) => setFilters(key === 'by' ? { by: '', byName: '' } : { [key]: '' })}
          onClearChips={() => setFilters({ ...FILTERS, session: filters.session })}
          resultCount={data?.total}
          noun={['sesión', 'sesiones']}
        />
        {error ? (
          <ErrorState error={error} resource="Las sesiones de soporte" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            label="sesiones"
            renderCard={(row) => (
              <button
                type="button"
                onClick={() => open(row)}
                className="grid w-full gap-1.5 text-left"
                aria-label={`Ver la sesión de ${row.requestedBy.fullName ?? 'soporte'} en ${row.distributorName}`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <Who row={row} withReason={false} />
                  </span>
                  <StatusBadges row={row} />
                </span>
                <span className="line-clamp-2 text-sm text-ink-2">{row.reason}</span>
                <span className="text-xs text-muted">
                  {row.distributorName} · {formatDateTime(row.createdAt)}
                </span>
              </button>
            )}
            loading={isPending || isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={open}
            empty={
              <EmptyState
                title={chips.length > 0 ? 'Sin resultados' : 'Sin sesiones de soporte'}
                description={
                  chips.length > 0
                    ? 'Ninguna sesión cumple esos filtros.'
                    : 'Nadie de la plataforma pidió todavía mirar una empresa.'
                }
              />
            }
          />
        )}
      </Card>
      <SessionPanel
        id={filters.session}
        fallback={rows.find((row) => row.id === filters.session) ?? null}
        onClose={() => setFilters({ session: '' }, { keepPage: true })}
        onCut={(session) => void cutFlow.start(session)}
        cutting={cutFlow.isPending}
        alert={cutFlow.alert}
      />
      {cutFlow.modal}
    </PageContainer>
  );
};
