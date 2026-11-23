import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getPhotoLink: vi.fn() }));
vi.mock('../../../services/api/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));

import { AssigneeOption } from './AssigneeOption';

afterEach(cleanup);

const show = (photoUrl?: string) =>
  render(
    <AssigneeOption
      name="Beto Despacho"
      userId="u-2"
      photoUrl={photoUrl}
      value="u-2"
      checked={false}
      onSelect={vi.fn()}
    />,
  );

describe('AssigneeOption: foto', () => {
  it('muestra la foto que mandó la API', () => {
    const { container } = show('https://fotos.test/beto.jpg');
    expect(container.querySelector('img[src="https://fotos.test/beto.jpg"]')).not.toBeNull();
  });

  it('si la foto venció, pide la URL vigente del usuario y la muestra', async () => {
    api.getPhotoLink.mockResolvedValue({ url: 'https://fotos.test/beto-nueva.jpg', expiresAt: null });
    const { container } = show('https://fotos.test/beto.jpg');
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    await waitFor(() => expect(container.querySelector('img[src="https://fotos.test/beto-nueva.jpg"]')).not.toBeNull());
    expect(api.getPhotoLink).toHaveBeenCalledWith('user', 'u-2');
  });

  it('sin foto quedan las iniciales', () => {
    const { container } = show();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('BD')).toBeInTheDocument();
  });
});
