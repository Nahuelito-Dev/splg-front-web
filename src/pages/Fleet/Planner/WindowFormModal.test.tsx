import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation } from '../../../test/pageTest';
import type { PlanningCase } from '../../../services/api/types';

const confirmMutation = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));
const forceMutation = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));

vi.mock('../../../services/queries/planner', () => ({
  useConfirmPlanningCase: () => confirmMutation.current,
  useForceTaskWindow: () => forceMutation.current,
}));

vi.mock('../../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
  confirm: vi.fn(),
}));

import { WindowFormModal } from './WindowFormModal';

const planningCase = (over: Partial<PlanningCase> = {}) =>
  ({
    caseId: 'c-1',
    taskName: 'Service',
    patent: 'AB123CD',
    chosenStart: '2026-11-02T11:00:00.000Z',
    chosenEnd: '2026-11-02T16:00:00.000Z',
    ...over,
  }) as PlanningCase;

const setup = () => {
  confirmMutation.current = mutation();
  forceMutation.current = mutation();
};

afterEach(cleanup);

describe('WindowFormModal: confirmar el taller', () => {
  it('con una ventana acordada la confirma sin pedir día ni horas', async () => {
    setup();
    const onClose = vi.fn();
    render(<WindowFormModal mode="confirm" planningCase={planningCase()} onClose={onClose} />);
    expect(screen.queryByLabelText(/Día/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ventana acordada con el chofer/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Taller'), { target: { value: 'Taller Los Pinos' } });
    fireEvent.change(screen.getByLabelText(/Gasto previsto/), { target: { value: '85000.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));

    await waitFor(() => expect(confirmMutation.current.mutate).toHaveBeenCalled());
    expect(confirmMutation.current.mutate.mock.calls[0][0]).toEqual({
      id: 'c-1',
      body: { provider: 'Taller Los Pinos', cost: 85000.5 },
    });
  });

  it('elegir otra ventana pide el día y manda la ventana en hora argentina', async () => {
    setup();
    render(<WindowFormModal mode="confirm" planningCase={planningCase()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Elegir otra ventana'));
    fireEvent.change(screen.getByLabelText(/Día/), { target: { value: '2099-11-03' } });
    fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/Hasta/), { target: { value: '12:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));

    await waitFor(() => expect(confirmMutation.current.mutate).toHaveBeenCalled());
    expect(confirmMutation.current.mutate.mock.calls[0][0]).toEqual({
      id: 'c-1',
      body: { windowStart: '2099-11-03T09:00:00-03:00', windowEnd: '2099-11-03T12:30:00-03:00' },
    });
  });

  it('un caso sin ventana acordada obliga a elegir una y no deja un horario invertido', async () => {
    setup();
    render(
      <WindowFormModal
        mode="confirm"
        planningCase={planningCase({ chosenStart: null, chosenEnd: null })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/No hay una ventana acordada/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Día/), { target: { value: '2099-11-03' } });
    fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText(/Hasta/), { target: { value: '08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));

    expect(await screen.findByText('Tiene que ser posterior al inicio')).toBeInTheDocument();
    expect(confirmMutation.current.mutate).not.toHaveBeenCalled();
  });

  it('una ventana pasada no se manda', async () => {
    setup();
    render(
      <WindowFormModal
        mode="confirm"
        planningCase={planningCase({ chosenStart: null, chosenEnd: null })}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Día/), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));
    expect(await screen.findByText('La ventana tiene que ser a futuro')).toBeInTheDocument();
    expect(confirmMutation.current.mutate).not.toHaveBeenCalled();
  });

  it('muestra el error que devuelve la API y no cierra', async () => {
    setup();
    const onClose = vi.fn();
    confirmMutation.current.mutate.mockImplementation((_vars, options) => {
      (options as { onError: (e: unknown) => void }).onError(new Error('El caso ya está resuelto'));
    });
    render(<WindowFormModal mode="confirm" planningCase={planningCase()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El caso ya está resuelto');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('al salir bien cierra', async () => {
    setup();
    const onClose = vi.fn();
    confirmMutation.current.mutate.mockImplementation((_vars, options) => {
      (options as { onSuccess: () => void }).onSuccess();
    });
    render(<WindowFormModal mode="confirm" planningCase={planningCase()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('WindowFormModal: cobertura de la zona', () => {
  it('si la API rechaza la ventana por la cobertura, ofrece confirmar igual y lo manda', async () => {
    setup();
    confirmMutation.current.mutate.mockImplementationOnce((_vars, options) => {
      (options as { onError: (e: unknown) => void }).onError(
        new Error('Esa ventana deja la zona de cobertura del vehículo con 1 unidad(es), por debajo del mínimo de 2'),
      );
    });
    render(<WindowFormModal mode="confirm" planningCase={planningCase()} onClose={vi.fn()} />);
    expect(screen.queryByLabelText(/Confirmar igual/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));
    fireEvent.click(await screen.findByLabelText(/Confirmar igual/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar taller' }));
    await waitFor(() => expect(confirmMutation.current.mutate).toHaveBeenCalledTimes(2));
    expect(confirmMutation.current.mutate.mock.calls[1][0]).toEqual({
      id: 'c-1',
      body: { ignoreCoverage: true },
    });
  });
});

describe('WindowFormModal: fijar la ventana de una tarea', () => {
  it('pide siempre la ventana y llama a fijar sobre la tarea', async () => {
    setup();
    render(<WindowFormModal mode="force" taskId="t-1" taskName="VTV" patent="AB123CD" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Día/), { target: { value: '2099-11-03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fijar ventana' }));

    await waitFor(() => expect(forceMutation.current.mutate).toHaveBeenCalled());
    expect(forceMutation.current.mutate.mock.calls[0][0]).toEqual({
      taskId: 't-1',
      body: { windowStart: '2099-11-03T08:00:00-03:00', windowEnd: '2099-11-03T13:00:00-03:00' },
    });
    expect(confirmMutation.current.mutate).not.toHaveBeenCalled();
  });
});
