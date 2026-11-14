// Equirectangular demo viewport, not a calibrated physical camera model.
export function skylineAt(values: readonly number[], azimuth: number): number {
  if (!values.length) return 0;
  const position = ((azimuth % 360 + 360) % 360) / 360 * values.length;
  const index = Math.floor(position);
  const fraction = position - index;
  return values[index] * (1 - fraction) + values[(index + 1) % values.length] * fraction;
}

export function cameraHorizon(values: readonly number[], heading: number, width: number, height: number) {
  const direction = (heading % 360 + 360) % 360;
  const elevations = Array.from({length: width}, (_, x) => skylineAt(values, direction - 45 + x / (width - 1) * 90));
  const center = (Math.max(...elevations) + Math.min(...elevations)) / 2 - 8;
  const verticalSpan = Math.max(50, Math.max(...elevations) - Math.min(...elevations) + 24);
  return elevations.map(elevation => height * (.5 + (center - elevation) / verticalSpan));
}

function noise(x: number, y: number) {
  const hash = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
    + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
}

export type CameraTexture = {image: CanvasImageSource; width: number; height: number};

// Blend overlapping texture edges instead of mirroring rocks and shadows.
export function cameraTexturePosition(azimuth: number, phase: number) {
  const cycle = ((azimuth / 180 + phase) % 1 + 1) % 1;
  const position = cycle * .85;
  const mix = Math.max(0, (position - .7) / .15);
  return {primary: .15 + position, secondary: Math.max(0, position - .7), blend: mix * mix * (3 - 2 * mix)};
}

function drawPhotographicSurface(ctx: CanvasRenderingContext2D, horizon: number[], heading: number, seed: number, texture: CameraTexture) {
  const {width: w, height: h} = ctx.canvas;
  ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const phase = seed / 4294967296 * 2;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, h);
  horizon.forEach((y, x) => ctx.lineTo(x, y));
  ctx.lineTo(w, h); ctx.closePath(); ctx.clip();
  // Only the silhouette is data-derived. The surface artwork is decorative.
  for (let x = 0; x < w; x++) {
    const azimuth = heading - 45 + x / (w - 1) * 90;
    const sourceWidth = Math.max(1, texture.width * .85 / (w - 1) / 2);
    const position = cameraTexturePosition(azimuth, phase);
    const sourceX = position.primary * (texture.width - sourceWidth);
    const top = horizon[x];
    ctx.globalAlpha = 1;
    ctx.drawImage(texture.image, sourceX, 0, sourceWidth, texture.height, x, top, 1.15, h - top);
    if (position.blend > 0) {
      ctx.globalAlpha = position.blend;
      ctx.drawImage(texture.image, position.secondary * (texture.width - sourceWidth), 0, sourceWidth, texture.height, x, top, 1.15, h - top);
    }
  }
  ctx.restore();
}

export function drawCameraScene(ctx: CanvasRenderingContext2D, values: readonly number[], heading: number, overlay: boolean, texture?: CameraTexture) {
  heading = (heading % 360 + 360) % 360;
  const {width: w, height: h} = ctx.canvas;
  const horizon = cameraHorizon(values, heading, w, h);
  // Decorative regolith is independent of hidden coordinates and matching results.
  const seed = values.reduce((sum, value, i) => sum + Math.round(value * 100) * (i + 1), 17) >>> 0;
  if (texture) {
    drawPhotographicSurface(ctx, horizon, heading, seed, texture);
    drawCameraFinish(ctx, horizon, overlay);
    return;
  }
  let state = seed || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const frame = ctx.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const offset = (y * w + x) * 4;
      const depth = Math.max(0, (y - horizon[x]) / (h - horizon[x]));
      let light = 3;
      if (y >= horizon[x]) {
        const scale = 1 + depth * 4;
        const nx = (x + heading * w / 90) / scale + seed % 1000;
        const ny = 100 / (depth + .08);
        const broad = noise(nx * .018, ny * .03);
        const grain = noise(nx * .6, ny * .8);
        const ridge = noise(nx * .07, ny * .13);
        light = 55 + broad * 85 + ridge * 30 + (grain - .5) * (16 + depth * 32);
        light *= .55 + Math.min(1, depth * 8) * .45;
        light *= .86 + .14 * x / w;
      }
      frame.data[offset] = light;
      frame.data[offset + 1] = light * .99;
      frame.data[offset + 2] = light * .97;
      frame.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, h);
  horizon.forEach((y, x) => ctx.lineTo(x, y));
  ctx.lineTo(w, h); ctx.closePath(); ctx.clip();
  // Perspective craters and angular rocks are illustrative, not recovered terrain.
  for (let i = 0; i < 64; i++) {
    const x = random() * w, depth = .07 + random() * .93;
    const y = horizon[Math.min(w - 1, Math.floor(x))] * (1 - depth) + h * depth;
    const rx = (3 + random() * 38) * depth * depth + 1, ry = rx * (.18 + depth * .2);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    ctx.shadowColor = '#0007'; ctx.shadowBlur = rx * .15; ctx.shadowOffsetY = rx * .1;
    const rim = ctx.createRadialGradient(-rx * .25, -rx * .3, rx * .1, 0, 0, rx * 1.1);
    rim.addColorStop(0, '#30302f'); rim.addColorStop(.65, '#565651'); rim.addColorStop(.84, '#99988f'); rim.addColorStop(1, '#77777000');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(0, 0, rx * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  for (let i = 0; i < 220; i++) {
    const x = random() * w, depth = random();
    const y = horizon[Math.min(w - 1, Math.floor(x))] * (1 - depth) + h * depth;
    const size = 1 + random() * 14 * depth ** 3;
    ctx.fillStyle = '#17171599'; ctx.beginPath(); ctx.ellipse(x - size, y + size * .35, size * 2, size * .35, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a4a39b'; ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x - size * .6, y - size * .9); ctx.lineTo(x + size * .3, y - size); ctx.lineTo(x + size, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4c4b47'; ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x - size * .6, y - size * .9); ctx.lineTo(x + size * .1, y - size * .35); ctx.lineTo(x + size, y); ctx.fill();
  }
  ctx.restore();
  drawCameraFinish(ctx, horizon, overlay);
}

function drawCameraFinish(ctx: CanvasRenderingContext2D, horizon: number[], overlay: boolean) {
  const {width: w, height: h} = ctx.canvas;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .2, w / 2, h / 2, w * .7);
  vignette.addColorStop(0, '#0000'); vignette.addColorStop(1, '#0005'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  if (overlay) {
    ctx.beginPath(); horizon.forEach((y, x) => x ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = '#66e9ff'; ctx.lineWidth = 2; ctx.stroke();
  }
}
