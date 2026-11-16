import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks', () => ({ usePermissions: () => ({ mode: 'support' }) }));
vi.mock('../useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Nahuel Gas' }));
vi.mock('../../../services/queries/distributors', () => ({ useCurrentDistributor: () => ({ data: undefined }) }));
vi.mock('../../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));

import { TenantCard } from './TenantCard';

describe('TenantCard', () => {
  it('las iniciales van sobre el borde del menú (side-line), que se distingue de la tarjeta y lleva el acento a 4,5:1', () => {
    render(<TenantCard />);
    const initials = screen.getByText('NG');
    expect(initials).toHaveClass('bg-side-line', 'text-side-accent');
    expect(initials).not.toHaveClass('bg-side');
    expect(initials.parentElement).toHaveClass('bg-side-raised');
    expect(screen.getByText('Modo soporte · sólo lectura')).toBeInTheDocument();
  });
});
