// levels: how many color levels (2..10, coarser <-> finer).
// contrast: contrast around the midpoint (flatter <-> punchier).
function PosterizeFilter(color, x, y, image, uniforms) {
  let levels = floor((uniforms.levels + 1) / 2 * 8 + 2); // -1..1 -> 2..10
  let contrast = 1 + uniforms.contrast;                  // -1..1 -> 0..2

  let r = floor(color.r * levels) / levels;
  let g = floor(color.g * levels) / levels;
  let b = floor(color.b * levels) / levels;

  r = constrain((r - 0.5) * contrast + 0.5, 0, 1);
  g = constrain((g - 0.5) * contrast + 0.5, 0, 1);
  b = constrain((b - 0.5) * contrast + 0.5, 0, 1);

  return new DFX.ColorVec(r, g, b, color.a);
}
