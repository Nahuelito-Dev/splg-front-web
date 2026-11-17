import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Modal,
  ReasonModal,
  SearchInput,
  Select,
} from '../../../common/components/ui';
import { useDebounce, usePermiso, usePermissions } from '../../../hooks';
import { toApiError } from '../../../services/api/errors';
import type { FleetTaskBoardCard } from '../../../services/api/types';
import { useCancelFleetTask, useFleetTask, useFleetTaskBoard, useMoveFleetTask } from '../../../services/queries/fleet';
import { useEmployees } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { FleetTaskCloseModal } from '../components/FleetTaskCloseModal';
import { FleetTaskFormModal } from '../components/FleetTaskFormModal';
import { useFleetOwners } from '../components/useFleetOwners';
import {
  applyMove,
  BOARD_COLUMNS,
  dropNeighbours,
  emptyBoard,
  findCard,
  moveBody,
  upsertCard,
  type BoardColumnId,
  type MoveTarget,
} from './boardModel';
import { ScheduleDialog } from './ScheduleDialog';
import { TaskBoard } from './TaskBoard';
import { useFleetTaskBoardEvents } from './useFleetTaskBoardEvents';

const EMPLOYEES_PAGE = { page: 0, pageSize: 100 };

/** Cerrar una tarea pide los datos del cierre: se abre el diálogo de siempre con la ficha completa. */
const CloseFromCard = ({ id, onClose }: { id: string | null; onClose: () => void }) => {
  const { data } = useFleetTask(id ?? undefined);
  return <FleetTaskCloseModal open={Boolean(id && data)} onClose={onClose} task={data ?? null} />;
};

/** El tablero de tareas de flota: filtros, alta, arrastre entre columnas con aviso del back y tiempo real. */
export const FleetTaskBoardView = () => {
  const navigate = useNavigate();
  const { needsDistributor, canWrite } = usePermissions();
  const gestionar = usePermiso('flota.gestionar');
  const canMove = canWrite && gestionar.allowed;
  const [carId, setCarId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const q = useDebounce(search.trim(), 300);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<{ card: FleetTaskBoardCard; index: number } | null>(null);
  const [cancelling, setCancelling] = useState<FleetTaskBoardCard | null>(null);
  const [pickingCar, setPickingCar] = useState(false);
  const [newCarId, setNewCarId] = useState('');
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const { cars } = useFleetOwners();
  const employees = useEmployees(EMPLOYEES_PAGE, { status: 'active' }, !needsDistributor);
  const filters = useMemo(
    () => ({ carId: carId || undefined, employeeId: employeeId || undefined, q: q || undefined }),
    [carId, employeeId, q],
  );
  const { data, isPending, error, refetch } = useFleetTaskBoard(filters, !needsDistributor);
  const move = useMoveFleetTask();
  const cancelTask = useCancelFleetTask();
  useFleetTaskBoardEvents(!needsDistributor);

  const board = useMemo(() => {
    const source = data ?? emptyBoard();
    if (!onlyOverdue) return source;
    const only = (cards: FleetTaskBoardCard[]) => cards.filter((card) => card.isOverdue);
    const { forecast, scheduled, in_progress, done } = source.columns;
    return {
      ...source,
      columns: {
        forecast: only(forecast),
        scheduled: only(scheduled),
        in_progress: only(in_progress),
        done: only(done),
      },
    };
  }, [data, onlyOverdue]);
  const visibleCards = BOARD_COLUMNS.flatMap(({ id }) => board.columns[id]).length;

  const runMove = (card: FleetTaskBoardCard, to: MoveTarget, index: number, scheduledAt?: string) => {
    if (move.isPending) return;
    move.mutate(
      {
        id: card.id,
        body: moveBody(board, card, to, index, scheduledAt),
        optimistic: (current) => applyMove(current, card.id, to, index, scheduledAt),
        settle: (current, saved) => upsertCard(current, saved),
      },
      { onError: (e) => notify.error(toApiError(e)), onSuccess: () => setScheduling(null) },
    );
  };

  const handleDrop = (card: FleetTaskBoardCard, to: BoardColumnId, index: number) => {
    if (!canMove || card.column === 'done') return;
    if (to === 'done') {
      setClosingId(card.id);
      return;
    }
    if (card.column === to) {
      const current = findCard(board, card.id)?.index;
      if (current === dropNeighbours(board, card.id, to, index).at) return;
    }
    if (to === 'scheduled' && card.column === 'forecast') {
      setScheduling({ card, index });
      return;
    }
    runMove(card, to, index);
  };

  const carOptions = [
    { value: '', label: 'Todos los vehículos' },
    ...(cars ?? []).map((car) => ({
      value: car.car_id,
      label: car.car_patent ? car.car_patent : (car.car_brand ?? 'Vehículo'),
    })),
  ];
  const employeeOptions = [
    { value: '', label: 'Todos los responsables' },
    ...(employees.data?.rows ?? []).map((e) => ({ value: e.employeeId, label: `${e.lastName}, ${e.firstName}` })),
  ];

  if (needsDistributor)
    return (
      <Card className="p-6">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver sus tareas."
        />
      </Card>
    );

  return (
    <Card>
      <div className="grid gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
        <SearchInput
          label="Buscar"
          className="self-end sm:!w-full"
          placeholder="Plan, patente, responsable…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select label="Vehículo" options={carOptions} value={carId} onChange={(e) => setCarId(e.target.value)} />
        <Select
          label="Responsable"
          options={employeeOptions}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <div className="self-end pb-2">
          <Checkbox label="Sólo vencidas" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
        </div>
        {canMove && (
          <div className="self-end">
            <Button onClick={() => setPickingCar(true)}>Nueva tarea</Button>
          </div>
        )}
      </div>

      {error && !data ? (
        <div className="p-4">
          <ErrorState error={error} resource="El tablero" onRetry={() => void refetch()} />
        </div>
      ) : isPending ? (
        <div className="p-4 text-sm text-muted" role="status">
          Cargando el tablero…
        </div>
      ) : (
        <>
          {visibleCards === 0 && (
            <p className="border-b border-outline px-4 py-3 text-sm text-muted">Ninguna tarea con estos filtros.</p>
          )}
          <TaskBoard
            board={board}
            canMove={canMove}
            onOpen={(card) => navigate(`/fleet/tasks/${card.id}`)}
            onDrop={handleDrop}
            onCancel={setCancelling}
          />
          {!canMove && (
            <p className="border-t border-outline px-4 py-3 text-xs text-muted">
              Sólo lectura: para mover o crear tareas hace falta el permiso «Gestionar la flota».
            </p>
          )}
          {board.cancelledCount > 0 && (
            <p className="border-t border-outline px-4 py-3 text-xs text-muted">
              {board.cancelledCount} tareas canceladas (no se muestran en el tablero).
            </p>
          )}
        </>
      )}

      <ScheduleDialog
        key={scheduling?.card.id ?? 'none'}
        open={Boolean(scheduling)}
        title={scheduling?.card.title ?? ''}
        busy={move.isPending}
        onClose={() => setScheduling(null)}
        onConfirm={(at) => scheduling && runMove(scheduling.card, 'scheduled', scheduling.index, at)}
      />
      <CloseFromCard id={closingId} onClose={() => setClosingId(null)} />
      <ReasonModal
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Cancelar la tarea"
        description={`Se cancela «${cancelling?.title ?? ''}». No se puede deshacer.`}
        confirmLabel="Cancelar tarea"
        danger
        loading={cancelTask.isPending}
        onConfirm={(notes) =>
          cancelling &&
          cancelTask.mutate(
            { id: cancelling.id, body: notes ? { notes } : {} },
            {
              onSuccess: () => {
                notify.success('Tarea cancelada');
                setCancelling(null);
              },
              onError: (e) => notify.error(toApiError(e)),
            },
          )
        }
      />
      <Modal
        open={pickingCar}
        onClose={() => setPickingCar(false)}
        size="sm"
        title="Nueva tarea"
        description="¿Para qué vehículo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickingCar(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newCarId}
              onClick={() => {
                setCreatingFor(newCarId);
                setPickingCar(false);
              }}
            >
              Continuar
            </Button>
          </>
        }
      >
        <Select
          label="Vehículo"
          options={[{ value: '', label: 'Elegí un vehículo' }, ...carOptions.slice(1)]}
          value={newCarId}
          onChange={(e) => setNewCarId(e.target.value)}
        />
      </Modal>
      <FleetTaskFormModal
        open={Boolean(creatingFor)}
        onClose={() => setCreatingFor(null)}
        subject="vehicle"
        ownerId={creatingFor ?? ''}
        carType={cars?.find((c) => c.car_id === creatingFor)?.type_car}
        task={null}
      />
    </Card>
  );
};
