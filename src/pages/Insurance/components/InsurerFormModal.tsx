import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormTextArea, Modal } from '../../../common/components/ui';
import type { Insurer } from '../../../services/api/types';
import { useCreateInsurer, useUpdateInsurer } from '../../../services/queries/insurance';
import { normalizeCuit } from '../../../utils/cuit';
import { notify } from '../../../utils/notifications';
import { insurerSchema, type InsurerFormValues } from '../insuranceSchemas';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con aseguradora es edición; sin ella, alta. */
  insurer: Insurer | null;
  /** Se llama con la aseguradora recién creada (p. ej. para elegirla en el formulario de la póliza). */
  onSaved?: (insurer: Insurer) => void;
}

const EMPTY: InsurerFormValues = { name: '', taxId: '', phone: '', email: '', website: '', paymentUrl: '', notes: '' };

/** Alta o edición de una aseguradora. */
export const InsurerFormModal = ({ open, onClose, insurer, onSaved }: Props) => {
  const create = useCreateInsurer();
  const update = useUpdateInsurer();
  const methods = useForm<InsurerFormValues>({ resolver: zodResolver(insurerSchema), defaultValues: EMPTY });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset(
      insurer
        ? {
            name: insurer.name,
            taxId: insurer.taxId ?? '',
            phone: insurer.phone ?? '',
            email: insurer.email ?? '',
            website: insurer.website ?? '',
            paymentUrl: insurer.paymentUrl ?? '',
            notes: insurer.notes ?? '',
          }
        : EMPTY,
    );
  }, [open, insurer, reset]);

  const saving = create.isPending || update.isPending;

  const onSubmit = (values: InsurerFormValues) => {
    const body = {
      name: values.name,
      // El vacío se manda como nulo para limpiar el dato guardado.
      taxId: values.taxId ? normalizeCuit(values.taxId) : null,
      phone: values.phone || null,
      email: values.email || null,
      website: values.website || null,
      paymentUrl: values.paymentUrl || null,
      notes: values.notes || null,
    };
    const options = {
      onSuccess: (saved: Insurer) => {
        notify.success(insurer ? 'Aseguradora actualizada' : 'Aseguradora creada');
        onSaved?.(saved);
        onClose();
      },
      onError: notify.error,
    };
    if (insurer) update.mutate({ id: insurer.insurerId, body }, options);
    else create.mutate({ body, scope: 'insurer:new' }, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      size="md"
      title={insurer ? 'Editar aseguradora' : 'Nueva aseguradora'}
      description="La compañía que asegura los vehículos. Su enlace de pago es el que abre el botón «Pagar» de cada cuota."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="insurer-form" loading={saving}>
            {insurer ? 'Guardar cambios' : 'Crear aseguradora'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="insurer-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput name="name" label="Nombre" required maxLength={120} />
        </div>
        <FormInput name="taxId" label="CUIT" placeholder="30-71512345-9" hint="Se valida el dígito verificador." />
        <FormInput name="phone" label="Teléfono" maxLength={30} />
        <FormInput name="email" label="Email" type="email" maxLength={120} />
        <FormInput name="website" label="Sitio web" maxLength={200} />
        <div className="sm:col-span-2">
          <FormInput
            name="paymentUrl"
            label="Enlace de pago"
            maxLength={500}
            placeholder="https://…"
            hint="Donde se pagan las cuotas (portal de la aseguradora, Mercado Pago…)."
          />
        </div>
        <div className="sm:col-span-2">
          <FormTextArea name="notes" label="Notas" maxLength={1000} rows={2} />
        </div>
      </Form>
    </Modal>
  );
};
