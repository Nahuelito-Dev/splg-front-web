import { describe, expect, it } from 'vitest';
import { findSlotConflict, timeSlotSchema } from './timeSlotSchema';

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

describe('capacidad y nombre', () => {
  const ok = { startTime: '09:00', endTime: '13:00' };
  it('la capacidad llega hasta 10000, como el back', () => {
    expect(timeSlotSchema.safeParse({ ...base, ...ok, capacity: 10000 }).success).toBe(true);
    expect(timeSlotSchema.safeParse({ ...base, ...ok, capacity: 10001 }).success).toBe(false);
    expect(timeSlotSchema.safeParse({ ...base, ...ok, capacity: 1.5 }).success).toBe(false);
  });

  it('el nombre tiene hasta 50 caracteres', () => {
    expect(timeSlotSchema.safeParse({ ...base, ...ok, name: 'a'.repeat(50) }).success).toBe(true);
    expect(timeSlotSchema.safeParse({ ...base, ...ok, name: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe('findSlotConflict', () => {
  const others = [
    { time_slot_id: 's1', name: 'Mañana', startTime: '09:00:00', endTime: '13:00:00' },
    { time_slot_id: 's2', name: 'Tarde', startTime: '14:00:00', endTime: '18:00:00' },
  ];

  it('detecta el nombre repetido sin distinguir mayúsculas', () => {
    const conflict = findSlotConflict({ name: ' mañana ', startTime: '19:00', endTime: '20:00' }, others);
    expect(conflict?.field).toBe('name');
  });

  it('detecta el horario pisado, pero no el que apenas se toca', () => {
    expect(findSlotConflict({ name: 'Noche', startTime: '12:00', endTime: '15:00' }, others)?.field).toBe('startTime');
    expect(findSlotConflict({ name: 'Noche', startTime: '13:00', endTime: '14:00' }, others)).toBeNull();
  });

  it('al editar no choca contra sí misma', () => {
    expect(findSlotConflict({ name: 'Mañana', startTime: '09:00', endTime: '12:00' }, others, 's1')).toBeNull();
  });
});
