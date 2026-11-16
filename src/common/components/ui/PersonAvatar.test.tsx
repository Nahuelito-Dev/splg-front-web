import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';
import { PersonAvatar } from './PersonAvatar';

afterEach(cleanup);

const withPhoto = (url: string | null, refetch = vi.fn()) =>
  vi.mocked(usePersonPhoto).mockReturnValue({
    data: url ? { url, expiresAt: '2030-01-01T00:00:00.000Z' } : null,
    refetch,
  } as unknown as ReturnType<typeof usePersonPhoto>);

describe('PersonAvatar', () => {
  it('con foto dibuja la imagen con el nombre como alt', () => {
    withPhoto('https://s3/ana.jpg');
    render(<PersonAvatar name="Ana Pérez" userId="u1" />);
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveAttribute('src', 'https://s3/ana.jpg');
  });

  it('decorative deja el alt vacío', () => {
    withPhoto('https://s3/ana.jpg');
    const { container } = render(<PersonAvatar name="Ana Pérez" userId="u1" decorative />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('sin foto muestra las iniciales', () => {
    withPhoto(null);
    render(<PersonAvatar name="Ana Pérez" userId="u1" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('sin ningún id pide la foto de nadie y muestra las iniciales', () => {
    withPhoto(null);
    render(<PersonAvatar name="Ana Pérez" />);
    expect(usePersonPhoto).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('si la foto no carga, pide una nueva y, si vuelve a fallar, deja las iniciales', () => {
    const refetch = vi.fn();
    withPhoto('https://s3/vencida.jpg', refetch);
    render(<PersonAvatar name="Ana Pérez" userId="u1" />);
    fireEvent.error(screen.getByRole('img'));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('usa el fallback en vez de las iniciales cuando se lo dan', () => {
    withPhoto(null);
    render(<PersonAvatar name="Ana Pérez" userId="u1" fallback={<span>ícono</span>} />);
    expect(screen.getByText('ícono')).toBeInTheDocument();
    expect(screen.queryByText('AP')).not.toBeInTheDocument();
  });

  it('al cambiar de persona vuelve a poder pedir una URL nueva', () => {
    const refetch = vi.fn();
    withPhoto('https://s3/a.jpg', refetch);
    const { rerender } = render(<PersonAvatar name="Ana" userId="u1" />);
    fireEvent.error(screen.getByRole('img'));
    expect(refetch).toHaveBeenCalledTimes(1);
    withPhoto('https://s3/b.jpg', refetch);
    rerender(<PersonAvatar name="Beto" userId="u2" />);
    fireEvent.error(screen.getByRole('img'));
    expect(refetch).toHaveBeenCalledTimes(2);
  });
});
