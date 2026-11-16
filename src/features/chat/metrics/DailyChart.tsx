import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatAxis, useTooltipStyle } from '../../../common/components/ui/chartColors';
import type { ChatDailyPoint } from '../../../services/api/types';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatDay, formatNumber } from '../../../utils/format';
import { formatMetricMinutes } from './metricsFormat';

const CONVERSATIONS = 'Conversaciones nuevas';
const FIRST_RESPONSE = 'Primera respuesta (mediana, min hábiles)';

/**
 * La serie diaria: barras con las conversaciones nuevas (eje izquierdo) y una línea con la mediana de la primera
 * respuesta en minutos hábiles (eje derecho). Un día sin respuestas corta la línea: no es cero.
 */
export const DailyChart = ({ daily, height = 280 }: { daily: ChatDailyPoint[]; height?: number }) => {
  const palette = useChartPalette();
  const tooltipStyle = useTooltipStyle();
  const data = daily.map((point) => ({
    label: formatDay(point.date),
    conversations: point.newConversations,
    firstResponse: point.firstResponseMedianMinutes,
  }));

  return (
    <div className="grid gap-2">
      {/* El gráfico es para la vista; los lectores de pantalla leen la tabla de abajo, con los mismos datos. */}
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: palette.axisStrong, fontSize: 11.5 }}
              minTickGap={24}
              dy={6}
            />
            <YAxis
              yAxisId="conversations"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={40}
              tick={{ fill: palette.axis, fontSize: 11.5 }}
              tickFormatter={(v: number) => formatAxis(v)}
            />
            <YAxis
              yAxisId="minutes"
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={56}
              tick={{ fill: palette.axis, fontSize: 11.5 }}
              tickFormatter={(v: number) => `${formatAxis(v)} min`}
            />
            <Tooltip<number, string>
              formatter={(value, name) =>
                name === FIRST_RESPONSE ? formatMetricMinutes(Number(value)) : formatNumber(Number(value))
              }
              contentStyle={tooltipStyle}
              cursor={{ fill: palette.cursor }}
            />
            <Bar
              yAxisId="conversations"
              dataKey="conversations"
              name={CONVERSATIONS}
              fill={palette.primary}
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
            <Line
              yAxisId="minutes"
              type="monotone"
              dataKey="firstResponse"
              name={FIRST_RESPONSE}
              stroke={palette.accent}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Conversaciones nuevas y mediana de la primera respuesta por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Conversaciones nuevas</th>
            <th scope="col">Primera respuesta (mediana, min hábiles)</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDay(point.date)}</th>
              <td>{formatNumber(point.newConversations)}</td>
              <td>{formatMetricMinutes(point.firstResponseMedianMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary" /> {CONVERSATIONS}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded bg-accent" /> {FIRST_RESPONSE}
        </span>
      </p>
    </div>
  );
};
