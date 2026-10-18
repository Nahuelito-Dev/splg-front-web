import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { VehicleAccident } from '../../../services/api/types';
import { useCreateVehicleAccident, useUpdateVehicleAccident } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';
import { ACCIDENT_STATUS, labelOf } from '../../../utils/statusLabels';
import { fromLocalInput, toLocalInput } from '../fleetExpenseDates';
import { accidentSchema, nextAccidentStatuses, type AccidentFormValues } from '../fleetExpenseSchemas';
import { useCarOptions } from './useCarOptions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con siniestro es edición y avance del ciclo (CU-327); sin él, alta (CU-201). */
  accident: VehicleAccident | null;
  fixedCarId?: string;
}

const EMPTY: AccidentFormValues = {
  carId: '',
  occurredAt: '',
  location: '',
  address: '',
  description: '',
  injuries: false,
  thirdPartiesInvolved: false,
  hazmatRelease: false,
  policeReportNumber: '',
  insurerClaimNumber: '',
  vehicleUnusable: false,
  status: 'reported',
};

/** Alta o edición de un siniestro. Dejar el vehículo inutilizable lo pasa a fuera de servicio y libera a su chofer. */
export const VehicleAccidentFormModal = ({ open, onClose, accident, fixedCarId }: Props) => {
  const isEditing = Boolean(accident);
  const create = useCreateVehicleAccident();
  const update = useUpdateVehicleAccident();
  const { options: carOptions } = useCarOptions('Elegí un vehículo');
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AccidentFormValues>({ resolver: zodResolver(accidentSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      accident
        ? {
            carId: accident.carId,
            occurredAt: toLocalInput(accident.occurredAt),
            location: accident.location ?? '',
            address: accident.address ?? '',
            description: accident.description,
            injuries: accident.injuries,
            thirdPartiesInvolved: accident.thirdPartiesInvolved,
            hazmatRelease: accident.hazmatRelease,
            policeReportNumber: accident.policeReportNumber ?? '',
            insurerClaimNumber: accident.insurerClaimNumber ?? '',
            vehicleUnusable: accident.vehicleUnusable,
            status: accident.status === 'closed' ? 'repairing' : accident.status,
          }
        : { ...EMPTY, carId: fixedCarId ?? '', occurredAt: toLocalInput(new Date()) },
    );
  }, [open, accident, fixedCarId, reset]);

  const unusable = watch('vehicleUnusable');
  const hazmat = watch('hazmatRelease');
  const saving = create.isPending || update.isPending;
  const statusOptions = (accident ? nextAccidentStatuses(accident.status) : []).map((value) => ({
    value,
    label: labelOf(ACCIDENT_STATUS, value).text,
  }));

  const onSubmit = handleSubmit((values) => {
    const body = {
      occurredAt: fromLocalInput(values.occurredAt) ?? new Date().toISOString(),
      location: values.location || null,
      address: values.address || null,
      description: values.description,
      injuries: values.injuries,
      thirdPartiesInvolved: values.thirdPartiesInvolved,
      hazmatRelease: values.hazmatRelease,
      policeReportNumber: values.policeReportNumber || null,
      insurerClaimNumber: values.insurerClaimNumber || null,
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Siniestro actualizado' : 'Siniestro registrado');
        onClose();
      },
      onError: notify.error,
    };
    if (accident) {
      const status = values.status === accident.status || values.status === 'reported' ? undefined : values.status;
      update.mutate({ id: accident.accidentId, body: { ...body, status } }, options);
    } else create.mutate({ ...body, carId: values.carId, vehicleUnusable: values.vehicleUnusable }, options);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={saving}
      size="md"
      title={isEditing ? 'Editar siniestro' : 'Nuevo siniestro'}
      description={isEditing ? (accident?.carPatent ?? undefined) : 'Nace denunciado.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="accident-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Registrar siniestro'}
          </Button>
        </>
      }
    >
      <form id="accident-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Select
            label="Vehículo"
            required
            options={carOptions}
            disabled={isEditing || Boolean(fixedCarId)}
            error={errors.carId?.message}
            {...register('carId')}
          />
        </div>
        <Input
          label="Cuándo ocurrió"
          type="datetime-local"
          required
          error={errors.occurredAt?.message}
          {...register('occurredAt')}
        />
        {isEditing ? (
          <Select
            label="Estado"
            options={statusOptions}
            hint="Avanza de a un paso; el cierre se hace aparte."
            error={errors.status?.message}
            {...register('status')}
          />
        ) : (
          <Input
            label="Punto en el mapa"
            placeholder="-27.3671,-55.8961"
            hint="Latitud y longitud."
            error={errors.location?.message}
            {...register('location')}
          />
        )}
        {isEditing && (
          <Input
            label="Punto en el mapa"
            placeholder="-27.3671,-55.8961"
            hint="Latitud y longitud."
            error={errors.location?.message}
            {...register('location')}
          />
        )}
        <Input label="Dirección" maxLength={300} error={errors.address?.message} {...register('address')} />
        <div className="sm:col-span-2">
          <TextArea
            label="Qué pasó"
            required
            maxLength={2000}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
        <Input
          label="Denuncia policial"
          maxLength={40}
          error={errors.policeReportNumber?.message}
          {...register('policeReportNumber')}
        />
        <Input
          label="Reclamo al seguro"
          maxLength={40}
          error={errors.insurerClaimNumber?.message}
          {...register('insurerClaimNumber')}
        />
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Checkbox label="Hubo heridos" {...register('injuries')} />
          <Checkbox label="Hay terceros involucrados" {...register('thirdPartiesInvolved')} />
          <Checkbox label="Fuga o derrame de gas" {...register('hazmatRelease')} />
          {!isEditing && <Checkbox label="El vehículo quedó inutilizable" {...register('vehicleUnusable')} />}
        </div>
        {hazmat && (
          <p
            role="alert"
            className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn sm:col-span-2"
          >
            Se avisa de inmediato por correo a los administradores.
          </p>
        )}
        {!isEditing && unusable && (
          <p
            role="alert"
            className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn sm:col-span-2"
          >
            El vehículo pasa a fuera de servicio y se libera a su chofer. Si el chofer tiene un pedido en curso o una
            carga de camión abierta, hay que resolverlo antes. Se vuelve a la flota con «Reactivar».
          </p>
        )}
      </form>
    </Modal>
  );
};
