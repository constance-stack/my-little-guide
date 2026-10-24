/**
 * Stylized, color-coded illustration of a destination's touristic
 * neighborhoods — not a literal geographic map (no real polygon
 * boundaries exist for "touristic zones"), but a simplified layout that
 * keeps each zone's real relative position (river, old town bend, north/
 * south/east/west) roughly right. Shared between the web guide and the
 * PDF so both show the same illustration driven by the same
 * Zone.mapColor data. One hand-placed LAYOUT per destination — a
 * destination with no entry here just doesn't get a map (see
 * hasZonesMapLayout()), same as before this was generalized past Bangkok.
 */
type Box = { x: number; y: number; w: number; h: number };
type DestinationLayout = {
  viewBox: string;
  altText: string;
  water: { d: string; strokeWidth: number }[];
  waterLabels?: { text: string; x: number; y: number; rotate?: number }[];
  // An optional faint outline + label grouping several zone boxes under a
  // larger geographic unit (e.g. Manhattan's many neighborhoods) — drawn
  // first, behind the zone boxes, purely for orientation.
  groups?: { label: string; x: number; y: number; w: number; h: number }[];
  boxes: Record<string, Box>;
};

const LAYOUTS: Record<string, DestinationLayout> = {
  bangkok: {
    viewBox: "0 0 860 710",
    altText: "Carte illustrative des quartiers de Bangkok",
    water: [
      // Chao Phraya river — illustrative curve, not a surveyed path
      { d: "M 400 0 C 360 120, 280 160, 300 300 C 315 400, 360 460, 340 710", strokeWidth: 34 },
    ],
    boxes: {
      "rattanakosin-banglamphu": { x: 300, y: 130, w: 170, h: 150 },
      "chinatown-talat-noi": { x: 330, y: 300, w: 150, h: 110 },
      riverside: { x: 350, y: 430, w: 150, h: 120 },
      "silom-sathorn": { x: 480, y: 450, w: 160, h: 150 },
      "siam-chit-lom": { x: 490, y: 270, w: 160, h: 150 },
      pratunam: { x: 470, y: 120, w: 150, h: 110 },
      ari: { x: 440, y: 10, w: 180, h: 90 },
      "sukhumvit-asok-phrom-phong": { x: 660, y: 290, w: 150, h: 280 },
      thonburi: { x: 40, y: 170, w: 250, h: 430 },
    },
  },
  "new-york": {
    viewBox: "0 0 900 980",
    altText: "Carte illustrative des quartiers de New York",
    water: [
      // Hudson River (west of Manhattan)
      { d: "M 260 10 L 260 650", strokeWidth: 26 },
      // East River (east of Manhattan, between Manhattan/Bronx and Queens/Brooklyn)
      { d: "M 610 60 C 600 300, 600 450, 610 650", strokeWidth: 26 },
      // Harlem River (between Manhattan and the Bronx)
      { d: "M 330 80 C 450 60, 550 65, 605 90", strokeWidth: 16 },
    ],
    waterLabels: [
      { text: "Hudson River", x: 243, y: 400, rotate: -90 },
      { text: "East River", x: 627, y: 420, rotate: -90 },
    ],
    groups: [{ label: "MANHATTAN", x: 270, y: 88, w: 330, h: 578 }],
    boxes: {
      bronx: { x: 330, y: 10, w: 250, h: 55 },
      harlem: { x: 330, y: 95, w: 250, h: 75 },
      "upper-west-side": { x: 290, y: 185, w: 140, h: 95 },
      "upper-east-side": { x: 440, y: 185, w: 140, h: 95 },
      midtown: { x: 300, y: 295, w: 290, h: 85 },
      chelsea: { x: 280, y: 395, w: 140, h: 85 },
      village: { x: 440, y: 395, w: 140, h: 85 },
      "soho-tribeca-chinatown": { x: 310, y: 495, w: 270, h: 75 },
      "lower-manhattan": { x: 330, y: 585, w: 230, h: 75 },
      queens: { x: 630, y: 240, w: 250, h: 400 },
      brooklyn: { x: 380, y: 690, w: 380, h: 230 },
    },
  },
};

export function hasZonesMapLayout(destinationSlug: string): boolean {
  return destinationSlug in LAYOUTS;
}

export function ZonesMap({
  zones,
  destinationSlug,
}: {
  zones: { id: string; slug: string; name: string; mapColor: string }[];
  destinationSlug: string;
}) {
  const layout = LAYOUTS[destinationSlug];
  if (!layout) return null;
  const placed = zones.filter((z) => layout.boxes[z.slug]);

  return (
    <div>
      <svg viewBox={layout.viewBox} className="w-full" role="img" aria-label={layout.altText}>
        {layout.water.map((w, i) => (
          <path key={i} d={w.d} fill="none" stroke="#aecbd6" strokeWidth={w.strokeWidth} strokeLinecap="round" />
        ))}
        {layout.groups?.map((g, i) => (
          <g key={i}>
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx={16}
              fill="none"
              stroke="#8a7a63"
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeDasharray="6 6"
            />
            <rect
              x={g.x + g.w / 2 - 58}
              y={g.y - 24}
              width={116}
              height={18}
              fill="#faf8f3"
            />
            <text
              x={g.x + g.w / 2}
              y={g.y - 10}
              textAnchor="middle"
              fill="#8a7a63"
              fillOpacity={0.9}
              fontSize={14}
              fontWeight={700}
              letterSpacing={2}
            >
              {g.label}
            </text>
          </g>
        ))}
        {layout.waterLabels?.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            fill="#6a8caf"
            fontSize={13}
            fontStyle="italic"
            fontWeight={600}
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
          >
            {l.text}
          </text>
        ))}
        {placed.map((z) => {
          const box = layout.boxes[z.slug];
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
  // Keeps the glyph map's labels on two short lines (long zone names
  // don't fit one line at this box width) by breaking on the zone-name
  // convention's own " / " separator first (e.g. "Sukhumvit / Asok /
  // Phrom Phong"), falling back to " & " (e.g. "Chelsea & Meatpacking
  // District") for zone names that use that convention instead.
  const slashParts = name.split(" / ");
  if (slashParts.length > 1) {
    if (slashParts.length === 2) return slashParts;
    return [slashParts[0], slashParts.slice(1).join(" / ")];
  }
  const ampParts = name.split(" & ");
  if (ampParts.length === 2) return ampParts;
  return [name];
}
