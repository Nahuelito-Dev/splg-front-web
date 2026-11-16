import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS } from '../common/components/sidemenu/navConfig';

/** Comisiones, reglas de comisión y liquidaciones salieron del alcance: el chofer cobra sueldo mensual. */
const RETIRADAS = ['/finance/commissions', '/finance/commission-rules', '/finance/liquidations'];

describe('Comisiones fuera del panel', () => {
  it('el menú no tiene accesos a comisiones ni liquidaciones', () => {
    const paths = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.path));
    for (const retirada of RETIRADAS) expect(paths.some((p) => p.startsWith(retirada))).toBe(false);
  });

  it('las rutas viejas redirigen al tablero de Finanzas y no cargan las páginas', () => {
    const rutas = readFileSync(join(__dirname, 'DashboardRoutes.tsx'), 'utf8');
    expect(rutas).not.toMatch(/pages\/Finance\/(Commission|DriverLiquidation)/);
    for (const retirada of RETIRADAS) {
      const ruta = new RegExp(`path="${retirada.slice(1)}(/\\*)?" element=\\{<Navigate to="/finance" replace />\\}`);
      expect(rutas).toMatch(ruta);
    }
  });
});
