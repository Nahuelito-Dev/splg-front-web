import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, Select, TextArea } from '../../../common/components/ui';
import type { TruckLoad } from '../../../services/api/types';
import { useEmployees } from '../../../services/queries/employees';
import { useVehicleInUse } from '../../../services/queries/fleet';
import { useCreateTruckLoad } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';
import {
  useCylinderOptions,
  useDriverOptions,
  useWarehouseOptions,
  withPlaceholder,
} from '../../Stock/components/useStockOptions';
import { LoadItemsFields } from './LoadItemsFields';
import { openLoadSchema, type OpenLoadFormValues } from './truckLoadSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (load: TruckLoad) => void;
}

/** Abre la carga del día: camión + chofer (+ ayudante) + galpón de origen y lo que se va a cargar. No mueve stock todavía. */
export const OpenTruckLoadModal = ({ open, onClose, onCreated }: Props) => {
  const drivers = useDriverOptions();
  const warehouses = useWarehouseOptions();
  const cylinders = useCylinderOptions();
  const helpers = useEmployees({ page: 0, pageSize: 100 }, { status: 'active' }, open);
  const create = useCreateTruckLoad();
  const scope = 'load:new';
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<OpenLoadFormValues>({ resolver: zodResolver(openLoadSchema) });

  useEffect(() => {
    if (open) {
      reset({
        deliveryId: '',
        carId: '',
        helperEmployeeId: '',
        originWarehouseId: '',
        notes: '',
        items: [{ gasCylinderId: '', loadedFull: 1, loadedEmpty: 0 }],
      });
    }
  }, [open, reset]);

  // Al elegir chofer se sugiere el camión que tiene en uso: la API exige que esté en uso por él.
  const deliveryId = watch('deliveryId');
  const inUse = useVehicleInUse(deliveryId || undefined, open);
  const carOptions =
    deliveryId && inUse.data
      ? [
          {
            value: inUse.data.carId,
            label: `${inUse.data.carPatent ?? 'Sin patente'} · ${inUse.data.carBrand ?? ''} ${
              inUse.data.carModel ?? ''
            }`.trim(),
          },
        ]
      : [];
  useEffect(() => {
    if (inUse.data?.carId) setValue('carId', inUse.data.carId);
  }, [inUse.data, setValue]);

  const onSubmit = handleSubmit((values) =>
    create.mutate(
      {
        scope,
        body: {
          carId: values.carId,
          deliveryId: values.deliveryId,
          helperEmployeeId: values.helperEmployeeId || undefined,
          originWarehouseId: values.originWarehouseId || undefined,
          notes: values.notes || undefined,
          items: values.items,
        },
      },
      {
        onSuccess: (load) => {
          notify.success(`Carga N° ${load.number} abierta`);
          onClose();
          onCreated(load);
        },
        onError: notify.error,
      },
    ),
  );

  const loadFailed = drivers.failed || warehouses.failed || cylinders.failed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Abrir carga del camión"
      description="Un camión y un chofer tienen una sola carga abierta. El stock sale del galpón recién cuando el camión sale."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="open-load-form" loading={create.isPending} disabled={loadFailed}>
            Abrir carga
          </Button>
        </>
      }
    >
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los choferes, galpones o garrafas.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              void drivers.refetch();
              void warehouses.refetch();
              void cylinders.refetch();
            }}
          >
            Reintentar
          </button>
        </p>
      ) : (
        <form id="open-load-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Chofer"
              required
              options={withPlaceholder(drivers.options)}
              hint={drivers.limited ? 'Se muestran los primeros 100 choferes.' : undefined}
              error={errors.deliveryId?.message}
              {...register('deliveryId', { onChange: () => setValue('carId', '') })}
            />
            <Select
              label="Camión"
              required
              options={withPlaceholder(carOptions)}
              disabled={!deliveryId || inUse.isPending || !inUse.data}
              hint={
                deliveryId && inUse.isSuccess && !inUse.data
                  ? 'El chofer no tiene un camión en uso: asignáselo antes en Vehículos.'
                  : deliveryId
                    ? 'Camión en uso por el chofer.'
                    : 'Elegí el chofer para ver su camión en uso.'
              }
              error={errors.carId?.message}
              {...register('carId')}
            />
            <Select
              label="Ayudante (opcional)"
              options={withPlaceholder(
                (helpers.data?.rows ?? []).map((e) => ({ value: e.employeeId, label: `${e.firstName} ${e.lastName}` })),
                'Sin ayudante',
              )}
              hint={
                helpers.isError
                  ? 'No se pudieron cargar los legajos'
                  : (helpers.data?.total ?? 0) > (helpers.data?.rows.length ?? 0)
                    ? 'Se muestran los primeros 100 legajos activos.'
                    : undefined
              }
              {...register('helperEmployeeId')}
            />
            <Select
              label="Sale del galpón"
              options={withPlaceholder(warehouses.options, 'Galpón predeterminado')}
              {...register('originWarehouseId')}
            />
          </div>
          {inUse.isError && (
            <p role="alert" className="text-sm text-danger">
              No se pudo consultar el camión en uso del chofer.{' '}
              <button type="button" className="font-semibold underline" onClick={() => void inUse.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          <LoadItemsFields
            control={control}
            register={register}
            errors={errors}
            cylinders={cylinders.options}
            cylindersLimited={cylinders.limited}
          />
          <TextArea label="Notas (opcional)" maxLength={300} error={errors.notes?.message} {...register('notes')} />
        </form>
      )}
    </Modal>
  );
};
