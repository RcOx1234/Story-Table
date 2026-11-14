
export const fieldLabels:Record<string,string>={name:'Nombre',title:'Título',description:'Descripción',content:'Contenido',backstory:'Historia',personality:'Personalidad',appearance:'Apariencia',goals:'Objetivos',fears:'Miedos',powers:'Poderes',relationships:'Relaciones',images:'Imágenes',imageUrl:'Imagen',worldId:'Mundo',isDeleted:'En papelera',updatedAt:'Última edición',createdAt:'Creación',tags:'Etiquetas',tagIds:'Etiquetas vinculadas',status:'Estado',age:'Edad',role:'Rol',alias:'Alias',houseId:'Casa',characters:'Personajes',members:'Miembros',placeId:'Lugar',timelineId:'Línea temporal',notes:'Notas',synopsis:'Sinopsis',quotes:'Citas',arc:'Arco',mapUrl:'Imagen del mapa'};
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function stable(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(record(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 return JSON.stringify(value)??'undefined';
}
export function changedReviewFields(a:unknown,b:unknown) {
 if(!record(a)&&!record(b))return [{key:'value',label:'Contenido',a,b}];
 const aa=record(a)?a:{},bb=record(b)?b:{};
 return [...new Set([...Object.keys(aa),...Object.keys(bb)])].filter(k=>k!=='id'&&stable(aa[k])!==stable(bb[k]))
 .sort((x,y)=>Number(['updatedAt','createdAt'].includes(x))-Number(['updatedAt','createdAt'].includes(y)))
 .map(key=>({key,label:fieldLabels[key]??key,a:aa[key],b:bb[key]}));
}
/** Plain text only: never renders imported HTML or loads remote images. */
export function reviewValueText(value:unknown):string {
 if(value===undefined)return 'No incluido';
 if(value===null||value==='')return 'Sin contenido';
 if(typeof value==='boolean')return value?'Sí':'No';
 if(typeof value==='string'){
  if(value.startsWith('data:'))return 'Archivo incluido en la copia';
  if(value.startsWith('blob:'))return 'Archivo temporal del navegador';
  if(/^https?:\/\//i.test(value))return 'Enlace a un archivo o recurso externo';
  return value;
 }
 if(Array.isArray(value)) {
  if(value.length===0)return 'Lista vacía';
  return value.length+' elementos: '+value.slice(0,5).map(v=>record(v)?String(v.name??v.title??v.characterName??v.id??'Elemento'):reviewValueText(v)).join(' · ')+(value.length>5?' …':'');
 }
 if(record(value))return Object.keys(value).length+' campos relacionados. Consulta el detalle para verlos.';
 return String(value);
}
