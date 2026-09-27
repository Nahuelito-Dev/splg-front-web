import { useMutation } from '@tanstack/react-query';
import { testEmailService } from '../api/email';

/** Sin invalidación: la prueba de email no tiene un listado que se vea afectado. */
export const useTestEmailService = () => useMutation({ mutationFn: testEmailService });
