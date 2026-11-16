import { describe, expect, it, vi } from 'vitest';
import { installNewVersionReload } from './newVersionReload';

const setup = (start = 1_000_000) => {
  const target = new EventTarget();
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  const reload = vi.fn();
  let clock = start;
  installNewVersionReload({ target: target as unknown as Window, storage, reload, now: () => clock });
  const fire = () => {
    const event = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  return { fire, reload, advance: (ms: number) => (clock += ms) };
};

describe('installNewVersionReload', () => {
  it('recarga una vez cuando falta un archivo de la versión anterior y evita el error de React', () => {
    const t = setup();
    const event = t.fire();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('no entra en bucle: dentro del minuto no vuelve a recargar y deja ver el error', () => {
    const t = setup();
    t.fire();
    t.advance(5_000);
    const second = t.fire();
    expect(t.reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it('pasado el minuto (otra publicación) vuelve a recargar', () => {
    const t = setup();
    t.fire();
    t.advance(61_000);
    t.fire();
    expect(t.reload).toHaveBeenCalledTimes(2);
  });

  it('sin almacenamiento disponible igual recarga', () => {
    const target = new EventTarget();
    const reload = vi.fn();
    installNewVersionReload({ target: target as unknown as Window, storage: null, reload, now: () => 1 });
    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
