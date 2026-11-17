import type { FleetTaskBoard, FleetTaskBoardCard } from '../../../services/api/types';

export const card = (over: Partial<FleetTaskBoardCard> & { id: string }): FleetTaskBoardCard => ({
  title: `Tarea ${over.id}`,
  category: 'generic',
  status: 'forecast',
  column: 'forecast',
  isOverdue: false,
  dueAt: '2026-12-01T00:00:00.000Z',
  dueKm: null,
  scheduledAt: null,
  car: { id: 'car-1', plate: 'AB123CD', label: 'Ford Cargo' },
  assignee: { employeeId: 'e-1', name: 'Pérez, Juan' },
  attachmentsCount: 0,
  cost: null,
  position: 1024,
  updatedAt: '2026-11-10T10:00:00.000Z',
  ...over,
});

export const sampleBoard = (): FleetTaskBoard => ({
  columns: {
    forecast: [
      card({ id: 'f1', title: 'VTV', position: 1024, isOverdue: true, attachmentsCount: 2, cost: 185000 }),
      card({ id: 'f2', title: 'Seguro', position: 2048 }),
    ],
    scheduled: [
      card({
        id: 's1',
        title: 'Service',
        status: 'scheduled',
        column: 'scheduled',
        position: 1024,
        scheduledAt: '2026-11-20T15:00:00.000Z',
      }),
      card({ id: 's2', title: 'Frenos', status: 'scheduled', column: 'scheduled', position: 2048 }),
    ],
    in_progress: [card({ id: 'i1', title: 'Cubiertas', status: 'in_progress', column: 'in_progress' })],
    done: [card({ id: 'd1', title: 'Patente', status: 'done', column: 'done' })],
  },
  cancelledCount: 1,
});
