import { useMutation } from '@tanstack/react-query';
import { changeEmail, sendPasswordReset, testEmailService } from '../api/email';

/** Sin invalidación: la prueba de email no tiene un listado que se vea afectado. */
export const useTestEmailService = () => useMutation({ mutationFn: testEmailService });

/** CU-047: "olvidé mi contraseña" desde el login. */
export const useSendPasswordReset = () => useMutation({ mutationFn: sendPasswordReset });

/** "Mi cuenta": la propia sesión cambia su correo (requiere su idToken de Firebase). */
export const useChangeEmail = () => useMutation({ mutationFn: changeEmail });
