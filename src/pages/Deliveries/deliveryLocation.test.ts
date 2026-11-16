import { describe, expect, it } from 'vitest';
import { parseLatLng } from './deliveryLocation';

describe('parseLatLng', () => {
  it('lee "lat,lng"', () => {
    expect(parseLatLng('-27.373048,-55.89356')).toEqual({ lat: -27.373048, lng: -55.89356 });
    expect(parseLatLng(' -27.3 , -55.8 ')).toEqual({ lat: -27.3, lng: -55.8 });
  });

  it('sin valor o mal formado devuelve null', () => {
    expect(parseLatLng(null)).toBeNull();
    expect(parseLatLng('')).toBeNull();
    expect(parseLatLng('-27.3')).toBeNull();
    expect(parseLatLng('a,b')).toBeNull();
    expect(parseLatLng('1,2,3')).toBeNull();
    expect(parseLatLng('-95,10')).toBeNull();
  });
});
