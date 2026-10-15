import { describe, expect, it } from 'vitest';
import { dispatchSchema, hasDispatchErrors, toDispatchBody, validateDispatch } from './dispatchRules';

describe('validateDispatch', () => {
  it('acepta los valores por defecto', () => {
    expect(hasDispatchErrors(validateDispatch(['5', '10', '15', '20'], '30'))).toBe(false);
  });

  it('exige pasos estrictamente crecientes y marca el que se repite', () => {
    const errors = validateDispatch(['5', '5', '3'], '30');
    expect(errors.steps[0]).toBeUndefined();
    expect(errors.steps[1]).toMatch(/mayor que el paso anterior \(5 km\)/);
    expect(errors.steps[2]).toMatch(/mayor que el paso anterior \(5 km\)/);
  });

  it('cada paso entre 1 y 100 km', () => {
    const errors = validateDispatch(['0', '101'], '30');
    expect(errors.steps[0]).toMatch(/entre 1 y 100/);
    expect(errors.steps[1]).toMatch(/entre 1 y 100/);
  });

  it('un paso vacío o no numérico pide un número', () => {
    expect(validateDispatch([''], '30').steps[0]).toMatch(/número/);
    expect(validateDispatch(['abc'], '30').steps[0]).toMatch(/número/);
  });

  it('hasta 8 pasos', () => {
    const nine = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    expect(validateDispatch(nine, '30').list).toMatch(/máximo 8/);
    expect(validateDispatch(nine.slice(0, 8), '30').list).toBeUndefined();
  });

  it('al menos un paso', () => {
    expect(validateDispatch([], '30').list).toMatch(/al menos un paso/);
  });

  it('la ventana va de 10 a 300 s y es entera', () => {
    expect(validateDispatch(['5'], '9').ttl).toMatch(/entre 10 y 300/);
    expect(validateDispatch(['5'], '301').ttl).toMatch(/entre 10 y 300/);
    expect(validateDispatch(['5'], '10').ttl).toBeUndefined();
    expect(validateDispatch(['5'], '300').ttl).toBeUndefined();
    expect(validateDispatch(['5'], '12.5').ttl).toMatch(/entero/);
    expect(validateDispatch(['5'], '').ttl).toMatch(/entero/);
  });
});

describe('dispatchSchema', () => {
  const values = (steps: string[], ttl: string) => ({ steps: steps.map((value) => ({ value })), ttl });

  it('lleva cada mensaje al campo que corresponde', () => {
    const result = dispatchSchema.safeParse(values(['5', '5'], '5'));
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(['steps.1.value', 'ttl']);
  });

  it('acepta valores válidos', () => {
    expect(dispatchSchema.safeParse(values(['5', '10'], '30')).success).toBe(true);
  });

  it('el error de cantidad de pasos va en la lista', () => {
    const result = dispatchSchema.safeParse(values([], '30'));
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual(['steps']);
  });
});

describe('cuerpo', () => {
  it('arma el cuerpo completo con números', () => {
    expect(toDispatchBody({ steps: [{ value: '5' }, { value: '10.5' }], ttl: '45' })).toEqual({
      radiusStepsKm: [5, 10.5],
      offerTtlSeconds: 45,
    });
  });
});
