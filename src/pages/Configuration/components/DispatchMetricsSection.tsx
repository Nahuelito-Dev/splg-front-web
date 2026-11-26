import { CheckCircle2, Clock, Route, PackageCheck, Repeat, Timer, Truck, UserX, XCircle } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, KpiCard, Skeleton } from '../../../common/components/ui';
import { usePermiso } from '../../../hooks/usePermiso';
import { useDispatchMetrics } from '../../../services/queries/dispatchMetrics';
import type { DispatchMetrics } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';
import { formatPercent, formatRatio, formatSeconds } from '../dispatchMetricsFormat';

const METHOD_LABELS: Record<DispatchMetrics['asignacionPorMetodo'][number]['method'], string> = {
  automatic: 'Automático',
  manual_override: 'Manual',
  route_sheet: 'Hoja de ruta',
  batch: 'Lote',
};

const TOP_TABLE = 'w-full text-left text-[13.5px]';
const CELL = 'py-2 pr-3 align-middle tabular-nums';

/**
 * «Cómo viene el despacho»: las cifras de los últimos 30 días del despacho automático (`GET /v2/dispatch/metrics`,
 * permiso `pedidos.ver`). Todo lo calcula la API. Sin el permiso, la sección no aparece.
 */
export const DispatchMetricsSection = () => {
  const permiso = usePermiso('pedidos.ver');
  const { data, isPending, error, refetch } = useDispatchMetrics(permiso.allowed);
  if (!permiso.allowed) return null;

  const body = () => {
    if (error) return <ErrorState error={error} resource="Las cifras del despacho" onRetry={() => void refetch()} />;
    if (isPending) {
      return (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          role="status"
          aria-label="Cargando las cifras del despacho"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }
    if (data.pedidosDespachados === 0 && data.pedidosSinChofer === 0 && data.pedidosAsignados === 0) {
      return (
        <EmptyState
          title="Todavía no hay pedidos despachados"
          description="Cuando se ofrezcan pedidos a los choferes en los últimos 30 días, vas a ver acá cómo respondieron."
        />
      );
    }
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard title="Pedidos ofrecidos" icon={PackageCheck} value={formatNumber(data.pedidosDespachados)} />
          <KpiCard
            title="Ofertas por pedido"
            icon={Repeat}
            value={formatRatio(data.ofertasPorPedido)}
            hint="En promedio"
          />
          <KpiCard
            title="Sin chofer"
            icon={UserX}
            value={formatNumber(data.pedidosSinChofer)}
            hint="Pedidos cancelados"
          />
          <KpiCard title="Ofertas aceptadas" icon={CheckCircle2} value={formatPercent(data.porcentajeAceptadas)} />
          <KpiCard title="Ofertas rechazadas" icon={XCircle} value={formatPercent(data.porcentajeRechazadas)} />
          <KpiCard title="Ofertas sin respuesta" icon={Clock} value={formatPercent(data.porcentajeVencidas)} />
          <KpiCard
            title="Tiempo en responder"
            icon={Timer}
            value={formatSeconds(data.respuestaDelChofer.mediana)}
            hint={`Típico · 9 de cada 10 responden en ${formatSeconds(data.respuestaDelChofer.p90)}`}
          />
          <KpiCard
            title="Tiempo hasta asignar"
            icon={Truck}
            value={formatSeconds(data.hastaAsignar.mediana)}
            hint={`Típico · 9 de cada 10 en ${formatSeconds(data.hastaAsignar.p90)}`}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Orden por calle</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KpiCard
              title="Ordenadas por calle"
              icon={Route}
              value={formatPercent(data.porcentajeOrdenadasPorOsrm)}
              hint={
                data.ofertasConEstimacion === 0
                  ? 'Todavía sin ofertas medidas'
                  : `El resto, en línea recta · ${formatNumber(data.ofertasConEstimacion)} ofertas medidas`
              }
            />
            <KpiCard
              title="Llegada estimada"
              icon={Timer}
              value={data.minutosEstimadosPromedio === null ? '—' : `${formatRatio(data.minutosEstimadosPromedio)} min`}
              hint="Promedio al ofrecer el pedido"
            />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Cómo se asignaron los pedidos</h3>
          <p className="mb-2 text-[13px] text-muted">
            Según la asignación vigente de cada pedido: si se reasignó, cuenta el último chofer.
          </p>
          {data.pedidosAsignados === data.asignadosSinMetodo ? (
            <p className="text-[13.5px] text-muted">
              Todavía no hay pedidos asignados con el método registrado en este período.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Pedidos asignados por método">
              {data.asignacionPorMetodo.map((item) => (
                <li key={item.method} className="rounded-xl border border-outline-soft p-3">
                  <p className="text-[12.5px] font-medium text-muted">{METHOD_LABELS[item.method]}</p>
                  <p className="text-lg font-semibold tabular-nums text-ink">{formatPercent(item.porcentaje)}</p>
                  <p className="text-xs tabular-nums text-muted">{formatNumber(item.cantidad)} pedidos</p>
                </li>
              ))}
            </ul>
          )}
          {data.asignadosSinMetodo > 0 && data.pedidosAsignados !== data.asignadosSinMetodo && (
            <p className="mt-2 text-xs text-muted">
              {formatNumber(data.asignadosSinMetodo)} pedidos anteriores no tienen el método registrado y no entran en
              el porcentaje.
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Choferes que más aceptan</h3>
          {data.topChoferes.length === 0 ? (
            <p className="text-[13.5px] text-muted">Todavía ningún chofer respondió ofertas en este período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={TOP_TABLE}>
                <thead className="text-[12.5px] font-medium text-muted">
                  <tr>
                    <th scope="col" className={CELL}>
                      Chofer
                    </th>
                    <th scope="col" className={CELL}>
                      Ofertas
                    </th>
                    <th scope="col" className={CELL}>
                      Aceptadas
                    </th>
                    <th scope="col" className={CELL}>
                      Tiempo en responder
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topChoferes.map((chofer) => (
                    <tr key={chofer.driverId} className="border-t border-outline-soft">
                      <th scope="row" className={`${CELL} font-medium text-ink`}>
                        {chofer.nombre}
                      </th>
                      <td className={CELL}>{formatNumber(chofer.ofertas)}</td>
                      <td className={CELL}>
                        {formatNumber(chofer.aceptadas)} ({formatPercent(chofer.tasaAceptacion)})
                      </td>
                      <td className={CELL}>{formatSeconds(chofer.medianaRespuestaSegundos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <CardHeader title="Cómo viene el despacho" subtitle="Últimos 30 días" />
      {body()}
    </Card>
  );
};
