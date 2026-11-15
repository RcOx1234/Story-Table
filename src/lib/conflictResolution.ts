import { compareCopies, buildReviewedCopy, buildConflictArchive, auditReviewedCopy, REVIEW_ENTITY_KEYS, type LibraryCopy, type Choice } from '@/lib/conflictReview';

export function sameReviewContent(a:LibraryCopy,b:LibraryCopy):boolean {
  return compareCopies(a,b).length===0;
}
export function prepareReviewedResolution(a:LibraryCopy,b:LibraryCopy,choices:Record<string,Choice>) {
  const proposal=buildReviewedCopy(a,b,choices);
  // Absence is not an explicit deletion. Preserve each known ID in this workflow.
  for(const key of REVIEW_ENTITY_KEYS) {
    const selected=new Set(((proposal[key]??[]) as {id:string}[]).map(x=>x.id));
    for(const item of [...(a[key]??[]) as {id:string}[],...(b[key]??[]) as {id:string}[]])
      if(!selected.has(item.id)) throw Error('Conserva los elementos que solo existen en una copia. Puedes enviarlos a la papelera después de sincronizar.');
  }
  const audit=auditReviewedCopy(proposal);
  const known=new Set([...auditReviewedCopy(a).issues,...auditReviewedCopy(b).issues].map(x=>JSON.stringify(x)));
  if(audit.issues.some(x=>!known.has(JSON.stringify(x)))) throw Error('Esta combinación deja una relación sin destino. Revisa los elementos relacionados.');
  if(audit.media.temporary>0) throw Error('Hay archivos temporales. Conserva una copia con los archivos antes de aplicar la revisión.');
  return {proposal,archive:buildConflictArchive(a,b,choices)};
}

/** Caller must serialize this operation with ordinary saves. No cloud writes before backup. */
export async function resolveReviewedConflict(options:{
  local:LibraryCopy;remote:LibraryCopy;choices:Record<string,Choice>;
  isActive:()=>boolean;readLocal:()=>LibraryCopy;readRemote:()=>Promise<LibraryCopy>;
  backup:(archive:unknown)=>Promise<void>;apply:(proposal:LibraryCopy)=>void;
  write:(proposal:LibraryCopy)=>Promise<void>;acknowledge:(proposal:LibraryCopy)=>void;
}) {
  const {proposal,archive}=prepareReviewedResolution(options.local,options.remote,options.choices);
  const check=()=>{
    if(!options.isActive()) throw Error('La sesión o la revisión cambió. No se aplicó esta revisión.');
    if(!sameReviewContent(options.local,options.readLocal())) throw Error('Seguiste editando mientras revisabas. Pulsa Actualizar revisión para incluir esos cambios.');
  };
  check();
  const remote=await options.readRemote();
  check();
  if(!sameReviewContent(options.remote,remote)) throw Error('La nube cambió mientras revisabas. Pulsa Actualizar revisión.');
  await options.backup(archive);
  check();
  // Apply as pending first, so later edits build on the reviewed content.
  options.apply(structuredClone(proposal));
  await options.write(structuredClone(proposal));
  if(!options.isActive()) throw Error('La sesión cambió durante el guardado. Comprueba la sincronización al volver.');
  options.acknowledge(proposal);
}
