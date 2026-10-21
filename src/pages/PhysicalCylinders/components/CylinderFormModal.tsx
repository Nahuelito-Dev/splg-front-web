import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
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
  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: cylinderEditDefaults(cylinder) });
  const { reset } = methods;

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

  const onSubmit = (values: FormValues) => {
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
  };

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
      <Form methods={methods} id="cylinder-form" onSubmit={onSubmit} className="space-y-4">
        <FormInput
          name="serial"
          label="Número de serie"
          required
          placeholder="Ej: SN-000123"
          hint="Se guarda en mayúsculas."
          maxLength={SERIAL_MAX}
        />
        <FormSelect name="gasCylinderId" label="Tipo de producto" options={productOptions} />
        <FormInput name="deposit" label="Depósito / garantía ($)" type="number" min={0} step="0.01" />
        {editing && (
          <FormInput
            name="manufacturedAt"
            label="Fabricación"
            type="date"
            hint="La última revisión y el vencimiento se cargan con «Registrar revisión» en la ficha."
          />
        )}
      </Form>
    </Modal>
  );
};
