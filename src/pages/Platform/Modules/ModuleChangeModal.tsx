import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Form, FormInput, FormTextArea, Modal, cx } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { CompanyModule } from '../../../services/api/types';
import { usePlatformCompanyModules, useSetPlatformCompanyModule } from '../../../services/queries/modules';
import { toIsoDay } from '../../../utils/dates';
import { notify } from '../../../utils/notifications';
import {
  moduleChangeSchema,
  overrideFor,
  REASON_MAX,
  toModuleBody,
  type ModuleChangeInput,
  type ModuleChangeValues,
} from './moduleRules';

const FORM_ID = 'module-change';

export interface ModuleChange {
  companyId: string;
  companyName: string;
  /** El módulo como estaba al tocar el interruptor (la confirmación usa el más reciente de la API si ya llegó). */
  module: CompanyModule;
  /** Lo que se quiere: habilitarlo o deshabilitarlo. */
  wantEnabled: boolean;
}

interface Props {
  change: ModuleChange | null;
  onClose: () => void;
}

/** Qué hace el cambio con la excepción, en palabras. */
const whatHappens = (module: CompanyModule, wantEnabled: boolean): string => {
  const override = overrideFor(module, wantEnabled);
  if (override === null) {
    return module.inPlan
      ? 'Vuelve a lo que trae el plan de la empresa, que lo incluye: la excepción vigente deja de regir.'
      : 'Vuelve a lo que trae el plan de la empresa, que no lo incluye: la excepción vigente deja de regir.';
  }
  return wantEnabled
    ? 'Queda habilitado como excepción: el plan de la empresa no lo trae.'
    : 'Queda deshabilitado como excepción, aunque el plan de la empresa lo trae.';
};

/**
 * Confirmación de un cambio de módulo desde la plataforma (`PUT /v2/platform/companies/:id/modules/:key`): dice qué
 * pasa con el plan y la excepción, al deshabilitar muestra lo que queda en curso según el back (`impact`), y pide el
 * motivo (obligatorio, queda en la auditoría) y, si queda una excepción, un vencimiento opcional.
 */
export const ModuleChangeModal = ({ change, onClose }: Props) => {
  const open = change !== null;
  const save = useSetPlatformCompanyModule();
  const { data: fresh, refetch, isFetching } = usePlatformCompanyModules(change?.companyId);
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<ModuleChangeInput, unknown, ModuleChangeValues>({
    resolver: zodResolver(moduleChangeSchema),
    defaultValues: { reason: '', expiresOn: '' },
  });
  const { reset, control } = methods;
  const reason = useWatch({ control, name: 'reason' }) ?? '';

  // Cada apertura arranca limpia y vuelve a pedir el módulo: el impacto tiene que ser el de ahora, no el de la lista.
  useEffect(() => {
    if (!open) return;
    reset({ reason: '', expiresOn: '' });
    setServerError(null);
    save.reset();
    void refetch();
    // `save` y `refetch` cambian de identidad en cada render; sólo importa la apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, change?.companyId, change?.module.key, change?.wantEnabled]);

  if (!change) return null;
  const module = fresh?.find((m) => m.key === change.module.key) ?? change.module;
  const { wantEnabled, companyName, companyId } = change;
  const createsOverride = overrideFor(module, wantEnabled) !== null;
  const busy = save.isPending;

  const onSubmit = (values: ModuleChangeValues) => {
    if (busy || isFetching) return;
    setServerError(null);
    save.mutate(
      { companyId, key: module.key, body: toModuleBody(module, wantEnabled, values) },
      {
        onSuccess: (saved) => {
          notify.success(`«${saved.label}» ${saved.enabled ? 'habilitado' : 'deshabilitado'} para ${companyName}`);
          onClose();
        },
        // Un 4xx (motivo corto, módulo desconocido, empresa dada de baja) queda a la vista en el diálogo.
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  const pending = module.impact.pending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={busy}
      size="sm"
      title={`¿${wantEnabled ? 'Habilitar' : 'Deshabilitar'} «${module.label}»?`}
      description={`Para ${companyName}. La empresa recibe un aviso y el cambio queda en la auditoría.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {/* Mientras se vuelve a pedir el módulo (el impacto de ahora) no se confirma con datos viejos. */}
          <Button
            type="submit"
            form={FORM_ID}
            variant={wantEnabled ? 'primary' : 'danger'}
            loading={busy}
            disabled={isFetching}
            title={isFetching ? 'Actualizando el estado del módulo…' : undefined}
          >
            {wantEnabled ? 'Habilitar' : 'Deshabilitar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-2">{whatHappens(module, wantEnabled)}</p>

        {!wantEnabled && (
          <section
            aria-label="Lo que queda en curso"
            aria-busy={isFetching || undefined}
            className={cx(
              'rounded-lg border px-3 py-2.5 text-sm',
              pending > 0 ? 'border-warn bg-warn-soft text-ink' : 'border-outline bg-surface-muted text-ink-2',
            )}
          >
            <p className={cx('font-semibold', pending > 0 ? 'text-warn' : 'text-ink')}>
              {pending > 0 ? `Queda${pending === 1 ? '' : 'n'} ${pending} en curso` : 'Nada en curso'}
            </p>
            <p className="mt-0.5">{module.impact.description}</p>
            {isFetching && (
              <p role="status" className="mt-1 text-xs text-muted">
                Actualizando lo que queda en curso…
              </p>
            )}
          </section>
        )}

        {wantEnabled && module.companySwitch === false && (
          <p className="rounded-lg border border-outline bg-info-soft px-3 py-2.5 text-sm text-ink">
            La empresa lo tiene apagado en su configuración: va a estar disponible, pero no se usa hasta que lo
            encienda.
          </p>
        )}

        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}

        <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="space-y-4">
          <FormTextArea
            name="reason"
            label="Motivo"
            required
            maxLength={REASON_MAX}
            placeholder="Por qué cambia: queda en la auditoría y en el aviso a la empresa"
            hint={`${reason.trim().length}/${REASON_MAX}`}
          />
          {createsOverride && (
            <FormInput
              name="expiresOn"
              label="Vence el (opcional)"
              type="date"
              min={toIsoDay(new Date())}
              hint="Sin fecha, la excepción rige hasta que se cambie."
            />
          )}
        </Form>
      </div>
    </Modal>
  );
};
