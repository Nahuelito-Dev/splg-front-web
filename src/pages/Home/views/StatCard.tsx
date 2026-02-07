import { ReactNode } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'indigo' | 'pink' | 'rose'; // Colores permitidos
  change?: string; // Opcional (ej: "+12%")
  isPositive?: boolean;
  isLoading?: boolean;
}

const colorMap = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
};

export const StatCard = ({
  title,
  value,
  icon,
  color,
  change,
  isPositive,
  isLoading = false,
}: Props) => {
  const styles = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded"></div>
          ) : (
            <h3 className="text-2xl font-extrabold text-slate-800">{value}</h3>
          )}
        </div>
        <div className={`p-3 rounded-xl ${styles.bg} ${styles.text}`}>
          {icon}
        </div>
      </div>

      {/* Footer de la tarjeta con tendencia */}
      {change && !isLoading && (
        <div className="mt-4 flex items-center gap-2">
          {isPositive ? (
            <TrendingUpIcon
              className="text-emerald-500 text-sm"
              fontSize="small"
            />
          ) : (
            // Un punto simple si es negativo o neutro
            <div className="w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span
            className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
};
