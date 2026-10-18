import { describe, expect, it } from 'vitest';
import { taskSubject } from './fleetTaskSubject';

describe('taskSubject', () => {
  it('distingue vehículo, empleado y chofer', () => {
    expect(taskSubject({ carId: 'c1', employeeId: null })).toBe('vehicle');
    expect(taskSubject({ carId: null, employeeId: 'e1' })).toBe('employee');
    expect(taskSubject({ carId: null, employeeId: null })).toBe('driver');
    expect(taskSubject(null)).toBe('driver');
  });
});
