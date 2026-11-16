import { describe, expect, it } from 'vitest';
import {
  aiSourcesOf,
  csatRatingIdOf,
  csatResultText,
  customerActionOf,
  handoffNoteOf,
  inCatalogOrder,
  mentionQueryAt,
  splitMentions,
} from './messageExtras';

describe('fuentes de la respuesta del asistente (4d)', () => {
  it('nombra preguntas frecuentes y herramientas en castellano, con el número de pedido y sin repetir', () => {
    const payload = {
      senderLabel: 'Asistente de Gas Norte',
      ai: {
        model: 'm',
        sources: [
          { type: 'faq', faqId: 'f-1', question: '¿Hacen envíos los domingos?' },
          { type: 'tool', tool: 'precios_vigentes' },
          { type: 'tool', tool: 'estado_de_mi_pedido', orderNumber: 'A1B2C3' },
          { type: 'tool', tool: 'precios_vigentes' },
          { type: 'tool', tool: 'horarios_y_zonas' },
          { type: 'tool', tool: 'medios_de_pago' },
        ],
      },
    };
    expect(aiSourcesOf({ payload })).toEqual([
      'Pregunta frecuente «¿Hacen envíos los domingos?»',
      'Precios vigentes',
      'Estado del pedido #A1B2C3',
      'Horarios y zonas de entrega',
      'Medios de pago',
    ]);
  });

  it('nunca muestra una clave interna: una herramienta desconocida no se nombra; sin fuentes, nada', () => {
    expect(aiSourcesOf({ payload: { ai: { sources: [{ type: 'tool', tool: 'pasar_a_persona' }] } } })).toEqual([]);
    expect(aiSourcesOf({ payload: { ai: { model: 'm' } } })).toEqual([]);
    expect(aiSourcesOf({ payload: null })).toEqual([]);
    expect(aiSourcesOf({ payload: { ai: { sources: 'x' } } })).toEqual([]);
  });

  it('el estado del pedido sin número va sin «#»', () => {
    expect(aiSourcesOf({ payload: { ai: { sources: [{ type: 'tool', tool: 'estado_de_mi_pedido' }] } } })).toEqual([
      'Estado del pedido',
    ]);
  });
});

describe('nota del asistente al derivar (4c)', () => {
  it('lee el resumen y el motivo legible del `payload`', () => {
    expect(
      handoffNoteOf({
        systemCode: 'handoff_note',
        payload: {
          handoff: {
            reason: 'requested',
            reasonLabel: 'La persona pidió hablar con alguien',
            summary: 'Pide factura A.',
          },
        },
      }),
    ).toEqual({ summary: 'Pide factura A.', reason: 'La persona pidió hablar con alguien' });
  });

  it('sin resumen (el modelo no corrió) queda sólo el motivo; otro mensaje no es nota de derivación', () => {
    expect(
      handoffNoteOf({
        systemCode: 'handoff_note',
        payload: { handoff: { reasonLabel: 'Tope mensual', summary: null } },
      }),
    ).toEqual({ summary: null, reason: 'Tope mensual' });
    expect(handoffNoteOf({ systemCode: 'received_ack', payload: null })).toBeNull();
  });
});

describe('encuesta (4b)', () => {
  it('el pedido de calificación nombra su encuesta', () => {
    expect(csatRatingIdOf({ systemCode: 'csat_request', payload: { ratingId: 'r-1', scale: 5 } })).toBe('r-1');
    expect(csatRatingIdOf({ systemCode: 'closed_manual', payload: { ratingId: 'r-1' } })).toBeNull();
  });

  it('el resultado: «4 de 5» si respondió; si no, cómo quedó', () => {
    const base = {
      ratingId: 'r-1',
      comment: null,
      requestedAt: '2026-11-15T12:00:00.000Z',
      expiresAt: '2026-11-17T12:00:00.000Z',
      answeredAt: null,
    };
    expect(csatResultText({ ...base, status: 'answered', score: 4 })).toBe('4 de 5');
    expect(csatResultText({ ...base, status: 'expired', score: null })).toBe('Venció sin respuesta');
    expect(csatResultText({ ...base, status: 'cancelled', score: null })).toBe('Anulada: se reabrió la conversación');
  });
});

describe('botones del cliente (4e)', () => {
  it('marca el mensaje con el texto del botón si el `payload` lo indica (clave o `{ key }`)', () => {
    expect(customerActionOf({ payload: { action: 'talk_to_person' } })).toBe('Hablar con una persona');
    expect(customerActionOf({ payload: { action: { key: 'where_is_my_order' } } })).toBe('¿Dónde está mi pedido?');
    expect(customerActionOf({ payload: { action: 'otra_cosa' } })).toBeNull();
    expect(customerActionOf({ payload: null })).toBeNull();
  });

  it('las claves elegidas quedan en el orden del catálogo y sin repetir', () => {
    expect(inCatalogOrder(['talk_to_person', 'where_is_my_order', 'talk_to_person'])).toEqual([
      'where_is_my_order',
      'talk_to_person',
    ]);
  });
});

describe('menciones en las notas (4a)', () => {
  it('resalta `@Nombre Apellido` de los mencionados, el nombre más largo primero', () => {
    expect(
      splitMentions('@Ana María fijate con @Ana y @Beto Despacho.', ['Ana', 'Ana María', 'Beto Despacho']),
    ).toEqual([
      { kind: 'mention', text: '@Ana María' },
      { kind: 'text', text: ' fijate con ' },
      { kind: 'mention', text: '@Ana' },
      { kind: 'text', text: ' y ' },
      { kind: 'mention', text: '@Beto Despacho' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('una `@` de alguien no mencionado queda como texto', () => {
    expect(splitMentions('mail@ejemplo.com @Carla', ['Ana'])).toEqual([
      { kind: 'text', text: 'mail@ejemplo.com @Carla' },
    ]);
    expect(splitMentions('sin menciones', [])).toEqual([{ kind: 'text', text: 'sin menciones' }]);
  });

  it('detecta la `@` que se está escribiendo hasta el cursor', () => {
    expect(mentionQueryAt('hola @be', 8)).toEqual({ start: 5, query: 'be' });
    expect(mentionQueryAt('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQueryAt('mail@ejemplo', 12)).toBeNull();
    // Con espacios sigue (nombre y apellido): quien muestra la lista la cierra si nadie coincide.
    expect(mentionQueryAt('hola @beto des', 14)).toEqual({ start: 5, query: 'beto des' });
    expect(mentionQueryAt('@beto\nhola', 10)).toBeNull();
  });
});
