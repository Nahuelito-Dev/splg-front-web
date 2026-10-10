import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Claim } from '../../../services/api/types';

vi.mock('../../../services/queries/photos', () => ({
  useUploadPhoto: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePhoto: () => ({ mutate: vi.fn(), isPending: false }),
  isSignedPhotoUrl: (url: string | null | undefined) => Boolean(url?.includes('X-Amz-Signature=')),
  useRenewablePhoto: (_kind: string, _id: string, url: string | null | undefined) => ({
    src: url ?? null,
    failed: false,
    none: false,
    renewing: false,
    handleError: vi.fn(),
    renewIfExpired: vi.fn(),
    retry: vi.fn(),
  }),
}));

import { ClaimPhoto } from './ClaimPhoto';

afterEach(cleanup);

const SIGNED = 'https://splg.s3.amazonaws.com/claims/c.jpg?X-Amz-Signature=abc';
const claim = (status: string, photoUrl: string | null = SIGNED) =>
  ({ claim_id: 'c-1', status, photoUrl }) as unknown as Claim;

describe('ClaimPhoto', () => {
  it('muestra la foto del reclamo y ofrece reemplazarla, pero no quitarla (el back no tiene DELETE)', () => {
    render(<ClaimPhoto claim={claim('pending')} canOperate />);
    expect(screen.getByAltText('Foto del reclamo')).toHaveAttribute('src', SIGNED);
    expect(screen.getByRole('button', { name: 'Reemplazar' })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('con el reclamo cerrado bloquea la acción y explica por qué', () => {
    render(<ClaimPhoto claim={claim('resolved')} canOperate />);
    const button = screen.getByRole('button', { name: 'Reemplazar' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'El reclamo está cerrado: reabrilo para cambiar la foto.');
    expect(screen.getByAltText('Foto del reclamo')).toBeInTheDocument();
  });

  it('sin permiso para operar la foto se ve pero no hay acciones', () => {
    render(<ClaimPhoto claim={claim('pending')} canOperate={false} operateHint="Elegí una distribuidora" />);
    expect(screen.getByAltText('Foto del reclamo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir foto|Reemplazar|Quitar/ })).not.toBeInTheDocument();
  });

  it('sin foto ofrece subir', () => {
    render(<ClaimPhoto claim={claim('pending', null)} canOperate />);
    expect(screen.getByText('Sin foto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeInTheDocument();
  });
});
