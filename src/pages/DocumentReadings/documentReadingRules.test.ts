import { describe, expect, it } from 'vitest';
import type { EmployeeDocuments } from '../../services/api/types';
import { readingOf } from './documentReadingFixtures';
import {
  correctedFields,
  decisionState,
  fieldLabel,
  initialValue,
  ownerLink,
  readingOwnerLabel,
  readingTitle,
  renewableTasks,
  runSummary,
  simulationText,
  spentPercent,
  typeParam,
} from './documentReadingRules';

const diff = (field: string) => ({ field, expected: '1', read: '2', message: `${field} difiere` });
type Task = EmployeeDocuments['tasks'][number];
const task = (taskId: string, status: Task['status'], documentKind: string): Task =>
  ({ taskId, status, plan: { documentKind } }) as unknown as Task;

describe('decisionState', () => {
  it('sin propuesta abierta no hay nada que decidir', () => {
    expect(decisionState(readingOf({ status: 'confirmed' })).open).toBe(false);
    expect(decisionState(readingOf({}, null)).open).toBe(false);
  });

  it('una propuesta sin diferencias se confirma tal cual', () => {
    expect(decisionState(readingOf())).toEqual({ open: true });
  });

  it('una diferencia de importe, fecha o total exige corregir o rechazar', () => {
    expect(decisionState(readingOf({}, { differences: [diff('importe')] })).confirmBlocked).toMatch(/importe/);
    expect(decisionState(readingOf({}, { differences: [diff('fecha_de_pago')] })).confirmBlocked).toMatch(
      /fecha de pago/,
    );
    expect(
      decisionState(readingOf({}, { action: 'register_purchase_invoice', differences: [diff('total')] }))
        .confirmBlocked,
    ).toMatch(/total/);
  });

  it('un pago sin importe leído no se confirma', () => {
    const reading = readingOf({ fields: [{ nombre: 'fecha_de_pago', valor: '2026-11-01', confianza: 'alta' }] });
    expect(decisionState(reading).confirmBlocked).toMatch(/Falta el importe/);
  });

  it('un pago con fecha posterior a hoy (día de Buenos Aires) no se confirma: el back lo rechaza', () => {
    const conFecha = (valor: string, action: 'pay_installment' | 'pay_fine' = 'pay_installment') =>
      readingOf(
        {
          fields: [
            { nombre: 'importe', valor: '38390.00', confianza: 'alta' },
            { nombre: 'fecha_de_pago', valor, confianza: 'alta' },
          ],
        },
        { action },
      );
    // 12/11 a las 22:00 de Buenos Aires = 13/11 01:00 UTC: «hoy» sigue siendo el 12.
    const ahora = new Date('2026-11-13T01:00:00Z');
    expect(decisionState(conFecha('2026-11-13'), ahora).confirmBlocked).toMatch(/posterior a hoy/);
    expect(decisionState(conFecha('2026-11-13', 'pay_fine'), ahora).confirmBlocked).toMatch(/posterior a hoy/);
    expect(decisionState(conFecha('2026-11-12'), ahora).confirmBlocked).toBeUndefined();
    expect(decisionState(conFecha('2026-11-12T21:30:00-03:00'), ahora).confirmBlocked).toBeUndefined();
    expect(decisionState(conFecha('2026-11-13T10:00:00-03:00'), ahora).confirmBlocked).toMatch(/posterior a hoy/);
  });

  it('patente distinta en una póliza, documento distinto o «no apto» en un legajo: sólo queda rechazar', () => {
    expect(
      decisionState(readingOf({}, { action: 'update_policy', differences: [diff('patente')] })).onlyReject,
    ).toMatch(/patente/);
    expect(
      decisionState(readingOf({}, { action: 'update_employee_document', differences: [diff('documento')] })).onlyReject,
    ).toMatch(/documento/);
    const noApto = readingOf(
      { detectedType: 'apto_medico', fields: [{ nombre: 'resultado', valor: 'No apto', confianza: 'alta' }] },
      { action: 'update_employee_document' },
    );
    expect(decisionState(noApto).onlyReject).toMatch(/no apto/);
  });
});

describe('correctedFields', () => {
  it('manda sólo lo que cambió', () => {
    const out = correctedFields(readingOf(), {
      importe: '38390.00',
      fecha_de_pago: '2026-11-01',
      numero_de_operacion: 'OP-78',
      destinatario: 'La Segunda',
      periodo: '',
    });
    expect(out).toEqual({ numero_de_operacion: 'OP-78' });
  });

  it('repetir un importe con diferencia es aceptarlo: se manda igual', () => {
    const out = correctedFields(readingOf({}, { differences: [diff('importe')] }), {
      importe: '38390.00',
      fecha_de_pago: '2026-11-01',
    });
    expect(out).toEqual({ importe: '38390.00' });
  });

  it('una fecha con hora se compara por el día', () => {
    const reading = readingOf({
      fields: [{ nombre: 'vencimiento', valor: '2027-05-01T00:00:00-03:00', confianza: 'alta' }],
      detectedType: 'licencia_de_conducir',
    });
    expect(correctedFields(reading, { vencimiento: '2027-05-01' })).toEqual({});
  });

  it('la fecha de pago con hora se edita como el día de Buenos Aires', () => {
    expect(initialValue('fecha_de_pago', '2026-11-05T18:55:00-03:00')).toBe('2026-11-05');
    expect(initialValue('fecha_de_pago', '2026-11-06T01:30:00Z')).toBe('2026-11-05');
    expect(initialValue('fecha_de_pago', '2026-11-05')).toBe('2026-11-05');
    expect(initialValue('fecha_de_pago', 'ayer')).toBe('');
    const reading = readingOf({
      fields: [{ nombre: 'fecha_de_pago', valor: '2026-11-05T18:55:00-03:00', confianza: 'alta' }],
    });
    expect(correctedFields(reading, { fecha_de_pago: '2026-11-05' })).toEqual({});
    expect(correctedFields(reading, { fecha_de_pago: '2026-11-04' })).toEqual({ fecha_de_pago: '2026-11-04' });
  });
});

describe('readingTitle', () => {
  it('sin el adjunto (el listado no lo trae) nombra la lectura por la propuesta y su registro', () => {
    const reading = readingOf({ attachment: undefined });
    expect(readingTitle(reading)).toBe('Pagar la cuota del seguro');
    expect(readingOwnerLabel(reading)).toBe('Cuota de seguro');
    expect(readingTitle(readingOf({ attachment: undefined }, null))).toBe('Documento');
    expect(readingOwnerLabel(readingOf({ attachment: undefined }, null))).toBe('Adjunto');
  });
});

describe('renewableTasks', () => {
  it('sólo las abiertas del documento que corresponde al tipo leído', () => {
    const reading = readingOf({ detectedType: 'licencia_de_conducir' }, { action: 'update_employee_document' });
    const tasks = [
      task('t1', 'scheduled', 'driver_license'),
      task('t2', 'done', 'driver_license'),
      task('t3', 'overdue', 'psychophysical'),
      task('t4', 'overdue', 'driver_license'),
    ];
    expect(renewableTasks(reading, tasks).map((t) => t.taskId)).toEqual(['t1', 't4']);
    expect(renewableTasks({ ...reading, detectedType: 'apto_medico' }, tasks).map((t) => t.taskId)).toEqual(['t3']);
  });
});

describe('textos y enlaces', () => {
  it('la simulación y la corrida en una frase', () => {
    expect(simulationText(0, 0)).toBe('No hay documentos pendientes de leer.');
    expect(simulationText(0, 1)).toMatch(/tope/);
    expect(simulationText(3, 0)).toBe('Se leerían 3 documentos.');
    expect(simulationText(1, 1)).toMatch(/1 documento: el tope/);
    expect(runSummary({ read: 2, duplicates: 1, failed: 1, budgetReached: 0 })).toBe(
      '2 leídos, 1 duplicado, 1 con error.',
    );
    expect(runSummary({ read: 1, duplicates: 0, failed: 0, budgetReached: 1 })).toMatch(/tope/);
  });

  it('el gasto contra el tope, sin pasar de 100 y sin tope no hay barra', () => {
    expect(spentPercent(5, 20)).toBe(25);
    expect(spentPercent(30, 20)).toBe(100);
    expect(spentPercent(1, 0)).toBeNull();
    expect(spentPercent(1, null)).toBeNull();
  });

  it('etiquetas de campos, tipo de la URL y enlace al dueño', () => {
    expect(fieldLabel('fecha_de_pago')).toBe('Fecha de pago');
    expect(fieldLabel('cuit_del_emisor')).toBe('CUIT del emisor');
    expect(typeParam('poliza')).toBe('poliza');
    expect(typeParam('cualquiera')).toBe('');
    expect(ownerLink('employee', 'e 1')).toBe('/employees/details/e%201?tab=documents');
    expect(ownerLink('insurance_installment', 'i-1')).toBeNull();
  });
});
