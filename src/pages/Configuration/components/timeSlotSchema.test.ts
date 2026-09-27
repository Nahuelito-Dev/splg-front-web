import { describe, expect, it } from 'vitest';
import { timeSlotSchema } from './timeSlotSchema';

const base = { name: 'Mañana', capacity: 50 };

describe('timeSlotSchema', () => {
  it('acepta un horario válido', () => {
    const result = timeSlotSchema.safeParse({ ...base, startTime: '09:00', endTime: '13:00' });
    expect(result.success).toBe(true);
  });

  it('rechaza si el fin es antes o igual al inicio', () => {
    expect(timeSlotSchema.safeParse({ ...base, startTime: '13:00', endTime: '09:00' }).success).toBe(false);
    expect(timeSlotSchema.safeParse({ ...base, startTime: '09:00', endTime: '09:00' }).success).toBe(false);
  });

  it('rechaza un formato de hora inválido', () => {
    expect(timeSlotSchema.safeParse({ ...base, startTime: '9h', endTime: '13:00' }).success).toBe(false);
    expect(timeSlotSchema.safeParse({ ...base, startTime: '09:00', endTime: '25:00' }).success).toBe(false);
  });

  it('rechaza capacidad no positiva', () => {
    expect(timeSlotSchema.safeParse({ ...base, startTime: '09:00', endTime: '13:00', capacity: 0 }).success).toBe(
      false,
    );
  });

  it('rechaza nombre vacío', () => {
    expect(timeSlotSchema.safeParse({ ...base, name: '', startTime: '09:00', endTime: '13:00' }).success).toBe(false);
  });
});
