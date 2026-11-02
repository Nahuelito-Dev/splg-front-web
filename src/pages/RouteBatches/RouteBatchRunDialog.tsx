import { Button, Modal } from '../../common/components/ui';
import type { RunDialog } from './routeBatchLabels';

interface Props {
  result: RunDialog;
  onClose: () => void;
}

/** Qué pasó con «Armar ahora» cuando quedaron pedidos sin lote: el resumen y los motivos, uno por renglón. */
export const RouteBatchRunDialog = ({ result, onClose }: Props) => (
  <Modal open onClose={onClose} title={result.title} footer={<Button onClick={onClose}>Entendido</Button>}>
    <p className="text-sm text-ink">{result.summary}</p>
    {result.drivers.length > 0 && (
      <section className="mt-4">
        <h3 className="text-sm font-semibold text-ink">{result.driversTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
          {result.drivers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    )}
    {result.lines.length > 0 && (
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
        {result.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    )}
  </Modal>
);
