import { describe, expect, it } from 'vitest';
import { employeeEditSchema, employeeSchema, isValidCuil } from './employeeSchema';

const valid = {
  firstName: 'Ana',
  lastName: 'Pérez',
  positionId: 'p1',
  documentType: 'dni',
  documentNumber: '30123456',
  hireDate: '2026-03-01',
  employmentType: 'permanent',
  fileNumber: '',
  cuil: '',
  birthDate: '',
  phone: '',
  personalEmail: '',
  addressLine: '',
  city: '',
  province: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  notes: '',
};

describe('employeeSchema', () => {
  it('acepta un legajo con sólo lo obligatorio', () => {
    expect(employeeSchema.safeParse(valid).success).toBe(true);
  });
  it('exige nombre, puesto y fecha de ingreso', () => {
    const result = employeeSchema.safeParse({ ...valid, firstName: ' ', positionId: '', hireDate: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['firstName', 'positionId', 'hireDate']);
  });
  it('pide un CUIL de once dígitos', () => {
    expect(employeeSchema.safeParse({ ...valid, cuil: '20-1234' }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...valid, cuil: '20123456786' }).success).toBe(true);
  });
  it('rechaza un CUIL con el dígito verificador o el prefijo mal, como el back', () => {
    expect(employeeSchema.safeParse({ ...valid, cuil: '20123456780' }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...valid, cuil: '30123456786' }).success).toBe(false);
    expect(isValidCuil('20123456786')).toBe(true);
  });
  it('las fechas tienen que existir (el back las valida estricto)', () => {
    expect(employeeSchema.safeParse({ ...valid, hireDate: '2026-02-30' }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...valid, birthDate: '1990-13-01' }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...valid, birthDate: '1990-05-17' }).success).toBe(true);
  });
  it('las notas admiten hasta 2000 caracteres, como el DTO', () => {
    expect(employeeSchema.safeParse({ ...valid, notes: 'a'.repeat(2000) }).success).toBe(true);
    expect(employeeSchema.safeParse({ ...valid, notes: 'a'.repeat(2001) }).success).toBe(false);
  });
  it('al editar exige el número de legajo, al crear no', () => {
    expect(employeeSchema.safeParse(valid).success).toBe(true);
    const result = employeeEditSchema.safeParse(valid);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/número de legajo/);
    expect(employeeEditSchema.safeParse({ ...valid, fileNumber: '0042' }).success).toBe(true);
  });
});
