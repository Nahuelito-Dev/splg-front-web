import { describe, expect, it } from 'vitest';
import { assignmentLabel } from './orderAssignment';

describe('assignmentLabel', () => {
  it.each([
    ['automatic', 'Asignado: automático'],
    ['manual_override', 'Asignado: manual'],
    ['route_sheet', 'Asignado: hoja de ruta'],
    ['batch', 'Asignado: lote'],
  ] as const)('%s → %s', (method, label) => {
    expect(assignmentLabel(method)).toBe(label);
  });

  it('sin método no dice nada', () => {
    expect(assignmentLabel(null)).toBeNull();
    expect(assignmentLabel(undefined)).toBeNull();
  });
});
