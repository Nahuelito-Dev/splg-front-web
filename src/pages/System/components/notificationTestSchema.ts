import { z } from 'zod';

/**
 * Reglas del formulario de "Probar las notificaciones push"
 * (`POST /notifications/send-test`), mismos límites que `SendTestNotificationDto`.
 */
export const notificationTestSchema = z.object({
  token: z.string().trim().min(1, 'Elegí un token o pegalo a mano'),
  title: z.string().trim().min(1, 'Ingresá un título').max(100, 'Hasta 100 caracteres'),
  body: z.string().trim().min(1, 'Ingresá el cuerpo del aviso').max(500, 'Hasta 500 caracteres'),
});

export type NotificationTestFormValues = z.infer<typeof notificationTestSchema>;
