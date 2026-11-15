import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mode: 'company',
  theme: undefined as unknown,
  platform: { name: 'OrixTech' } as unknown,
}));
vi.mock('../../hooks', () => ({ usePermissions: () => ({ mode: state.mode }) }));
vi.mock('../../services/queries/companyTheme', () => ({ useCompanyTheme: () => ({ data: state.theme }) }));
vi.mock('../../services/queries/distributors', () => ({
  useCurrentDistributor: () => ({ data: { distributor_id: 'd1', name: 'Distribuidora Demo', photoUrl: null } }),
}));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: state.platform }) }));
vi.mock('./ui/PhotoThumb', () => ({ PhotoThumb: ({ fallback }: { fallback: string }) => <span>{fallback}</span> }));

import { CompanyBrand, PoweredByPlatform } from './CompanyBrand';

afterEach(() => {
  cleanup();
  state.theme = undefined;
});

describe('CompanyBrand', () => {
  it('muestra el nombre para mostrar de la Apariencia, no el de la plataforma', () => {
    state.theme = { displayName: 'Nahuel Gas', companyName: 'Distribuidora Demo', logoUrl: null };
    render(<CompanyBrand subtitle="Gestión de reparto" />);
    expect(screen.getByText('Nahuel Gas')).toBeInTheDocument();
    expect(screen.queryByText('OrixTech')).not.toBeInTheDocument();
  });

  it('sin nombre para mostrar, el de la empresa', () => {
    state.theme = { displayName: null, companyName: 'Distribuidora Demo', logoUrl: null };
    render(<CompanyBrand />);
    expect(screen.getByText('Distribuidora Demo')).toBeInTheDocument();
  });

  it('mientras el tema no llega, el nombre de la empresa de la sesión', () => {
    render(<CompanyBrand />);
    expect(screen.getByText('Distribuidora Demo')).toBeInTheDocument();
  });
});

describe('PoweredByPlatform', () => {
  it('«con tecnología de» y el nombre de la plataforma de la API', () => {
    render(<PoweredByPlatform />);
    expect(screen.getByText(/con tecnología de/)).toHaveTextContent('con tecnología de OrixTech');
  });

  it('sin el nombre de la plataforma no muestra nada', () => {
    state.platform = undefined;
    const { container } = render(<PoweredByPlatform />);
    expect(container).toBeEmptyDOMElement();
    state.platform = { name: 'OrixTech' };
  });
});
