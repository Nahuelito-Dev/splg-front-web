interface Props {
  message: string | null;
}

/** Lo que el back rechaza para la base entera (el tope de preguntas) y no corresponde a un campo. */
export const FaqFormError = ({ message }: Props) =>
  message ? (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
      {message}
    </p>
  ) : null;
