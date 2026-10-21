import { describe, expect, it } from 'vitest';
import { sessionDifference } from './cashSessionDifference';

describe('sessionDifference (arqueo, CU-227)', () => {
  it('negativa es faltante', () => {
    expect(sessionDifference(-250)).toEqual({ text: 'Faltante', tone: 'danger' });
  });
  it('positiva es sobrante', () => {
    expect(sessionDifference(100)).toEqual({ text: 'Sobrante', tone: 'warn' });
  });
  it('cero cuadra', () => {
    expect(sessionDifference(0)).toEqual({ text: 'Cuadra', tone: 'success' });
  });
  it('una sesión abierta no tiene arqueo', () => {
    expect(sessionDifference(null)).toEqual({ text: '—', tone: 'neutral' });
  });
});
