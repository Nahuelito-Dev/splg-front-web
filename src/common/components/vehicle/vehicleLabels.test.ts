import { describe, expect, it } from 'vitest';
import { clockTime, loadText, loadTone, minutesUntil, remainingText, vehicleName } from './vehicleLabels';

const NOW = new Date('2026-11-21T16:00:00.000Z').getTime();

describe('vehicleLabels', () => {
  it('tiempo restante: minutos, horas, llegando, demorado y sin hora', () => {
    expect(remainingText('2026-11-21T16:57:00.000Z', NOW)).toBe('Faltan 57 min');
    expect(remainingText('2026-11-21T17:20:00.000Z', NOW)).toBe('Faltan 1 h 20 min');
    expect(remainingText('2026-11-21T18:00:00.000Z', NOW)).toBe('Faltan 2 h');
    expect(remainingText('2026-11-21T16:00:10.000Z', NOW)).toBe('Llegando');
    expect(remainingText('2026-11-21T15:48:00.000Z', NOW)).toBe('Demorado 12 min');
    expect(remainingText(null, NOW)).toBeNull();
    expect(minutesUntil(undefined, NOW)).toBeNull();
  });

  it('el tono de la carga avisa arriba del 85 % y se pone en rojo pasado el 100 %', () => {
    expect(loadTone(null)).toBe('neutral');
    expect(loadTone(85)).toBe('primary');
    expect(loadTone(86)).toBe('warn');
    expect(loadTone(100)).toBe('warn');
    expect(loadTone(101)).toBe('danger');
  });

  it('el texto de la carga dice la capacidad sólo si el vehículo la tiene', () => {
    expect(loadText({ unitsOnBoard: 32, capacityUnits: 40 })).toBe('32 de 40 envases');
    expect(loadText({ unitsOnBoard: 1, capacityUnits: null })).toBe('1 envase a bordo');
    expect(loadText({ unitsOnBoard: 5, capacityUnits: null })).toBe('5 envases a bordo');
  });

  it('la hora es la argentina en 24 h y la patente que falta se dice', () => {
    expect(clockTime('2026-11-21T16:05:00.000Z')).toBe('13:05');
    expect(clockTime(null)).toBe('—');
    expect(vehicleName(null)).toBe('Sin patente');
    expect(vehicleName('AB104EJ')).toBe('AB104EJ');
  });
});
