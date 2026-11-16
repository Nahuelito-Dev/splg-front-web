import { useEffect, useRef, useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useMediaQuery } from '@mui/material';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PageContainer,
  CardHeader,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { CoverageZone } from '../../services/api/types';
import { useCoverageZones, useDeleteCoverageZone, useUpdateCoverageZone } from '../../services/queries/coverageZones';
import { confirm, notify } from '../../utils/notifications';
import { CoverageCheckPanel } from './components/CoverageCheckPanel';
import { ZoneDetailPanel } from './components/ZoneDetailPanel';
import { ZoneFormPanel } from './components/ZoneFormPanel';
import { ZoneList } from './components/ZoneList';
import { ZoneMap, type MapMode } from './components/ZoneMap';

export const CoverageZones = () => {
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data, isPending, isError, error, refetch } = useCoverageZones({ enabled: !needsDistributor });
  const zones = data?.rows ?? [];
  // Con zonas cargadas pero ninguna activa y vigente, la distribuidora no cubre nada (CU-151).
  const noActiveZones =
    zones.length > 0 &&
    !zones.some((zone) => zone.isActive && (!zone.validUntil || new Date(zone.validUntil).getTime() > Date.now()));
  const updateZone = useUpdateCoverageZone();
  const deleteZone = useDeleteCoverageZone();

  const [mode, setMode] = useState<MapMode>('idle');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [polygon, setPolygon] = useState<number[][] | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);

  // Desde `lg` el formulario vive al costado del mapa; por debajo, en una sola columna, queda después de la lista y del
  // mapa. Ahí, si al abrirlo su encabezado quedó fuera de la pantalla, se lo trae a la vista para que «Editar» y «Nueva
  // zona» no parezcan no hacer nada. En escritorio no se mueve la página. El ancho se lee por ref: cruzar el breakpoint
  // con el formulario abierto no tiene que desplazar nada.
  const singleColumn = useMediaQuery('(max-width:1023px)');
  const singleColumnRef = useRef(singleColumn);
  singleColumnRef.current = singleColumn;
  const formRef = useRef<HTMLDivElement>(null);
  const formOpen = mode === 'draw' || mode === 'edit';
  useEffect(() => {
    const form = formRef.current;
    if (!formOpen || !form || !singleColumnRef.current) return;
    const { top } = form.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight - 120) form.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [formOpen, selectedZoneId, formSession]);

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
      title: '¿Dar de baja la zona?',
      text: `Baja lógica: "${zone.name}" deja de aplicar cobertura y recargo a los pedidos nuevos. No se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    // El detalle se cierra antes de borrar: si no, la recarga que sigue al borrado lo pediría de nuevo y mostraría un 404.
    const wasSelected = zone.coverage_zone_id === selectedZoneId;
    if (wasSelected) resetForm();
    deleteZone.mutate(zone.coverage_zone_id, {
      onSuccess: () => notify.success('Zona dada de baja'),
      onError: (error) => {
        if (wasSelected) setSelectedZoneId(zone.coverage_zone_id);
        notify.error(error);
      },
    });
  };

  if (needsDistributor) {
    return (
      <PageContainer size="xl">
        <PageHeader
          title="Zonas de cobertura"
          description="Las áreas donde la distribuidora entrega, con su recargo."
        />
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus zonas."
          />
        </Card>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer size="xl">
        <PageHeader
          title="Zonas de cobertura"
          description="Las áreas donde la distribuidora entrega, con su recargo."
        />
        <Card>
          <ErrorState error={error} resource="Las zonas de cobertura" onRetry={() => void refetch()} />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="xl">
      <PageHeader
        title="Zonas de cobertura"
        description="Las áreas donde la distribuidora entrega, con su recargo."
        actions={
          <Button
            icon={<AddCircleOutlineIcon />}
            // Hasta que cargan las zonas no se abre: el mapa (560 px) llegaría después y correría el formulario hacia
            // abajo, y la prioridad por defecto se calcula con las zonas existentes.
            disabled={!canWrite || mode !== 'idle' || isPending}
            title={!canWrite ? writeHint : isPending ? 'Cargando las zonas…' : undefined}
            onClick={startCreate}
          >
            Nueva zona
          </Button>
        }
      />

      {noActiveZones && (
        <div
          role="alert"
          className="mb-6 rounded-[10px] border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink"
        >
          <p className="font-semibold">La distribuidora no tiene zonas de cobertura activas ni vigentes</p>
          <p className="mt-1 text-muted">
            Mientras no haya una, ninguna dirección está cubierta y no se aceptan pedidos nuevos. Activá una zona (con
            una fecha de fin futura) o creá una nueva.
          </p>
        </div>
      )}

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
        {/* `self-start`: el mapa tiene alto fijo; estirado al alto del formulario dejaba un hueco en blanco debajo. */}
        <Card className="overflow-hidden lg:col-span-2 lg:self-start">
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
          {formOpen && (
            <div ref={formRef} className="scroll-mt-20">
              <Card className="p-5">
                <CardHeader
                  title={editingZone ? `Editar "${editingZone.name}"` : 'Nueva zona'}
                  as="h3"
                  className="mb-3"
                />
                <ZoneFormPanel
                  key={editingZone?.coverage_zone_id ?? `new-${formSession}`}
                  zone={editingZone}
                  polygon={polygon}
                  zones={zones}
                  onSaved={resetForm}
                  onCancel={resetForm}
                />
              </Card>
            </div>
          )}

          {mode === 'idle' && selectedZoneId && (
            <ZoneDetailPanel
              key={selectedZoneId}
              zoneId={selectedZoneId}
              onClose={() => setSelectedZoneId(null)}
              onEdit={canWrite ? startEdit : undefined}
              onDelete={canWrite ? (zone) => void handleDelete(zone) : undefined}
            />
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
    </PageContainer>
  );
};
