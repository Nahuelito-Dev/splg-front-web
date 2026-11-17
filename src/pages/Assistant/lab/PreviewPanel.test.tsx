import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { mutation, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ company: undefined as unknown, platform: undefined as unknown }));

vi.mock('../../../services/queries/assistantLab', () => ({
  usePreviewCompanyAssistant: () => state.company,
  usePreviewPlatformAssistant: () => state.platform,
}));
vi.mock('../../Orders/components/CustomerPicker', () => ({
  CustomerPicker: ({ onSelect }: { onSelect: (customer: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onSelect({ customer_id: 'cus-1', user_id: 'u-1', user: { full_name: 'Ana Pérez' } })}
    >
      Elegir a Ana
    </button>
  ),
}));

import { PlatformPreviewTab } from '../../Platform/Assistant/PlatformPreviewTab';
import { CompanyPreviewTab } from './CompanyPreviewTab';

type Mut = ReturnType<typeof mutation>;

const answer = (over: Record<string, unknown> = {}) => ({
  answer: 'Abrimos de lunes a sábado de 8 a 20.',
  wouldHandOff: false,
  handOffReason: null,
  handOffReasonLabel: null,
  handOffCause: null,
  handOffCauseLabel: null,
  sources: [
    { type: 'faq', id: 'f-1', title: '¿Hasta qué hora abren?' },
    { type: 'order', id: 'A1B2C3', title: 'Pedido #A1B2C3' },
  ],
  layer: 'ai',
  assistantEnabled: true,
  ...over,
});

const drawCompany = (over: Record<string, unknown> = {}, blockedReason?: string) => {
  state.company = mutation({ data: undefined, error: null, ...over });
  return renderPage(<CompanyPreviewTab blockedReason={blockedReason} />, { url: '/settings/assistant' });
};

const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText(/^Pregunta/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('probador de la empresa', () => {
  it('sin probar todavía, explica que no se crea ninguna conversación', () => {
    drawCompany();
    expect(screen.getByText(/No se crea ninguna conversación/)).toBeInTheDocument();
  });

  it('manda la pregunta sin cliente; con cliente elegido manda su customer_id y se puede quitar', async () => {
    drawCompany();
    ask('  ¿Hasta qué hora?  ');
    await waitFor(() => expect((state.company as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.company as Mut).mutate.mock.calls[0][0]).toEqual({ question: '¿Hasta qué hora?' });

    fireEvent.click(screen.getByRole('button', { name: 'Probar como un cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir a Ana' }));
    expect(screen.getByText('Como Ana Pérez')).toBeInTheDocument();
    ask('¿Dónde está mi pedido?');
    await waitFor(() => expect((state.company as Mut).mutate).toHaveBeenCalledTimes(2));
    expect((state.company as Mut).mutate.mock.calls[1][0]).toEqual({
      question: '¿Dónde está mi pedido?',
      customerId: 'cus-1',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar a Ana Pérez' }));
    expect(screen.queryByText('Como Ana Pérez')).not.toBeInTheDocument();
  });

  it('una pregunta vacía no se manda', async () => {
    drawCompany();
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
    expect(await screen.findByText('Escribí la pregunta')).toBeInTheDocument();
    expect((state.company as Mut).mutate).not.toHaveBeenCalled();
  });

  it('muestra la respuesta como la vería el cliente, la capa y las fuentes (la pregunta frecuente con su link)', () => {
    drawCompany({ data: answer() });
    expect(screen.getByText('Abrimos de lunes a sábado de 8 a 20.')).toBeInTheDocument();
    expect(screen.getByText('Respuesta automática')).toBeInTheDocument();
    expect(screen.getByText('Con IA')).toBeInTheDocument();
    const sources = screen.getByRole('region', { name: 'Fuentes usadas' });
    expect(within(sources).getByRole('link', { name: '¿Hasta qué hora abren?' })).toHaveAttribute(
      'href',
      '/settings/assistant?tab=faqs&q=%C2%BFHasta+qu%C3%A9+hora+abren%3F',
    );
    expect(within(sources).getByText('Pedido #A1B2C3')).toBeInTheDocument();
    expect(within(sources).queryByRole('link', { name: 'Pedido #A1B2C3' })).not.toBeInTheDocument();
    expect(screen.queryByText(/asistente está apagado/)).not.toBeInTheDocument();
  });

  it('una fuente cuyo título es el mismo que su tipo se muestra una sola vez', () => {
    drawCompany({ data: answer({ sources: [{ type: 'schedule', id: null, title: 'Horarios y zonas' }] }) });
    const sources = screen.getByRole('region', { name: 'Fuentes usadas' });
    expect(within(sources).getAllByText('Horarios y zonas')).toHaveLength(1);
  });

  it('si derivaría, lo dice con el motivo y la causa, sin respuesta', () => {
    drawCompany({
      data: answer({
        answer: null,
        wouldHandOff: true,
        handOffReason: 'requested',
        handOffReasonLabel: 'El asistente no pudo resolverlo o la persona pidió hablar con alguien',
        handOffCause: 'no_info',
        handOffCauseLabel: 'No tenía la información',
        sources: [],
        layer: 'fixed',
      }),
    });
    expect(screen.getByText(/le pasaría la conversación a alguien del equipo/)).toBeInTheDocument();
    expect(screen.getByText('Por qué: No tenía la información')).toBeInTheDocument();
    expect(screen.getByText(/^Motivo: El asistente no pudo/)).toBeInTheDocument();
    expect(screen.getByText('Respuestas fijas')).toBeInTheDocument();
    expect(screen.queryByText('Respuesta automática')).not.toBeInTheDocument();
    expect(screen.getByText('Ninguna')).toBeInTheDocument();
  });

  it('avisa si hoy el asistente está apagado', () => {
    drawCompany({ data: answer({ assistantEnabled: false }) });
    expect(screen.getByRole('note')).toHaveTextContent('Hoy el asistente está apagado');
  });

  it('un 429 del cupo de pruebas se muestra con el texto de la API', () => {
    drawCompany({
      error: new ApiError(
        429,
        ['Se terminó el cupo de pruebas del mes: vuelve el 1.º'],
        'ASSISTANT_TEST_QUOTA_REACHED',
      ),
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Se terminó el cupo de pruebas del mes: vuelve el 1.º');
  });

  it('en modo soporte «Probar» queda apagado con el motivo', () => {
    drawCompany({}, 'Modo soporte: sólo lectura');
    const button = screen.getByRole('button', { name: 'Probar' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    fireEvent.click(button);
    expect((state.company as Mut).mutate).not.toHaveBeenCalled();
  });
});

describe('probador de la plataforma', () => {
  it('sin selector de cliente y con los links a la base de OrixTech', async () => {
    state.platform = mutation({
      data: answer({ sources: [{ type: 'faq', id: 'p-1', title: 'Choferes' }] }),
      error: null,
    });
    renderPage(<PlatformPreviewTab />, { url: '/platform/assistant' });
    expect(screen.queryByRole('button', { name: 'Probar como un cliente' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choferes' })).toHaveAttribute(
      'href',
      '/platform/assistant?tab=orixtech&q=Choferes',
    );
    ask('¿Cómo cargo un chofer?');
    await waitFor(() =>
      expect((state.platform as Mut).mutate).toHaveBeenCalledWith({ question: '¿Cómo cargo un chofer?' }),
    );
  });
});
