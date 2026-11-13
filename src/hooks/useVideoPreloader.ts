import {useEffect,useState} from 'react';
/** Fetch the full seekable clip once; loading progress never updates during scroll. */
export function useVideoPreloader(source?:string){
 const [state,setState]=useState<{url?:string;progress:number;error:boolean}>({progress:0,error:false});
 useEffect(()=>{
  setState({progress:0,error:false});
  if(!source)return;
  const abort=new AbortController();let objectUrl:string|undefined;
  const timeout=setTimeout(()=>abort.abort(),60000);
  (async()=>{
   const response=await fetch(source,{signal:abort.signal});
   if(!response.ok)throw new Error('Video download failed');
   const total=Number(response.headers.get('content-length'));
   const reader=response.body?.getReader();let blob:Blob;
   if(reader){const chunks:Uint8Array<ArrayBuffer>[]=[];let received=0,last=-1;
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(new Uint8Array(value));received+=value.byteLength;
     const progress=total?Math.min(99,Math.floor(received/total*100)):0;
     if(progress!==last){last=progress;setState({progress,error:false})}
    }blob=new Blob(chunks,{type:'video/mp4'});
   }else blob=await response.blob();
   if(abort.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setState({url:objectUrl,progress:100,error:false});
  })().catch(()=>{if(!disposed)setState({progress:0,error:true})}).finally(()=>clearTimeout(timeout));
  let disposed=false;
  return()=>{disposed=true;clearTimeout(timeout);abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[source]);return state;
}
