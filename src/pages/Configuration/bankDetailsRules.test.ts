import { describe, expect, it } from 'vitest';
import { bankDetailsSchema, bankDetailsValues, isValidCbu, toBankDetailsBody } from './bankDetailsRules';

const VALID_CBU = '0170099220000067797370';
const empty = { cbu: '', alias: '', holder: '' };

describe('isValidCbu', () => {
  it('acepta un CBU con sus dígitos verificadores', () => {
    expect(isValidCbu(VALID_CBU)).toBe(true);
  });

  it('rechaza un dígito verificador incorrecto, el largo y los no numéricos', () => {
    expect(isValidCbu('0170099220000067797371')).toBe(false);
    expect(isValidCbu('0170099220000067797')).toBe(false);
    expect(isValidCbu('01700992200000677973ab')).toBe(false);
  });
});

describe('bankDetailsSchema', () => {
  it('acepta todo vacío: queda sin cargar', () => {
    expect(bankDetailsSchema.safeParse(empty).success).toBe(true);
  });

  it('acepta datos válidos', () => {
    expect(
      bankDetailsSchema.safeParse({ cbu: VALID_CBU, alias: 'garrafas.splg', holder: 'Distribuidora Demo' }).success,
    ).toBe(true);
  });

  it.each([
    ['cbu', '123', 'El CBU tiene 22 dígitos'],
    ['cbu', '0170099220000067797371', 'El CBU no es válido'],
    ['alias', 'corto', 'El alias lleva de 6 a 20'],
    ['alias', 'con espacio no', 'El alias lleva de 6 a 20'],
    ['holder', 'A', 'El titular lleva de 2 a 120'],
    ['holder', 'x'.repeat(121), 'El titular lleva de 2 a 120'],
  ])('rechaza %s = %s', (field, value, message) => {
    const result = bankDetailsSchema.safeParse({ ...empty, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });
});

describe('conversión con la API', () => {
  it('los null se muestran vacíos y lo vacío viaja como null', () => {
    expect(bankDetailsValues({ cbu: null, alias: 'a.b.c.d', holder: null } as never)).toEqual({
      cbu: '',
      alias: 'a.b.c.d',
      holder: '',
    });
    expect(toBankDetailsBody({ cbu: '', alias: ' alias.ok ', holder: '  ' })).toEqual({
      cbu: null,
      alias: 'alias.ok',
      holder: null,
    });
  });
});
