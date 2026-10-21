import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const notify = vi.hoisted(() => ({ error: vi.fn<[Error], void>() }));
vi.mock('../../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify,
}));

import { PhotoPicker } from './PhotoPicker';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PhotoPicker', () => {
  it('rechaza un tipo no permitido y un tamaño excedido', () => {
    const onChange = vi.fn();
    render(<PhotoPicker kind="incident" file={null} onChange={onChange} />);
    const input = screen.getByLabelText('Elegir la foto');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(notify.error.mock.calls.at(-1)?.[0].message).toMatch(/JPG, PNG o WEBP/);
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' })] },
    });
    expect(notify.error.mock.calls.at(-1)?.[0].message).toMatch(/5 MB/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('entrega la imagen válida', () => {
    const onChange = vi.fn();
    render(<PhotoPicker kind="claim" file={null} onChange={onChange} />);
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Elegir la foto'), { target: { files: [png] } });
    expect(onChange).toHaveBeenCalledWith(png);
  });
});

describe('PhotoPicker: zona de subida', () => {
  it('muestra formatos y tamaño máximo, se activa con el teclado y acepta una foto soltada', () => {
    const onChange = vi.fn();
    render(<PhotoPicker kind="claim" file={null} onChange={onChange} />);
    expect(screen.getByText(/JPG, PNG o WEBP, hasta \d+ MB/)).toBeInTheDocument();
    const zone = screen.getByRole('button', { name: /Soltá la foto acá/ });
    const click = vi.spyOn(screen.getByLabelText('Elegir la foto'), 'click');
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-dragging');
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.drop(zone, { dataTransfer: { files: [png] } });
    expect(zone).not.toHaveAttribute('data-dragging');
    expect(onChange).toHaveBeenCalledWith(png);
  });
});
