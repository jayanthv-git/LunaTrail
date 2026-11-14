import {useEffect,useState} from 'react';
import {useMission} from './context';
import {Panel} from './components';
import {parseProfile} from './profileInput';
export function DemoDataEditor(){
 const m=useMission(),d=m.data!,obs=d.observation;
 const [text,setText]=useState(''),[error,setError]=useState(''),[sample,setSample]=useState(0);
 useEffect(()=>{setText(obs?JSON.stringify(obs.observed,null,2):'');setError('');setSample(0)},[obs]);
 const count=d.index?.parameters.geometry.samples||d.settings.geometry.samples;
 let values:number[]|null=null;try{values=parseProfile(text,count)}catch{/* Validation appears on submission. */}
 const testIndex=d.tests.findIndex(t=>t.id===obs?.id);
 const dirty=!!obs&&text!==JSON.stringify(obs.observed,null,2);
 function submit(){try{const profile=parseProfile(text,count);setError('');void m.matchManual(profile)}catch(e){setError((e as Error).message)}}
 return <Panel title="Demo input data · inspect and edit" extra={<span className="mc-pill">{obs?.source==='manual'?'MANUAL INPUT':'DEM SIMULATION'}</span>}>
 <div className="mc-input-editor">
 <p className="mc-muted">This is the actual array passed to the matcher: horizon elevation angles in degrees, uniformly sampled clockwise from grid +Y. Edit one sample or paste a complete JSON array, then match it against the current reference set.</p>
 <dl className="mc-details compact">
 {[["Terrain file",d.dataset.active_file],["Reference set",`${d.index?.count||0} viewpoints`],["Input",obs?.source==='manual'?'Manually edited profile':testIndex>=0?d.tests[testIndex].label:'No observation loaded'],["Generation seed",testIndex>=0?d.settings.seed+testIndex:'Not applicable'],["Angular noise σ",obs?.noise==null?'Unknown / manual':`${obs.noise}°`],["Sampling",`${count} values · ${(360/count).toFixed(2)}° apart`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
 </dl>
 {!obs?<p>Use Generate Test Skyline above to load the demo data.</p>:<>
 <div className="mc-toolbar"><label>Sample index<input aria-label="Sample index" type="number" min={0} max={count-1} value={sample} onChange={e=>setSample(Math.max(0,Math.min(count-1,Math.trunc(Number(e.target.value)))))}/></label><label>Elevation at {(sample*360/count).toFixed(2)}°<input aria-label="Sample elevation (degrees)" type="number" min={-90} max={90} step="any" disabled={!values||!!m.busy} value={values?.[sample]??''} onChange={e=>{if(values&&e.target.value!==''){const next=[...values];next[sample]=Number(e.target.value);setText(JSON.stringify(next,null,2));setError('')}}}/></label></div>
 <label className="mc-profile-label">Skyline samples (JSON array)<textarea aria-label="Skyline samples (JSON array)" value={text} disabled={!!m.busy} spellCheck={false} onChange={e=>{setText(e.target.value);setError('')}}/></label>
 {error&&<p role="alert" className="mc-warning">{error}</p>}
 <div className="mc-toolbar"><button type="button" className="mc-button primary" disabled={!!m.busy||!d.index} onClick={submit}>Match Edited Data</button><button type="button" className="mc-button" disabled={!!m.busy||!dirty} onClick={()=>{setText(JSON.stringify(obs.observed,null,2));setError('')}}>Discard Unsaved Edits</button>{testIndex<0&&d.tests.length>0&&<button type="button" className="mc-button" disabled={!!m.busy} onClick={()=>void m.generate(d.tests[0].id)}>Restore Demo Observation</button>}</div>
 <p className="mc-note">{dirty?'Unsaved edits: the charts and prediction still show the last submitted input. ':''}Matching edited data replaces the active skyline across the dashboard, ranking and map. Manual inputs have no verified location: ground truth and position errors are unavailable. Held-out evaluation continues to use the original test observations. Change seed and noise in Settings → Advanced to regenerate demo observations.</p>
 </>}
 </div></Panel>
}
