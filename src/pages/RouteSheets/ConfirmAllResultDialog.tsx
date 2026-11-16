import { Button, Modal } from '../../common/components/ui';
import type { ConfirmAll, RoutePlanDay } from '../../services/api/types';
import { sheetTitle } from './routeSheetLabels';

/** El resultado de «Confirmar todas» cuando alguna no se pudo: cuáles y por qué. */
export const ConfirmAllResultDialog = ({
  result,
  day,
  onClose,
}: {
  result: ConfirmAll;
  day: RoutePlanDay;
  onClose: () => void;
}) => {
  const titleOf = (id: string) => {
    const sheet = day.sheets.find((s) => s.id === id);
    return sheet ? sheetTitle(sheet) : 'Hoja';
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Se confirmaron ${result.confirmed.length} de ${result.confirmed.length + result.failed.length}`}
      description="Las que no, quedaron en borrador. Abrilas para resolver lo que falta."
      footer={<Button onClick={onClose}>Entendido</Button>}
    >
      <ul className="space-y-3 text-[13px]">
        {result.failed.map((failure) => (
          <li key={failure.sheetId}>
            <b className="font-semibold text-ink">{titleOf(failure.sheetId)}</b>
            <ul className="mt-0.5 list-disc pl-5 text-warn">
              {(failure.violations.length > 0 ? failure.violations.map((v) => v.message) : [failure.message]).map(
                (message) => (
                  <li key={message}>{message}</li>
                ),
              )}
            </ul>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
