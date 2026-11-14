import {useEffect,useMemo,useRef,useState} from 'react';
import {Crosshair,Layers,Minus,Plus,RotateCcw} from 'lucide-react';
import {useMission} from './context';
import {request} from './api';
import {Panel,position} from './components';
import type {Grid,Position} from './types';
export type LayersState={elevation:boolean;contours:boolean;hillshade:boolean;slope:boolean};
function raster(grid:Grid,layers:LayersState,palette:string,quality:string){
 const z=grid.elevations,h=z.length,w=z[0].length,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;const pixels=ctx.createImageData(w,h);
 const all=z.flat().filter((v):v is number=>v!==null),lo=Math.min(...all),hi=Math.max(...all),span=hi-lo||1;
 for(let r=0;r<h;r++)for(let c=0;c<w;c++){
 const value=z[r][c],i=(r*w+c)*4;if(value===null)continue;
 const west=z[r][Math.max(0,c-1)]??value,east=z[r][Math.min(w-1,c+1)]??value,north=z[Math.max(0,r-1)][c]??value,south=z[Math.min(h-1,r+1)][c]??value;
 const dx=(east-west)/(2*grid.resolution[0]),dy=(north-south)/(2*grid.resolution[1]);
 const shade=Math.max(0,(-dx*.5-dy*.5+.707)/Math.sqrt(dx*dx+dy*dy+1));
 const height=(value-lo)/span;let base=layers.elevation?55+height*125:100;
 if(layers.hillshade)base=base*(.3+shade*.95);let rgb=palette==='blue'?[base*.53,base*.75,base]:[base*.9,base*.96,base];
 if(layers.slope){const slope=Math.atan(Math.hypot(dx,dy))/(Math.PI/2);rgb=[50+slope*205,115-slope*70,155-slope*110]}
 // Elevation isolines: mark crossings of uniformly spaced elevation levels.
 const interval=span/18;
 if(layers.contours&&interval>0&&(Math.floor((value-lo)/interval)!==Math.floor((east-lo)/interval)||Math.floor((value-lo)/interval)!==Math.floor((south-lo)/interval)))rgb=[59,130,210];
 for(let k=0;k<3;k++)pixels.data[i+k]=Math.round(rgb[k]);pixels.data[i+3]=255;
 }ctx.putImageData(pixels,0,0);
 if(quality==='half'){const small=document.createElement('canvas');small.width=Math.ceil(w/2);small.height=Math.ceil(h/2);small.getContext('2d')!.drawImage(canvas,0,0,small.width,small.height);return small.toDataURL()}
 return canvas.toDataURL();
}
export function TerrainViewer({controls=false,focus=false}:{controls?:boolean;focus?:boolean}){
 const m=useMission(),grid=m.grid;const [layers,setLayers]=useState<LayersState>({elevation:true,contours:m.data?.settings.contours??true,hillshade:m.data?.settings.hillshade??true,slope:false});
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[inspect,setInspect]=useState<{position:Position;elevation:number}|null>(null),[message,setMessage]=useState('Click terrain to inspect elevation');
 useEffect(()=>setLayers(v=>({...v,contours:m.data?.settings.contours??true,hillshade:m.data?.settings.hillshade??true})),[m.data?.settings.contours,m.data?.settings.hillshade]);
 useEffect(()=>{setZoom(1);setPan({x:0,y:0});setInspect(null);setMessage('Click terrain to inspect elevation')},[grid?.dataset_id]);
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{x:number;y:number;px:number;py:number;moved:boolean}|null>(null);
 const image=useMemo(()=>grid?raster(grid,layers,m.data?.settings.palette||'lunar',m.data?.settings.quality||'native'):'',[grid,layers,m.data?.settings.palette,m.data?.settings.quality]);
 const bounds=grid?.bounds||[0,0,1,1];const ratio=grid?grid.shape[0]*grid.resolution[1]/(grid.shape[1]*grid.resolution[0]):1;const height=1000*ratio;
 const xy=(p:{x:number;y:number})=>({x:(p.x-bounds[0])/(bounds[2]-bounds[0])*1000,y:(bounds[3]-p.y)/(bounds[3]-bounds[1])*height});
 const selected=m.data?.index?.points.find(p=>p.id===m.selected),best=m.data?.result?.candidates[0];
 useEffect(()=>{if(focus&&selected){const p=xy(selected);setZoom(2);setPan({x:500-p.x*2,y:height/2-p.y*2})}},[focus,m.selected,grid?.dataset_id]);
 function point(e:React.PointerEvent<SVGSVGElement>){const p=svg.current!.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.current!.getScreenCTM()!.inverse())}
 async function inspectTerrain(e:React.PointerEvent<SVGSVGElement>){const p=point(e),x=(p.x-pan.x)/zoom,y=(p.y-pan.y)/zoom;const wx=bounds[0]+x/1000*(bounds[2]-bounds[0]),wy=bounds[3]-y/height*(bounds[3]-bounds[1]);try{const v=await request<{position:Position;elevation:number}>('/terrain/inspect',{x:wx,y:wy});setInspect(v);m.setSelected('');setMessage(`${v.elevation.toFixed(1)} m elevation · ${position(v.position)}`)}catch(err){setMessage(err instanceof Error?err.message:'Invalid map point')}}
 return <Panel title="Lunar terrain · DEM" icon={<Layers size={16}/>} extra={<span className="mc-pill">{m.data?.dataset.resolution[0]} m / pixel</span>}><div className={`mc-terrain ${controls?'expanded':''}`}><svg ref={svg} viewBox={`0 0 1000 ${height}`} aria-label="Interactive lunar elevation map" onPointerDown={e=>{if((e.target as Element).closest('[data-marker]'))return;const p=point(e);drag.current={x:p.x,y:p.y,px:pan.x,py:pan.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(!drag.current)return;const p=point(e),d=drag.current;if(Math.abs(p.x-d.x)+Math.abs(p.y-d.y)>4)d.moved=true;if(d.moved)setPan({x:d.px+p.x-d.x,y:d.py+p.y-d.y})}} onPointerUp={e=>{const d=drag.current;drag.current=null;if(d&&!d.moved)void inspectTerrain(e)}} onPointerCancel={()=>{drag.current=null}}>
 <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>{image&&<image href={image} x="0" y="0" width="1000" height={height}/>}{m.data?.index?.points.map(p=>{const q=xy(p);return <g key={p.id} data-marker="true" role="button" tabIndex={0} aria-label={`Reference C-${p.id}`} onClick={()=>m.setSelected(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();m.setSelected(p.id)}}}><circle cx={q.x} cy={q.y} r={10/zoom} fill="transparent"/><circle cx={q.x} cy={q.y} r={3.3/zoom} fill="#4cb9fa"/><title>C-{p.id} · {position(p)}</title></g>})}
 {selected&&<circle cx={xy(selected).x} cy={xy(selected).y} r={16/zoom} stroke="#b3a1ff" strokeWidth={3/zoom} fill="none"/>}
 {best&&<g><circle cx={xy(best.position).x} cy={xy(best.position).y} r={11/zoom} fill="#20d995" stroke="#d5fff0" strokeWidth={2/zoom}/><title>Predicted · {position(best.position)}</title></g>}
 {m.data?.truth&&<g><line x1={xy(m.data.truth.true_position).x} y1={xy(m.data.truth.true_position).y} x2={xy(m.data.truth.predicted_position).x} y2={xy(m.data.truth.predicted_position).y} stroke="white" strokeWidth={1.6/zoom} strokeDasharray={`${5/zoom} ${5/zoom}`}/><circle cx={xy(m.data.truth.true_position).x} cy={xy(m.data.truth.true_position).y} r={9/zoom} fill="#f43f5e" stroke="#ffbcc8" strokeWidth={2/zoom}/><title>Ground truth · {position(m.data.truth.true_position)}</title></g>}
 {inspect&&<g stroke="white" strokeWidth={2/zoom}><path d={`M${xy(inspect.position).x-12/zoom} ${xy(inspect.position).y}h${24/zoom} M${xy(inspect.position).x} ${xy(inspect.position).y-12/zoom}v${24/zoom}`}/></g>}</g><g className="mc-svg-scale"><rect x="735" y={height-74} width="250" height="61" rx="6" fill="#050914dd"/><path d={`M760 ${height-59}v8h200v-8`} fill="none" stroke="#e6efff" strokeWidth="3"/><text x="860" y={height-26} textAnchor="middle" fill="white" fontSize="22">{((bounds[2]-bounds[0])/5/zoom/1000).toFixed(2)} km</text></g></svg>
 <div className="mc-map-tools"><button aria-label="Zoom in" disabled={zoom>=5} onClick={()=>{setZoom(z=>Math.min(5,z*1.25));setPan(p=>({x:500+(p.x-500)*(Math.min(5,zoom*1.25)/zoom),y:height/2+(p.y-height/2)*(Math.min(5,zoom*1.25)/zoom)}))}}><Plus size={17}/></button><button aria-label="Zoom out" disabled={zoom<=.5} onClick={()=>{setZoom(z=>Math.max(.5,z/1.25));setPan(p=>({x:500+(p.x-500)*(Math.max(.5,zoom/1.25)/zoom),y:height/2+(p.y-height/2)*(Math.max(.5,zoom/1.25)/zoom)}))}}><Minus size={17}/></button><button aria-label="Reset map view" onClick={()=>{setZoom(1);setPan({x:0,y:0})}}><RotateCcw size={15}/></button></div><span className="mc-map-north">+Y ↑<small>GRID NORTH</small></span><div className="mc-map-legend"><span><i style={{background:'#4cb9fa'}}/>References</span><span><i style={{background:'#20d995'}}/>Prediction</span><span><i style={{background:'#f43f5e'}}/>Ground truth {m.data?.truth?'':'hidden'}</span></div></div>
 <div className="mc-map-inspect"><Crosshair size={14}/>{selected?`C-${selected.id} · ${position(selected)} · X ${selected.x.toFixed(0)}, Y ${selected.y.toFixed(0)} m`:message}</div>
 {controls&&<div className="mc-layer-controls">{(Object.keys(layers) as (keyof LayersState)[]).map(k=><label key={k}><input type="checkbox" checked={layers[k]} onChange={e=>setLayers({...layers,[k]:e.target.checked})}/>{({elevation:'Elevation DEM',contours:'Contours',hillshade:'Hillshade',slope:'Slope map'})[k]}</label>)}<label title="No validated hazard model is implemented"><input type="checkbox" disabled/>Hazards · unavailable</label></div>}</Panel>
}
