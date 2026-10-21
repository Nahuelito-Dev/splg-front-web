import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropZone } from './DropZone';

afterEach(cleanup);

const setup = (props: Partial<Parameters<typeof DropZone>[0]> = {}) => {
  const onFile = vi.fn();
  const onReject = vi.fn();
  render(
    <DropZone
      inputLabel="Elegir"
      accept={['image/png']}
      hint="PNG, hasta 5 MB"
      onFile={onFile}
      onReject={onReject}
      {...props}
    />,
  );
  return { onFile, onReject, zone: screen.getByRole('button') };
};

const png = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('DropZone', () => {
  it('un archivo soltado se entrega; varios juntos se rechazan con aviso y no se entrega ninguno', () => {
    const { onFile, onReject, zone } = setup();
    fireEvent.drop(zone, { dataTransfer: { files: [png('a.png')] } });
    expect(onFile).toHaveBeenCalledTimes(1);
    fireEvent.drop(zone, { dataTransfer: { files: [png('b.png'), png('c.png')] } });
    expect(onReject).toHaveBeenCalledWith('Soltá un solo archivo por vez.');
    expect(onFile).toHaveBeenCalledTimes(1);
  });

  it('bloqueada sigue enfocable, muestra el motivo a la vista y no acepta archivos', () => {
    const { onFile, zone } = setup({ blockedReason: 'Elegí una distribuidora' });
    expect(zone).toHaveAttribute('tabindex', '0');
    expect(zone).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Elegí una distribuidora')).toBeVisible();
    expect(screen.queryByText('PNG, hasta 5 MB')).toBeNull();
    fireEvent.drop(zone, { dataTransfer: { files: [png('a.png')] } });
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(onFile).not.toHaveBeenCalled();
  });
});
