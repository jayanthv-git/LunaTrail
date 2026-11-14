import type {Mission,Observation,MatchResult,Truth} from './types';
type Api=<T>(path:string,body?:unknown)=>Promise<T>;
export async function localizeActive(data:Mission,api:Api,onLoaded:(obs:Observation)=>void){
 let observation=data.observation;
 if(!observation){
  const id=data.tests[0]?.id;
  if(!id)throw new Error('Generate reference and test profiles in Dataset first.');
  observation=await api<Observation>('/skyline/generate',{test_id:id});
  onLoaded(observation);
 }
 const manual=observation.source==='manual';
 const result=await api<{result:MatchResult;truth:Truth|null;observation?:Observation}>(manual?'/localize/manual':'/localize',manual?{index_id:data.index?.id,profile:observation.observed}:{test_id:observation.id,profile:observation.observed});
 return {...result,observation:result.observation||observation};
}
