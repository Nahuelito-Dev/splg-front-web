import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveIndicator } from './LiveIndicator';

afterEach(cleanup);

describe('LiveIndicator', () => {
  it('dice «En vivo» con conexión y «Reconectando…» mientras no hay', () => {
    const { rerender } = render(<LiveIndicator online />);
    expect(screen.getByRole('status')).toHaveTextContent('En vivo');
    rerender(<LiveIndicator online={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
  });
});
