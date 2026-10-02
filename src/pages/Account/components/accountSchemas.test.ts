import { describe, expect, it } from 'vitest';
import { changeEmailSchema, profileSchema } from './accountSchemas';

describe('profileSchema', () => {
  it('acepta nombre y teléfono en formato internacional', () => {
    expect(profileSchema.safeParse({ full_name: 'Ana Pérez', phone_number: '+5493764000000' }).success).toBe(true);
  });

  it('rechaza un nombre corto y un teléfono sin prefijo', () => {
    const result = profileSchema.safeParse({ full_name: 'A', phone_number: '3764000000' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path[0])).toEqual(['full_name', 'phone_number']);
  });
});

describe('changeEmailSchema', () => {
  const schema = changeEmailSchema('admin@splg.com');

  it('acepta un correo nuevo válido', () => {
    expect(schema.safeParse({ newEmail: 'nuevo@splg.com' }).success).toBe(true);
  });

  it('rechaza un correo mal formado', () => {
    expect(schema.safeParse({ newEmail: 'nuevo' }).success).toBe(false);
  });

  it('rechaza el mismo correo aunque cambien las mayúsculas', () => {
    const result = schema.safeParse({ newEmail: 'Admin@SPLG.com' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('Es el mismo correo que ya usás');
  });
});
