import { describe, expect, it } from 'vitest';
import {
  WARNING_BEFORE_CLOSE_MESSAGE,
  conversationTimesSchema,
  inactivityErrorField,
  labelSchema,
  normalizeLabelName,
} from './labelSchemas';

const name = (value: string) => labelSchema.safeParse({ name: value, color: 'red' }).success;
const times = (over: Partial<Record<string, unknown>>) =>
  conversationTimesSchema.safeParse({
    expectedReplyEnabled: true,
    inactivityEnabled: true,
    closeMinutes: 60,
    warningEnabled: true,
    warningMinutes: 10,
    ...over,
  });

describe('reglas de las etiquetas (como el back)', () => {
  it('nombre de 1 a 30 letras en una línea, contando las letras y no UTF-16', () => {
    expect(name('Factura')).toBe(true);
    expect(name('   ')).toBe(false);
    expect(name('a'.repeat(30))).toBe(true);
    expect(name('a'.repeat(31))).toBe(false);
    expect(name('🔥'.repeat(30))).toBe(true);
    expect(name('Dos\nlíneas')).toBe(false);
    expect(normalizeLabelName('  Reclamo   de envío ')).toBe('Reclamo de envío');
  });

  it('sólo los colores de la paleta', () => {
    expect(labelSchema.safeParse({ name: 'x', color: 'cyan' }).success).toBe(false);
  });
});

describe('reglas de los plazos de inactividad (como el back)', () => {
  it('cierre de 30 a 10080 y aviso de 5 a 1440, menor que el cierre', () => {
    expect(times({}).success).toBe(true);
    expect(times({ closeMinutes: 29 }).success).toBe(false);
    expect(times({ closeMinutes: 10081 }).success).toBe(false);
    expect(times({ closeMinutes: 45.5 }).success).toBe(false);
    expect(times({ warningMinutes: 4 }).success).toBe(false);
    expect(times({ closeMinutes: 2000, warningMinutes: 1441 }).success).toBe(false);
    expect(times({ warningMinutes: 60 }).success).toBe(false);
    expect(times({ warningMinutes: 59 }).success).toBe(true);
  });

  it('lo apagado no se valida (los campos vacíos llegan como NaN)', () => {
    expect(times({ inactivityEnabled: false, closeMinutes: NaN, warningMinutes: NaN }).success).toBe(true);
    expect(times({ warningEnabled: false, warningMinutes: NaN }).success).toBe(true);
  });

  it('cada 400 del back va a su campo', () => {
    expect(inactivityErrorField('El aviso va de 5 minutos a 24 horas antes del cierre')).toBe('warningMinutes');
    expect(inactivityErrorField(WARNING_BEFORE_CLOSE_MESSAGE)).toBe('warningMinutes');
    expect(
      inactivityErrorField('Para avisar antes de cerrar, primero elegí en cuántos minutos se cierra la conversación'),
    ).toBe('closeMinutes');
    expect(inactivityErrorField('El cierre por inactividad va de 30 minutos a 7 días (10080 minutos)')).toBe(
      'closeMinutes',
    );
    expect(inactivityErrorField('property foo should not exist')).toBeNull();
    // El CHECK de la base habla del cierre y del aviso: no es de ninguno de los dos.
    expect(
      inactivityErrorField(
        'El cierre por inactividad va de 30 minutos a 7 días y el aviso, de 5 minutos a 24 horas antes del cierre',
      ),
    ).toBeNull();
    expect(inactivityErrorField('Cierre por inactividad (minutos): tiene que ser un número entero')).toBe(
      'closeMinutes',
    );
    expect(inactivityErrorField('Aviso antes del cierre (minutos): tiene que ser un número entero')).toBe(
      'warningMinutes',
    );
    expect(inactivityErrorField('Hubo un problema con el aviso')).toBeNull();
  });
});
