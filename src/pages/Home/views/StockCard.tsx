import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../../../common/components/ui';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { formatCurrency, formatNumber } from '../../../utils/format';

/** El catálogo entero: la API admite hasta 100 por página. */
const CATALOG = { page: 0, pageSize: 100 };
const SHOWN = 5;

/** Stock por producto, de menor a mayor: lo que se está por acabar queda arriba. */
export const StockCard = () => {
  const { data, isLoading } = useGasCylinders(CATALOG);
  const products = [...(data?.rows ?? [])].sort((a, b) => a.stock - b.stock);
  const max = Math.max(1, ...products.map((p) => p.stock));
  // El total de unidades sólo es cierto si vino el catálogo entero.
  const complete = data !== undefined && products.length === data.total;
  const units = complete ? products.reduce((acc, p) => acc + p.stock, 0) : null;

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 border-b border-outline-soft px-[18px] py-3.5">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Stock de garrafas</h2>
          <p className="text-xs text-muted">
            {formatNumber(data?.total ?? 0)} productos activos
            {!complete && data && ` · los ${formatNumber(products.length)} primeros`}
          </p>
        </div>
        {units !== null && (
          <span className="tabular-nums text-sm font-semibold text-ink">{formatNumber(units)} u.</span>
        )}
      </div>
      {isLoading ? (
        <div className="m-[18px] h-40 animate-pulse rounded-lg bg-surface-hover" />
      ) : products.length === 0 ? (
        <EmptyState title="Sin productos" description="Cargá el catálogo en Garrafas." />
      ) : (
        <ul className="divide-y divide-outline-soft">
          {products.slice(0, SHOWN).map((product) => (
            <li
              key={product.gas_cylinder_id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-[18px] py-2.5"
            >
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-semibold text-ink">{product.type}</b>
                <span className="text-[11.5px] text-muted">{formatCurrency(product.price)}</span>
              </span>
              <span className="text-right">
                <b
                  className={
                    product.stock === 0 ? 'tabular-nums text-[13px] text-danger' : 'tabular-nums text-[13px] text-ink'
                  }
                >
                  {product.stock === 0 ? 'Sin stock' : `${formatNumber(product.stock)} u.`}
                </b>
                <span className="mt-1 block h-[5px] w-20 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-primary-from to-primary-to"
                    style={{ width: `${(product.stock / max) * 100}%` }}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/cylinders"
        className="mt-auto flex items-center justify-center gap-1.5 border-t border-outline-soft py-2.5 text-[12.5px] font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
      >
        Ver el catálogo <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
};
