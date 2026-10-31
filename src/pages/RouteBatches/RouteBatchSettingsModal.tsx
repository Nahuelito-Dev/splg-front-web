import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Form, FormInput, Modal } from '../../common/components/ui';
import { errorMessage } from '../../services/api/errors';
import type { PatchRouteBatchSettingsBody, ProcessConfig } from '../../services/api/types';
import { useUpdateRouteBatchSettings } from '../../services/queries/routeBatches';
import { notify } from '../../utils/notifications';
import { SettingsMeta } from '../Configuration/components/SettingsMeta';
import { buildProcessSchema, processValues, rangeHint, type ProcessFormValues } from '../Configuration/processRules';

interface Props {
  config: ProcessConfig;
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/** Los parámetros de la agrupación por recorrido (CU-107 y CU-172): tamaño, radio, tolerancia, vigencia y frecuencia. */
export const RouteBatchSettingsModal = ({ config, canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const update = useUpdateRouteBatchSettings();
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
    ) as PatchRouteBatchSettingsBody;
    update.mutate(body, {
      onSuccess: () => {
        notify.success('Recorridos: parámetros guardados');
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
      title="Parámetros de los recorridos"
      description="Rigen desde la próxima pasada del proceso; las ofertas ya hechas conservan su vigencia."
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
          field.key === 'enabled' ? (
            <div key={field.key} className="sm:col-span-2">
              <Checkbox
                label="Recorridos encendido"
                hint="Apagado por omisión: mientras esté apagado el proceso no arma lotes, «Armar ahora» responde que está apagado y el despacho individual funciona como siempre."
                disabled={!canWrite}
                checked={methods.watch('enabled') === '1'}
                onChange={(e) =>
                  methods.setValue('enabled', e.target.checked ? '1' : '0', {
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
