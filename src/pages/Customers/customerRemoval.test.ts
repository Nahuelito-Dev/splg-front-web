import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { removalError } from './customerRemoval';

describe('removalError', () => {
  it('un 404 (el cliente ya cambió) se explica sin el texto interno del back', () => {
    const error = removalError(new ApiError(404, ['Cliente no encontrado']));
    expect(error.message).toBe('El cliente ya no está como lo veías: se actualizó la lista, volvé a intentarlo');
  });

  it('el resto pasa tal cual (el 409 de pedidos en curso, por ejemplo)', () => {
    const error = removalError(new ApiError(409, ['El cliente tiene pedidos en curso con esta distribuidora']));
    expect(error.message).toBe('El cliente tiene pedidos en curso con esta distribuidora');
  });
});
