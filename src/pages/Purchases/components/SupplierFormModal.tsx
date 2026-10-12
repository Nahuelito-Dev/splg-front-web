import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema) });

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

  const onSubmit = handleSubmit((values) => {
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
  });

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
      <form id="supplier-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input
            label="Razón social"
            required
            maxLength={120}
            error={errors.businessName?.message}
            {...register('businessName')}
          />
        </div>
        <Input
          label="CUIT"
          required
          placeholder="30-71512345-9"
          hint="Se valida el dígito verificador. Único entre los proveedores vigentes."
          error={errors.cuit?.message}
          {...register('cuit')}
        />
        <Select label="Tipo" options={KIND_OPTIONS} error={errors.kind?.message} {...register('kind')} />
        <Input label="Contacto" maxLength={80} error={errors.contactName?.message} {...register('contactName')} />
        <Input label="Teléfono" maxLength={30} error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" type="email" maxLength={120} error={errors.email?.message} {...register('email')} />
        <Input
          label="Plazo de pago (días)"
          type="number"
          min={0}
          max={365}
          hint="0 = contado"
          error={errors.paymentTermsDays?.message}
          {...register('paymentTermsDays')}
        />
        <div className="sm:col-span-2">
          <Input label="Dirección" maxLength={300} error={errors.address?.message} {...register('address')} />
        </div>
      </form>
    </Modal>
  );
};
