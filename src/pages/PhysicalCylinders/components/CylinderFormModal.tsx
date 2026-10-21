import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { useCreateCylinder, useUpdateCylinder } from '../../../services/queries/physicalCylinders';
import { useResetOnOpen } from '../../../hooks/useResetOnOpen';
import { notify } from '../../../utils/notifications';
import { SERIAL_MAX, serialSchema } from '../parseSerials';
import { buildCylinderUpdate, cylinderEditDefaults } from '../cylinderEdit';

const schema = z.object({
  serial: serialSchema,
  gasCylinderId: z.string(),
  deposit: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo'),
  manufacturedAt: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con envase, se edita; sin él, es un alta. */
  cylinder?: Cylinder | null;
}

/** Alta (nace en depósito) o edición de los datos maestros de un envase físico. */
export const CylinderFormModal = ({ open, onClose, cylinder }: Props) => {
  const createCylinder = useCreateCylinder();
  const updateCylinder = useUpdateCylinder();
  const editing = Boolean(cylinder);
  const { data: catalog } = useGasCylinders({ page: 0, pageSize: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: cylinderEditDefaults(cylinder) });

  useResetOnOpen(open, () => reset(cylinderEditDefaults(cylinder)));

  const productOptions = useMemo(
    () => [
      { value: '', label: '— Sin asociar —' },
      ...(catalog?.rows ?? []).map((c) => ({ value: c.gas_cylinder_id, label: c.type })),
    ],
    [catalog],
  );

  const onSuccess = (message: string) => ({
    onSuccess: () => {
      notify.success(message);
      onClose();
    },
    onError: notify.error,
  });

  const onSubmit = handleSubmit((values) => {
    if (cylinder) {
      // Sólo lo que cambió; sin cambios no se llama a la API ni se muestra un éxito que no fue.
      const body = buildCylinderUpdate(cylinder, values);
      if (Object.keys(body).length === 0) {
        notify.info('No hay cambios para guardar');
        return;
      }
      updateCylinder.mutate({ id: cylinder.cylinder_id, body }, onSuccess('Envase actualizado'));
      return;
    }
    createCylinder.mutate(
      { serial: values.serial, gasCylinderId: values.gasCylinderId || undefined, deposit: values.deposit },
      onSuccess('Envase creado'),
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar envase' : 'Nuevo envase'}
      description={editing ? 'El estado cambia con «Mover de estado».' : 'Nace en depósito, listo para llenarse.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cylinder-form" loading={createCylinder.isPending || updateCylinder.isPending}>
            {editing ? 'Guardar cambios' : 'Crear envase'}
          </Button>
        </>
      }
    >
      <form id="cylinder-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Input
          label="Número de serie"
          required
          placeholder="Ej: SN-000123"
          hint="Se guarda en mayúsculas."
          maxLength={SERIAL_MAX}
          error={errors.serial?.message}
          {...register('serial')}
        />
        <Select label="Tipo de producto" options={productOptions} {...register('gasCylinderId')} />
        <Input
          label="Depósito / garantía ($)"
          type="number"
          min={0}
          step="0.01"
          error={errors.deposit?.message}
          {...register('deposit')}
        />
        {editing && (
          <Input
            label="Fabricación"
            type="date"
            hint="La última revisión y el vencimiento se cargan con «Registrar revisión» en la ficha."
            {...register('manufacturedAt')}
          />
        )}
      </form>
    </Modal>
  );
};
