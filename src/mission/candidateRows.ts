import type {Candidate} from './types';
export function candidateRows(candidates:Candidate[],all:boolean,limit:number,sort:string){
 const rows=all?[...candidates]:candidates.slice(0,limit);
 return sort==='id'?rows.sort((a,b)=>Number(a.id)-Number(b.id)):rows;
}
