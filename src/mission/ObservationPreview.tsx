import {useId,useState} from 'react';
import {CameraView} from './CameraView';
import {Link} from 'react-router';
import {Camera,ScanLine} from 'lucide-react';
import {useMission} from './context';
import {Panel} from './components';
function Panorama({values,reference,lo,hi}:{values:number[];reference:boolean;lo:number;hi:number}){
 const id=useId().replace(/:/g,'');
 const x=(i:number)=>i/values.length*960,y=(v:number)=>30+(hi-v)/(hi-lo)*190;
 const points=[...values,values[0]].map((v,i)=>`${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
 return <svg className="mc-panorama" viewBox="0 0 960 270" role="img" aria-label={reference?'Aligned database reference horizon reconstruction':'Active observation horizon reconstruction'}>
 <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={reference?'#4f456e':'#415a70'}/><stop offset="1" stopColor="#0a1220"/></linearGradient></defs>
 <rect width="960" height="270" fill="#040914"/>
 {[0,1,2,3,4,5,6,7,8].map(i=><g key={i}><path d={`M${i*120} 0V240`} stroke="#223049" strokeDasharray="3 8"/><text x={i===8?952:i*120+8} y="260" textAnchor={i===8?'end':'start'} fill="#8397b6" fontSize="13">{i*45}°</text></g>)}
 {[0,1,2].map(i=><g key={i}><path d={`M0 ${30+i*95}H960`} stroke="#223049" strokeDasharray="3 8"/><text x="8" y={23+i*95} fill="#8397b6" fontSize="12">{(hi-i*(hi-lo)/2).toFixed(1)}°</text></g>)}
 <polygon points={`0,240 ${points} 960,240`} fill={`url(#${id})`}/>
 <polyline points={points} fill="none" stroke={reference?'#b3a1ff':'#54d7f3'} strokeWidth="2.5"/>
 <path d="M465 125h30M480 110v30" stroke="#dae9ff" opacity=".5"/>
 </svg>;
}
export function ObservationPreview(){
 const m=useMission(),d=m.data!,obs=d.observation;
 const [view,setView]=useState<'camera'|'horizon'>('camera');
 const tabId=useId();
 const label=obs?.source==='manual'?'Manual profile':d.tests.find(t=>t.id===obs?.id)?.label||'No observation selected';
 const best=obs&&d.result&&d.result.test_id===obs.id?d.result.candidates[0]:undefined;
 const values=[...(obs?.observed||[]),...(best?.values||[])];
 const lo=Math.min(-8,...values)-2,hi=Math.max(25,...values)+2;
 return <Panel title="Camera / sensor observation preview" icon={<Camera size={17}/>} extra={<span className="mc-pill">SIMULATED OBSERVATION</span>}>
 <div className="mc-observation-preview">
 <div className="mc-toolbar"><div><span className="mc-eyebrow">ACTIVE MATCH INPUT</span><h3>{label}</h3></div><label>Demo observation<select aria-label="Dashboard demo observation" value={obs?.source==='manual'?'manual':obs?.id||''} disabled={!!m.busy||!d.index} onChange={e=>{if(e.target.value&&e.target.value!=='manual')void m.generate(e.target.value)}}><option value="" disabled>Select an observation</option>{obs?.source==='manual'&&<option value="manual">Manual profile · active</option>}{d.tests.map(t=><option key={t.id} value={t.id}>{t.label} · DEM simulation</option>)}</select></label><Link to="/skyline" className="mc-button"><ScanLine size={14}/>Inspect / edit input</Link></div>
 <p className="mc-muted">A visual demo of the horizon a lunar panoramic camera or sensor could observe. This reconstruction uses the active angular profile; live camera capture and image skyline extraction are not connected.</p>
 <div className="mc-preview-tabs" role="tablist" aria-label="Observation visualization">{(['camera','horizon'] as const).map((tab,index)=><button key={tab} id={`${tabId}-${tab}`} role="tab" aria-selected={view===tab} aria-controls={`${tabId}-panel`} tabIndex={view===tab?0:-1} onClick={()=>setView(tab)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'camera':e.key==='End'?'horizon':index===0?'horizon':'camera';setView(next);document.getElementById(`${tabId}-${next}`)?.focus()}}}>{tab==='camera'?'Camera View':'Horizon Comparison'}</button>)}</div>
 <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${view}`} tabIndex={0}>
 {obs?view==='camera'?<CameraView values={obs.observed} label={label}/>:<div className="mc-panorama-grid"><figure><figcaption><span className="mc-dot good"/>OBSERVATION · {label}<small>{obs.observed.length} azimuth samples · {obs.source==='manual'?'manual input':'terrain-derived simulation'}</small></figcaption><Panorama values={obs.observed} reference={false} lo={lo} hi={hi}/></figure><figure><figcaption><span className="mc-dot"/>DATABASE REFERENCE{best?` · C-${best.id}`:''}<small>{best?`Aligned +${best.heading.toFixed(1)}° · similarity ${best.similarity.toFixed(4)}`:'Run Localization to find the best reference'}</small></figcaption>{best?<Panorama values={best.values} reference lo={lo} hi={hi}/>:<div className="mc-panorama-placeholder"><ScanLine size={28}/><span>Reference comparison awaiting match</span></div>}</figure></div>:<div className="mc-empty"><Camera size={30}/><p>Select a demo observation above to preview its horizon.</p></div>}
 </div>
 <p className="mc-note">Run Localization matches this active input and keeps your selection. Panoramas share the same elevation scale; azimuth is clockwise from grid +Y. Database visuals are reconstructions of stored reference skylines, not photographs.</p>
 </div></Panel>;
}
