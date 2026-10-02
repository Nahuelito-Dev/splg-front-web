import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';

const mutate = vi.fn();
vi.mock('../../../services/queries/email', () => ({
  useChangeEmail: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../firebase/providers', () => ({
  getCurrentIdToken: vi.fn().mockResolvedValue('token-de-prueba'),
  reauthenticateWithPassword: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { ChangeEmailForm } from './ChangeEmailForm';

const submit = (value: string) => {
  fireEvent.change(screen.getByLabelText(/Correo nuevo/), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }));
};

describe('ChangeEmailForm', () => {
  beforeEach(() => {
    mutate.mockReset();
  });
  afterEach(cleanup);

  it('no llama a la API con un correo inválido', async () => {
    render(<ChangeEmailForm currentEmail="admin@splg.com" onChanged={vi.fn()} />);
    submit('nuevo');
    expect(await screen.findByText('Email inválido')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('no llama a la API si el correo es el mismo', async () => {
    render(<ChangeEmailForm currentEmail="admin@splg.com" onChanged={vi.fn()} />);
    submit('admin@splg.com');
    expect(await screen.findByText('Es el mismo correo que ya usás')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('manda el idToken de la sesión y, ante un 400, pide la contraseña actual', async () => {
    mutate.mockImplementation((...args: unknown[]) => {
      (args[1] as { onError: (e: unknown) => void } | undefined)?.onError(new ApiError(400, ['Token inválido']));
    });
    render(<ChangeEmailForm currentEmail="admin@splg.com" onChanged={vi.fn()} />);
    submit('nuevo@splg.com');
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(
      { currentEmail: 'admin@splg.com', newEmail: 'nuevo@splg.com', idToken: 'token-de-prueba' },
      expect.anything(),
    );

    expect(await screen.findByLabelText(/Contraseña actual/)).toBeInTheDocument();
  });
});
