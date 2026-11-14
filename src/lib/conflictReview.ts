
export type LibraryCopy = Record<string, unknown>;
export type Choice = 'a' | 'b';
export const REVIEW_ENTITY_KEYS = ['worlds','characters','scenes','places','maps','plots','components','organizations','ideas','timelines','fantasticElements','houses','worldFacts','worldData','placeCollections','mapCollections','worldTags','entityFolders'] as const;
export type Difference = {key:string; collection:string; id:string|null; a:unknown; b:unknown; aPresent:boolean; bPresent:boolean};
function record(value:unknown):value is Record<string,unknown> {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function validate(value:unknown, depth=0):void {
  if(depth>80) throw Error('El archivo tiene demasiados niveles.');
  if(value===null || ['string','number','boolean'].includes(typeof value)) return;
  if(Array.isArray(value)) {value.forEach(v=>validate(v,depth+1));return;}
  if(!record(value)) throw Error('La copia debe contener datos JSON.');
  for(const [key,v] of Object.entries(value)) {
    if(['__proto__','constructor','prototype'].includes(key)) throw Error('El archivo contiene una clave no admitida.');
    validate(v,depth+1);
  }
}
function indexed(value:unknown):Map<string,Record<string,unknown>> {
  if(value===undefined) return new Map();
  if(!Array.isArray(value)) throw Error('Una colección no es una lista.');
  const map=new Map<string,Record<string,unknown>>();
  for(const item of value) {
    if(!record(item)||typeof item.id!=='string'||!item.id||item.id.includes('/')||map.has(item.id)) throw Error('Hay identificadores ausentes, inválidos o duplicados.');
    map.set(item.id,item);
  }
  return map;
}
export function readReviewCopy(input:unknown):LibraryCopy {
  validate(input);
  if(!record(input)) throw Error('Formato de copia no reconocido.');
  const source=input.format==='storytable-local-recovery-v1'?input.library:input;
  if(!record(source)||!Array.isArray(source.worlds)) throw Error('La copia debe contener una biblioteca con mundos.');
  if(source.v!==undefined && source.v!==1 && source.v!==2) throw Error('Versión de copia no admitida.');
  const copy=structuredClone(source);
  delete copy.v; delete copy.exportedAt;
  for(const key of REVIEW_ENTITY_KEYS) indexed(copy[key]);
  return copy;
}
function canonical(value:unknown):string {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if(record(value)) return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value) ?? 'undefined';
}
export function compareCopies(inputA:LibraryCopy,inputB:LibraryCopy):Difference[] {
  const a=readReviewCopy(inputA),b=readReviewCopy(inputB),out:Difference[]=[];
  for(const collection of new Set([...Object.keys(a),...Object.keys(b)])) {
    if((REVIEW_ENTITY_KEYS as readonly string[]).includes(collection)) {
      const aa=indexed(a[collection]),bb=indexed(b[collection]);
      for(const id of new Set([...aa.keys(),...bb.keys()])) if(canonical(aa.get(id))!==canonical(bb.get(id)))
        out.push({key:JSON.stringify([collection,id]),collection,id,a:aa.get(id),b:bb.get(id),aPresent:aa.has(id),bPresent:bb.has(id)});
    } else if(canonical(a[collection])!==canonical(b[collection])) {
      out.push({key:JSON.stringify([collection,null]),collection,id:null,a:a[collection],b:b[collection],aPresent:Object.hasOwn(a,collection),bPresent:Object.hasOwn(b,collection)});
    }
  }
  return out;
}
export function buildReviewedCopy(a:LibraryCopy,b:LibraryCopy,choices:Record<string,Choice>):LibraryCopy {
  const differences=compareCopies(a,b), result=readReviewCopy(a);
  for(const d of differences) {
    const choice=choices[d.key];
    if(choice!=='a'&&choice!=='b') throw Error('Revisa todas las diferencias antes de descargar la propuesta.');
    const present=choice==='a'?d.aPresent:d.bPresent,value=choice==='a'?d.a:d.b;
    if(d.id!==null) {
      const rows=indexed(result[d.collection]);
      if(present) rows.set(d.id,structuredClone(value) as Record<string,unknown>); else rows.delete(d.id);
      result[d.collection]=[...rows.values()];
    } else if(present) result[d.collection]=structuredClone(value); else delete result[d.collection];
  }
  return result;
}
export function buildConflictArchive(a:LibraryCopy,b:LibraryCopy,choices:Record<string,Choice>) {
  return {format:'storytable-conflict-review-v1',createdAt:new Date().toISOString(),applied:false,linkedFilesIncluded:false,requiresRelationshipValidation:true,originals:{a:structuredClone(a),b:structuredClone(b)},choices:structuredClone(choices),proposal:buildReviewedCopy(a,b,choices)};
}
