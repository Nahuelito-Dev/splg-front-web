import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuAction } from '../common/components/ui/MoreActionsMenu';

const state = vi.hoisted(() => ({ operateHint: undefined as string | undefined }));
vi.mock('.', () => ({ usePermissions: () => ({ operateHint: state.operateHint }) }));
vi.mock('../common/components/ImportWizard/ImportWizard', () => ({
  ImportWizard: ({ resource }: { resource: string }) => <p>asistente {resource}</p>,
}));

import { useImportActions } from './useImportActions';

let actions: MenuAction[] = [];
const Probe = () => {
  const importing = useImportActions([
    { resource: 'garrafas', label: 'Importar garrafas' },
    { resource: 'precios', label: 'Importar precios' },
  ]);
  actions = importing.actions;
  return importing.wizard;
};

afterEach(() => {
  cleanup();
  state.operateHint = undefined;
});

describe('useImportActions', () => {
  it('una entrada por recurso; abrirla monta el asistente de ese recurso', () => {
    render(<Probe />);
    expect(actions.map((a) => a.label)).toEqual(['Importar garrafas', 'Importar precios']);
    expect(actions.every((a) => a.blockedReason === undefined)).toBe(true);
    expect(screen.queryByText(/asistente/)).not.toBeInTheDocument();
    actions[1].onClick();
    // el estado cambia fuera de act: se re-renderiza al siguiente tick
    return screen.findByText('asistente precios');
  });

  it('sin distribuidora elegida las entradas quedan bloqueadas con el motivo', () => {
    state.operateHint = 'Elegí una distribuidora en «Ver como» para operar';
    render(<Probe />);
    expect(actions.every((a) => a.blockedReason === state.operateHint)).toBe(true);
  });
});
