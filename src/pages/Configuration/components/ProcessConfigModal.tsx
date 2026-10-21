import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RotateCcw } from 'lucide-react';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { ProcessConfig } from '../../../services/api/types';
import { useUpdateProcessConfig } from '../../../services/queries/moduleConfig';
import { confirm, notify } from '../../../utils/notifications';
import { buildProcessSchema, processValues, rangeHint, toProcessBody, type ProcessFormValues } from '../processRules';
import { SettingsMeta } from './SettingsMeta';

interface Props {
  config: ProcessConfig;
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/** Edita los parámetros de un proceso automático: los campos salen del esquema que publica el back (CU-172). */
export const ProcessConfigModal = ({ config, canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const update = useUpdateProcessConfig();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<ProcessFormValues>({
    resolver: zodResolver(buildProcessSchema(config)),
    mode: 'onChange',
    defaultValues: processValues(config),
  });
  const {
    formState: { isDirty, isValid },
  } = methods;

  const save = (body: ReturnType<typeof toProcessBody>, successText: string) => {
    setServerError(null);
    update.mutate(
      { process: config.process, body },
      {
        onSuccess: () => {
          notify.success(successText);
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  const submit = (values: ProcessFormValues) =>
    save(toProcessBody(config, values), `${config.title}: parámetros guardados`);

  const restoreDefaults = async () => {
    const ok = await confirm({
      title: '¿Restablecer los valores por defecto?',
      text: 'Se descartan los parámetros configurados de este proceso y vuelven los de fábrica. Rigen desde su próxima ejecución.',
      confirmText: 'Restablecer',
    });
    if (ok) save({}, `${config.title}: valores por defecto restablecidos`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={update.isPending}
      size="md"
      title={config.title}
      description={config.description}
      footer={
        <>
          <Button
            variant="secondary"
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            disabled={!canWrite || config.isDefault || update.isPending}
            title={writeHint}
            onClick={() => void restoreDefaults()}
          >
            Restablecer valores por defecto
          </Button>
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
        {config.fields.map((field) => (
          <div key={field.key}>
            <FormInput
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
          </div>
        ))}
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
