
export type CapturedConflict<T>={id:number;ownerId:string;local:T;remote:T;capturedAt:string};
export function createConflictCapture<T>() {
 let session:CapturedConflict<T>|null=null;
 let sequence=0;
 let inFlight:{ownerId:string;promise:Promise<void>}|null=null;
 const listeners=new Set<()=>void>();
 const emit=()=>listeners.forEach(fn=>fn());
 return {
  getSnapshot:()=>session,
  subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};},
  clear:()=>{sequence++;session=null;inFlight=null;emit();},
  capture(ownerId:string,readLocal:()=>T,readRemote:()=>Promise<T>,isActive:()=>boolean):Promise<void> {
   if(!isActive())return Promise.resolve();
   if(session?.ownerId===ownerId)return Promise.resolve();
   if(inFlight?.ownerId===ownerId)return inFlight.promise;
   const id=++sequence,local=structuredClone(readLocal());
   const promise=(async()=>{
    const remote=await readRemote();
    if(id!==sequence||!isActive())return;
    session={id,ownerId,local,remote:structuredClone(remote),capturedAt:new Date().toISOString()};emit();
   })().finally(()=>{if(inFlight?.promise===promise)inFlight=null;});
   inFlight={ownerId,promise};return promise;
  }
 };
}
