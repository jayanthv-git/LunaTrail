import {createContext,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {request} from './api';
import {localizeActive} from './localizeActive';
import {readSelection,writeSelection} from './selection';
import type {Mission,Grid,Health,Observation,Preferences,MatchResult,Evaluation} from './types';
function useMissionState(){
 const [data,setData]=useState<Mission|null>(null),[grid,setGrid]=useState<Grid|null>(null),[health,setHealth]=useState<Health|null>(null);
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState('');
 const gate=useRef(false);const loaded=useRef(false);
 async function sync(){const d=await request<Mission>('/mission');setData(d);setHealth(d.status);setSelected(readSelection(d));const g=await request<Grid>('/terrain/grid');setGrid(g);return d}
 useEffect(()=>{if(data)writeSelection(data,selected)},[selected,data?.index?.id,data?.observation?.id]);
 async function task(label:string,fn:()=>Promise<void>){if(gate.current)return;gate.current=true;setBusy(label);setError('');setNotice('');try{await fn();setNotice(`${label} complete`)}catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{gate.current=false;setBusy('')}}
 async function refresh(){await task('Connecting',async()=>{await sync()})}
 useEffect(()=>{if(!loaded.current){loaded.current=true;void refresh()}},[]);
 useEffect(()=>{const timer=setInterval(()=>{if(!gate.current)request<Health>('/status').then(setHealth).catch(()=>setHealth(null))},15000);return()=>clearInterval(timer)},[]);
 async function generate(testId?:string){await task('Generating test skyline',async()=>{const id=testId||data?.tests[0]?.id;if(!id)throw new Error('Generate the reference and held-out test sets in Dataset first.');const observation=await request<Observation>('/skyline/generate',{test_id:id});setSelected('');setData(d=>d?{...d,observation,result:null,truth:null}:d)})}
 async function match(){await task('Running localization',async()=>{if(!data)throw new Error('Load the mission first.');const r=await localizeActive(data,request,observation=>{setSelected('');setData(d=>d?{...d,observation,result:null,truth:null}:d)});setData(d=>d?{...d,...r}:d);setSelected(r.result.candidates[0].id);setHealth(await request<Health>('/status'))})}
 async function matchManual(profile:number[]){await task('Matching manual skyline',async()=>{const r=await request<{result:MatchResult;truth:null;observation:Observation}>('/localize/manual',{index_id:data?.index?.id,profile});setData(d=>d?{...d,...r}:d);setSelected(r.result.candidates[0].id)})}
 async function action(path:string,label:string,body:unknown={}){await task(label,async()=>{await request(path,body);setSelected('');await sync()})}
 async function evaluate(testId?:string){await task('Evaluating held-out tests',async()=>{const evaluation=await request<Evaluation>('/evaluation/run',testId?{test_ids:[testId]}:{});setData(d=>d?{...d,evaluation}:d);setHealth(await request<Health>('/status'))})}
 async function save(settings:Preferences){await task('Saving settings',async()=>{await request('/settings',settings,'PUT');await sync()})}
 async function upload(file:File){await task('Importing DEM',async()=>{if(!/\.tiff?$/i.test(file.name))throw new Error('Select a GeoTIFF (.tif or .tiff).');if(file.size>32*1024*1024)throw new Error('Maximum upload size is 32 MiB.');const response=await fetch('/api/datasets/upload',{method:'POST',headers:{'Content-Type':'image/tiff'},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Import failed');setSelected('');await sync()})}
 return {data,grid,health,busy,error,notice,selected,setSelected,sync,refresh,generate,match,matchManual,action,evaluate,save,upload,task};
}
const Context=createContext<ReturnType<typeof useMissionState>|null>(null);
export function MissionProvider({children}:{children:ReactNode}){return <Context.Provider value={useMissionState()}>{children}</Context.Provider>}
export function useMission(){const c=useContext(Context);if(!c)throw new Error('MissionProvider missing');return c}
