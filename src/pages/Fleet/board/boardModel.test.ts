import { describe, expect, it } from 'vitest';
import { applyMove, findCard, moveBody } from './boardModel';
import { applyBoardEvent } from './useFleetTaskBoardEvents';
import { card, sampleBoard } from './boardFixtures';

describe('boardModel', () => {
  it('moveBody: soltar primero manda beforeId; en el medio o al final, afterId; con la precondición', () => {
    const board = sampleBoard();
    const f1 = board.columns.forecast[0];
    expect(moveBody(board, f1, 'scheduled', 0)).toEqual({
      to: 'scheduled',
      beforeId: 's1',
      expectedUpdatedAt: f1.updatedAt,
    });
    expect(moveBody(board, f1, 'scheduled', 1)).toMatchObject({ afterId: 's1' });
    expect(moveBody(board, f1, 'scheduled', 2)).toMatchObject({ afterId: 's2' });
    expect(moveBody(board, f1, 'in_progress', 9, '2026-12-02T10:00:00.000Z')).toMatchObject({
      afterId: 'i1',
      scheduledAt: '2026-12-02T10:00:00.000Z',
    });
  });

  it('moveBody: en la misma columna no se cuenta a sí misma', () => {
    const board = sampleBoard();
    expect(moveBody(board, board.columns.forecast[0], 'forecast', 2)).toMatchObject({ afterId: 'f2' });
  });

  it('applyMove: cambia de columna, borra el turno al volver a pronosticada', () => {
    const board = sampleBoard();
    const next = applyMove(board, 's1', 'forecast', 0);
    expect(next.columns.scheduled.map((c) => c.id)).toEqual(['s2']);
    expect(next.columns.forecast.map((c) => c.id)).toEqual(['s1', 'f1', 'f2']);
    expect(findCard(next, 's1')?.card.scheduledAt).toBeNull();
  });

  it('applyBoardEvent: ignora un evento más viejo y entra una tarjeta nueva', () => {
    const board = sampleBoard();
    const old = card({ id: 'f1', updatedAt: '2026-01-01T00:00:00.000Z' });
    expect(applyBoardEvent(board, { id: 'f1', change: 'updated', card: old }, {})).toBeNull();
    const created = card({ id: 'n1', title: 'Nueva' });
    const next = applyBoardEvent(board, { id: 'n1', change: 'created', card: created }, {});
    expect(next?.columns.forecast.map((c) => c.id)).toContain('n1');
    expect(applyBoardEvent(board, { id: 'n1', change: 'created', card: created }, { carId: 'otro' })).toBeNull();
  });

  it('applyBoardEvent: una cancelada sale del tablero y suma al contador', () => {
    const board = sampleBoard();
    const gone = card({ id: 'f2', column: null, status: 'cancelled', updatedAt: '2026-11-11T00:00:00.000Z' });
    const next = applyBoardEvent(board, { id: 'f2', change: 'cancelled', card: gone }, {});
    expect(findCard(next!, 'f2')).toBeNull();
    expect(next?.cancelledCount).toBe(2);
  });
});
