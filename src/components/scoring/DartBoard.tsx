'use client';
import { SEGMENT_ORDER, SEGMENT_ANGLE, R_DOUBLE_IN, R_TRIPLE_OUT, R_TRIPLE_IN, R_OUTER_BULL, R_INNER_BULL } from '@/lib/dartboard';

interface DartBoardProps {
  onPress: (segment: number) => void;
  accentColor?: string;
  className?: string;
}

const SIZE = 200;
const C = SIZE / 2; // 100

/** Polar → cartesian, angle in degrees measured clockwise from 12 o'clock. */
function polar(deg: number, r: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° → screen-top
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

/** One annular wedge between radii r1 > r2 at angle deg..deg+18. */
function wedgePath(deg: number, r1: number, r2: number): string {
  const [ax, ay] = polar(deg, r1);
  const [bx, by] = polar(deg + SEGMENT_ANGLE, r1);
  const [cx, cy] = polar(deg + SEGMENT_ANGLE, r2);
  const [dx, dy] = polar(deg, r2);
  return `M ${ax} ${ay} A ${r1} ${r1} 0 0 1 ${bx} ${by} L ${cx} ${cy} A ${r2} ${r2} 0 0 0 ${dx} ${dy} Z`;
}

const BOARD_RINGS = [
  { r1: 1.0, r2: R_DOUBLE_IN },        // double ring
  { r1: R_TRIPLE_OUT, r2: R_TRIPLE_IN },// triple ring
  { r1: R_TRIPLE_IN, r2: R_OUTER_BULL },// single area
];

export default function DartBoard({ onPress, className }: DartBoardProps) {
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - C;
    const dy = y - C;
    const r = Math.sqrt(dx * dx + dy * dy) / (rect.width / 2);
    if (r > 1) return; // outside the board
    if (r <= R_OUTER_BULL) {
      onPress(r <= R_INNER_BULL ? 50 : 25);
      return;
    }
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° at 12 o'clock, clockwise
    const idx = Math.floor((((deg % 360) + 360) % 360) / SEGMENT_ANGLE) % 20;
    onPress(SEGMENT_ORDER[idx]);
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerDown={handlePointer}
      role="img"
      aria-label="Dartboard — tap where the dart landed"
    >
      {SEGMENT_ORDER.map((seg, i) => {
        const deg = i * SEGMENT_ANGLE;
        const fill = i % 2 === 0 ? '#18181b' : '#27272a'; // zinc-900 / zinc-800 alternation
        return (
          <g key={seg}>
            {BOARD_RINGS.map((ring, j) => (
              <path key={j} d={wedgePath(deg, ring.r1 * C, ring.r2 * C)} fill={fill} stroke="#3f3f46" strokeWidth="0.75" />
            ))}
            {/* segment labels at mid radius of the double ring */}
            <text
              x={polar(deg + SEGMENT_ANGLE / 2, ((R_DOUBLE_IN + R_TRIPLE_OUT) / 2) * C)[0]}
              y={polar(deg + SEGMENT_ANGLE / 2, ((R_DOUBLE_IN + R_TRIPLE_OUT) / 2) * C)[1]}
              textAnchor="middle" dominantBaseline="central"
              className="fill-zinc-400 text-[9px] font-mono"
            >
              {seg}
            </text>
          </g>
        );
      })}
      {/* bulls */}
      <circle cx={C} cy={C} r={R_OUTER_BULL * C} fill="#22c55e" stroke="#166534" strokeWidth="1" />
      <circle cx={C} cy={C} r={R_INNER_BULL * C} fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
    </svg>
  );
}
