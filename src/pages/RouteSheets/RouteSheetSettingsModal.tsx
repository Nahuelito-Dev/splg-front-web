import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Form, FormInput, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { PatchRoutePlanningSettingsBody, ProcessConfig, ProcessConfigField } from '../../services/api/types';
import { useUpdateRoutePlanningSettings } from '../../services/queries/routeSheets';
import { notify } from '../../utils/notifications';
import { SettingsMeta } from '../Configuration/components/SettingsMeta';
import { buildProcessSchema, processValues, rangeHint, type ProcessFormValues } from '../Configuration/processRules';

interface Props {
  config: ProcessConfig;
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/** Los interruptores (enteros 0–1) se muestran como casillas con su explicación. */
const SWITCHES: Record<string, { label: string; hint: string }> = {
  enabled: {
    label: 'Hojas de ruta encendidas',
    hint: 'Apagado por omisión: el sistema no propone hojas, «Proponer» responde que está apagado y el despacho sigue como siempre.',
  },
  autoPropose: {
    label: 'Proponer solo al cierre',
    hint: 'A la hora de cierre del día anterior el sistema arma los borradores sin que nadie lo pida.',
  },
  lateOrderPolicy: {
    label: 'Sugerir dónde van los pedidos tardíos',
    hint: 'Para los pedidos que entran después del cierre, el sistema sugiere la hoja y la posición que menos alargan el recorrido.',
  },
};

const isSwitch = (field: ProcessConfigField) => field.type === 'integer' && field.min === 0 && field.max === 1;

/**
 * Los parámetros de las hojas de ruta. El formulario se arma con el esquema que publica el back (rango y tipo de
 * cada campo, los mismos límites que valida `PatchRoutePlanningSettingsDto`).
 */
export const RouteSheetSettingsModal = ({ config, canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const update = useUpdateRoutePlanningSettings();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => buildProcessSchema(config), [config]);
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
    ) as PatchRoutePlanningSettingsBody;
    update.mutate(body, {
      onSuccess: () => {
        notify.success('Hojas de ruta: parámetros guardados');
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
      title="Parámetros de las hojas de ruta"
      description="Rigen desde la próxima propuesta; las hojas ya armadas se recalculan cuando se editan."
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
        {config.fields.map((field) =>
          isSwitch(field) ? (
            <div key={field.key} className="sm:col-span-2">
              <Checkbox
                label={SWITCHES[field.key]?.label ?? field.description}
                hint={SWITCHES[field.key]?.hint}
                disabled={!canWrite}
                checked={methods.watch(field.key) === '1'}
                onChange={(e) =>
                  methods.setValue(field.key, e.target.checked ? '1' : '0', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
          ) : (
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
          ),
        )}
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
