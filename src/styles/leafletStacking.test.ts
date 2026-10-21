import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('mapas de Leaflet', () => {
  it('el contenedor crea su propio contexto de apilamiento para no tapar el header', () => {
    const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8');
    const rule = /\.leaflet-container\s*{([^}]*)}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/isolation:\s*isolate/);
    expect(rule).toMatch(/z-index:\s*0/);
  });
});
