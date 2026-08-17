import { Logo } from '@aletheia/frontend-commons';

// Hero decorativo del panel de control: una hoja con forma orgánica (bordes
// con leve curvatura y un "boil" continuo, no un rectángulo geométrico
// perfecto) que se firma (la pluma recorre la misma curva que se dibuja),
// se sella, se archiva en una carpeta que se abre para recibirla, y el ciclo
// cierra con el logo como si fueran los créditos de una grabación — luego
// reinicia. Todo SVG + CSS (ver tokens.css), sin JS ni dependencias nuevas.

const SIGNATURE_PATH =
  'M85,190 Q100,155 115,190 T145,190 T175,190 T205,190 T235,190 T265,190 T295,190';

// Hoja con bordes ligeramente curvos en vez de un rect perfecto — el
// trazo "boil" (ver .animate-paper-boil) hace el resto del efecto orgánico.
const PAPER_PATH =
  'M74,44 C130,38 230,36 326,44 C330,90 328,150 326,206 C228,212 128,210 74,206 C70,150 72,96 74,44 Z';

export function SignatureArchiveAnimation() {
  return (
    <div className="relative flex h-72 w-full items-center justify-center overflow-hidden rounded-base border-2 border-border bg-background shadow-shadow sm:h-80 lg:h-96">
      <svg
        viewBox="0 0 400 260"
        className="h-full w-full max-w-2xl"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Taza de café con vapor — utilería de escritorio, ambiente fijo. */}
        <g transform="translate(38,48)" opacity="0.8">
          <path
            d="M2,10 Q0,26 12,27 Q25,27 24,10 Q24,6 20,6 L4,6 Q1,6 2,10 Z"
            fill="var(--color-secondary-background)"
            stroke="var(--color-border-muted)"
            strokeWidth="2"
          />
          <path
            d="M24,10 Q34,8 34,16 Q34,23 24,21"
            fill="none"
            stroke="var(--color-border-muted)"
            strokeWidth="2"
          />
          <path
            className="animate-steam"
            d="M7,4 Q11,-4 7,-10"
            stroke="var(--color-muted-foreground)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            style={{ animationDelay: '0s' }}
          />
          <path
            className="animate-steam"
            d="M16,4 Q20,-4 16,-10"
            stroke="var(--color-muted-foreground)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            style={{ animationDelay: '1.1s' }}
          />
        </g>

        {/* Carpeta destino — la solapa se abre justo antes de recibir la hoja. */}
        <g transform="translate(300,195)" opacity="0.95">
          <path
            d="M0,14 Q0,4 8,4 L16,4 Q20,4 22,7 L27,14 L52,14 Q60,14 60,22 L60,40 Q60,44 56,44 L4,44 Q0,44 0,40 Z"
            fill="var(--color-main)"
            stroke="var(--color-border)"
            strokeWidth="2"
          />
          <g className="animate-folder-flap" style={{ transformOrigin: '30px 44px' }}>
            <path
              d="M3,44 Q1,20 30,19 Q59,20 57,44 Z"
              fill="var(--color-main-hover)"
              stroke="var(--color-border)"
              strokeWidth="2"
            />
          </g>
        </g>

        {/* Documento: entra, se firma, se sella, se archiva. */}
        <g className="animate-paper">
          <g className="animate-paper-boil">
            <path
              d={PAPER_PATH}
              fill="var(--color-background)"
              stroke="var(--color-border)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Doblez de esquina */}
            <path
              d="M298,44 Q328,42 328,68 Q312,58 298,44 Z"
              fill="var(--color-secondary-background)"
              stroke="var(--color-border)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Clip de papel */}
            <path
              d="M96,50 Q84,50 84,63 L84,82 Q84,92 94,92 Q104,92 104,82 L104,66"
              fill="none"
              stroke="var(--color-muted-foreground)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Líneas de texto, con leve curva (nada de reglas perfectas) */}
            <path
              d="M112,70 Q200,66 288,71"
              stroke="var(--color-border-muted)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M112,90 Q190,87 268,91"
              stroke="var(--color-border-muted)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M112,110 Q200,107 284,111"
              stroke="var(--color-border-muted)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M112,130 Q170,127 224,131"
              stroke="var(--color-border-muted)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Línea de firma (guía) + trazo animado */}
            <path
              d="M85,200 Q190,197 295,200"
              stroke="var(--color-border-muted)"
              strokeWidth="2"
              strokeDasharray="3 4"
              fill="none"
            />
            <path
              d={SIGNATURE_PATH}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              className="animate-signature"
            />

            {/* Marca del sello, junto a la firma */}
            <g className="animate-stamp-mark">
              <circle
                cx="250"
                cy="178"
                r="22"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="3"
              />
              <path
                d="M240,178 L247,186 L262,168"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>

        {/* Pluma: recorre la MISMA curva que la firma, en sincronía. */}
        <g className="animate-pen" style={{ offsetPath: `path('${SIGNATURE_PATH}')` }}>
          <path
            d="M-6,0 L0,-11 L6,0 L0,11 Z"
            fill="var(--color-foreground)"
            stroke="var(--color-foreground)"
            strokeLinejoin="round"
          />
          <line x1="0" y1="-9" x2="0" y2="9" stroke="var(--color-background)" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Créditos: el logo cierra cada ciclo, como al final de una grabación. */}
      <div className="animate-credits pointer-events-none absolute inset-0 flex items-center justify-center">
        <Logo size={34} className="drop-shadow-sm" />
      </div>
    </div>
  );
}
