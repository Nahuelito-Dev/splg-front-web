import { describe, expect, it } from 'vitest';
import {
  DETAIL_FIELDS,
  detailFieldsOf,
  documentFormDefaults,
  documentFormSchema,
  isEmployeePlan,
} from './documentDetails';

describe('detalle de los documentos del personal', () => {
  it('cada tipo con detalle pide los campos que valida el back', () => {
    expect(detailFieldsOf('hazmat_driver_course').map((f) => f.key)).toEqual(['certificateNumber', 'issuer']);
    expect(detailFieldsOf('psychophysical').map((f) => f.key)).toEqual(['examDate']);
    expect(detailFieldsOf('art_coverage').map((f) => f.key)).toEqual(['insurer', 'policyNumber']);
    expect(Object.keys(DETAIL_FIELDS)).toHaveLength(3);
  });

  it('los demás tipos, o un plan sin tipo, no llevan detalle', () => {
    expect(detailFieldsOf('vtv')).toEqual([]);
    expect(detailFieldsOf(null)).toEqual([]);
  });

  it('sólo los planes de personal se cargan desde la ficha del empleado', () => {
    expect(isEmployeePlan({ subject: 'employee' })).toBe(true);
    expect(isEmployeePlan({ subject: 'driver' })).toBe(false);
    expect(isEmployeePlan({ subject: 'vehicle' })).toBe(false);
  });

  describe('esquema del formulario', () => {
    const schema = documentFormSchema('hazmat_driver_course');
    const valido = {
      dueAt: '2027-05-10',
      notes: '',
      details: { certificateNumber: '123/26', issuer: 'CNRT' },
    };

    it('acepta el documento completo', () => {
      expect(schema.safeParse(valido).success).toBe(true);
    });

    it('exige el vencimiento y cada campo del detalle, nombrándolo', () => {
      const sinVencimiento = schema.safeParse({ ...valido, dueAt: '' });
      expect(sinVencimiento.success).toBe(false);
      const sinEmisor = schema.safeParse({ ...valido, details: { certificateNumber: '1', issuer: '  ' } });
      expect(sinEmisor.success ? [] : sinEmisor.error.issues.map((i) => i.message)).toEqual(['Ingresá emisor']);
    });

    it('respeta el largo máximo del back', () => {
      const largo = schema.safeParse({ ...valido, details: { certificateNumber: 'x'.repeat(41), issuer: 'CNRT' } });
      expect(largo.success).toBe(false);
    });

    it('el psicofísico pide una fecha de examen', () => {
      const psico = documentFormSchema('psychophysical');
      expect(psico.safeParse({ dueAt: '2027-01-31', notes: '', details: { examDate: '' } }).success).toBe(false);
      expect(psico.safeParse({ dueAt: '2027-01-31', notes: '', details: { examDate: '2026-02-01' } }).success).toBe(
        true,
      );
    });

    it('un tipo sin detalle sólo pide el vencimiento', () => {
      expect(documentFormSchema('vtv').safeParse({ dueAt: '2027-01-31', notes: '', details: {} }).success).toBe(true);
    });
  });

  describe('valores iniciales', () => {
    it('al renovar arrastra los datos del documento anterior, pero no la fecha del examen', () => {
      expect(
        documentFormDefaults('hazmat_driver_course', {
          details: { certificateNumber: '123/26', issuer: 'CNRT' },
        }).details,
      ).toEqual({ certificateNumber: '123/26', issuer: 'CNRT' });
      expect(documentFormDefaults('psychophysical', { details: { examDate: '2025-02-01' } }).details).toEqual({
        examDate: '',
      });
    });

    it('sin documento anterior, todo vacío', () => {
      expect(documentFormDefaults('art_coverage', null)).toEqual({
        dueAt: '',
        notes: '',
        details: { insurer: '', policyNumber: '' },
      });
    });
  });
});
