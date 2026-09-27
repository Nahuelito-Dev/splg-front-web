import { describe, expect, it } from 'vitest';
import { labelOf, ORDER_STATUS } from './statusLabels';

describe('statusLabels', () => {
  it('los dos nombres de "en camino" se muestran igual', () => {
    expect(labelOf(ORDER_STATUS, 'out_for_delivery')).toEqual(labelOf(ORDER_STATUS, 'on_the_way'));
  });

  it('un valor desconocido se muestra tal cual, en neutro', () => {
    expect(labelOf(ORDER_STATUS, 'nuevo' as 'pending')).toEqual({ text: 'nuevo', tone: 'neutral' });
    expect(labelOf(ORDER_STATUS, null)).toEqual({ text: '—', tone: 'neutral' });
  });
});
