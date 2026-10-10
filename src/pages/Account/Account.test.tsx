import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/api/types';

const api = vi.hoisted(() => ({ getPhotoLink: vi.fn(), uploadPhoto: vi.fn(), removePhoto: vi.fn() }));
vi.mock('../../services/api/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../hooks', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => ({ email: 'admin@splg.com' }),
}));
vi.mock('../../services/queries/users', () => ({
  useMyAccount: () => ({
    data: {
      user_id: 'u-real-1',
      full_name: 'Admin Jeny',
      email: 'admin@splg.com',
      photoUrl: 'https://splg.s3.amazonaws.com/users/u.jpg?X-Amz-Signature=abc',
      role: { type: 'admin' },
    } as unknown as User,
    isPending: false,
    error: null,
  }),
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notify: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('./components/ProfileForm', () => ({ ProfileForm: () => null }));
vi.mock('./components/ChangeEmailForm', () => ({ ChangeEmailForm: () => null }));
vi.mock('./components/PasswordResetCard', () => ({ PasswordResetCard: () => null }));

import { Account } from './Account';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Account: foto propia', () => {
  it('sube y renueva con /users/me/photo, no con el id (con "Ver como" el id propio daría 404)', async () => {
    api.uploadPhoto.mockResolvedValue(undefined);
    api.getPhotoLink.mockResolvedValue({ url: null, expiresAt: null, requiresAuth: false });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Account />
      </QueryClientProvider>,
    );
    const file = new File([new Uint8Array(10)], 'f.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Elegir la foto de perfil'), { target: { files: [file] } });
    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledWith('user', 'me', file));
    fireEvent.error(screen.getAllByRole('img')[0]);
    await waitFor(() => expect(api.getPhotoLink).toHaveBeenCalledWith('user', 'me'));
    expect(api.uploadPhoto).not.toHaveBeenCalledWith('user', 'u-real-1', expect.anything());
  });
});
