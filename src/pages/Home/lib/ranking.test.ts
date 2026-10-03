import { describe, expect, it } from 'vitest';
import { rankDrivers, ratingText } from './ranking';

describe('ranking de choferes', () => {
  it('ordena por ventas y recorta', () => {
    const ranking = rankDrivers(
      [
        { driverId: 'a', driverName: null, totalOrders: 1, totalSales: 10 },
        { driverId: 'b', driverName: 'Bea', totalOrders: 3, totalSales: 50 },
      ],
      1,
    );
    expect(ranking).toEqual([{ id: 'b', name: 'Bea', orders: 3, sales: 50 }]);
  });

  it('un chofer sin nombre se rotula', () => {
    const [first] = rankDrivers([{ driverId: 'a', driverName: null, totalOrders: 1, totalSales: 1 }]);
    expect(first.name).toBe('Chofer sin nombre');
  });
});

describe('ratingText', () => {
  it('con calificaciones muestra el promedio con coma', () => {
    expect(ratingText({ average: 4.5, count: 12 })).toBe('4,5');
  });

  it('sin calificaciones (o sin dato todavía) no inventa un 0,0', () => {
    expect(ratingText({ average: 0, count: 0 })).toBeNull();
    expect(ratingText(undefined)).toBeNull();
  });
});
