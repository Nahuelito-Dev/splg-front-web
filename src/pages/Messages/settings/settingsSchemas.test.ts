import { describe, expect, it } from 'vitest';
import { nextOpeningText } from '../../../features/chat/inbox/inboxLabels';
import { broadcastSchema, claimFromChatSchema, firstMessageSchema } from '../../../features/chat/inbox/inboxSchemas';
import {
  autoRepliesSchema,
  businessHoursSchema,
  keyFromTitle,
  templateSchema,
  unknownVariables,
} from './settingsSchemas';

const issues = (result: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`);

const hours = (
  days: { weekday: number; opensAt: string; closesAt: string }[],
  holidays = [] as { date: string; reason: string }[],
) => businessHoursSchema.safeParse({ timezone: 'America/Argentina/Buenos_Aires', days, holidays });

describe('horario de atención (las reglas de `domain/horario.ts`)', () => {
  it('acepta franjas bien escritas, también dos el mismo día sin solaparse', () => {
    expect(
      hours([
        { weekday: 1, opensAt: '09:00', closesAt: '13:00' },
        { weekday: 1, opensAt: '16:00', closesAt: '20:00' },
      ]).success,
    ).toBe(true);
  });

  it('rechaza cerrar antes de abrir, horas mal escritas y franjas que se solapan', () => {
    expect(issues(hours([{ weekday: 1, opensAt: '18:00', closesAt: '09:00' }]))).toEqual([
      'days.0.closesAt: Cierra antes de abrir',
    ]);
    expect(issues(hours([{ weekday: 1, opensAt: '9:00', closesAt: '18:00' }]))[0]).toMatch(/Hora como/);
    expect(
      issues(
        hours([
          { weekday: 2, opensAt: '09:00', closesAt: '13:00' },
          { weekday: 2, opensAt: '12:00', closesAt: '15:00' },
        ]),
      ),
    ).toEqual(['days.1.opensAt: Se solapa con otra franja del martes']);
  });

  it('días sin atención: fecha sin repetir y motivo de 2 a 120', () => {
    expect(
      issues(
        hours(
          [],
          [
            { date: '2026-12-25', reason: 'Navidad' },
            { date: '2026-12-25', reason: 'Otra vez' },
          ],
        ),
      ),
    ).toEqual(['holidays.1.date: Esa fecha ya está']);
    expect(issues(hours([], [{ date: '2026-12-25', reason: 'N' }]))[0]).toMatch(/al menos 2/);
    expect(issues(hours([], [{ date: '', reason: 'Navidad' }]))[0]).toMatch(/Elegí la fecha/);
  });
});

describe('respuestas automáticas y guardadas', () => {
  it('sólo las variables que entiende el back', () => {
    expect(unknownVariables('Hola {{cliente.nombre}}, {{pedido.numero}}')).toEqual([]);
    expect(unknownVariables('Hola {{cliente.apellido}}')).toEqual(['cliente.apellido']);
    const auto = autoRepliesSchema.safeParse({
      customerChatEnabled: true,
      assistantAiEnabled: false,
      assistantName: '',
      handoffMessage: '',
      outOfHoursEnabled: true,
      outOfHoursMessage: 'Volvemos {{horario.vuelta}}',
      ackEnabled: false,
      ackMessage: '',
      firstResponseTargetMinutes: 30,
    });
    expect(issues(auto)[0]).toMatch(/^outOfHoursMessage: Variable desconocida: \{\{horario.vuelta\}\}/);
  });

  it('el objetivo de primera respuesta va de 5 a 1440 minutos', () => {
    const base = {
      customerChatEnabled: true,
      assistantAiEnabled: false,
      assistantName: '',
      handoffMessage: '',
      outOfHoursEnabled: false,
      outOfHoursMessage: '',
      ackEnabled: false,
      ackMessage: '',
    };
    expect(autoRepliesSchema.safeParse({ ...base, firstResponseTargetMinutes: 4 }).success).toBe(false);
    expect(autoRepliesSchema.safeParse({ ...base, firstResponseTargetMinutes: 1441 }).success).toBe(false);
    expect(autoRepliesSchema.safeParse({ ...base, firstResponseTargetMinutes: 30 }).success).toBe(true);
  });

  it('el nombre del asistente: vacío o de 2 a 60 caracteres, en una línea y sólo con {{empresa.nombre}}', () => {
    const base = {
      customerChatEnabled: true,
      assistantAiEnabled: false,
      handoffMessage: '',
      outOfHoursEnabled: false,
      outOfHoursMessage: '',
      ackEnabled: false,
      ackMessage: '',
      firstResponseTargetMinutes: 30,
    };
    const name = (assistantName: string) => issues(autoRepliesSchema.safeParse({ ...base, assistantName }));
    expect(name('')).toEqual([]);
    expect(name('  Gasito  ')).toEqual([]);
    expect(name('Asistente de {{empresa.nombre}}')).toEqual([]);
    expect(name('G')).toEqual(['assistantName: El nombre tiene que tener entre 2 y 60 caracteres']);
    expect(name('a'.repeat(61))).toEqual(['assistantName: El nombre tiene que tener entre 2 y 60 caracteres']);
    // Como el back: un emoji es un carácter (60 con emojis entra).
    expect(name('🔥'.repeat(60))).toEqual([]);
    expect(name('Gas\tito')).toEqual(['assistantName: El nombre va en una sola línea']);
    expect(name('Gas\u2028ito')).toEqual(['assistantName: El nombre va en una sola línea']);
    expect(name('Hola {{cliente.nombre}}')).toEqual([
      'assistantName: En el nombre sólo va {{empresa.nombre}} (no {{cliente.nombre}})',
    ]);
  });

  it('el mensaje al pasar a una persona: hasta 500 y con las variables de siempre', () => {
    const base = {
      customerChatEnabled: true,
      assistantAiEnabled: false,
      assistantName: '',
      outOfHoursEnabled: false,
      outOfHoursMessage: '',
      ackEnabled: false,
      ackMessage: '',
      firstResponseTargetMinutes: 30,
    };
    const handoff = (handoffMessage: string) => issues(autoRepliesSchema.safeParse({ ...base, handoffMessage }));
    expect(handoff('Te paso con {{empresa.nombre}}, {{cliente.nombre}}')).toEqual([]);
    expect(handoff('x'.repeat(501))).toEqual(['handoffMessage: Hasta 500 caracteres']);
    expect(handoff('Te paso con {{equipo.nombre}}')[0]).toMatch(/^handoffMessage: Variable desconocida/);
  });

  it('las variables se reconocen como en el back (sin llaves adentro)', () => {
    expect(unknownVariables('Hola {{a{b}}')).toEqual([]);
    expect(unknownVariables('Hola {{ cliente.nombre }} y {{x}}')).toEqual(['x']);
  });

  it('un texto con su interruptor apagado no se valida (no traba «Guardar»)', () => {
    const base = {
      customerChatEnabled: true,
      assistantAiEnabled: false,
      assistantName: '',
      handoffMessage: '',
      outOfHoursMessage: 'Volvemos {{horario.vuelta}}',
      ackMessage: 'x'.repeat(501),
      firstResponseTargetMinutes: 30,
    };
    expect(issues(autoRepliesSchema.safeParse({ ...base, outOfHoursEnabled: false, ackEnabled: false }))).toEqual([]);
    expect(issues(autoRepliesSchema.safeParse({ ...base, outOfHoursEnabled: true, ackEnabled: true }))).toEqual([
      'outOfHoursMessage: Variable desconocida: {{horario.vuelta}}. Usá {{cliente.nombre}}, {{pedido.numero}}, {{empresa.nombre}}, {{horario.proximo}}',
      'ackMessage: Hasta 500 caracteres',
    ]);
  });

  it('el interruptor del asistente que contesta solo es un booleano (como el DTO: `null` o texto dan 400)', () => {
    const base = {
      customerChatEnabled: true,
      assistantName: '',
      handoffMessage: '',
      outOfHoursEnabled: false,
      outOfHoursMessage: '',
      ackEnabled: false,
      ackMessage: '',
      firstResponseTargetMinutes: 30,
    };
    expect(autoRepliesSchema.safeParse({ ...base, assistantAiEnabled: true }).success).toBe(true);
    expect(autoRepliesSchema.safeParse({ ...base, assistantAiEnabled: null }).success).toBe(false);
    expect(autoRepliesSchema.safeParse({ ...base, assistantAiEnabled: 'true' }).success).toBe(false);
  });

  it('el tope de los textos cuenta emojis como un carácter', () => {
    const base = {
      customerChatEnabled: true,
      assistantAiEnabled: false,
      assistantName: '',
      outOfHoursEnabled: false,
      outOfHoursMessage: '',
      ackEnabled: false,
      ackMessage: '',
      firstResponseTargetMinutes: 30,
    };
    expect(issues(autoRepliesSchema.safeParse({ ...base, handoffMessage: '🔥'.repeat(500) }))).toEqual([]);
    expect(issues(autoRepliesSchema.safeParse({ ...base, handoffMessage: '🔥'.repeat(501) }))).toEqual([
      'handoffMessage: Hasta 500 caracteres',
    ]);
  });

  it('la clave de una respuesta guardada: minúsculas, números y guiones bajos; sale del título', () => {
    const base = { title: 'Pedido en camino', body: 'Ya salió', channel: 'both' as const, active: true };
    expect(templateSchema.safeParse({ ...base, key: 'pedido_en_camino' }).success).toBe(true);
    expect(issues(templateSchema.safeParse({ ...base, key: 'Pedido-En' }))[0]).toMatch(/^key: Sólo minúsculas/);
    expect(keyFromTitle('¿Pedido en camino? ¡Sí!')).toBe('pedido_en_camino_si');
  });
});

describe('formularios de la bandeja (las reglas de los DTO)', () => {
  it('avisar a varios choferes: 1 a 50 y un texto', () => {
    expect(issues(broadcastSchema.safeParse({ driverIds: [], body: 'hola' }))).toEqual([
      'driverIds: Elegí al menos un chofer',
    ]);
    const many = Array.from({ length: 51 }, (_, i) => `d-${i}`);
    expect(issues(broadcastSchema.safeParse({ driverIds: many, body: 'hola' }))[0]).toMatch(/50 choferes/);
    expect(issues(broadcastSchema.safeParse({ driverIds: ['d'], body: '   ' }))).toEqual(['body: Escribí el aviso']);
  });

  it('el primer mensaje: no vacío y hasta 2000', () => {
    expect(firstMessageSchema.safeParse({ body: '  ' }).success).toBe(false);
    expect(firstMessageSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
    expect(firstMessageSchema.safeParse({ body: 'hola' }).success).toBe(true);
  });

  it('reclamo desde el hilo: motivo hasta 120, descripción hasta 1000; en una general, el pedido', () => {
    const ok = { reason: 'Pérdida', description: 'La garrafa pierde', orderId: 'o-1' };
    expect(claimFromChatSchema(true).safeParse(ok).success).toBe(true);
    expect(issues(claimFromChatSchema(true).safeParse({ ...ok, orderId: '' }))).toEqual([
      'orderId: Elegí el pedido reclamado',
    ]);
    expect(claimFromChatSchema(false).safeParse({ ...ok, orderId: undefined }).success).toBe(true);
    expect(claimFromChatSchema(false).safeParse({ ...ok, reason: 'x'.repeat(121) }).success).toBe(false);
    expect(claimFromChatSchema(false).safeParse({ ...ok, description: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('`{{horario.proximo}}` como lo escribe el back', () => {
  const now = new Date('2026-11-15T15:00:00.000Z'); // domingo 12:00 en Argentina
  it('ahora, hoy, mañana o el día', () => {
    expect(nextOpeningText(true, null, now)).toBe('ahora');
    expect(nextOpeningText(false, '2026-11-15T20:00:00.000Z', now)).toBe('hoy a las 17:00');
    expect(nextOpeningText(false, '2026-11-16T12:00:00.000Z', now)).toBe('mañana a las 09:00');
    expect(nextOpeningText(false, '2026-11-18T12:30:00.000Z', now)).toBe('el miércoles 18/11 a las 09:30');
    expect(nextOpeningText(false, null, now)).toBeNull();
  });
});
