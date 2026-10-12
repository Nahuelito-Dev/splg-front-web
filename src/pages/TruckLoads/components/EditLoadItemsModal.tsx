import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal } from '../../../common/components/ui';
import type { TruckLoad } from '../../../services/api/types';
import { useUpdateTruckLoadItems } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import { useCylinderOptions } from '../../Stock/components/useStockOptions';
import { LoadItemsFields } from './LoadItemsFields';
import { openLoadSchema, type OpenLoadFormValues } from './truckLoadSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  load: TruckLoad;
}

/** Edita los renglones de una carga mientras todavía se está cargando. */
export const EditLoadItemsModal = ({ open, onClose, load }: Props) => {
  const cylinders = useCylinderOptions();
  const update = useUpdateTruckLoadItems();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OpenLoadFormValues>({ resolver: zodResolver(openLoadSchema) });

  useEffect(() => {
    if (open) {
      // Chofer, camión y demás ya están definidos al abrir la carga: acá solo se editan los renglones.
      reset({
        deliveryId: load.deliveryId,
        carId: load.carId,
        helperEmployeeId: '',
        originWarehouseId: '',
        notes: '',
        items: load.items.map((i) => ({
          gasCylinderId: i.gasCylinderId,
          loadedFull: i.loadedFull,
          loadedEmpty: i.loadedEmpty,
        })),
      });
    }
  }, [open, load, reset]);

  const onSubmit = handleSubmit((values) =>
    update.mutate(
      { id: load.loadId, body: { items: values.items } },
      {
        onSuccess: () => {
          notify.success('Renglones actualizados');
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
      size="lg"
      title={`Editar la carga N° ${load.number}`}
      description="Solo se puede mientras se está cargando. Reemplaza los renglones actuales."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-items-form" loading={update.isPending} disabled={cylinders.failed}>
            Guardar renglones
          </Button>
        </>
      }
    >
      {cylinders.failed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar el catálogo de garrafas.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void cylinders.refetch()}>
            Reintentar
          </button>
        </p>
      ) : (
        <form id="edit-items-form" onSubmit={(e) => void onSubmit(e)} noValidate>
          <LoadItemsFields control={control} register={register} errors={errors} cylinders={cylinders.options} />
        </form>
      )}
    </Modal>
  );
};
