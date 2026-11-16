import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
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
  const methods = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: inspectionDefaults(),
  });
  const { reset, watch } = methods;
  useResetOnOpen(open, () => reset(inspectionDefaults()));
  const rejected = watch('result') === 'rejected';

  const onSubmit = (values: InspectionFormValues) =>
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
      <Form methods={methods} id="inspection-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput name="inspectedAt" label="Fecha de la revisión" type="date" required />
          <FormSelect name="result" label="Resultado" options={RESULT_OPTIONS} />
        </div>
        {rejected ? (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="note">
            El vencimiento queda en la fecha de la revisión. Si el envase está con un cliente, se marca para retirarlo
            cuando vuelva.
          </p>
        ) : (
          <FormInput name="nextDueAt" label="Puede circular hasta" type="date" required />
        )}
        <FormTextArea name="notes" label="Notas" />
      </Form>
    </Modal>
  );
};
