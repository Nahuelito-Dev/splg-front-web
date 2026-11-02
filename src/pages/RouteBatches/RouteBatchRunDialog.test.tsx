import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteBatchRunDialog } from './RouteBatchRunDialog';

afterEach(cleanup);

const result = {
  title: 'No se armó ningún lote',
  summary: 'Había 15 pedidos candidatos.',
  driversTitle: 'Choferes que no pueden recibir el lote',
  drivers: ['Ramón Villalba: su vehículo tiene el taller programado en este horario', 'Ana Paz'],
  lines: ['Otro proceso tomó los pedidos mientras se armaba'],
};

describe('RouteBatchRunDialog', () => {
  it('muestra título, resumen, un renglón por chofer y los otros motivos', () => {
    render(<RouteBatchRunDialog result={result} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'No se armó ningún lote' })).toBeInTheDocument();
    expect(screen.getByText('Había 15 pedidos candidatos.')).toBeInTheDocument();
    expect(screen.getByText('Choferes que no pueden recibir el lote')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.getByText('Ramón Villalba: su vehículo tiene el taller programado en este horario'),
    ).toBeInTheDocument();
    expect(screen.getByText('Otro proceso tomó los pedidos mientras se armaba')).toBeInTheDocument();
  });

  it('sin choferes no dibuja el encabezado de la lista', () => {
    render(<RouteBatchRunDialog result={{ ...result, drivers: [], lines: [] }} onClose={vi.fn()} />);
    expect(screen.queryByText('Choferes que no pueden recibir el lote')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('«Entendido» cierra', () => {
    const onClose = vi.fn();
    render(<RouteBatchRunDialog result={result} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(onClose).toHaveBeenCalled();
  });
});
