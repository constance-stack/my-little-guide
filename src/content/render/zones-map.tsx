/**
 * Stylized, color-coded illustration of Bangkok's touristic neighborhoods
 * — not a literal geographic map (no real polygon boundaries exist for
 * "touristic zones"), but a simplified layout that keeps each zone's
 * real relative position (river, old town bend, north/south/east/west)
 * roughly right. Shared between the web guide and the PDF so both show
 * the same illustration driven by the same Zone.mapColor data.
 */
const LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  "rattanakosin-banglamphu": { x: 300, y: 130, w: 170, h: 150 },
  "chinatown-talat-noi": { x: 330, y: 300, w: 150, h: 110 },
  "riverside": { x: 350, y: 430, w: 150, h: 120 },
  "silom-sathorn": { x: 480, y: 450, w: 160, h: 150 },
  "siam-chit-lom": { x: 490, y: 270, w: 160, h: 150 },
  "pratunam": { x: 470, y: 120, w: 150, h: 110 },
  "ari": { x: 440, y: 10, w: 180, h: 90 },
  "sukhumvit-asok-phrom-phong": { x: 660, y: 290, w: 150, h: 280 },
  "thonburi": { x: 40, y: 170, w: 250, h: 430 },
};

export function ZonesMap({
  zones,
}: {
  zones: { id: string; slug: string; name: string; mapColor: string }[];
}) {
  const placed = zones.filter((z) => LAYOUT[z.slug]);

  return (
    <div>
      <svg viewBox="0 0 860 710" className="w-full" role="img" aria-label="Carte illustrative des quartiers de Bangkok">
        {/* Chao Phraya river — illustrative curve, not a surveyed path */}
        <path
          d="M 400 0 C 360 120, 280 160, 300 300 C 315 400, 360 460, 340 710"
          fill="none"
          stroke="#aecbd6"
          strokeWidth={34}
          strokeLinecap="round"
        />
        {placed.map((z) => {
          const box = LAYOUT[z.slug];
          return (
            <g key={z.id}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={28}
                fill={z.mapColor}
                fillOpacity={0.85}
                stroke="#faf8f3"
                strokeWidth={3}
              />
              <text
                x={box.x + box.w / 2}
                y={box.y + box.h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#faf8f3"
                fontSize={15}
                fontWeight={600}
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.25)", strokeWidth: 3 }}
              >
                {splitLabel(z.name).map((line, i) => (
                  <tspan key={i} x={box.x + box.w / 2} dy={i === 0 ? 0 : 18}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-xs italic text-foreground/50">
        Carte indicative — les zones représentent des secteurs touristiques usuels, pas des limites administratives officielles.
      </p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {zones.map((z) => (
          <li key={z.id} className="flex items-center gap-2 text-sm text-foreground/80">
            <ZoneSwatch color={z.mapColor} />
            {z.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ZoneSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-ivory"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function splitLabel(name: string): string[] {
  // Keeps the glyph map's labels on two short lines ("Sukhumvit / Asok /
  // Phrom Phong" doesn't fit one line at this box width) by breaking on
  // the zone-name convention's own " / " separator.
  const parts = name.split(" / ");
  if (parts.length <= 1) return [name];
  if (parts.length === 2) return parts;
  return [parts[0], parts.slice(1).join(" / ")];
}
