import { Pencil, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, DetailList, ErrorState, IconButton, LoadingState } from '../../../common/components/ui';
import type { CoverageZone } from '../../../services/api/types';
import { useCoverageZone } from '../../../services/queries/coverageZones';
import { DEFAULT_ZONE_COLOR } from '../../../theme/zoneColors';
import { formatDateTime } from '../../../utils/format';
import { countVertices, formatSurcharge, formatValidity } from '../coverageZoneUtils';

interface Props {
  zoneId: string;
  onClose: () => void;
  /** Sin ellos no se muestran los botones (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (zone: CoverageZone) => void;
  onDelete?: (zone: CoverageZone) => void;
}

/** El detalle de la zona resaltada en el mapa, pedido a `GET /coverage-zones/:id`. */
export const ZoneDetailPanel = ({ zoneId, onClose, onEdit, onDelete }: Props) => {
  const { data: zone, isPending, error, refetch } = useCoverageZone(zoneId);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">Detalle de la zona</h3>
        <IconButton label="Cerrar el detalle" icon={<X />} onClick={onClose} />
      </div>

      {isPending ? (
        <LoadingState label="Cargando zona…" />
      ) : error || !zone ? (
        <ErrorState error={error} resource="La zona" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: zone.color ?? DEFAULT_ZONE_COLOR }}
              />
              <span className="truncate font-medium text-ink">{zone.name}</span>
            </p>
            <Badge
              label={zone.isActive ? { text: 'Activa', tone: 'success' } : { text: 'Inactiva', tone: 'neutral' }}
            />
          </div>
          <DetailList
            items={[
              { label: 'Recargo', value: formatSurcharge(zone.surchargeType, zone.surchargeValue), mono: true },
              { label: 'Prioridad', value: zone.priority, mono: true },
              { label: 'Etiqueta', value: zone.label ?? '—' },
              { label: 'Vértices', value: countVertices(zone.area.coordinates[0]), mono: true },
              { label: 'Vigencia', value: formatValidity(zone.validFrom, zone.validUntil) ?? 'Siempre', wide: true },
              { label: 'Alta', value: formatDateTime(zone.createdAt) },
              { label: 'Última modificación', value: formatDateTime(zone.updatedAt) },
              { label: 'Id', value: zone.coverage_zone_id, mono: true, wide: true },
            ]}
          />
          {(onEdit || onDelete) && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline pt-4">
              {onDelete && (
                <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => onDelete(zone)}>
                  Eliminar
                </Button>
              )}
              {onEdit && (
                <Button size="sm" icon={<Pencil />} onClick={() => onEdit(zone)}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
