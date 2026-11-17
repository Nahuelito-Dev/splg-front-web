import { CheckCircle2, Clock, PackageCheck, Repeat, Timer, Truck, UserX, XCircle } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, KpiCard, Skeleton } from '../../../common/components/ui';
import { usePermiso } from '../../../hooks/usePermiso';
import { useDispatchMetrics } from '../../../services/queries/dispatchMetrics';
import { formatNumber } from '../../../utils/format';
import { formatPercent, formatRatio, formatSeconds } from '../dispatchMetricsFormat';

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
    if (data.pedidosDespachados === 0 && data.pedidosSinChofer === 0) {
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
