import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const panel = vi.hoisted(() => vi.fn());
vi.mock('../../../../common/components/AttachmentsPanel', () => ({
  AttachmentsPanel: (props: Record<string, unknown>) => {
    panel(props);
    return <p>lista de adjuntos</p>;
  },
}));

import { OrderLegacyReceipts } from './OrderLegacyReceipts';

afterEach(cleanup);

describe('OrderLegacyReceipts', () => {
  it('lista los adjuntos del pedido en sólo lectura: sin subir ni borrar', () => {
    render(<OrderLegacyReceipts orderId="o-1" />);
    expect(screen.getByText('Comprobantes anteriores')).toBeInTheDocument();
    expect(panel).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: 'order', ownerId: 'o-1', canWrite: false }),
    );
  });
});
