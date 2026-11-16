import { describe, expect, it } from 'vitest';
import { emptyEmployeeValues, toEmployeeBody } from './employeeBody';

describe('toEmployeeBody', () => {
  it('manda los textos vacíos como null y omite el legajo sin número', () => {
    const body = toEmployeeBody({ ...emptyEmployeeValues, firstName: 'Ana', phone: ' ' });
    expect(body.phone).toBeNull();
    expect(body.cuil).toBeNull();
    expect('fileNumber' in body).toBe(false);
  });
  it('conserva el número de legajo si se escribió', () => {
    expect(toEmployeeBody({ ...emptyEmployeeValues, fileNumber: '0042' }).fileNumber).toBe('0042');
  });
});
