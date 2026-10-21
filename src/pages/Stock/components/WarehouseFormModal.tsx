import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormCheckbox, FormSelect, Form } from '../../../common/components/ui';
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
  const methods = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseSchema) });
  const { reset } = methods;

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

  const onSubmit = (values: WarehouseFormValues) => {
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
  };

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
      <Form methods={methods} id="warehouse-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="name" label="Nombre" required maxLength={80} />
        <FormInput name="code" label="Código" required maxLength={12} hint="Corto y único; se guarda en mayúsculas." />
        <FormSelect name="kind" label="Tipo" options={KIND_OPTIONS} />
        <FormInput name="address" label="Dirección" maxLength={300} />
        <div className="sm:col-span-2">
          <FormCheckbox
            name="isDefault"
            label="Galpón predeterminado"
            hint="Es el que usa la entrega cuando el camión no tiene stock. No puede estar inactivo."
          />
        </div>
      </Form>
    </Modal>
  );
};
