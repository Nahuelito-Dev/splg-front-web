
interface Props {
  className?: string;
  textSize?: string;
}

export const YennigasLogo = ({
  className = '',
  textSize = 'text-5xl',
}: Props) => {
  return (
    <div
      className={`flex items-center justify-center select-none ${className}`}
      style={{ fontFamily: '"Pacifico", cursive' }}
    >
      {/* Parte "Yenni" - Azul con borde blanco simulado */}
      <span
        className={`${textSize} relative z-10 mr-[-5px]`}
        style={{
          color: '#22d3ee', // Cyan-400
          textShadow:
            '3px 3px 0px #000, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff',
        }}
      >
        Yenni
      </span>

      {/* Parte "gas" - Fondo Rosa */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-[#f43f5e] transform -skew-x-12 rounded-lg scale-110"
          style={{
            boxShadow: '2px 2px 0px white',
          }}
        ></div>
        <span
          className={`${textSize} relative z-10 text-white px-1`}
          style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}
        >
          gas
        </span>
      </div>
    </div>
  );
};
