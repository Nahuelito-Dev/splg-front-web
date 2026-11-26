import { describe, expect, it } from 'vitest';
import type { FailedVisit, FailedVisitOrder, RevisitDay } from '../../services/api/types';
import {
  canScheduleRevisit,
  distanceText,
  isClosedOrder,
  revisitBadge,
  orderRevisitWhen,
  proposalText,
  resolutionText,
  revisitWhen,
  slotOptions,
  weekdayDay,
} from './revisit';

const order = (over: Partial<FailedVisitOrder>): FailedVisitOrder =>
  ({
    orderStatus: 'pending',
    revisitStatus: 'proposed',
    scheduledDate: '2026-11-26',
    timeSlotName: 'Mañana',
    windowStart: '09:00:00',
    windowEnd: '13:00:00',
    ...over,
  }) as FailedVisitOrder;

const visit = (over: Partial<FailedVisit>): FailedVisit =>
  ({ proposedDate: null, proposedTimeSlotName: null, resolution: null, finalDate: null, ...over }) as FailedVisit;

describe('nueva visita: textos', () => {
  it('el día con su día de la semana', () => {
    expect(weekdayDay('2026-11-26')).toMatch(/^jueves 26/);
    expect(weekdayDay('no-es-fecha')).toBe('no-es-fecha');
  });

  it('día, franja y horario; sin franja, sólo el día; sin día, nada', () => {
    expect(revisitWhen(order({}))).toMatch(/^jueves 26 .* · Mañana \(09:00 a 13:00\)$/);
    expect(revisitWhen(order({ timeSlotName: null }))).toMatch(/· 09:00 a 13:00$/);
    expect(revisitWhen(order({ windowStart: null, windowEnd: null }))).toMatch(/^jueves 26/);
    expect(revisitWhen(order({ scheduledDate: null }))).toBeNull();
  });

  it('con la decisión en el admin el listado no muestra fecha', () => {
    expect(orderRevisitWhen(order({ revisitStatus: 'awaiting_admin' }))).toBeNull();
    expect(orderRevisitWhen(order({}))).not.toBeNull();
  });

  it('la distancia al domicilio, redondeada; sin ubicación, nada', () => {
    expect(distanceText(34.6)).toBe('a 35 m del domicilio');
    expect(distanceText(null)).toBeNull();
  });

  it('lo propuesto y cómo se resolvió', () => {
    expect(proposalText(visit({}))).toBeNull();
    expect(proposalText(visit({ proposedDate: '2026-11-26', proposedTimeSlotName: 'Tarde' }))).toMatch(
      /^jueves 26 .* · Tarde$/,
    );
    expect(resolutionText(visit({}))).toBeNull();
    expect(resolutionText(visit({ resolution: 'customer_accepted' }))).toBe('El cliente aceptó');
    expect(
      resolutionText(visit({ resolution: 'customer_changed', finalDate: '2026-11-27', finalTimeSlotName: 'Tarde' })),
    ).toMatch(/^El cliente eligió viernes 27 .* · Tarde$/);
    expect(resolutionText(visit({ resolution: 'admin_set', finalDate: '2026-11-27' }))).toMatch(
      /^La distribuidora fijó viernes 27/,
    );
  });
});

describe('nueva visita: reglas del panel', () => {
  it('se fija sólo con el pedido pendiente y una nueva visita abierta', () => {
    expect(canScheduleRevisit(order({}))).toBe(true);
    expect(canScheduleRevisit(order({ revisitStatus: 'awaiting_admin' }))).toBe(true);
    expect(canScheduleRevisit(order({ orderStatus: 'delivered' }))).toBe(false);
    expect(canScheduleRevisit(order({ revisitStatus: null }))).toBe(false);
  });

  it('las franjas del día elegido, con los lugares que quedan', () => {
    const days = [
      {
        date: '2026-11-26',
        slots: [
          { timeSlotId: 'm', name: 'Mañana', startTime: '09:00:00', endTime: '13:00:00', remaining: 1 },
          { timeSlotId: 't', name: 'Tarde', startTime: '14:00:00', endTime: '18:00:00', remaining: 7 },
        ],
      },
    ] as RevisitDay[];
    expect(slotOptions(days, '2026-11-26')).toEqual([
      { value: 'm', label: 'Mañana · 09:00 a 13:00 (1 lugar)' },
      { value: 't', label: 'Tarde · 14:00 a 18:00 (7 lugares)' },
    ]);
    expect(slotOptions(days, '2026-11-27')).toEqual([]);
  });
});

describe('revisitBadge', () => {
  it('con el pedido cerrado manda el estado del pedido, en tono neutro; abierto, el de la nueva visita', () => {
    expect(revisitBadge({ orderStatus: 'cancelled', revisitStatus: 'confirmed' })).toEqual({
      text: 'Pedido cancelado',
      tone: 'neutral',
    });
    expect(revisitBadge({ orderStatus: 'delivered', revisitStatus: 'confirmed' })).toEqual({
      text: 'Entregado',
      tone: 'neutral',
    });
    expect(revisitBadge({ orderStatus: 'pending', revisitStatus: 'confirmed' })).toEqual({
      text: 'Confirmada',
      tone: 'success',
    });
    expect(revisitBadge({ orderStatus: 'pending', revisitStatus: null })).toBeNull();
    expect(isClosedOrder({ orderStatus: 'cancelled' })).toBe(true);
    expect(isClosedOrder({ orderStatus: 'pending' })).toBe(false);
  });
});
