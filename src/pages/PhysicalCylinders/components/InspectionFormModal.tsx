import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import { useResetOnOpen } from '../../../hooks/useResetOnOpen';
import { useRegisterInspection } from '../../../services/queries/physicalCylinders';
import { notify } from '../../../utils/notifications';
import { INSPECTION_RESULT, labelOf } from '../../../utils/statusLabels';
import {
  INSPECTION_RESULTS,
  buildInspectionBody,
  inspectionDefaults,
  inspectionSchema,
  type InspectionFormValues,
} from '../inspection';

interface Props {
  open: boolean;
  onClose: () => void;
  cylinderId: string;
}

const RESULT_OPTIONS = INSPECTION_RESULTS.map((value) => ({ value, label: labelOf(INSPECTION_RESULT, value).text }));

/** Registra la revisión periódica (prueba hidráulica) de un envase: fecha, resultado y hasta cuándo puede circular. */
export const InspectionFormModal = ({ open, onClose, cylinderId }: Props) => {
  const registerInspection = useRegisterInspection();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InspectionFormValues>({ resolver: zodResolver(inspectionSchema), defaultValues: inspectionDefaults() });
  useResetOnOpen(open, () => reset(inspectionDefaults()));
  const rejected = watch('result') === 'rejected';

  const onSubmit = handleSubmit((values) =>
    registerInspection.mutate(
      { id: cylinderId, body: buildInspectionBody(values) },
      {
        onSuccess: (vigencia) => {
          notify.success(
            vigencia.status === 'expired'
              ? 'Revisión registrada: el envase quedó vencido y no se puede despachar'
              : 'Revisión registrada',
          );
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
      title="Registrar revisión"
      description="Una revisión rechazada deja el envase vencido: no se podrá asignar a ningún pedido."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="inspection-form" loading={registerInspection.isPending}>
            Registrar revisión
          </Button>
        </>
      }
    >
      <form id="inspection-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Fecha de la revisión"
            type="date"
            required
            error={errors.inspectedAt?.message}
            {...register('inspectedAt')}
          />
          <Select label="Resultado" options={RESULT_OPTIONS} {...register('result')} />
        </div>
        {rejected ? (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="note">
            El vencimiento queda en la fecha de la revisión. Si el envase está con un cliente, se marca para retirarlo
            cuando vuelva.
          </p>
        ) : (
          <Input
            label="Puede circular hasta"
            type="date"
            required
            error={errors.nextDueAt?.message}
            {...register('nextDueAt')}
          />
        )}
        <TextArea label="Notas" error={errors.notes?.message} {...register('notes')} />
      </form>
    </Modal>
  );
};
