import {
  DEFAULT_ACK_MESSAGE,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_HANDOFF_MESSAGE,
  DEFAULT_OUT_OF_HOURS_MESSAGE,
} from '../../../services/api/inbox';
import type { ChatSettings } from '../../../services/api/types';
import type { AutoRepliesValues } from './settingsSchemas';

/**
 * El texto de siempre de cada campo (lo que usa el back si se deja vacío). Mientras la empresa no guardó uno propio, la
 * API lo devuelve en `effective*`; con uno propio guardado, `effective*` es el propio y vale el de omisión del back.
 */
export const defaultTexts = (settings: ChatSettings) => ({
  name: DEFAULT_ASSISTANT_NAME,
  handoff: settings.handoffMessage === null ? settings.effectiveHandoffMessage : DEFAULT_HANDOFF_MESSAGE,
  outOfHours: settings.outOfHoursMessage === null ? settings.effectiveOutOfHoursMessage : DEFAULT_OUT_OF_HOURS_MESSAGE,
  ack: settings.ackMessage === null ? settings.effectiveAckMessage : DEFAULT_ACK_MESSAGE,
});

/**
 * Lo que mandaría el asistente con lo que está escrito en el formulario (vacío: el texto de siempre), todavía con
 * las variables sin completar. `nameIsSaved`: el nombre es el que ya está guardado.
 */
export const assistantTexts = (settings: ChatSettings, values: AutoRepliesValues) => {
  const defaults = defaultTexts(settings);
  const name = values.assistantName.trim();
  return {
    name: name || defaults.name,
    nameIsSaved: name === (settings.assistantName ?? ''),
    handoff: values.handoffMessage.trim() || defaults.handoff,
    outOfHours: values.outOfHoursMessage.trim() || defaults.outOfHours,
    ack: values.ackMessage.trim() || defaults.ack,
  };
};
