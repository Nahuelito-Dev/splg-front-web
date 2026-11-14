import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '../../../test/pageTest';

const user = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));
vi.mock('../../../services/queries/users', () => ({ useUser: () => user.result }));

import { SettingsMeta } from './SettingsMeta';

const draw = () =>
  renderPage(
    <SettingsMeta isDefault={false} updatedAt="2026-11-14T17:12:00.000Z" updatedByUserId="0114a3eb-58dbb4" />,
    {
      url: '/settings',
    },
  );

afterEach(cleanup);

describe('SettingsMeta: quién lo modificó', () => {
  it('una cuenta de la empresa se nombra con su enlace', () => {
    user.result = { data: { full_name: 'Ana Admin', role: { type: 'admin' } }, isPending: false, isError: false };
    draw();
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
  });

  it('si la cuenta no se puede leer (403), dice «la plataforma», sin el id', () => {
    user.result = { data: undefined, isPending: false, isError: true };
    draw();
    expect(screen.getByText(/Modificado por la plataforma/)).toBeInTheDocument();
    expect(screen.queryByText(/58DBB4/i)).not.toBeInTheDocument();
  });

  it('si la cambió un administrador general, también es «la plataforma»', () => {
    user.result = { data: { full_name: 'Nahuel', role: { type: 'super_admin' } }, isPending: false, isError: false };
    draw();
    expect(screen.getByText(/Modificado por la plataforma/)).toBeInTheDocument();
    expect(screen.queryByText('Nahuel')).not.toBeInTheDocument();
  });
});
