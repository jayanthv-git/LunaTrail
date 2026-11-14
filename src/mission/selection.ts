import type {Mission} from './types';
const key='lunatrail-candidate-selection';
export function selectionScope(data:Mission){return `${data.index?.id||''}:${data.observation?.id||''}`}
export function readSelection(data:Mission):string {
 try {const saved=JSON.parse(sessionStorage.getItem(key)||'null');
  return saved?.scope===selectionScope(data)&&data.index?.points.some(p=>p.id===saved.id)?saved.id:'';
 } catch {return ''}
}
export function writeSelection(data:Mission,id:string){
 try {sessionStorage.setItem(key,JSON.stringify({scope:selectionScope(data),id}))}catch{/* Storage may be disabled; navigation still works in memory. */}
}
