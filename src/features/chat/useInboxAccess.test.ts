import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ mode: 'company' as string }));

vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => ({ mode: state.mode }) }));
vi.mock('../../hooks/usePermiso', () => ({ usePermiso: () => ({ allowed: true, known: true }) }));
vi.mock('../../services/queries/modules', () => ({ useModuleGate: () => ({ ready: true }) }));

import { useInboxAccess } from './useInboxAccess';

beforeEach(() => {
  state.mode = 'company';
});

describe('useInboxAccess', () => {
  it('la empresa con todos los permisos atiende, configura y etiqueta', () => {
    expect(renderHook(() => useInboxAccess()).result.current).toEqual({
      customers: true,
      drivers: true,
      configure: true,
      claims: true,
      any: true,
    });
  });

  it('en modo soporte no hay bandeja ni configuración: nada de etiquetas ni de plazos (D-C2b, sólo lectura)', () => {
    state.mode = 'support';
    expect(renderHook(() => useInboxAccess()).result.current).toEqual({
      customers: false,
      drivers: false,
      configure: false,
      claims: false,
      any: false,
    });
  });
});
