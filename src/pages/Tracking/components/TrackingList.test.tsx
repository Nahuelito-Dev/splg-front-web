import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';
import { TrackingList } from './TrackingList';

afterEach(cleanup);

describe('TrackingList', () => {
  it('el driverId del socket es el user_id del chofer: su foto se pide como usuario', () => {
    vi.mocked(usePersonPhoto).mockClear();
    render(
      <TrackingList
        trackedOrders={[
          { orderId: 'o-1000000', driverId: 'user-chofer', lat: -27.1, lng: -55.9, at: new Date().toISOString() },
        ]}
      />,
    );
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'user', id: 'user-chofer' });
    expect(usePersonPhoto).not.toHaveBeenCalledWith({ kind: 'delivery', id: 'user-chofer' });
  });
});
