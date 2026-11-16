import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { Supplier } from '../../../services/api/types';
import { useCreateSupplier, useUpdateSupplier } from '../../../services/queries/purchases';
import { normalizeCuit } from '../../../utils/cuit';
import { notify } from '../../../utils/notifications';
import { supplierSchema, type SupplierFormValues } from './supplierSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con proveedor es edición; sin él, alta. */
  supplier: Supplier | null;
}

const KIND_OPTIONS = [
  { value: 'filling_plant', label: 'Planta fraccionadora' },
  { value: 'other', label: 'Otro' },
];

/** Alta o edición de un proveedor. */
export const SupplierFormModal = ({ open, onClose, supplier }: Props) => {
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const scope = 'supplier:new';
  const methods = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset({
      businessName: supplier?.businessName ?? '',
      cuit: supplier?.cuit ?? '',
      kind: supplier?.kind ?? 'filling_plant',
      contactName: supplier?.contactName ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      paymentTermsDays: supplier?.paymentTermsDays?.toString() ?? '',
    });
  }, [open, supplier, reset]);

  const onSubmit = (values: SupplierFormValues) => {
    const body = {
      businessName: values.businessName,
      cuit: normalizeCuit(values.cuit),
      kind: values.kind,
      // El vacío se manda como nulo para limpiar el dato guardado.
      contactName: values.contactName || null,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      paymentTermsDays: values.paymentTermsDays === '' ? null : Number(values.paymentTermsDays),
    };
    const options = {
      onSuccess: () => {
        notify.success(supplier ? 'Proveedor actualizado' : 'Proveedor creado');
        onClose();
      },
      onError: notify.error,
    };
    if (supplier) update.mutate({ id: supplier.supplierId, body }, options);
    else create.mutate({ body, scope }, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      description="A quién le compra garrafas la distribuidora."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="supplier-form" loading={create.isPending || update.isPending}>
            {supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="supplier-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput name="businessName" label="Razón social" required maxLength={120} />
        </div>
        <FormInput
          name="cuit"
          label="CUIT"
          required
          placeholder="30-71512345-9"
          hint="Se valida el dígito verificador. Único entre los proveedores vigentes."
        />
        <FormSelect name="kind" label="Tipo" options={KIND_OPTIONS} />
        <FormInput name="contactName" label="Contacto" maxLength={80} />
        <FormInput name="phone" label="Teléfono" maxLength={30} />
        <FormInput name="email" label="Email" type="email" maxLength={120} />
        <FormInput
          name="paymentTermsDays"
          label="Plazo de pago (días)"
          type="number"
          min={0}
          max={365}
          hint="0 = contado"
        />
        <div className="sm:col-span-2">
          <FormInput name="address" label="Dirección" maxLength={300} />
        </div>
      </Form>
    </Modal>
  );
};
