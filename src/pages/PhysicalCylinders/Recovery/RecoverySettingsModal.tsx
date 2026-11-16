import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Form, FormInput, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { PatchRecoverySettingsBody, ProcessConfig } from '../../../services/api/types';
import { useUpdateRecoverySettings } from '../../../services/queries/recovery';
import { notify } from '../../../utils/notifications';
import { SettingsMeta } from '../../Configuration/components/SettingsMeta';
import { buildProcessSchema, processValues, rangeHint, type ProcessFormValues } from '../../Configuration/processRules';

interface Props {
  config: ProcessConfig;
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/** Los parámetros de la recuperación de envases (CU-108 y CU-172): tolerancia, plazo de cada escalón, umbral y oferta de retiro. */
export const RecoverySettingsModal = ({ config, canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const update = useUpdateRecoverySettings();
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
    ) as PatchRecoverySettingsBody;
    update.mutate(body, {
      onSuccess: () => {
        notify.success('Recupero de envases: parámetros guardados');
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
      title="Parámetros del recupero de envases"
      description="Rigen desde la próxima corrida."
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
                label="Recupero de envases encendido"
                hint="Apagado por omisión: mientras esté apagado el proceso no abre casos ni manda avisos a los clientes, y «Correr ahora» no hace nada."
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
