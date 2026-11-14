import { Package } from 'lucide-react';
import { Card, CardHeader, Skeleton } from '../../common/components/ui';
import { useLoadSuggestion } from '../../services/queries/routeSheets';

/** Qué garrafas cargar en el vehículo para la hoja y cuántos envases vacíos vuelven. */
export const LoadSuggestionCard = ({ sheetId }: { sheetId: string }) => {
  const { data, error, isPending } = useLoadSuggestion(sheetId);
  return (
    <Card className="p-4">
      <CardHeader
        as="h3"
        icon={<Package />}
        title="Carga sugerida"
        subtitle="Lo que tiene que salir en el vehículo y los envases que vuelven."
        className="mb-3"
      />
      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : error || !data ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo calcular la carga sugerida.
        </p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-muted">La hoja no tiene garrafas para cargar.</p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Garrafa</th>
              <th className="py-1 text-right font-medium">Llenas</th>
              <th className="py-1 text-right font-medium">Envases que vuelven</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-soft">
            {data.items.map((item) => (
              <tr key={item.gasCylinderId}>
                <td className="py-1.5 text-ink">{item.type ?? 'Garrafa'}</td>
                <td className="py-1.5 text-right font-mono text-ink">{item.fullUnits}</td>
                <td className="py-1.5 text-right font-mono text-ink">{item.emptyUnitsBack}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};
