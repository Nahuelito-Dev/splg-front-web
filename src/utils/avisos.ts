import Swal from 'sweetalert2';

const ESTILO = {
  customClass: {
    popup: 'rounded-2xl shadow-xl',
    confirmButton: 'bg-indigo-600 text-white px-5 py-2 rounded-lg',
  },
  buttonsStyling: false,
};

export const MENSAJE_CUENTA_DE_CLIENTE =
  'La cuenta de un cliente la administra el administrador general';

/** Aviso de una acción que el rol de la sesión no tiene permitida. */
export const avisarAccionNoPermitida = (
  mensaje: string = MENSAJE_CUENTA_DE_CLIENTE,
) =>
  Swal.fire({
    title: 'Acción no permitida',
    text: mensaje,
    icon: 'error',
    confirmButtonText: 'OK',
    ...ESTILO,
  });

/** El mensaje que manda el backend en un error de axios, o el de respaldo. */
export const mensajeDeError = (error: unknown, respaldo: string): string => {
  const respuesta = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = respuesta.response?.data?.message ?? respuesta.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || respaldo;
};
