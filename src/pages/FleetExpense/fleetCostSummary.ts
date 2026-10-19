interface CostRow {
  total: number;
  km: number;
}

/**
 * Las cifras de arriba del tablero de costos. El costo por km sólo cuenta los vehículos con km: sumar el costo de uno
 * sin km y dividirlo por los km de los demás infla el promedio. Los que no tienen km se informan aparte.
 */
export const summarizeFleetCosts = (rows: CostRow[]) => {
  const withKm = rows.filter((row) => row.km > 0);
  const km = withKm.reduce((sum, row) => sum + row.km, 0);
  const costWithKm = withKm.reduce((sum, row) => sum + row.total, 0);
  return {
    totalCost: rows.reduce((sum, row) => sum + row.total, 0),
    costPerKm: km > 0 ? costWithKm / km : null,
    withoutKm: rows.length - withKm.length,
  };
};
