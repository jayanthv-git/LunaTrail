export async function request<T>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const response=await fetch(`/api${path}`,{method,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 const data=await response.json().catch(()=>{throw new Error('Backend unavailable. Start npm run dev:all and retry.')});
 if(!response.ok){
  if(response.status===404)throw new Error(`API endpoint /api${path} was not found. The frontend may be connected to an older backend. Run npm run dev:all from the current LunaTrail folder and use the URL printed in its terminal.`);
  throw new Error(data.error?.message||`Request failed (${response.status})`);
 }
 return data;
}
export function download(name:string,data:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
