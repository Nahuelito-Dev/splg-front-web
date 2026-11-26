import { describe, expect, it } from 'vitest';
import { dispatchSchema, hasDispatchErrors, toDispatchBody, toDispatchValues, validateDispatch } from './dispatchRules';

describe('validateDispatch', () => {
  it('acepta los valores por defecto', () => {
    expect(hasDispatchErrors(validateDispatch(['5', '10', '15', '20'], '30', '300', '120', '150'))).toBe(false);
  });

  it('exige pasos estrictamente crecientes y marca el que se repite', () => {
    const errors = validateDispatch(['5', '5', '3'], '30', '300', '120', '150');
    expect(errors.steps[0]).toBeUndefined();
    expect(errors.steps[1]).toMatch(/mayor que el paso anterior \(5 km\)/);
    expect(errors.steps[2]).toMatch(/mayor que el paso anterior \(5 km\)/);
  });

  it('cada paso entre 1 y 100 km', () => {
    const errors = validateDispatch(['0', '101'], '30', '300', '120', '150');
    expect(errors.steps[0]).toMatch(/entre 1 y 100/);
    expect(errors.steps[1]).toMatch(/entre 1 y 100/);
  });

  it('un paso vacío o no numérico pide un número', () => {
    expect(validateDispatch([''], '30', '300', '120', '150').steps[0]).toMatch(/número/);
    expect(validateDispatch(['abc'], '30', '300', '120', '150').steps[0]).toMatch(/número/);
  });

  it('hasta 8 pasos', () => {
    const nine = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    expect(validateDispatch(nine, '30', '300', '120', '150').list).toMatch(/máximo 8/);
    expect(validateDispatch(nine.slice(0, 8), '30', '300', '120', '150').list).toBeUndefined();
  });

  it('al menos un paso', () => {
    expect(validateDispatch([], '30', '300', '120', '150').list).toMatch(/al menos un paso/);
  });

  it('la ventana va de 10 a 300 s y es entera', () => {
    expect(validateDispatch(['5'], '9', '300', '120', '150').ttl).toMatch(/entre 10 y 300/);
    expect(validateDispatch(['5'], '301', '300', '120', '150').ttl).toMatch(/entre 10 y 300/);
    expect(validateDispatch(['5'], '10', '300', '120', '150').ttl).toBeUndefined();
    expect(validateDispatch(['5'], '300', '300', '120', '150').ttl).toBeUndefined();
    expect(validateDispatch(['5'], '12.5', '300', '120', '150').ttl).toMatch(/entero/);
    expect(validateDispatch(['5'], '', '300', '120', '150').ttl).toMatch(/entero/);
  });
});

describe('radio de por terminar', () => {
  const finishing = (raw: string) => validateDispatch(['5'], '30', raw, '120', '150').finishing;

  it('va de 0 (apagado) a 5000 m y es entero', () => {
    expect(finishing('0')).toBeUndefined();
    expect(finishing('300')).toBeUndefined();
    expect(finishing('5000')).toBeUndefined();
    expect(finishing('-1')).toMatch(/entre 0 y 5000/);
    expect(finishing('5001')).toMatch(/entre 0 y 5000/);
    expect(finishing('10.5')).toMatch(/entero/);
    expect(finishing('')).toMatch(/entero/);
  });

  it('el esquema lleva el error al campo', () => {
    const result = dispatchSchema.safeParse({
      steps: [{ value: '5' }],
      ttl: '30',
      finishing: '-3',
      expiry: '120',
      arrival: '150',
      osrm: '8',
    });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual(['finishing']);
  });
});

describe('vencimiento de pedidos sin chofer', () => {
  const expiry = (raw: string) => validateDispatch(['5'], '30', '300', raw, '150').expiry;

  it('va de 1 a 1440 minutos y es entero', () => {
    expect(expiry('1')).toBeUndefined();
    expect(expiry('1440')).toBeUndefined();
    expect(expiry('0')).toMatch(/entre 1 y 1440 minutos/);
    expect(expiry('1441')).toMatch(/entre 1 y 1440 minutos/);
    expect(expiry('30.5')).toMatch(/entero/);
    expect(expiry('')).toMatch(/entero/);
  });
});

describe('radio para marcar «Llegué»', () => {
  const arrival = (raw: string) => validateDispatch(['5'], '30', '300', '120', raw).arrival;

  it('va de 0 (sin control) a 5000 m y es entero', () => {
    expect(arrival('0')).toBeUndefined();
    expect(arrival('5000')).toBeUndefined();
    expect(arrival('-1')).toMatch(/entre 0 y 5000 metros/);
    expect(arrival('5001')).toMatch(/entre 0 y 5000 metros/);
    expect(arrival('10.5')).toMatch(/entero/);
  });

  const osrm = (raw: string) => validateDispatch(['5'], '30', '300', '120', '150', raw).osrm;

  it('choferes a medir por calle: entero de 1 a 20', () => {
    expect(osrm('1')).toBeUndefined();
    expect(osrm('20')).toBeUndefined();
    expect(osrm('0')).toMatch(/entre 1 y 20 choferes/);
    expect(osrm('21')).toMatch(/entre 1 y 20 choferes/);
    expect(osrm('2.5')).toMatch(/entero/);
    expect(osrm('')).toMatch(/entero/);
  });

  it('el esquema lleva cada error a su campo', () => {
    const result = dispatchSchema.safeParse({
      steps: [{ value: '5' }],
      ttl: '30',
      finishing: '300',
      expiry: '0',
      arrival: '6000',
      osrm: '8',
    });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual([
      'expiry',
      'arrival',
    ]);
  });
});

describe('valores del formulario', () => {
  const base = {
    radiusStepsKm: [5],
    offerTtlSeconds: 30,
    finishingRadiusMeters: 300,
    osrmCandidateCount: 12,
    isDefault: true,
    updatedAt: null,
    updatedByUserId: null,
  };

  it('toma los campos nuevos del GET', () => {
    expect(toDispatchValues({ ...base, noDriverExpiryMinutes: 45, arrivalRadiusMeters: 0 })).toMatchObject({
      expiry: '45',
      arrival: '0',
      osrm: '12',
    });
  });
});

describe('dispatchSchema', () => {
  const values = (steps: string[], ttl: string, finishing = '300') => ({
    steps: steps.map((value) => ({ value })),
    ttl,
    finishing,
    expiry: '120',
    arrival: '150',
    osrm: '8',
  });

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
    expect(
      toDispatchBody({
        steps: [{ value: '5' }, { value: '10.5' }],
        ttl: '45',
        finishing: '150',
        expiry: '90',
        arrival: '0',
        osrm: '3',
      }),
    ).toEqual({
      radiusStepsKm: [5, 10.5],
      offerTtlSeconds: 45,
      finishingRadiusMeters: 150,
      noDriverExpiryMinutes: 90,
      arrivalRadiusMeters: 0,
      osrmCandidateCount: 3,
    });
  });
});
