import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, Checkbox, Select } from '../../../common/components/ui';
import type { MpReconciliationItem } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { MP_ITEM_STATUS, labelOf } from '../../../utils/statusLabels';
import { amountsLine, isSelectable, selectableIds, type DifferenceGroup } from '../mpReconciliationRules';

export interface BoxOption {
  value: string;
  label: string;
}

interface RowProps {
  item: MpReconciliationItem;
  checked: boolean;
  disabled: boolean;
  boxId: string;
  boxOptions: BoxOption[];
  failure: string | undefined;
  onToggle: (itemId: string) => void;
  onBox: (itemId: string, boxId: string) => void;
}

const Row = ({ item, checked, disabled, boxId, boxOptions, failure, onToggle, onBox }: RowProps) => {
  const selectable = isSelectable(item);
  const date = item.occurredAt && <span className="text-xs text-muted">{formatDateTime(item.occurredAt)}</span>;
  return (
    <li className="min-w-0 space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {selectable ? (
          <Checkbox
            label={item.sourceId ?? 'Diferencia'}
            checked={checked}
            disabled={disabled}
            onChange={() => onToggle(item.itemId)}
            aria-label={`Elegir la diferencia ${item.sourceId ?? item.itemId}`}
          />
        ) : (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{item.sourceId ?? 'Sin identificador'}</span>
            {date}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-2">
          {item.accountLevel && <Badge label={{ text: 'De la cuenta', tone: 'accent' }} />}
          <Badge label={labelOf(MP_ITEM_STATUS, item.status)} />
        </span>
      </div>
      {selectable && date && <div className="pl-7">{date}</div>}
      <p className="text-sm text-ink">{amountsLine(item)}</p>
      <p className="text-xs text-muted">
        {item.note}
        {item.orderId && (
          <>
            {' '}
            <Link className="font-mono text-primary underline" to={`/orders/${item.orderId}`}>
              Pedido {formatShortId(item.orderId)}
            </Link>
          </>
        )}
      </p>
      {item.needsCashBox && selectable && (
        <div className="max-w-sm">
          <Select
            label="Caja que recibió el retiro"
            value={boxId}
            onChange={(e) => onBox(item.itemId, e.target.value)}
            options={[{ value: '', label: 'Elegí la caja de destino' }, ...boxOptions]}
            disabled={disabled}
          />
        </div>
      )}
      {failure && (
        <p role="alert" className="text-xs text-danger">
          No se asentó: {failure}
        </p>
      )}
    </li>
  );
};

interface Props {
  group: DifferenceGroup;
  selected: ReadonlySet<string>;
  boxes: Readonly<Record<string, string>>;
  boxOptions: BoxOption[];
  failures: Readonly<Record<string, string>>;
  disabled: boolean;
  onToggle: (itemId: string) => void;
  onToggleGroup: (ids: string[], on: boolean) => void;
  onBox: (itemId: string, boxId: string) => void;
}

/** Un grupo de diferencias del mismo tipo, con una casilla por fila y «Marcar todas». */
export const MpDifferenceGroup = ({
  group,
  selected,
  boxes,
  boxOptions,
  failures,
  disabled,
  onToggle,
  onToggleGroup,
  onBox,
}: Props) => {
  const ids = selectableIds(group.items);
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  return (
    <Card>
      <CardHeader
        title={`${group.info.title} (${group.items.length})`}
        subtitle={group.info.help}
        className="border-b border-outline px-5 py-3"
        action={
          ids.length > 0 ? (
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onToggleGroup(ids, !allOn)}>
              {allOn ? 'Quitar todas' : 'Marcar todas'}
            </Button>
          ) : undefined
        }
      />
      <ul className="divide-y divide-outline" aria-label={group.info.title}>
        {group.items.map((item) => (
          <Row
            key={item.itemId}
            item={item}
            checked={selected.has(item.itemId)}
            disabled={disabled}
            boxId={boxes[item.itemId] ?? ''}
            boxOptions={boxOptions}
            failure={failures[item.itemId]}
            onToggle={onToggle}
            onBox={onBox}
          />
        ))}
      </ul>
    </Card>
  );
};
