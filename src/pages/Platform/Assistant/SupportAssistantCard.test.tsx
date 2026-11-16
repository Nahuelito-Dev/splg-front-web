import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { newQueryClient } from '../../../test/chatFixtures';

const api = vi.hoisted(() => ({ getSupportSettings: vi.fn(), updateSupportSettings: vi.fn() }));
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../../services/api/supportChat', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../utils/notifications', () => ({ notify: notices, confirm: vi.fn() }));

import { SupportAssistantCard } from './SupportAssistantCard';

const SETTINGS = {
  timezone: 'America/Argentina/Buenos_Aires',
  chatHours: [],
  chatAckEnabled: true,
  chatAckMessage: null,
  assistantAiEnabled: false,
  assistantRepliesPerConversation: 10,
  assistantMonthlyTokenLimit: 2_000_000,
  assistantMonthlyCostEstimateUsd: { min: 0.2381, max: 1 },
  chatInactivityHours: 24,
  resolvedCloseDays: 3,
  waitingCloseDays: 7,
  waitingWarnDays: 5,
  targetUrgentMinutes: 30,
  targetHighMinutes: 120,
  targetNormalMinutes: 480,
  targetLowMinutes: 1440,
  openNow: true,
  updatedAt: null,
};

beforeEach(() => {
  api.getSupportSettings.mockResolvedValue(SETTINGS);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const show = () =>
  render(
    <QueryClientProvider client={newQueryClient()}>
      <SupportAssistantCard />
    </QueryClientProvider>,
  );

describe('SupportAssistantCard', () => {
  it('muestra lo guardado y el estimado tal como lo da el back', async () => {
    show();
    const toggle = await screen.findByRole('switch', { name: 'El asistente contesta en el chat de soporte' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText(/Respuestas del asistente por conversación/)).toHaveValue(10);
    expect(screen.getByLabelText(/Tokens por mes/)).toHaveValue(2_000_000);
    expect(screen.getByText(/^Entre US\$\s0,24 y US\$\s1,00 por mes, estimado$/)).toBeInTheDocument();
    expect(screen.queryByText(/se recalcula al guardar/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('al cambiar el tope no calcula nada: aclara que el estimado es el del guardado y muestra el nuevo al guardar', async () => {
    api.updateSupportSettings.mockResolvedValue({
      ...SETTINGS,
      assistantMonthlyTokenLimit: 10_000_000,
      assistantMonthlyCostEstimateUsd: { min: 1.19, max: 5 },
    });
    show();
    const tokens = await screen.findByLabelText(/Tokens por mes/);
    fireEvent.change(tokens, { target: { value: '10000000' } });
    expect(screen.getByText(/^Entre US\$\s0,24 y US\$\s1,00 por mes, estimado$/)).toBeInTheDocument();
    expect(screen.getByText(/se recalcula al guardar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/^Entre US\$\s1,19 y US\$\s5,00 por mes, estimado$/)).toBeInTheDocument();
    expect(screen.queryByText(/se recalcula al guardar/)).not.toBeInTheDocument();
  });

  it('guarda el interruptor y los topes, sólo esos tres campos', async () => {
    api.updateSupportSettings.mockResolvedValue({ ...SETTINGS, assistantAiEnabled: true });
    show();
    fireEvent.click(await screen.findByRole('switch', { name: 'El asistente contesta en el chat de soporte' }));
    fireEvent.change(screen.getByLabelText(/Respuestas del asistente por conversación/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Tokens por mes/), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.updateSupportSettings).toHaveBeenCalledWith({
        assistantAiEnabled: true,
        assistantRepliesPerConversation: 5,
        assistantMonthlyTokenLimit: 500_000,
      }),
    );
    await waitFor(() => expect(notices.success).toHaveBeenCalledWith('Asistente del soporte guardado'));
  });

  it('fuera de rango no se manda: los mismos límites que el back', async () => {
    show();
    fireEvent.change(await screen.findByLabelText(/Respuestas del asistente por conversación/), {
      target: { value: '51' },
    });
    fireEvent.change(screen.getByLabelText(/Tokens por mes/), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hasta 50')).toBeInTheDocument();
    expect(screen.getByText('Al menos 10.000')).toBeInTheDocument();
    expect(api.updateSupportSettings).not.toHaveBeenCalled();
  });

  it('un 400 de la API se avisa', async () => {
    api.updateSupportSettings.mockRejectedValue(new ApiError(400, ['Valor fuera de rango']));
    show();
    fireEvent.change(await screen.findByLabelText(/Respuestas del asistente por conversación/), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notices.error).toHaveBeenCalled());
    expect(notices.success).not.toHaveBeenCalled();
  });

  it('si no se pudo leer, el error con reintento', async () => {
    api.getSupportSettings.mockRejectedValue(new ApiError(500, ['Error 500']));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Reintentar/ }));
    await waitFor(() => expect(api.getSupportSettings).toHaveBeenCalledTimes(2));
  });
});
