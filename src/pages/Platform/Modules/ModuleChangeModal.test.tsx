import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { CompanyModule } from '../../../services/api/types';
import { mutation } from '../../../test/pageTest';
import { ModuleChangeModal, type ModuleChange } from './ModuleChangeModal';

const state = vi.hoisted(() => ({
  fresh: undefined as unknown,
  save: undefined as unknown,
  refetch: vi.fn(),
  fetching: false,
}));
vi.mock('../../../services/queries/modules', () => ({
  usePlatformCompanyModules: () => ({ data: state.fresh, refetch: state.refetch, isFetching: state.fetching }),
  useSetPlatformCompanyModule: () => state.save,
}));
const notified = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/notifications', () => ({ notify: { success: notified, error: vi.fn() } }));

const reader = (over: Partial<CompanyModule> = {}): CompanyModule => ({
  key: 'document_reading',
  label: 'Lector de documentos',
  inPlan: true,
  override: null,
  enabled: true,
  companySwitch: true,
  effective: true,
  impact: {
    pending: 3,
    description:
      '3 documento(s) esperando lectura. Los documentos que esperan lectura no se leen y quedan pendientes; subir documentos sigue funcionando.',
  },
  ...over,
});

const draw = (change: ModuleChange, onClose = vi.fn()) => {
  state.save = mutation();
  render(<ModuleChangeModal change={change} onClose={onClose} />);
  return { save: state.save as ReturnType<typeof mutation>, onClose };
};

const reasonField = () => screen.getByLabelText(/Motivo/);
const write = (text: string) => fireEvent.change(reasonField(), { target: { value: text } });
const MOTIVO = 'La empresa pidió dejar de usar el lector';

afterEach(() => {
  cleanup();
  state.fresh = undefined;
  state.refetch.mockReset();
  state.fetching = false;
  notified.mockReset();
});

describe('ModuleChangeModal', () => {
  it('al deshabilitar muestra lo que queda en curso según el back (impact) antes de confirmar', () => {
    draw({ companyId: 'c-1', companyName: 'Gas Norte', module: reader(), wantEnabled: false });
    expect(screen.getByRole('heading', { name: '¿Deshabilitar «Lector de documentos»?' })).toBeInTheDocument();
    expect(screen.getByText('Quedan 3 en curso')).toBeInTheDocument();
    expect(screen.getByText(/3 documento\(s\) esperando lectura/)).toBeInTheDocument();
    expect(screen.getByText(/deshabilitado como excepción, aunque el plan de la empresa lo trae/)).toBeInTheDocument();
  });

  it('usa el impacto que se vuelve a pedir al abrir, no el de la lista', () => {
    state.fresh = [reader({ impact: { pending: 7, description: '7 documento(s) esperando lectura.' } })];
    draw({ companyId: 'c-1', companyName: 'Gas Norte', module: reader(), wantEnabled: false });
    expect(state.refetch).toHaveBeenCalled();
    expect(screen.getByText('Quedan 7 en curso')).toBeInTheDocument();
  });

  it('sin motivo, o con menos de 10 caracteres, no manda nada y dice por qué', async () => {
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module: reader(), wantEnabled: false });
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    expect(await screen.findByText('Escribí el motivo')).toBeInTheDocument();
    write('   corto   ');
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    expect(await screen.findByText('El motivo tiene que tener al menos 10 caracteres')).toBeInTheDocument();
    expect(save.mutate).not.toHaveBeenCalled();
  });

  it('deshabilitar un módulo del plan manda una excepción en false con el motivo recortado', async () => {
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module: reader(), wantEnabled: false });
    write(`  ${MOTIVO}  `);
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    await waitFor(() => expect(save.mutate).toHaveBeenCalled());
    expect(save.mutate.mock.calls[0][0]).toEqual({
      companyId: 'c-1',
      key: 'document_reading',
      body: { enabled: false, reason: MOTIVO },
    });
  });

  it('habilitar uno que el plan no trae deja una excepción en true, con vencimiento al final del día elegido', async () => {
    const module = reader({ inPlan: false, enabled: false, effective: false });
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module, wantEnabled: true });
    expect(screen.queryByText(/en curso/)).not.toBeInTheDocument();
    write('Prueba de dos semanas pedida por la empresa');
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Habilitar' }));
    await waitFor(() => expect(save.mutate).toHaveBeenCalled());
    expect(save.mutate.mock.calls[0][0]).toMatchObject({
      body: {
        enabled: true,
        reason: 'Prueba de dos semanas pedida por la empresa',
        expiresAt: '2099-12-31T23:59:59-03:00',
      },
    });
  });

  it('un vencimiento pasado no se manda', async () => {
    const module = reader({ inPlan: false, enabled: false, effective: false });
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module, wantEnabled: true });
    write('Prueba de dos semanas pedida por la empresa');
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Habilitar' }));
    expect(await screen.findByText('El vencimiento tiene que ser hoy o una fecha futura')).toBeInTheDocument();
    expect(save.mutate).not.toHaveBeenCalled();
  });

  it('volver a lo del plan manda enabled null, sin vencimiento (ni el campo)', async () => {
    const module = reader({
      enabled: false,
      effective: false,
      override: { enabled: false, reason: 'Pedido de la empresa', expiresAt: null },
    });
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module, wantEnabled: true });
    expect(screen.getByText(/Vuelve a lo que trae el plan de la empresa, que lo incluye/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Vence el/)).not.toBeInTheDocument();
    write('La empresa vuelve a usar el lector');
    fireEvent.click(screen.getByRole('button', { name: 'Habilitar' }));
    await waitFor(() => expect(save.mutate).toHaveBeenCalled());
    expect(save.mutate.mock.calls[0][0]).toMatchObject({
      body: { enabled: null, reason: 'La empresa vuelve a usar el lector' },
    });
  });

  it('un 4xx del back queda a la vista en el diálogo, que no se cierra', async () => {
    const { save, onClose } = draw({
      companyId: 'c-1',
      companyName: 'Gas Norte',
      module: reader(),
      wantEnabled: false,
    });
    save.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onError: (e: unknown) => void }).onError(
        new ApiError(404, ['La empresa no existe o está dada de baja'], 'COMPANY_NOT_FOUND'),
      ),
    );
    write(MOTIVO);
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La empresa no existe o está dada de baja');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('al guardar avisa con lo que respondió el back y cierra', async () => {
    const { save, onClose } = draw({
      companyId: 'c-1',
      companyName: 'Gas Norte',
      module: reader(),
      wantEnabled: false,
    });
    save.mutate.mockImplementation((_vars: unknown, options?: unknown) =>
      (options as { onSuccess: (m: CompanyModule) => void }).onSuccess(reader({ enabled: false, effective: false })),
    );
    write(MOTIVO);
    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(notified).toHaveBeenCalledWith('«Lector de documentos» deshabilitado para Gas Norte');
  });

  it('mientras se vuelve a pedir el impacto no deja confirmar (no se decide con datos viejos)', async () => {
    state.fetching = true;
    const { save } = draw({ companyId: 'c-1', companyName: 'Gas Norte', module: reader(), wantEnabled: false });
    expect(screen.getByRole('button', { name: 'Deshabilitar' })).toBeDisabled();
    expect(screen.getByText('Actualizando lo que queda en curso…')).toBeInTheDocument();
    write(MOTIVO);
    fireEvent.submit(reasonField().closest('form') as HTMLFormElement);
    await new Promise((r) => setTimeout(r, 20));
    expect(save.mutate).not.toHaveBeenCalled();
  });
});
