import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkColors } from './check-colors.mjs';

const roots: string[] = [];

const fixture = (source: string, extension = 'tsx') => {
  const root = mkdtempSync(join(tmpdir(), 'splg-colors-'));
  roots.push(root);
  mkdirSync(join(root, 'components'));
  writeFileSync(join(root, 'components', `Sample.${extension}`), source);
  return root;
};

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('check-colors', () => {
  it('rechaza una escala llama fija en un componente', () => {
    const root = fixture('export const Sample = () => <div className="bg-llama-500" />;');
    expect(checkColors(root)).toEqual([expect.stringContaining('bg-llama-500')]);
  });

  it('acepta roles del tema', () => {
    const root = fixture('export const Sample = () => <div className="bg-primary text-on-primary" />;');
    expect(checkColors(root)).toEqual([]);
  });

  it.each([
    ['theme sin comillas en CSS', '.sample { color: theme(colors.llama.500); }', 'css'],
    ['theme con comillas en una clase arbitraria', 'const sample = "[color:theme(\'colors.gas.500\')]";', 'tsx'],
    ['import de brand.json', "import brand from '../theme/brand.json';", 'tsx'],
    ['acceso a una escala de brand', "const color = brand.llama['500'];", 'tsx'],
  ])('rechaza %s', (_name, source, extension) => {
    expect(checkColors(fixture(source, extension))).toHaveLength(1);
  });
});
