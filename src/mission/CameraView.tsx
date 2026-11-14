import {useEffect, useRef, useState} from 'react';
import {drawCameraScene} from './cameraScene';
import type {CameraTexture} from './cameraScene';

export function CameraView({values, label}: {values: number[]; label: string}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [heading, setHeading] = useState(0);
  const [overlay, setOverlay] = useState(false);
  const [available, setAvailable] = useState(true);
  const [texture, setTexture] = useState<CameraTexture>();
  const [textureFailed, setTextureFailed] = useState(false);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setTexture({image, width: image.naturalWidth, height: image.naturalHeight});
    image.onerror = () => setTextureFailed(true);
    image.src = '/media/lunar-camera-surface-v2.png';
    return () => { image.onload = null; image.onerror = null; };
  }, []);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    setAvailable(!!context);
    if (!context) return;
    const frame = requestAnimationFrame(() => drawCameraScene(context, values, heading, overlay, texture));
    return () => cancelAnimationFrame(frame);
  }, [values, heading, overlay, texture]);
  return <div className="mc-camera-view">
    <div className="mc-camera-screen">
      <canvas ref={canvas} width={1200} height={600} role="img" aria-label={`Illustrative lunar camera view for ${label}, direction ${heading} degrees. Horizon follows the active skyline; surface details are AI-generated.`}/>
      {!available && <p className="mc-camera-unavailable">Camera preview requires Canvas support. Use Horizon Comparison to inspect the input.</p>}
      <div className="mc-camera-hud"><span>CAM 01 / LUNAR SURFACE<small>{label} · ILLUSTRATIVE DEMO</small></span><span>AZ {String(heading).padStart(3, '0')}°<small>90° VIEW / AUTO FRAMING</small></span></div>
      <div className="mc-camera-reticle" aria-hidden="true"/>
      <div className="mc-camera-caption">{overlay?'CYAN: MATCHING SKYLINE':'HORIZON OVERLAY OFF'}<span>NO LIVE CAMERA CONNECTED</span></div>
    </div>
    {!texture && <p className="mc-note" role="status">{textureFailed?'Surface artwork unavailable. Showing the procedural preview.':'Loading detailed lunar surface…'}</p>}
    <div className="mc-camera-controls">
      <label className="mc-camera-heading">Viewing direction <output>{heading}°</output><input aria-label="Camera viewing direction" type="range" min="0" max="359" step="1" value={heading} onChange={e => setHeading(Number(e.target.value))}/></label>
      <label><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)}/>Show matching horizon</label>
      <button className="mc-button" onClick={() => setHeading(0)}>Reset view</button>
    </div>
    <p className="mc-note">AI-generated surface artwork fitted to the selected observation’s skyline. Rocks, craters and shadows are illustrative, not recovered from the DEM or captured by a camera. Only the horizon comes from the matching input. Turning this view does not change your observation or localization result.</p>
  </div>;
}
