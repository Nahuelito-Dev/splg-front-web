import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, FormTextArea, Modal } from '../../../../common/components/ui';
import type { CustomerContainerAccount } from '../../../../services/api/customerContainers';
import { errorMessage } from '../../../../services/api/errors';
import { useAdjustCustomerContainers } from '../../../../services/queries/customerContainers';
import { notify } from '../../../../utils/notifications';
import { adjustSchema, NOTE_MAX, NOTE_MIN, QUANTITY_MAX, toAdjustBody, type AdjustFormValues } from './containerRules';

const FORM_ID = 'container-adjust-form';

const DIRECTIONS = [
  { value: 'add', label: 'Sumar' },
  { value: 'remove', label: 'Restar' },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  accounts: CustomerContainerAccount[];
}

/**
 * Corrige a mano cuántos envases propios de un tipo tiene el cliente (F35 E2). El motivo es obligatorio y queda en el
 * historial. Un doble clic no manda dos ajustes: hay un solo envío en vuelo y, si se reintenta, va con la misma clave.
 */
export const ContainerAdjustModal = ({ open, onClose, customerId, accounts }: Props) => {
  const adjust = useAdjustCustomerContainers();
  const sending = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<AdjustFormValues>({ resolver: zodResolver(adjustSchema) });
  const { reset, watch, register, formState } = methods;

  // Sólo al abrir (el id es un texto: si la cuenta se refresca con el modal abierto no se pisa lo que se carga).
  const firstTypeId = accounts[0]?.gasCylinderId ?? '';
  useEffect(() => {
    if (open) {
      // La cantidad arranca vacía: con un valor cargado, escribir «5» terminaba en «15».
      reset({ gasCylinderId: firstTypeId, direction: 'add', count: undefined, note: '' });
      setServerError(null);
    }
  }, [open, reset, firstTypeId]);

  const selected = accounts.find((a) => a.gasCylinderId === watch('gasCylinderId'));
  const typeOptions = accounts.map((a) => ({
    value: a.gasCylinderId,
    label: a.isActive ? a.type : `${a.type} (dado de baja)`,
  }));

  const submit = (values: AdjustFormValues) => {
    if (sending.current) return;
    sending.current = true;
    setServerError(null);
    adjust.mutate(
      { customerId, body: toAdjustBody(values) },
      {
        onSuccess: (account) => {
          notify.success(`Envases de ${account.type} ajustados: ahora tiene ${account.owned} propios`);
          onClose();
        },
        onError: (error) => setServerError(errorMessage(error)),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  const directionError = formState.errors.direction?.message;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={adjust.isPending}
      size="md"
      title="Ajustar envases"
      description="Corregí cuántos envases propios tiene el cliente. El motivo queda en el historial."
      footer={
        <>
          <Button variant="secondary" disabled={adjust.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={adjust.isPending}>
            Guardar ajuste
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={submit} className="grid gap-4">
        <FormSelect
          name="gasCylinderId"
          label="Tipo de garrafa"
          required
          options={typeOptions}
          hint={selected ? `Hoy tiene ${selected.owned} propios` : undefined}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">¿Sumás o restás?</legend>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-outline p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input type="radio" value={option.value} aria-label={option.label} {...register('direction')} />
                <span className="font-medium text-ink">{option.label}</span>
              </label>
            ))}
          </div>
          {directionError && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {directionError}
            </p>
          )}
        </fieldset>
        <FormInput name="count" label="Cantidad" type="number" min={1} max={QUANTITY_MAX} step={1} required />
        <FormTextArea
          name="note"
          label="Motivo"
          required
          maxLength={NOTE_MAX}
          placeholder="Por qué cambia la cantidad de envases del cliente"
          hint={`De ${NOTE_MIN} a ${NOTE_MAX} caracteres.`}
        />
      </Form>
      {serverError && (
        <p role="alert" className="mt-4 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      )}
    </Modal>
  );
};
