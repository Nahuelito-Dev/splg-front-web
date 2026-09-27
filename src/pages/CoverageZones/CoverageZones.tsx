import { useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { CoverageZone } from '../../services/api/types';
import { useCoverageZones, useDeleteCoverageZone, useUpdateCoverageZone } from '../../services/queries/coverageZones';
import { confirm, notify } from '../../utils/notifications';
import { CoverageCheckPanel } from './components/CoverageCheckPanel';
import { ZoneFormPanel } from './components/ZoneFormPanel';
import { ZoneList } from './components/ZoneList';
import { ZoneMap, type MapMode } from './components/ZoneMap';

export const CoverageZones = () => {
  const { canWrite, writeHint } = usePermissions();
  const { data, isPending, isError, error, refetch } = useCoverageZones();
  const zones = data?.rows ?? [];
  const updateZone = useUpdateCoverageZone();
  const deleteZone = useDeleteCoverageZone();

  const [mode, setMode] = useState<MapMode>('idle');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<number[][] | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);

  const editingZone = mode === 'edit' ? (zones.find((zone) => zone.coverage_zone_id === selectedZoneId) ?? null) : null;

  const resetForm = () => {
    setMode('idle');
    setSelectedZoneId(null);
    setPolygon(null);
  };

  const startCreate = () => {
    setMode('draw');
    setSelectedZoneId(null);
    setPolygon(null);
    setFormSession((session) => session + 1);
  };

  const startEdit = (zone: CoverageZone) => {
    setMode('edit');
    setSelectedZoneId(zone.coverage_zone_id);
    setPolygon(zone.area.coordinates[0]);
  };

  const handleSelectRow = (zone: CoverageZone) => {
    if (mode !== 'idle') return;
    setSelectedZoneId((current) => (current === zone.coverage_zone_id ? null : zone.coverage_zone_id));
  };

  const handleToggleActive = (zone: CoverageZone) => {
    updateZone.mutate(
      { id: zone.coverage_zone_id, changes: { isActive: !zone.isActive } },
      {
        onSuccess: () => notify.success(zone.isActive ? 'Zona desactivada' : 'Zona activada'),
        onError: notify.error,
      },
    );
  };

  const handleDelete = async (zone: CoverageZone) => {
    const confirmed = await confirm({
      title: '¿Eliminar la zona?',
      text: `"${zone.name}" deja de aplicar cobertura y recargo a los pedidos nuevos.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    deleteZone.mutate(zone.coverage_zone_id, {
      onSuccess: () => {
        notify.success('Zona eliminada');
        if (zone.coverage_zone_id === selectedZoneId) resetForm();
      },
      onError: notify.error,
    });
  };

  if (isError) {
    return (
      <div className="mx-auto max-w-[1600px] p-4 md:p-8">
        <PageHeader
          title="Zonas de cobertura"
          description="Las áreas donde la distribuidora entrega, con su recargo."
        />
        <Card>
          <ErrorState error={error} resource="Las zonas de cobertura" onRetry={() => void refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-8">
      <PageHeader
        title="Zonas de cobertura"
        description="Las áreas donde la distribuidora entrega, con su recargo."
        actions={
          <Button
            icon={<AddCircleOutlineIcon />}
            disabled={!canWrite || mode !== 'idle'}
            title={!canWrite ? writeHint : undefined}
            onClick={startCreate}
          >
            Nueva zona
          </Button>
        }
      />

      <Card className="mb-6 p-0">
        <ZoneList
          rows={zones}
          loading={isPending}
          selectedZoneId={selectedZoneId}
          onSelectRow={handleSelectRow}
          onToggleActive={handleToggleActive}
          onEdit={canWrite ? startEdit : undefined}
          onDelete={canWrite ? (zone) => void handleDelete(zone) : undefined}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          {isPending ? (
            <LoadingState />
          ) : (
            <ZoneMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              mode={mode}
              onSelectZone={handleSelectRow}
              onPolygonChange={setPolygon}
              onPickPoint={setPickedPoint}
              pickedPoint={pickedPoint}
            />
          )}
        </Card>

        <div className="space-y-6">
          {(mode === 'draw' || mode === 'edit') && (
            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-ink">
                {editingZone ? `Editar "${editingZone.name}"` : 'Nueva zona'}
              </h3>
              <ZoneFormPanel
                key={editingZone?.coverage_zone_id ?? `new-${formSession}`}
                zone={editingZone}
                polygon={polygon}
                onSaved={resetForm}
                onCancel={resetForm}
              />
            </Card>
          )}

          <Card className="p-5">
            <CoverageCheckPanel
              pickedPoint={pickedPoint}
              isPicking={mode === 'pick'}
              onStartPicking={() => setMode('pick')}
              onStopPicking={() => setMode((current) => (current === 'pick' ? 'idle' : current))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
