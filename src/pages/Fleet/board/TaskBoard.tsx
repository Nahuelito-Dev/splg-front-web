import { useState, type DragEvent } from 'react';
import { cx, EmptyState } from '../../../common/components/ui';
import type { FleetTaskBoard, FleetTaskBoardCard } from '../../../services/api/types';
import { BoardCard } from './BoardCard';
import { BOARD_COLUMNS, columnLabel, type BoardColumnId } from './boardModel';

interface Props {
  board: FleetTaskBoard;
  canMove: boolean;
  onOpen: (card: FleetTaskBoardCard) => void;
  /** Soltar (o «Mover a…») una tarjeta en una columna, en la posición `index` de ella. */
  onDrop: (card: FleetTaskBoardCard, to: BoardColumnId, index: number) => void;
  onCancel: (card: FleetTaskBoardCard) => void;
}

interface Over {
  column: BoardColumnId;
  index: number;
}

/**
 * Las cuatro columnas. Se arrastra con el drag and drop del navegador; para teclado y celular cada tarjeta tiene
 * «Mover a…» en su menú. Desde «Hechas» no se arrastra (ya está cerrada) y a «Hechas» se llega por el cierre.
 */
export const TaskBoard = ({ board, canMove, onOpen, onDrop, onCancel }: Props) => {
  const [dragged, setDragged] = useState<FleetTaskBoardCard | null>(null);
  const [over, setOver] = useState<Over | null>(null);

  const end = () => {
    setDragged(null);
    setOver(null);
  };

  const overCard = (column: BoardColumnId, index: number) => (event: DragEvent<HTMLLIElement>) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setOver({ column, index: event.clientY > rect.top + rect.height / 2 ? index + 1 : index });
  };

  return (
    <div className="overflow-x-auto p-4" data-testid="task-board">
      <div className="flex min-w-max items-start gap-3">
        {BOARD_COLUMNS.map(({ id, label }) => {
          const cards = board.columns[id];
          const active = over?.column === id;
          return (
            <section
              key={id}
              aria-label={`Columna ${label}`}
              onDragOver={(event) => {
                if (!dragged) return;
                event.preventDefault();
                setOver({ column: id, index: cards.length });
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const target = over?.column === id ? over.index : cards.length;
                const card = dragged;
                end();
                if (card) onDrop(card, id, target);
              }}
              className={cx(
                'flex w-[272px] shrink-0 flex-col rounded-xl border bg-surface-sunken p-2.5 transition-colors',
                active ? 'border-primary bg-primary-soft' : 'border-outline',
              )}
            >
              <header className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-[13px] font-semibold text-ink">{label}</span>
                <span
                  className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted"
                  aria-label={`${cards.length} tareas`}
                >
                  {cards.length}
                </span>
              </header>
              {cards.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline">
                  <EmptyState compact title="Sin tareas" />
                </div>
              ) : (
                <ul className="space-y-2" aria-label={columnLabel(id)}>
                  {cards.map((card, index) => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      column={id}
                      canMove={canMove}
                      dragging={dragged?.id === card.id}
                      onDragOverCard={overCard(id, index)}
                      onDragStart={setDragged}
                      onDragEnd={end}
                      onOpen={onOpen}
                      onMoveTo={(c, to) => onDrop(c, to, board.columns[to].length)}
                      onCancel={onCancel}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
