import { describe, expect, it } from 'vitest';
import type { PermissionModule } from '../../../services/api/types';
import { allGrantableOn, togglePermissions, type PermissionRules } from './permissionSelection';

const stock: PermissionModule = {
  key: 'stock',
  label: 'Stock',
  permissions: [
    { key: 'stock.ver', label: 'ver el stock', description: 'Ver', implies: [] },
    { key: 'stock.gestionar', label: 'gestionar el stock', description: 'Gestionar', implies: ['stock.ver'] },
  ],
};
const catalog = [stock];
const rules = (held: string[], impliedBy: [string, string][] = []): PermissionRules => ({
  impliedBy: new Map(impliedBy),
  held: (key) => held.includes(key),
});

describe('togglePermissions', () => {
  it('tildar «gestionar» no manda «ver» aparte', () => {
    expect(togglePermissions(['stock.ver'], ['stock.gestionar'], true, catalog)).toEqual(['stock.gestionar']);
  });

  it('destildar «gestionar» suelto deja «ver» si la sesión lo puede dar', () => {
    const all = () => true;
    expect(togglePermissions(['stock.gestionar'], ['stock.gestionar'], false, catalog, all)).toEqual(['stock.ver']);
    expect(togglePermissions(['stock.gestionar'], ['stock.gestionar'], false, catalog, () => false)).toEqual([]);
  });

  it('destildar el módulo entero saca todo lo que puso', () => {
    expect(togglePermissions(['stock.gestionar'], ['stock.ver', 'stock.gestionar'], false, catalog)).toEqual([]);
  });
});

describe('allGrantableOn', () => {
  it('no cuenta los permisos que la sesión no tiene', () => {
    expect(allGrantableOn(stock, ['stock.ver'], rules(['stock.ver']))).toBe(true);
    expect(allGrantableOn(stock, ['stock.ver'], rules(['stock.ver', 'stock.gestionar']))).toBe(false);
  });

  it('lo incluido en otro cuenta como tildado; sin nada para dar, nunca', () => {
    const held = rules(['stock.ver', 'stock.gestionar'], [['stock.ver', 'gestionar el stock']]);
    expect(allGrantableOn(stock, ['stock.gestionar'], held)).toBe(true);
    expect(allGrantableOn(stock, [], rules([]))).toBe(false);
  });
});
