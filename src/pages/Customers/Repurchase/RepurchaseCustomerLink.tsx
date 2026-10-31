import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { RepurchaseCustomerRef } from '../../../services/api/types';
import { customerHref } from './repurchaseLabels';

interface Props {
  customer: RepurchaseCustomerRef;
  className?: string;
  children: ReactNode;
}

/** Lleva a la ficha del cliente (pestaña Recompra); sin perfil de cliente no hay ficha y queda el texto. */
export const RepurchaseCustomerLink = ({ customer, className, children }: Props) => {
  const href = customerHref(customer);
  return href ? (
    <Link to={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
};
