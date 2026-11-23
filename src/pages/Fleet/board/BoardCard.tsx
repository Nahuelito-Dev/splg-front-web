import AttachFile from '@mui/icons-material/AttachFile';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import Event from '@mui/icons-material/Event';
import type { DragEvent } from 'react';
import { cx, MoreActionsMenu, PersonAvatar, PhotoThumb, type MenuAction } from '../../../common/components/ui';
import type { FleetTaskBoardCard } from '../../../services/api/types';
import { formatCurrency, formatDay, formatNumber, formatScheduledDay } from '../../../utils/format';
import { BOARD_COLUMNS, columnLabel, type BoardColumnId } from './boardModel';

interface Props {
  card: FleetTaskBoardCard;
  column: BoardColumnId;
  canMove: boolean;
  dragging: boolean;
  /** Dónde se suelta una tarjeta arrastrada si se la deja sobre ésta (antes o después, según la mitad). */
  onDragOverCard: (event: DragEvent<HTMLLIElement>) => void;
  onDragStart: (card: FleetTaskBoardCard) => void;
  onDragEnd: () => void;
  onOpen: (card: FleetTaskBoardCard) => void;
  onMoveTo: (card: FleetTaskBoardCard, to: BoardColumnId) => void;
  onCancel: (card: FleetTaskBoardCard) => void;
}

const dueLabel = (card: FleetTaskBoardCard) => {
  const parts: string[] = [];
  if (card.dueAt) parts.push(formatDay(card.dueAt));
  if (card.dueKm !== null) parts.push(`${formatNumber(card.dueKm)} km`);
  return parts.length ? `Vence ${parts.join(' · ')}` : 'Sin vencimiento';
};

/** Tarjeta del tablero: título, vehículo, responsable, vencimiento (rojo si venció), turno, adjuntos y costo. */
export const BoardCard = ({
  card,
  column,
  canMove,
  dragging,
  onDragOverCard,
  onDragStart,
  onDragEnd,
  onOpen,
  onMoveTo,
  onCancel,
}: Props) => {
  const draggable = canMove && column !== 'done';
  const actions: MenuAction[] = [];
  if (canMove && column !== 'done') {
    for (const target of BOARD_COLUMNS)
      if (target.id !== column)
        actions.push({ label: `Mover a ${columnLabel(target.id)}`, onClick: () => onMoveTo(card, target.id) });
    actions.push({ label: 'Cancelar tarea', tone: 'danger', onClick: () => onCancel(card) });
  }

  return (
    <li
      draggable={draggable}
      data-card-id={card.id}
      onDragStart={(event) => {
        event.dataTransfer?.setData?.('text/plain', card.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        onDragStart(card);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cx(
        'rounded-xl border bg-surface p-3 shadow-card',
        card.isOverdue ? 'border-danger/40' : 'border-outline',
        draggable && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="min-w-0 flex-1 text-left text-[13px] font-semibold text-ink hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {card.title}
        </button>
        {actions.length > 0 && <MoreActionsMenu actions={actions} label={`Acciones de ${card.title}`} />}
      </div>
      {card.car && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-2">
          <PhotoThumb
            kind="car"
            id={card.car.id}
            url={card.car.photoUrl}
            size="sm"
            shape="square"
            fallback={<DirectionsCar aria-hidden="true" fontSize="inherit" className="text-muted" />}
          />
          <span className="truncate">{card.car.plate ? `${card.car.label} · ${card.car.plate}` : card.car.label}</span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-[11.5px] font-medium',
            card.isOverdue ? 'bg-danger-soft text-danger' : 'bg-surface-sunken text-ink-2',
          )}
        >
          {card.isOverdue ? `Vencida · ${dueLabel(card)}` : dueLabel(card)}
        </span>
        {card.scheduledAt && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-2 py-0.5 text-[11.5px] font-medium text-primary">
            <Event aria-hidden="true" fontSize="inherit" />
            Turno {formatScheduledDay(card.scheduledAt)}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-muted">
        {card.assignee ? (
          <span className="inline-flex min-w-0 items-center gap-1.5" title={card.assignee.name}>
            <PersonAvatar name={card.assignee.name} employeeId={card.assignee.employeeId} size="xs" decorative />
            <span className="truncate text-ink-2">{card.assignee.name}</span>
          </span>
        ) : (
          <span>Sin responsable</span>
        )}
        <span className="ml-auto inline-flex shrink-0 items-center gap-2">
          {card.attachmentsCount > 0 && (
            <span className="inline-flex items-center gap-0.5" aria-label={`${card.attachmentsCount} adjuntos`}>
              <AttachFile aria-hidden="true" fontSize="inherit" />
              {card.attachmentsCount}
            </span>
          )}
          {card.cost !== null && <span className="tabular-nums text-ink-2">{formatCurrency(card.cost)}</span>}
        </span>
      </div>
    </li>
  );
};
