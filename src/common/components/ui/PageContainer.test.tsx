import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageContainer } from './PageContainer';

afterEach(cleanup);

const box = () => screen.getByText('contenido');

describe('PageContainer', () => {
  it('por defecto es el ancho de los listados, centrado y con el padding del panel', () => {
    render(<PageContainer>contenido</PageContainer>);
    expect(box()).toHaveClass('mx-auto', 'max-w-7xl', 'p-4', 'md:p-8');
  });

  it.each([
    ['sm', 'max-w-3xl'],
    ['md', 'max-w-5xl'],
    ['lg', 'max-w-7xl'],
    ['xl', 'max-w-[1600px]'],
  ] as const)('size %s pone %s', (size, cls) => {
    render(<PageContainer size={size}>contenido</PageContainer>);
    expect(box()).toHaveClass(cls);
  });

  it('full no pone tope de ancho y stack separa los bloques', () => {
    render(
      <PageContainer size="full" stack>
        contenido
      </PageContainer>,
    );
    expect(box().className).not.toMatch(/max-w-/);
    expect(box()).toHaveClass('space-y-6');
  });
});
