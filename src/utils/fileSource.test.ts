import { afterEach, describe, expect, it, vi } from 'vitest';
import { openFileSource, saveFileSource } from './fileSource';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openFileSource', () => {
  it('una URL firmada se abre con un enlace noopener, sin blob y sin reportar bloqueo', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    const createObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    expect(openFileSource({ kind: 'url', url: 'https://s3.example/x?sig=1', expiresAt: null })).toBe(true);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.href).toBe('https://s3.example/x?sig=1');
    expect(clicked[0]?.target).toBe('_blank');
    expect(clicked[0]?.rel).toBe('noopener noreferrer');
    expect(open).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('un blob se abre con una URL local y avisa si el navegador bloqueó la ventana', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    URL.createObjectURL = vi.fn(() => 'blob:local');
    expect(openFileSource({ kind: 'blob', blob: new Blob(['x']) })).toBe(false);
    expect(window.open).toHaveBeenCalledWith('blob:local', '_blank');
  });
});

describe('saveFileSource', () => {
  it('con una URL firmada abre un enlace con el nombre original', () => {
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    saveFileSource({ kind: 'url', url: 'https://s3.example/x', expiresAt: null }, 'poliza.pdf');
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.href).toBe('https://s3.example/x');
    expect(clicked[0]?.download).toBe('poliza.pdf');
  });
});
