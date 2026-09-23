interface Props {
  className?: string;
  textSize?: string;
}

/**
 * La marca que se ve en el ingreso, en el menú lateral y mientras carga.
 *
 * Es el nombre del sistema, no el de la titular de la distribuidora: el panel
 * lo usa cualquier distribuidora que opere con él.
 */
export const LogoSplg = ({ className = '', textSize = 'text-5xl' }: Props) => {
  return (
    <div
      className={`flex items-center justify-center select-none ${className}`}
      style={{ fontFamily: '"Pacifico", cursive' }}
    >
      <span
        className={`${textSize} relative z-10`}
        style={{
          color: '#22d3ee', // Cyan-400
          textShadow:
            '3px 3px 0px #000, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff',
        }}
      >
        SPLG
      </span>
    </div>
  );
};
