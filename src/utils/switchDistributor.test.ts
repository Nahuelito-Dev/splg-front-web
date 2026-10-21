import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confirmMock = vi.hoisted(() => vi.fn());
vi.mock('./notifications', () => ({ confirm: confirmMock }));

import { activeDistributor } from '../services/api/activeDistributor';
import { setFormDirty } from './unsavedChanges';
import { switchDistributor } from './switchDistributor';

const reload = vi.fn();
const formId = Symbol('form');

beforeEach(() => {
  activeDistributor.set('a');
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
});
afterEach(() => {
  setFormDirty(formId, false);
  activeDistributor.set(null);
  vi.clearAllMocks();
});

describe('switchDistributor («Ver como»)', () => {
  it('sin cambios sin guardar guarda el slug y recarga', async () => {
    expect(await switchDistributor('b')).toBe(true);
    expect(activeDistributor.get()).toBe('b');
    expect(reload).toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('con cambios y sin confirmar NO toca el slug ni recarga', async () => {
    setFormDirty(formId, true);
    confirmMock.mockResolvedValue(false);
    expect(await switchDistributor('b')).toBe(false);
    expect(activeDistributor.get()).toBe('a');
    expect(reload).not.toHaveBeenCalled();
  });

  it('con cambios y confirmado recién ahí guarda el slug y recarga', async () => {
    setFormDirty(formId, true);
    confirmMock.mockResolvedValue(true);
    expect(await switchDistributor('b')).toBe(true);
    expect(activeDistributor.get()).toBe('b');
    expect(reload).toHaveBeenCalled();
  });
});
