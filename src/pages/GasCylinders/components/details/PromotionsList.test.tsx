import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PromotionsList } from './PromotionsList';

afterEach(() => cleanup());

describe('PromotionsList', () => {
  it('muestra el precio con promoción que manda el back, sin recalcularlo', () => {
    // 10856 con 3,33 % en el panel daba 10494,95 (sin redondear); el back cobra 10494,50.
    render(
      <PromotionsList price={10856} promotions={[{ quantity: 2, discountPercentage: 3.33, unitPrice: 10494.5 }]} />,
    );
    expect(screen.getByText(/c\/u/).textContent).toContain('10.494,50');
  });

  it('sin promociones lo dice', () => {
    render(<PromotionsList price={1000} promotions={[]} />);
    expect(screen.getByText('Sin promociones')).toBeTruthy();
  });
});
