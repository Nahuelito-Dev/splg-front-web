import {
  CalendarOff,
  CalendarPlus,
  CheckCheck,
  Lock,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  DayFilter,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  Tabs,
  cx,
  tabPanelProps,
} from '../../common/components/ui';
import { usePermiso, usePermissions, useUrlParams } from '../../hooks';
import { toApiError } from '../../services/api/errors';
import { ROUTE_SHEET_CODES } from '../../services/api/routeSheets';
import type { ConfirmAll, RoutePlanDay, RoutePlanProposal } from '../../services/api/types';
import {
  useCloseRoutePlanDay,
  useConfirmAllRouteSheets,
  useOpenRoutePlanDay,
  useProposeRoutePlan,
  useRoutePlanDay,
  useRoutePlanningSettings,
} from '../../services/queries/routeSheets';
import { formatDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { ConfirmAllResultDialog } from './ConfirmAllResultDialog';
import { DriverView } from './DriverView';
import { HolidaysModal } from './HolidaysModal';
import { PlanView } from './PlanView';
import { ProposalDialog } from './ProposalDialog';
import { PLAN_STATUS, tomorrow } from './routeSheetLabels';
import { RouteSheetSettingsModal } from './RouteSheetSettingsModal';
import { SheetFormModal } from './SheetFormModal';
import { SheetView } from './SheetView';

type View = 'plan' | 'sheet' | 'driver';

const DISPATCH_PERMISSION = 'despacho.gestionar';
const NO_PERMISSION = 'Hace falta el permiso «Gestionar el despacho»';

const TABS = [
  { id: 'plan', label: 'Planificación del día' },
  { id: 'sheet', label: 'Detalle de la hoja' },
  { id: 'driver', label: 'Vista del chofer' },
];

const Chip = ({ icon, text, className }: { icon: ReactNode; text: string; className: string }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
      className,
    )}
  >
    {icon}
    {text}
  </span>
);

/**
 * Hojas de ruta (módulo inteligente): el sistema propone el reparto planificado del día, una hoja por chofer y
 * vehículo con las paradas ordenadas, y el administrador lo ajusta y lo confirma.
 */
export const RouteSheets = () => {
  const permissions = usePermissions();
  const { needsDistributor } = permissions;
  // Todo lo de la hoja de ruta (también leer) pide `despacho.gestionar` en la API.
  const despacho = usePermiso(DISPATCH_PERMISSION);
  const forbidden = despacho.known && !despacho.allowed;
  const canWrite = permissions.canWrite && despacho.allowed;
  const writeHint = permissions.writeHint ?? (despacho.allowed ? undefined : NO_PERMISSION);
  const [{ date: dateParam, view, sheet: sheetParam }, setParams] = useUrlParams({
    date: tomorrow(),
    view: 'plan',
    sheet: '',
  });
  // El día sale de la URL: sólo se acepta AAAA-MM-DD; cualquier otra cosa vuelve a mañana.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : tomorrow();
  const day = useRoutePlanDay(date, { enabled: !needsDistributor && despacho.allowed });
  const [configuring, setConfiguring] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [proposal, setProposal] = useState<RoutePlanProposal | null>(null);
  const [confirmAllResult, setConfirmAllResult] = useState<ConfirmAll | null>(null);
  const settings = useRoutePlanningSettings({ enabled: configuring && !needsDistributor && despacho.allowed });
  const open = useOpenRoutePlanDay();
  const propose = useProposeRoutePlan();
  const confirmAll = useConfirmAllRouteSheets();
  const close = useCloseRoutePlanDay();

  const notOpened = day.error ? toApiError(day.error).code === ROUTE_SHEET_CODES.planNotFound : false;
  const data: RoutePlanDay | undefined = day.data;
  const closed = data?.plan.status === 'closed';
  const drafts = data?.sheets.filter((s) => s.status === 'draft') ?? [];
  const sheetId = data?.sheets.some((s) => s.id === sheetParam) ? sheetParam : (data?.sheets[0]?.id ?? '');

  const openSheet = (id: string) => setParams({ view: 'sheet', sheet: id });

  const preview = () =>
    propose.mutate({ date, dryRun: true }, { onSuccess: setProposal, onError: (error) => notify.error(error) });

  const handleConfirmAll = async () => {
    const ok = await confirm({
      title: '¿Confirmar todas las hojas?',
      text: `Se confirman los ${drafts.length} borradores del día que cumplen las reglas; los que no, quedan como están y te decimos por qué.`,
      confirmText: 'Confirmar todas',
    });
    if (!ok) return;
    confirmAll.mutate(date, {
      onSuccess: (result) => {
        if (result.failed.length === 0) notify.success(`Quedaron confirmadas ${result.confirmed.length} hojas`);
        else setConfirmAllResult(result);
      },
      onError: (error) => notify.error(error),
    });
  };

  const handleClose = async () => {
    const ok = await confirm({
      title: '¿Cerrar el día?',
      text: 'Los borradores se descartan y sus pedidos vuelven a «Sin asignar». Las hojas confirmadas siguen. Un día cerrado no se vuelve a abrir.',
      confirmText: 'Cerrar el día',
      danger: true,
    });
    if (!ok) return;
    close.mutate(date, {
      onSuccess: () => notify.success('El día quedó cerrado'),
      onError: (error) => notify.error(error),
    });
  };

  const blocked = !canWrite ? writeHint : closed ? 'El día está cerrado' : !data ? 'Abrí el día primero' : undefined;

  return (
    <PageContainer size="xl" stack>
      <PageHeader
        title="Hojas de ruta"
        eyebrow={`Planificación del ${formatDay(date)}`}
        description="El sistema propone las hojas del día; el administrador las ajusta y las confirma."
        badges={
          <>
            <Chip
              icon={<Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
              text="Planificación inteligente"
              className="bg-primary-soft text-primary-strong"
            />
            {data && <Badge label={PLAN_STATUS[data.plan.status]} />}
          </>
        }
        actions={
          forbidden ? undefined : (
            <>
              <DayFilter
                label="Día del reparto"
                value={date}
                onChange={(next) => setParams({ date: next || tomorrow(), sheet: '' })}
                disabled={needsDistributor}
              />
              <Button
                icon={<Sparkles className="h-4 w-4" />}
                loading={propose.isPending}
                disabled={needsDistributor || Boolean(blocked)}
                title={blocked}
                onClick={preview}
              >
                Proponer
              </Button>
            </>
          )
        }
        secondaryActions={
          forbidden
            ? []
            : [
                {
                  label: 'Nueva hoja',
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => setCreating(true),
                  blockedReason: blocked,
                },
                {
                  label: 'Confirmar todas',
                  icon: <CheckCheck className="h-4 w-4" />,
                  onClick: () => void handleConfirmAll(),
                  blockedReason: blocked ?? (drafts.length === 0 ? 'No hay borradores' : undefined),
                },
                {
                  label: 'Parámetros',
                  icon: <SlidersHorizontal className="h-4 w-4" />,
                  onClick: () => setConfiguring(true),
                  blockedReason: needsDistributor ? writeHint : undefined,
                },
                {
                  label: 'Feriados',
                  icon: <CalendarOff className="h-4 w-4" />,
                  onClick: () => setHolidaysOpen(true),
                  blockedReason: needsDistributor ? writeHint : undefined,
                },
                {
                  label: 'Cerrar el día',
                  icon: <Lock className="h-4 w-4" />,
                  onClick: () => void handleClose(),
                  blockedReason: blocked,
                  tone: 'danger',
                },
              ]
        }
      />
      {forbidden ? (
        <Card className="p-6">
          <EmptyState
            icon={Waypoints}
            title="No tenés permiso para las hojas de ruta"
            description="Hace falta el permiso «Gestionar el despacho». Pedíselo a quien administra los roles del personal."
          />
        </Card>
      ) : needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            icon={Waypoints}
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para planificar sus hojas de ruta."
          />
        </Card>
      ) : day.isPending && !notOpened ? (
        <Card>
          <LoadingState label="Cargando el día…" />
        </Card>
      ) : notOpened ? (
        <Card className="p-6">
          <EmptyState
            icon={CalendarPlus}
            title="El día no está abierto"
            description="Abrilo para ver los pedidos programados, los choferes y los vehículos, y pedirle al sistema una propuesta. También se abre solo al cierre de la planificación."
            action={
              <Button
                icon={<CalendarPlus className="h-4 w-4" />}
                loading={open.isPending}
                disabled={!canWrite}
                title={writeHint}
                onClick={() =>
                  open.mutate(date, {
                    onSuccess: () => notify.success('Día abierto'),
                    onError: (error) => notify.error(error),
                  })
                }
              >
                Abrir el día
              </Button>
            }
          />
        </Card>
      ) : !data ? (
        <Card className="p-6">
          <ErrorState error={day.error} resource="El día" onRetry={() => void day.refetch()} />
        </Card>
      ) : (
        <Card>
          <Tabs
            items={TABS}
            value={view}
            onChange={(id) => setParams({ view: id as View })}
            label="Vistas de la hoja de ruta"
            idPrefix="route-sheets"
          />
          <div {...tabPanelProps('route-sheets', view)} className="p-4 md:p-5">
            {view === 'plan' && (
              <PlanView day={data} canWrite={canWrite && !closed} canDecide={canWrite} onOpen={openSheet} />
            )}
            {view === 'sheet' && <SheetView day={data} sheetId={sheetId} canWrite={canWrite} onPick={openSheet} />}
            {view === 'driver' && <DriverView day={data} sheetId={sheetId} onPick={openSheet} />}
          </div>
        </Card>
      )}
      {proposal && (
        <ProposalDialog
          proposal={proposal}
          day={data}
          applying={propose.isPending}
          onApply={() =>
            propose.mutate(
              { date, dryRun: false },
              {
                onSuccess: (done) => {
                  setProposal(null);
                  notify.success(
                    done.sheets.length === 0
                      ? 'La propuesta no armó hojas nuevas'
                      : `El sistema armó ${done.sheets.length} hoja(s) en borrador`,
                  );
                },
                onError: (error) => notify.error(error),
              },
            )
          }
          onClose={() => setProposal(null)}
        />
      )}
      {confirmAllResult && data && (
        <ConfirmAllResultDialog result={confirmAllResult} day={data} onClose={() => setConfirmAllResult(null)} />
      )}
      {creating && data && (
        <SheetFormModal
          day={data}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            openSheet(created.id);
          }}
        />
      )}
      {holidaysOpen && (
        <HolidaysModal canWrite={canWrite} writeHint={writeHint} onClose={() => setHolidaysOpen(false)} />
      )}
      {configuring && settings.data && (
        <RouteSheetSettingsModal
          config={settings.data}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setConfiguring(false)}
        />
      )}
    </PageContainer>
  );
};
