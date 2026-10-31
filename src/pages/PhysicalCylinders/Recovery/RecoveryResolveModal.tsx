import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { RecoveryCase } from '../../../services/api/types';
import { useResolveRecoveryCase } from '../../../services/queries/recovery';
import { formatCurrencyExact } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { DECISIONS } from './recoveryLabels';
import { NOTE_MAX, NOTE_MIN, resolveSchema, toResolveBody, type ResolveFormValues } from './recoveryRules';

const FORM_ID = 'recovery-resolve-form';

interface Props {
  recoveryCase: Pick<RecoveryCase, 'caseId' | 'depositAmount' | 'cylinder' | 'customer'>;
  onClose: () => void;
}

/**
 * El administrador decide un caso escalado o perdido (CU-108, paso 11): cobrar el depósito, dar el envase de baja o
 * cerrar sin cargo. La nota es obligatoria y queda con quién decidió; el sistema nunca cobra por su cuenta.
 */
export const RecoveryResolveModal = ({ recoveryCase, onClose }: Props) => {
  const resolve = useResolveRecoveryCase();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<ResolveFormValues>({
    resolver: zodResolver(resolveSchema),
    mode: 'onChange',
    defaultValues: { decision: undefined, note: '' },
  });
  const {
    register,
    watch,
    formState: { errors, isValid },
  } = methods;
  const decision = watch('decision');
  const help = DECISIONS.find((d) => d.value === decision)?.help;

  const submit = (values: ResolveFormValues) => {
    setServerError(null);
    resolve.mutate(
      { id: recoveryCase.caseId, body: toResolveBody(values) },
      {
        onSuccess: () => {
          notify.success('Decisión registrada');
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={resolve.isPending}
      size="md"
      title="Decidir el caso"
      description={`${recoveryCase.cylinder.serial} · ${recoveryCase.customer.fullName ?? 'Cliente'} · ${formatCurrencyExact(recoveryCase.depositAmount)}`}
      footer={
        <>
          <Button variant="secondary" disabled={resolve.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={resolve.isPending} disabled={!isValid}>
            Registrar decisión
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={submit} className="grid gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">¿Qué decidís?</legend>
          <div className="grid gap-2">
            {DECISIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input type="radio" value={option.value} className="mt-1" {...register('decision')} />
                <span className="font-medium text-ink">{option.label}</span>
              </label>
            ))}
          </div>
          {help && <p className="mt-2 text-xs text-muted">{help}</p>}
          {errors.decision && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errors.decision.message}
            </p>
          )}
        </fieldset>
        <FormTextArea
          name="note"
          label="Motivo de la decisión"
          maxLength={NOTE_MAX}
          required
          minLength={NOTE_MIN}
          hint={`De ${NOTE_MIN} a ${NOTE_MAX} caracteres. Queda en el caso, con quién decidió.`}
        />
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
