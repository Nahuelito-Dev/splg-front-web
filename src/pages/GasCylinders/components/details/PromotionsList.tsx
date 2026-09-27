import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { Card, EmptyState } from '../../../../common/components/ui';
import type { PromocionBody } from '../../../../services/api/types';
import { formatCurrency } from '../../../../utils/format';
import { discountedPrice } from '../pricing';

export const PromotionsList = ({ promotions, price }: { promotions: PromocionBody[]; price: number }) => (
  <Card className="p-6">
    <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
      <LocalOfferIcon aria-hidden="true" className="text-primary" fontSize="small" />
      Promociones por cantidad
    </h3>

    {promotions.length === 0 ? (
      <div className="mt-4">
        <EmptyState
          title="Sin promociones"
          description="Este producto no tiene descuentos por cantidad configurados."
        />
      </div>
    ) : (
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promo) => (
          <li key={promo.quantity} className="rounded-xl border border-outline p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Llevando</p>
            <p className="text-2xl font-bold text-ink">{promo.quantity} u.</p>
            <p className="mt-2 text-sm font-semibold text-primary-strong">{promo.discountPercentage}% off</p>
            <p className="mt-1 text-xs text-muted">
              <span className="line-through">{formatCurrency(price)}</span> →{' '}
              {formatCurrency(discountedPrice(price, promo.discountPercentage))} c/u
            </p>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
