import { describe, expect, it } from 'vitest';
import { isModuleOff } from '../../../services/queries/modules';
import { moduleChangeSchema, moduleSource, moduleUsage, overrideFor, toModuleBody } from './moduleRules';

describe('moduleChangeSchema (las reglas de SetCompanyModuleDto)', () => {
  it('el motivo va recortado y entre 10 y 300 caracteres', () => {
    expect(moduleChangeSchema.safeParse({ reason: '  123456789  ', expiresOn: '' }).success).toBe(false);
    expect(moduleChangeSchema.parse({ reason: '  1234567890  ', expiresOn: '' }).reason).toBe('1234567890');
    expect(moduleChangeSchema.safeParse({ reason: 'x'.repeat(301), expiresOn: '' }).success).toBe(false);
    expect(moduleChangeSchema.safeParse({ reason: 'x'.repeat(300), expiresOn: '' }).success).toBe(true);
  });

  it('el vencimiento es opcional y, si va, no puede haber pasado', () => {
    expect(moduleChangeSchema.safeParse({ reason: 'Un motivo válido', expiresOn: '2020-01-01' }).success).toBe(false);
    expect(moduleChangeSchema.safeParse({ reason: 'Un motivo válido', expiresOn: '2099-01-01' }).success).toBe(true);
  });
});

describe('qué se manda al mover el interruptor', () => {
  it('lo mismo que trae el plan vuelve al plan (null); lo contrario es una excepción', () => {
    expect(overrideFor({ inPlan: true }, true)).toBeNull();
    expect(overrideFor({ inPlan: true }, false)).toBe(false);
    expect(overrideFor({ inPlan: false }, true)).toBe(true);
    expect(overrideFor({ inPlan: false }, false)).toBeNull();
  });

  it('el vencimiento sólo viaja con una excepción', () => {
    const values = { reason: 'Un motivo válido', expiresOn: '2099-01-01' };
    expect(toModuleBody({ inPlan: true }, true, values)).toEqual({ enabled: null, reason: 'Un motivo válido' });
    expect(toModuleBody({ inPlan: false }, true, values)).toEqual({
      enabled: true,
      reason: 'Un motivo válido',
      expiresAt: '2099-01-01T23:59:59-03:00',
    });
  });
});

describe('etiquetas', () => {
  it('de dónde sale el estado', () => {
    expect(moduleSource({ inPlan: true, override: null }).text).toBe('Incluido en el plan');
    expect(moduleSource({ inPlan: false, override: null }).text).toBe('Fuera del plan');
    expect(moduleSource({ inPlan: true, override: { enabled: false, reason: 'x', expiresAt: null } }).text).toBe(
      'Excepción: deshabilitado',
    );
  });

  it('cómo lo usa la empresa', () => {
    expect(moduleUsage({ enabled: true, companySwitch: true, effective: true }).text).toBe('En uso');
    expect(moduleUsage({ enabled: true, companySwitch: false, effective: false }).text).toBe('Apagado por la empresa');
    expect(moduleUsage({ enabled: false, companySwitch: true, effective: false }).text).toBe('Deshabilitado');
  });
});

describe('isModuleOff', () => {
  it('sólo cuenta como apagado lo que la API dice que no está habilitado', () => {
    expect(isModuleOff({ document_reading: false }, 'document_reading')).toBe(true);
    expect(isModuleOff({ document_reading: true }, 'document_reading')).toBe(false);
    expect(isModuleOff({ document_reading: false }, 'dispatch')).toBe(false);
    expect(isModuleOff(null, 'document_reading')).toBe(false);
    expect(isModuleOff({ document_reading: false }, undefined)).toBe(false);
  });
});
