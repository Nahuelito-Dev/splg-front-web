import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { useCreateCylinder } from '../../../services/queries/physicalCylinders';
import { notify } from '../../../utils/notifications';

const schema = z.object({
  serial: z.string().trim().min(1, 'El serial es obligatorio'),
  gasCylinderId: z.string(),
  deposit: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Alta de un envase físico: nace en depósito, listo para llenarse. */
export const CreateCylinderModal = ({ open, onClose }: Props) => {
  const createCylinder = useCreateCylinder();
  const { data: catalog } = useGasCylinders({ page: 0, pageSize: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serial: '', gasCylinderId: '', deposit: 0 },
  });

  useEffect(() => {
    if (open) reset({ serial: '', gasCylinderId: '', deposit: 0 });
  }, [open, reset]);

  const productOptions = useMemo(
    () => [
      { value: '', label: '— Sin asociar —' },
      ...(catalog?.rows ?? []).map((c) => ({ value: c.gas_cylinder_id, label: c.type })),
    ],
    [catalog],
  );

  const onSubmit = handleSubmit(({ serial, gasCylinderId, deposit }) =>
    createCylinder.mutate(
      { serial, gasCylinderId: gasCylinderId || undefined, deposit },
      {
        onSuccess: () => {
          notify.success('Envase creado');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo envase"
      description="Nace en depósito, listo para llenarse."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cylinder-create-form" loading={createCylinder.isPending}>
            Crear envase
          </Button>
        </>
      }
    >
      <form id="cylinder-create-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Input
          label="Número de serie"
          required
          placeholder="Ej: SN-000123"
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
      </form>
    </Modal>
  );
};
