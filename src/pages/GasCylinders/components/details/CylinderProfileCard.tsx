import type { ReactNode } from 'react';
import { Banknote, Flame, Package, Weight } from 'lucide-react';
import { Badge, Card, DetailList, EntityPhoto, PhotoThumb } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import type { GasCylinder } from '../../../../services/api/types';
import { formatCurrency, formatDateTime } from '../../../../utils/format';
import { stockLabel } from '../stockLabel';

const Metric = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="flex items-center gap-3 rounded-xl border border-outline p-4">
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong [&_svg]:h-[18px] [&_svg]:w-[18px]"
    >
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-lg font-semibold text-ink">{value}</p>
    </div>
  </div>
);

export const CylinderProfileCard = ({ cylinder }: { cylinder: GasCylinder }) => {
  const { canWrite, writeHint } = usePermissions();
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PhotoThumb
            kind="gasCylinder"
            id={cylinder.gas_cylinder_id}
            url={cylinder.photoUrl}
            size="lg"
            shape="square"
            fallback={
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-strong"
              >
                <Flame className="h-6 w-6" strokeWidth={1.8} />
              </span>
            }
          />
          <div>
            <h2 className="text-lg font-semibold text-ink">{cylinder.type}</h2>
            <p className="text-sm text-muted">{cylinder.description || 'Sin descripción'}</p>
          </div>
        </div>
        <Badge
          label={cylinder.isActive ? { text: 'Activo', tone: 'success' } : { text: 'Desactivado', tone: 'danger' }}
        />
      </div>

      <EntityPhoto
        kind="gasCylinder"
        id={cylinder.gas_cylinder_id}
        url={cylinder.photoUrl}
        subject="del producto"
        canEdit
        blockedReason={canWrite ? undefined : writeHint}
        className="mt-6 max-w-md"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric icon={<Banknote />} label="Precio unitario" value={formatCurrency(cylinder.price)} />
        <Metric icon={<Package />} label="Stock" value={<Badge label={stockLabel(cylinder.stock)} />} />
        <Metric icon={<Weight />} label="Peso neto" value={`${cylinder.weight} kg`} />
      </div>

      <DetailList
        className="mt-6 border-t border-outline-soft pt-5"
        items={[
          { label: 'Alta', value: formatDateTime(cylinder.createdAt) },
          { label: 'Última modificación', value: formatDateTime(cylinder.updatedAt) },
          { label: 'Id', value: cylinder.gas_cylinder_id, mono: true, wide: true },
        ]}
      />
    </Card>
  );
};
