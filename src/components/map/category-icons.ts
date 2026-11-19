/**
 * Draws a small, flat monochrome glyph for a Category.icon keyword (set
 * in prisma/seed.ts's GLOBAL_CATEGORIES) directly onto a canvas 2D
 * context — hand-drawn vector shapes, not emoji or an icon font.
 *
 * This exists because two earlier approaches failed: MapLibre's
 * text-field only renders glyphs from the style's own single-color SDF
 * font (no emoji coverage, so emoji rendered as nothing), and even once
 * emoji were rasterized via canvas text instead, full-color pictographs
 * read as indistinct blobs at marker size and most places share
 * "incontournables" as a tagged category, which flattened the map to
 * mostly gold stars. Flat white silhouettes on the category-colored
 * circle (the convention most map pins use) stay legible at ~24px and
 * are drawn from the place's most specific category, not just the first.
 *
 * Caller sets fillStyle/strokeStyle (typically white) before calling;
 * every shape here only calls fill()/stroke(), never sets a color.
 */
/**
 * Picks the category that should represent a place on the map: the most
 * specific one tagged, not just the first. "Incontournables" is applied
 * so broadly alongside a more specific category (a temple, a restaurant…)
 * that defaulting to the first tag made most markers gold stars — skip it
 * in favor of any other tagged category when one exists.
 */
export function pickRepresentativeCategory<T extends { slug: string }>(categories: T[]): T | undefined {
  return categories.find((c) => c.slug !== "incontournables") ?? categories[0];
}

export function drawCategoryIcon(ctx: CanvasRenderingContext2D, icon: string, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (icon) {
    case "star":
      drawStar(ctx, cx, cy, size * 0.32, size * 0.14, 5);
      break;
    case "temple":
      drawTemple(ctx, cx, cy, size);
      break;
    case "walk":
      drawWalkPath(ctx, cx, cy, size);
      break;
    case "sparkle":
      drawStar(ctx, cx, cy, size * 0.3, size * 0.08, 4);
      break;
    case "family":
      drawFamily(ctx, cx, cy, size);
      break;
    case "fork":
      drawFork(ctx, cx, cy, size);
      break;
    case "noodles":
      drawBowl(ctx, cx, cy, size);
      break;
    case "coffee":
      drawCup(ctx, cx, cy, size);
      break;
    case "cocktail":
      drawCocktail(ctx, cx, cy, size);
      break;
    case "basket":
      drawBasket(ctx, cx, cy, size);
      break;
    case "bag":
      drawBag(ctx, cx, cy, size);
      break;
    case "compass":
      drawCompass(ctx, cx, cy, size);
      break;
    case "lotus":
      drawLotus(ctx, cx, cy, size);
      break;
    case "view":
      drawMountains(ctx, cx, cy, size);
      break;
    case "moon":
      drawMoon(ctx, cx, cy, size);
      break;
    case "transport":
      drawTransport(ctx, cx, cy, size);
      break;
    case "bed":
      drawBed(ctx, cx, cy, size);
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTemple(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // A classical museum facade — pediment, entablature and columns — not
  // a house: a plain pitched roof over a body read as "home", not
  // "monument/museum".
  const halfW = size * 0.26;
  const roofTopY = cy - size * 0.3;
  const roofBaseY = cy - size * 0.12;
  const entablatureBottomY = cy - size * 0.04;
  const baseTopY = cy + size * 0.24;
  const baseY = cy + size * 0.3;

  // Pediment (triangular roof).
  ctx.beginPath();
  ctx.moveTo(cx, roofTopY);
  ctx.lineTo(cx + halfW * 1.1, roofBaseY);
  ctx.lineTo(cx - halfW * 1.1, roofBaseY);
  ctx.closePath();
  ctx.fill();

  // Entablature (thin bar under the roof).
  ctx.fillRect(cx - halfW, roofBaseY, halfW * 2, entablatureBottomY - roofBaseY);

  // Three columns.
  const colWidth = size * 0.07;
  const colTopY = entablatureBottomY;
  const gap = (halfW * 2 - colWidth * 3) / 2;
  for (let i = 0; i < 3; i++) {
    const x = cx - halfW + i * (colWidth + gap);
    ctx.fillRect(x, colTopY, colWidth, baseTopY - colTopY);
  }

  // Base (thin bar).
  ctx.fillRect(cx - halfW * 1.1, baseTopY, halfW * 2.2, baseY - baseTopY);
}

function drawWalkPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.26, cy + size * 0.24);
  ctx.quadraticCurveTo(cx - size * 0.1, cy - size * 0.1, cx + size * 0.02, cy);
  ctx.quadraticCurveTo(cx + size * 0.18, cy + size * 0.14, cx + size * 0.26, cy - size * 0.24);
  ctx.stroke();
}

function drawFamily(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // A single heart — "family/togetherness" as one clean, unambiguous shape
  // instead of trying (and failing, at this size) to depict people.
  const r = size * 0.19;
  const topY = cy - size * 0.12;
  ctx.beginPath();
  ctx.arc(cx - r * 0.95, topY, r, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.95, topY, r, 0, Math.PI * 2);
  ctx.moveTo(cx - r * 1.85, topY + r * 0.35);
  ctx.lineTo(cx, cy + size * 0.32);
  ctx.lineTo(cx + r * 1.85, topY + r * 0.35);
  ctx.closePath();
  ctx.fill();
}

function drawFork(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Three tines over a cross-bar, one straight handle — a simple flat
  // fork silhouette, not a spoon.
  const topY = cy - size * 0.32;
  const barY = cy - size * 0.06;
  const bottomY = cy + size * 0.32;
  const spread = size * 0.14;

  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(cx - spread, topY);
  ctx.lineTo(cx - spread, barY);
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, barY);
  ctx.moveTo(cx + spread, topY);
  ctx.lineTo(cx + spread, barY);
  ctx.moveTo(cx - spread, barY);
  ctx.lineTo(cx + spread, barY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, barY);
  ctx.lineTo(cx, bottomY);
  ctx.stroke();
}

function drawBowl(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // A bowl with wavy noodle strands rising out of it, plus one chopstick
  // resting across the rim — reads as "noodles" specifically, not just
  // generic chopsticks.
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.1, size * 0.26, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "round";
  const rimY = cy - size * 0.02;
  for (const dx of [-size * 0.1, size * 0.08]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, rimY);
    ctx.quadraticCurveTo(cx + dx - size * 0.07, rimY - size * 0.14, cx + dx + size * 0.03, rimY - size * 0.28);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, cy + size * 0.04);
  ctx.lineTo(cx + size * 0.28, cy - size * 0.28);
  ctx.stroke();
}

function drawCup(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Scaled down ~25% from the original — client feedback was that this
  // one read fine, just too large relative to the others.
  const w = size * 0.26;
  const top = cy - size * 0.14;
  const bottom = cy + size * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx - w, top);
  ctx.lineTo(cx + w, top);
  ctx.lineTo(cx + w * 0.78, bottom);
  ctx.lineTo(cx - w * 0.78, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(cx + w * 0.95, cy, size * 0.1, -0.6 * Math.PI, 0.6 * Math.PI);
  ctx.stroke();
}

function drawCocktail(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size * 0.26;
  const top = cy - size * 0.26;
  const mid = cy - size * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx - w, top);
  ctx.lineTo(cx + w, top);
  ctx.lineTo(cx, mid);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(cx, mid);
  ctx.lineTo(cx, cy + size * 0.26);
  ctx.moveTo(cx - size * 0.16, cy + size * 0.26);
  ctx.lineTo(cx + size * 0.16, cy + size * 0.26);
  ctx.stroke();
}

function drawBasket(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const topW = size * 0.3;
  const botW = size * 0.22;
  const top = cy - size * 0.02;
  const bottom = cy + size * 0.26;
  ctx.beginPath();
  ctx.moveTo(cx - topW, top);
  ctx.lineTo(cx + topW, top);
  ctx.lineTo(cx + botW, bottom);
  ctx.lineTo(cx - botW, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.14, size * 0.18, Math.PI, 2 * Math.PI);
  ctx.stroke();
}

function drawBag(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size * 0.26;
  const top = cy - size * 0.1;
  const bottom = cy + size * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - w, top);
  ctx.lineTo(cx + w, top);
  ctx.lineTo(cx + w * 0.88, bottom);
  ctx.lineTo(cx - w * 0.88, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(cx, top - size * 0.02, size * 0.15, Math.PI, 2 * Math.PI);
  ctx.stroke();
}

function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.18);
  ctx.lineTo(cx + size * 0.08, cy);
  ctx.lineTo(cx, cy + size * 0.18);
  ctx.lineTo(cx - size * 0.08, cy);
  ctx.closePath();
  ctx.fill();
}

function drawLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Three petals instead of five — stays a clean flower shape at marker
  // size instead of fusing into a blob.
  const petal = (angle: number) => {
    ctx.save();
    ctx.translate(cx, cy + size * 0.06);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.12, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  for (const angle of [-0.45, 0, 0.45]) petal(angle);
}

function drawMountains(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // A single peak — one clean triangle instead of a sun + two overlapping
  // ridgelines, which merged into a smudge at marker size.
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.24);
  ctx.lineTo(cx - size * 0.3, cy + size * 0.24);
  ctx.closePath();
  ctx.fill();
}

function drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx + size * 0.12, cy - size * 0.06, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTransport(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size * 0.28;
  ctx.beginPath();
  const top = cy - size * 0.24;
  const bottom = cy + size * 0.08;
  ctx.moveTo(cx - w, top + size * 0.08);
  ctx.quadraticCurveTo(cx - w, top, cx - w + size * 0.08, top);
  ctx.lineTo(cx + w - size * 0.08, top);
  ctx.quadraticCurveTo(cx + w, top, cx + w, top + size * 0.08);
  ctx.lineTo(cx + w, bottom);
  ctx.lineTo(cx - w, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx - w * 0.5, cy + size * 0.26, size * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.5, cy + size * 0.26, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx - w * 0.5, cy + size * 0.26, size * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.5, cy + size * 0.26, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawBed(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size * 0.3;
  ctx.fillRect(cx - w, cy - size * 0.02, w * 2, size * 0.2);
  ctx.beginPath();
  ctx.arc(cx - w * 0.6, cy - size * 0.1, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + size * 0.24);
  ctx.lineTo(cx - w, cy - size * 0.12);
  ctx.moveTo(cx + w, cy + size * 0.24);
  ctx.lineTo(cx + w, cy + size * 0.02);
  ctx.stroke();
}
