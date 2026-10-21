/** Mismo tope que `ModerateRatingDto.reason`. */
export const MODERATION_REASON_MAX = 500;

export const moderationReasonError = (reason: string): string | undefined =>
  reason.trim().length > MODERATION_REASON_MAX ? `No puede superar ${MODERATION_REASON_MAX} caracteres` : undefined;

export const moderationReasonCounter = (reason: string): string => `${reason.trim().length}/${MODERATION_REASON_MAX}`;
