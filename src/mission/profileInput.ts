export function parseProfile(text:string,samples:number):number[]{
 let values:unknown;
 try{values=JSON.parse(text)}catch{throw new Error('Enter a valid JSON array of elevation angles, for example [1.2, 2.3, …].')}
 if(!Array.isArray(values)||values.length!==samples)throw new Error(`Enter exactly ${samples} elevation angles for the active reference geometry.`);
 if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>90))throw new Error('Every elevation angle must be a finite number between −90° and 90°.');
 return values;
}
