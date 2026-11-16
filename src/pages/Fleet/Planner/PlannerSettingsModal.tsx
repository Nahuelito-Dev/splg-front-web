import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Form, FormInput, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { PatchPlannerSettingsBody, ProcessConfig } from '../../../services/api/types';
import { useUpdatePlannerSettings } from '../../../services/queries/planner';
import { notify } from '../../../utils/notifications';
import { processValues, rangeHint, type ProcessFormValues } from '../../Configuration/processRules';
import { SettingsMeta } from '../../Configuration/components/SettingsMeta';
import { WORKSHOP_DAYS, buildSettingsSchema, hasWorkshopDay, toggleWorkshopDay } from './plannerRules';

interface Props {
  config: ProcessConfig;
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/** Los parámetros del planificador de taller (CU-105 y CU-172): rangos, horario de taller, vigencia y alternativas. */
export const PlannerSettingsModal = ({ config, canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const update = useUpdatePlannerSettings();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => buildSettingsSchema(config), [config]);
  const methods = useForm<ProcessFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: processValues(config),
  });
  const {
    formState: { isDirty, isValid },
  } = methods;

  const submit = (values: ProcessFormValues) => {
    setServerError(null);
    const body = Object.fromEntries(
      config.fields.map((f) => [f.key, Number(values[f.key])]),
    ) as PatchPlannerSettingsBody;
    update.mutate(body, {
      onSuccess: () => {
        notify.success('Planificador de taller: parámetros guardados');
        onClose();
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={update.isPending}
      size="md"
      title="Parámetros del planificador"
      description="Rigen desde la próxima corrida del planificador."
      footer={
        <>
          <Button variant="secondary" disabled={update.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={update.isPending}
            disabled={!canWrite || !isDirty || !isValid}
            title={writeHint}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <SettingsMeta
        isDefault={config.isDefault}
        updatedAt={config.updatedAt}
        updatedByUserId={config.updatedByUserId}
      />
      <Form methods={methods} id={formId} onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        {config.fields.map((field) => {
          if (field.key === 'workshopDays') {
            const mask = Number(methods.watch('workshopDays'));
            return (
              <fieldset key={field.key} className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium text-ink">Días de taller</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {WORKSHOP_DAYS.map(({ bit, label }) => (
                    <Checkbox
                      key={bit}
                      label={label}
                      disabled={!canWrite}
                      checked={Number.isFinite(mask) && hasWorkshopDay(mask, bit)}
                      onChange={(e) =>
                        methods.setValue(
                          'workshopDays',
                          String(toggleWorkshopDay(Number.isFinite(mask) ? mask : 0, bit, e.target.checked)),
                          { shouldDirty: true, shouldValidate: true },
                        )
                      }
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Los feriados nacionales no se ofrecen aunque el día esté marcado.
                </p>
                {Number.isFinite(mask) && (mask & 127) === 0 && (
                  <p role="alert" className="mt-1 text-xs text-danger">
                    Elegí al menos un día de taller
                  </p>
                )}
              </fieldset>
            );
          }
          if (field.key === 'driverEmail') {
            return (
              <div key={field.key} className="sm:col-span-2">
                <Checkbox
                  label="Mandar también un correo al chofer cuando se le propone una ventana"
                  hint="Por defecto no: la propuesta le llega por la app (socket y notificación)."
                  disabled={!canWrite}
                  checked={methods.watch('driverEmail') === '1'}
                  onChange={(e) =>
                    methods.setValue('driverEmail', e.target.checked ? '1' : '0', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>
            );
          }
          return (
            <FormInput
              key={field.key}
              name={field.key}
              label={field.description}
              type="number"
              inputMode="decimal"
              step={field.type === 'integer' ? 1 : 'any'}
              min={field.min}
              max={field.max}
              hint={rangeHint(field)}
              disabled={!canWrite}
            />
          );
        })}
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
