import type { LocationDto } from '@urcst/shared';

const WIDTH = 640;
const HEIGHT = 340;
const CENTRE_X = 320;
const CENTRE_Y = HEIGHT / 2;
const KM_SCALE = 52;
const RINGS = [1, 2, 3];
const FONT = 'Inter,Arial';

function position({ angleDeg, distanceKm }: LocationDto): [number, number] {
  const radians = (angleDeg * Math.PI) / 180;
  return [
    CENTRE_X + Math.cos(radians) * distanceKm * KM_SCALE,
    CENTRE_Y - Math.sin(radians) * distanceKm * KM_SCALE,
  ];
}

interface SchematicMapProps {
  locations: LocationDto[];
  area?: string;
  /** Where the landlord placed the pin, from 0 to 1 across and down. */
  pin?: { x: number; y: number } | null;
}

/** A simple drawing of the area around campus, not to scale. Later reused by the wizard. */
export function SchematicMap({ locations, area, pin }: SchematicMapProps) {
  const location = locations.find(({ name }) => name === area);
  const pinAt: [number, number] | null = pin
    ? [pin.x * WIDTH, pin.y * HEIGHT]
    : location
      ? position(location)
      : null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Schematic map around UR-CST${area ? `, showing ${area}` : ''}. Not to scale.`}
    >
      <rect width={WIDTH} height={HEIGHT} fill="#EEF3EE" />
      <path
        d={`M0 ${HEIGHT * 0.7} C160 ${HEIGHT * 0.55} 260 ${HEIGHT * 0.9} 420 ${HEIGHT * 0.72} S600 ${HEIGHT * 0.5} ${WIDTH} ${HEIGHT * 0.62}`}
        stroke="#fff"
        strokeWidth="14"
        fill="none"
      />
      <path
        d={`M${WIDTH * 0.2} 0 C${WIDTH * 0.3} ${HEIGHT * 0.3} ${WIDTH * 0.45} ${HEIGHT * 0.45} ${WIDTH * 0.5} ${HEIGHT}`}
        stroke="#fff"
        strokeWidth="10"
        fill="none"
      />
      <path
        d={`M${WIDTH * 0.78} 0 C${WIDTH * 0.7} ${HEIGHT * 0.3} ${WIDTH * 0.62} ${HEIGHT * 0.5} ${WIDTH * 0.55} ${HEIGHT}`}
        stroke="#fff"
        strokeWidth="8"
        fill="none"
      />
      <path d={`M0 ${HEIGHT * 0.25} H${WIDTH}`} stroke="#fff" strokeWidth="6" fill="none" />
      {RINGS.map((km) => (
        <g key={km}>
          <circle
            cx={CENTRE_X}
            cy={CENTRE_Y}
            r={km * KM_SCALE}
            fill="none"
            stroke="#94A3B8"
            strokeDasharray="4 6"
          />
          <text
            x={CENTRE_X + km * KM_SCALE - 6}
            y={CENTRE_Y + 14}
            fontSize="11"
            fontFamily={FONT}
            fill="#64748B"
          >
            {km} km
          </text>
        </g>
      ))}
      {locations.map((item) => {
        const [x, y] = position(item);
        return (
          <g key={item.id}>
            <circle cx={x} cy={y} r="4" fill="#94A3B8" />
            <text x={x + 8} y={y - 6} fontSize="13" fontFamily={FONT} fill="#334155">
              {item.name}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${CENTRE_X},${CENTRE_Y})`}>
        <rect x="-44" y="-14" width="88" height="28" rx="8" fill="#0F172A" />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fontFamily={FONT}
          fill="#fff"
        >
          UR-CST
        </text>
      </g>
      {pinAt && (
        <g transform={`translate(${pinAt[0]},${pinAt[1]})`}>
          <path
            d="M0 0c-9-12-14-18-14-25a14 14 0 0 1 28 0c0 7-5 13-14 25z"
            fill="#1D4ED8"
            stroke="#fff"
            strokeWidth="2.5"
          />
          <circle cx="0" cy="-25" r="5" fill="#fff" />
        </g>
      )}
      <text x="12" y={HEIGHT - 12} fontSize="11" fontFamily="Inter,Arial" fill="#475569">
        Schematic map · not to scale
      </text>
    </svg>
  );
}
