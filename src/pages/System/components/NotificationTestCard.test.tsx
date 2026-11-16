import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const accounts = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/users', () => ({
  usePlatformAccounts: (term: string, options: unknown) => accounts(term, options) as unknown,
  useUsers: list,
}));
vi.mock('../../../services/queries/notifications', () => ({
  useSendTestNotification: () => ({ mutate: vi.fn(), isPending: false }),
  useUserNotificationTokens: () => ({ data: undefined, isLoading: false }),
}));

import { NotificationTestCard } from './NotificationTestCard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationTestCard', () => {
  it('el destinatario se busca sólo entre cuentas de la plataforma y administradores', async () => {
    accounts.mockReturnValue({
      accounts: [{ user_id: 'u1', full_name: 'Ana Admin', email: 'ana@demo.com', role: { type: 'admin' } }],
      loading: false,
      error: null,
    });
    render(<NotificationTestCard />);
    fireEvent.change(screen.getByLabelText('Buscar una cuenta de la plataforma o un administrador'), {
      target: { value: 'ana' },
    });
    await waitFor(() => expect(accounts).toHaveBeenLastCalledWith('ana', { enabled: true }));
    expect(screen.getByRole('button', { name: /Ana Admin/ })).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });
});
