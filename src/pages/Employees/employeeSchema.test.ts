import { describe, expect, it } from 'vitest';
import { employeeEditSchema, employeeSchema } from './employeeSchema';

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
  it('al editar exige el número de legajo, al crear no', () => {
    expect(employeeSchema.safeParse(valid).success).toBe(true);
    const result = employeeEditSchema.safeParse(valid);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/número de legajo/);
    expect(employeeEditSchema.safeParse({ ...valid, fileNumber: '0042' }).success).toBe(true);
  });
});
