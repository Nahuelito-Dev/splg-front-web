import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal, Select } from '../../../common/components/ui';
import type { Warehouse } from '../../../services/api/types';
import { useCreateWarehouse, useUpdateWarehouse } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';
import { warehouseCreateBody, warehouseSchema, warehouseUpdateBody, type WarehouseFormValues } from './warehouseSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con galpón es edición; sin él, alta. */
  warehouse: Warehouse | null;
}

const KIND_OPTIONS = [
  { value: 'depot', label: 'Galpón' },
  { value: 'branch', label: 'Sucursal' },
];

/** Alta o edición de un galpón (depósito). */
export const WarehouseFormModal = ({ open, onClose, warehouse }: Props) => {
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const saving = createWarehouse.isPending || updateWarehouse.isPending;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: warehouse?.name ?? '',
      code: warehouse?.code ?? '',
      kind: warehouse?.kind ?? 'depot',
      address: warehouse?.address ?? '',
      isDefault: warehouse?.isDefault ?? false,
    });
  }, [open, warehouse, reset]);

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        notify.success(warehouse ? 'Galpón actualizado' : 'Galpón creado');
        onClose();
      },
      onError: notify.error,
    };
    if (warehouse)
      updateWarehouse.mutate({ id: warehouse.warehouseId, body: warehouseUpdateBody(values, warehouse) }, options);
    else createWarehouse.mutate(warehouseCreateBody(values), options);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={warehouse ? 'Editar galpón' : 'Nuevo galpón'}
      description="Un lugar donde la distribuidora guarda garrafas."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="warehouse-form" loading={saving}>
            {warehouse ? 'Guardar cambios' : 'Crear galpón'}
          </Button>
        </>
      }
    >
      <form id="warehouse-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nombre" required maxLength={80} error={errors.name?.message} {...register('name')} />
        <Input
          label="Código"
          required
          maxLength={12}
          hint="Corto y único; se guarda en mayúsculas."
          error={errors.code?.message}
          {...register('code')}
        />
        <Select label="Tipo" options={KIND_OPTIONS} error={errors.kind?.message} {...register('kind')} />
        <Input label="Dirección" maxLength={300} error={errors.address?.message} {...register('address')} />
        <div className="sm:col-span-2">
          <Checkbox
            label="Galpón predeterminado"
            hint="Es el que usa la entrega cuando el camión no tiene stock. No puede estar inactivo."
            {...register('isDefault')}
          />
        </div>
      </form>
    </Modal>
  );
};
