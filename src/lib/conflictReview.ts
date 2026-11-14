
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
  return {format:'storytable-conflict-review-v1',createdAt:new Date().toISOString(),applied:false,linkedFilesIncluded:false,requiresRelationshipValidation:true,originals:{a:structuredClone(a),b:structuredClone(b)},choices:structuredClone(choices),validation:auditReviewedCopy(buildReviewedCopy(a,b,choices)),proposal:buildReviewedCopy(a,b,choices)};
}

export type ReviewIssue = {path:string; code:'missing'|'deleted'|'different-world'|'invalid-reference'; target:string};
export function auditReviewedCopy(input:LibraryCopy) {
  const copy=readReviewCopy(input),issues:ReviewIssue[]=[];
  const tables=new Map<string,Map<string,Record<string,unknown>>>(REVIEW_ENTITY_KEYS.map(key=>[key,indexed(copy[key])]));
  function reference(value:unknown,target:string,path:string,world:unknown,sourceDeleted:boolean) {
    if(value===undefined||value===null||value==='') return;
    if(typeof value!=='string') {issues.push({path,code:'invalid-reference',target});return;}
    const entity=tables.get(target)?.get(value);
    if(!entity) {issues.push({path,code:'missing',target});return;}
    if(!sourceDeleted&&entity.isDeleted===true) issues.push({path,code:'deleted',target});
    if(target!=='worlds'&&typeof world==='string'&&world&&entity.worldId!==world) issues.push({path,code:'different-world',target});
  }
  function references(value:unknown,target:string,path:string,world:unknown,deleted:boolean) {
    if(value===undefined||value===null) return;
    if(!Array.isArray(value)) {issues.push({path,code:'invalid-reference',target});return;}
    value.forEach((v,i)=>reference(v,target,path+'['+i+']',world,deleted));
  }
  const singles:Record<string,string>={houseId:'houses',parentHouseId:'houses',parentPlaceId:'places',parentFolderId:'entityFolders',mainTimelineId:'timelines',timelineId:'timelines',joinedAtTimelineId:'timelines',placeId:'places',sceneId:'scenes',componentId:'components',organizationId:'organizations',linkedCharacterId:'characters',characterId:'characters',fromCharacterId:'characters',toCharacterId:'characters',fatherId:'characters',motherId:'characters',parentCharacterId:'characters'};
  const multiples:Record<string,string>={tagIds:'worldTags',relatedCharacterIds:'characters',linkedCharacterIds:'characters',relatedPlaceIds:'places',relatedSceneIds:'scenes',relatedHouseIds:'houses',relatedOrganizationIds:'organizations',placeIds:'places',mapIds:'maps',relatedPlots:'plots',relatedScenes:'scenes',timelineIds:'timelines',parentIds:'characters',childIds:'characters',adoptedParentIds:'characters',spouseIds:'characters'};
  function walkRelations(value:unknown,path:string,world:unknown,deleted:boolean) {
    if(Array.isArray(value)) {value.forEach((v,i)=>walkRelations(v,path+'['+i+']',world,deleted));return;}
    if(!record(value)) return;
    for(const [key,v] of Object.entries(value)) {
      if(singles[key]) reference(v,singles[key],path+'.'+key,world,deleted);
      else if(multiples[key]) references(v,multiples[key],path+'.'+key,world,deleted);
      // Only schema fields are inspected; free-text strings are never interpreted as IDs.
      if(record(v)||Array.isArray(v)) walkRelations(v,path+'.'+key,world,deleted);
    }
  }
  for(const collection of REVIEW_ENTITY_KEYS) for(const [id,entity] of tables.get(collection)!) {
    const path=collection+'['+id+']',world=collection==='worlds'?id:entity.worldId,deleted=entity.isDeleted===true;
    if(collection!=='worlds') {
      if((world===undefined||world===null||world==='')&&collection!=='ideas') issues.push({path:path+'.worldId',code:'missing',target:'worlds'});
      else reference(world,'worlds',path+'.worldId',world,deleted);
    }
    walkRelations(entity,path,world,deleted);
    if(collection==='scenes'||collection==='plots') references(entity.characters,'characters',path+'.characters',world,deleted);
    if(collection==='components') references(entity.scenes,'scenes',path+'.scenes',world,deleted);
    if(collection==='organizations') references(entity.members,'characters',path+'.members',world,deleted);
    if(collection==='places') reference(entity.collectionId,'placeCollections',path+'.collectionId',world,deleted);
    if(collection==='characters') for(const key of ['ageByTimeline','deathByTimeline','statusByTimeline','statusRecoveryByTimeline']) {
      if(record(entity[key])) for(const timeline of Object.keys(entity[key])) reference(timeline,'timelines',path+'.'+key+'.'+timeline,world,deleted);
    }
    if(collection==='entityFolders') {
      const scopes:Record<string,string>={character:'characters',scene:'scenes',component:'components',organization:'organizations',worldFact:'worldFacts',worldDatum:'worldData',fantasticElement:'fantasticElements'};
      const target=scopes[String(entity.scope)];
      if(target) references(entity.itemIds,target,path+'.itemIds',world,deleted);
      else issues.push({path:path+'.scope',code:'invalid-reference',target:'entityFolders'});
    }
  }
  references(copy.dashboardWorldIds,'worlds','dashboardWorldIds',null,false);
  if(record(copy.characterOrderByWorld)) for(const [world,ids] of Object.entries(copy.characterOrderByWorld)) {
    reference(world,'worlds','characterOrderByWorld.'+world,null,false);
    references(ids,'characters','characterOrderByWorld.'+world,world,false);
  }
  const media={embedded:0,remoteUnverified:0,temporary:0,otherUnverified:0};
  const mediaKeys=new Set(['imageUrl','mapUrl','images','video','audio','audioUrl','coatOfArms']);
  function mediaValue(value:unknown) {
    if(Array.isArray(value)) {value.forEach(mediaValue);return;}
    if(typeof value!=='string'||!value.trim()) return;
    if(value.startsWith('data:')) media.embedded++;
    else if(value.startsWith('blob:')) media.temporary++;
    else if(/^https?:\/\//i.test(value)) media.remoteUnverified++;
    else media.otherUnverified++;
  }
  function walkMedia(value:unknown) {
    if(Array.isArray(value)) {value.forEach(walkMedia);return;}
    if(!record(value)) return;
    for(const [key,v] of Object.entries(value)) {
      if(mediaKeys.has(key)) mediaValue(v);
      else if(record(v)||Array.isArray(v)) walkMedia(v);
    }
  }
  walkMedia(copy);
  return {scope:'known-schema-references-and-media-fields-v1',issues,media,canApply:false,remoteFilesChecked:false,
    limitations:['No comprueba acceso ni integridad de archivos remotos o embebidos.','No verifica ciclos genealógicos, enlaces en texto enriquecido ni todos los campos de complementos.','No comprueba cuenta, versión remota ni restauración. La propuesta no se aplica.']};
}
