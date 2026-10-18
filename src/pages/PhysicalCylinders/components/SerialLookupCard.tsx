import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge, Button, Card, DetailList, Input } from '../../../common/components/ui';
import { OPERATE_HINT, usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import { useFindCylinderBySerial } from '../../../services/queries/physicalCylinders';
import { formatArgentinaDay } from '../../../utils/format';
import { CYLINDER_STATE, CYLINDER_VIGENCIA, labelOf } from '../../../utils/statusLabels';
import { daysLabel } from '../inspection';

/** CU-133: la vigencia de un envase a partir del número de serie grabado, el que se escanea o se lee a mano. */
export const SerialLookupCard = () => {
  const navigate = useNavigate();
  const { needsDistributor } = usePermissions();
  const [serial, setSerial] = useState('');
  const find = useFindCylinderBySerial();
  const term = serial.trim();
  const found = find.data;

  return (
    <Card className="mb-6 p-4">
      <h2 className="text-base font-semibold text-ink">Buscar un envase por número de serie</h2>
      <form
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (term && !needsDistributor) find.mutate(term);
        }}
      >
        <div className="flex-1">
          <Input
            label="Número de serie"
            placeholder="SN-000123"
            autoComplete="off"
            value={serial}
            onChange={(e) => {
              setSerial(e.target.value);
              find.reset();
            }}
          />
        </div>
        <Button
          type="submit"
          icon={<Search />}
          loading={find.isPending}
          disabled={!term}
          blockedReason={needsDistributor ? OPERATE_HINT : undefined}
        >
          Ver vigencia
        </Button>
      </form>
      {find.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorMessage(find.error)}
        </p>
      )}
      {found && (
        <div className="mt-4 border-t border-outline pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge label={labelOf(CYLINDER_VIGENCIA, found.status)} />
            <span className="text-sm text-ink">
              {daysLabel(found.status, found.daysRemaining)}
              {found.expiresAt ? ` · ${formatArgentinaDay(found.expiresAt)}` : ''}
            </span>
          </div>
          {found.withdrawalPending && (
            <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
              Está vencido y todavía no volvió al depósito: hay que retirarlo cuando vuelva.
            </p>
          )}
          <DetailList
            className="mt-4"
            items={[
              { label: 'Serie', value: found.serial, mono: true },
              { label: 'Estado', value: <Badge label={labelOf(CYLINDER_STATE, found.state)} /> },
              { label: 'Producto', value: found.productType ?? 'Sin producto asignado' },
              { label: 'Última revisión', value: formatArgentinaDay(found.lastInspectionAt) },
              { label: 'Fabricación', value: formatArgentinaDay(found.manufacturedAt) },
            ]}
          />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/physical-cylinders/${found.cylinderId}`)}>
              Ver el envase
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
