
import { useMemo, useRef, useState } from 'react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { getStorySlice } from '@/services/storyBundleSync';
import { readReviewCopy, compareCopies, buildConflictArchive, buildReviewedCopy, auditReviewedCopy, planCompatibleChanges, type LibraryCopy, type Choice } from '@/lib/conflictReview';

export type ReviewSource={label:string;original:unknown;library:LibraryCopy};
const names:Record<string,string>={worlds:'Mundos',characters:'Personajes',scenes:'Escenas',places:'Lugares',maps:'Mapas',plots:'Tramas',components:'Componentes',organizations:'Organizaciones',ideas:'Ideas',timelines:'Cronologías',fantasticElements:'Elementos fantásticos',houses:'Casas',worldFacts:'Hechos',worldData:'Datos del mundo',placeCollections:'Colecciones de lugares',mapCollections:'Colecciones de mapas',worldTags:'Etiquetas',entityFolders:'Carpetas',characterOrderByWorld:'Orden de personajes',dashboardWorldIds:'Mundos del inicio'};
function download(payload:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='storytable-revision-'+Date.now()+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function displayName(value:unknown,fallback:string) {
  if(value&&typeof value==='object') {const row=value as Record<string,unknown>;for(const key of ['name','title','description']) if(typeof row[key]==='string'&&row[key]) return row[key].slice(0,100);}
  return fallback;
}
function readable(value:unknown,present:boolean) {
  if(!present) return 'Ausente. Elegir esta opción lo excluye de la propuesta.';
  const text=JSON.stringify(value,null,2) ?? '';
  return text.length>4000?text.slice(0,4000)+'\n… Vista abreviada. La descarga conserva el contenido completo.':text;
}
export function ConflictReviewModal({open,onClose,initial}:{open:boolean;onClose:()=>void;initial?:{a:ReviewSource;b:ReviewSource}}) {
  const [a,setA]=useState<ReviewSource|null>(initial?.a??null),[b,setB]=useState<ReviewSource|null>(initial?.b??null);
  const [choices,setChoices]=useState<Record<string,Choice>>({});
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(0);
  const [automatic,setAutomatic]=useState(0);
  const [exampleBase,setExampleBase]=useState<LibraryCopy|null>(null);
  const requests=useRef({a:0,b:0});
  const differences=useMemo(()=>a&&b?compareCopies(a.library,b.library):[],[a,b]);
  const remaining=differences.filter(d=>!choices[d.key]).length;
  const validation=useMemo(()=>a&&b&&remaining===0?auditReviewedCopy(buildReviewedCopy(a.library,b.library,choices)):null,[a,b,choices,remaining]);
  function select(side:Choice,label:string,original:unknown) {
    const source={label,original:structuredClone(original),library:readReviewCopy(original)};
    (side==='a'?setA:setB)(source);setChoices({});setAutomatic(0);setExampleBase(null);setPage(0);setError('');setNotice('');
  }
  async function load(side:Choice,file:File) {
    const request=++requests.current[side];
    try {
      if(file.size>20*1024*1024) throw Error('El límite de revisión es 20 MB por archivo.');
      const data=JSON.parse(await file.text());
      if(request===requests.current[side]) select(side,file.name,data);
    } catch(e) {if(request===requests.current[side]) setError(e instanceof Error?e.message:'No se pudo leer la copia.');}
  }
  function sample() {
    requests.current.a++;requests.current.b++;
    const worlds=[{id:'demo-world',name:'Isla del Alba'}];

    const base={worlds,characters:[{id:'luna',worldId:'demo-world',name:'Luna',description:'Exploradora'}]};
    const left={worlds,characters:[{id:'luna',worldId:'demo-world',name:'Luna',description:'Exploradora del norte'},{id:'elias',worldId:'demo-world',name:'Elías'}]};
    const right={worlds,characters:[{id:'luna',worldId:'demo-world',name:'Luna',description:'Cartógrafa del sur'},{id:'mara',worldId:'demo-world',name:'Mara'}]};
    select('a','Ejemplo ficticio · PC',left);
    select('b','Ejemplo ficticio · teléfono',right);
    const plan=planCompatibleChanges(base,left,right);
    setChoices(plan.choices);setAutomatic(Object.keys(plan.choices).length);setExampleBase(base);

  }
  function archive() {
    if(!a||!b) return;
    try {
      download({...buildConflictArchive(a.library,b.library,choices),exampleBase,sourceFiles:{a:{label:a.label,payload:a.original},b:{label:b.label,payload:b.original}}});
      setNotice('Descarga solicitada con ambas copias y la propuesta. Tu biblioteca no fue reemplazada.');
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo preparar la descarga.');}
  }
  return <BaseModal open={open} onClose={onClose} title="Comparar copias" description="Revisión local. No reemplaza tu biblioteca ni envía datos a Firebase." maxWidthClass="max-w-5xl"
    footer={<div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="story-btn-secondary">Cerrar</button><button type="button" onClick={archive} disabled={!a||!b||remaining>0} className="story-btn-primary disabled:opacity-40">Descargar revisión con ambas copias</button></div>}>
    <div className="space-y-4 text-sm text-[#E8E9EB]">
      <p className="rounded-xl border border-amber-500/40 p-3 text-amber-100">La revisión permanece en memoria hasta descargarla. La propuesta todavía necesita comprobar relaciones e imágenes y no puede importarse como biblioteca. Las imágenes enlazadas necesitan un respaldo aparte.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={sample} className="story-btn-secondary">Probar combinación automática</button>
        <button type="button" className="story-btn-secondary" onClick={()=>{requests.current.a++;try{select('a','Biblioteca de este navegador',JSON.parse(JSON.stringify(getStorySlice())));}catch(e){setError(e instanceof Error?e.message:'No se pudo leer la biblioteca.');}}}>Usar biblioteca local como A</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{(['a','b'] as const).map(side=><label key={side} className="block min-w-0 rounded-xl border border-white/10 p-3">Copia {side.toUpperCase()}
        <input className="mt-2 block w-full text-xs" type="file" accept=".json,application/json" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file) void load(side,file);}} />
        <span className="mt-2 block break-all">{(side==='a'?a:b)?.label ?? 'Sin seleccionar'}</span>
      </label>)}</div>
      {error&&<p role="alert" className="text-red-300">{error}</p>}
      {notice&&<p role="status" className="text-green-300">{notice}</p>}
      {a&&b&&<>
        <p>{differences.length} diferencias · {remaining} pendientes de elegir</p>
        {exampleBase?<p className="rounded-xl bg-emerald-950/50 p-3 text-emerald-100">Ejemplo: {automatic} cambios compatibles se seleccionaron automáticamente usando la versión común. Revisa solo lo que cambió en ambos dispositivos. Puedes modificar las selecciones; nada se aplica.</p>:<p className="text-[#AAB0C0]">Estas copias no incluyen una versión común verificada. No se elige automáticamente cuál debe prevalecer.</p>}
        <button type="button" className="underline" onClick={()=>download({format:'storytable-comparison-originals-v1',createdAt:new Date().toISOString(),a:{label:a.label,payload:a.original},b:{label:b.label,payload:b.original}})}>Descargar ambas originales sin elegir</button>
        {validation&&<section aria-label="Comprobación de la propuesta" className="rounded-xl border border-amber-500/40 p-3 space-y-2">
          <h3 className="font-semibold">Comprobación de la propuesta</h3>
          <p>{validation.issues.length} advertencias en las relaciones comprobadas. Este resultado no autoriza aplicar la propuesta.</p>
          <p>Archivos: {validation.media.embedded} referencias embebidas · {validation.media.remoteUnverified} enlaces remotos sin verificar · {validation.media.temporary} enlaces temporales · {validation.media.otherUnverified} otras referencias.</p>
          {validation.media.temporary>0&&<p className="text-amber-200">Los enlaces temporales pueden dejar de funcionar al cerrar la página y no constituyen un respaldo.</p>}
          <ul className="list-disc pl-5 break-all">{validation.issues.slice(0,30).map((issue,i)=><li key={i}>{issue.path}: {({missing:'destino ausente',deleted:'destino en papelera','different-world':'destino de otro mundo','invalid-reference':'referencia inválida'})[issue.code]} ({names[issue.target]??issue.target})</li>)}</ul>
          {validation.issues.length>30&&<p>Se muestran 30 advertencias. La descarga incluye el informe completo.</p>}
          <p className="text-xs text-[#AAB0C0]">Comprobación parcial: no descarga imágenes ni verifica genealogías completas, complementos, cuenta o versión remota. Conserva las originales.</p>
        </section>}
        {differences.length===0&&<p>No se encontraron diferencias de contenido.</p>}
        {differences.slice(page*10,page*10+10).map(d=><fieldset key={d.key} className="min-w-0 rounded-xl border border-white/20 p-3">
          <legend className="px-2 font-semibold">{names[d.collection]??d.collection}{d.id?' · '+displayName(d.a??d.b,d.id):''}</legend>
          <div className="grid gap-3 md:grid-cols-2">{(['a','b'] as const).map(side=>{
            const present=side==='a'?d.aPresent:d.bPresent;
            return <label key={side} className="block min-w-0 rounded-lg border border-white/10 p-3">
              <span className="flex items-center gap-2"><input type="radio" name={d.key} checked={choices[d.key]===side} onChange={()=>{setChoices(old=>({...old,[d.key]:side}));setNotice('');}} />{present?'Conservar de copia ':'No incluir · ausente en '}{side.toUpperCase()}</span>
              <details className="mt-3"><summary className="cursor-pointer text-[#AAB0C0]">Ver contenido completo del elemento</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{readable(side==='a'?d.a:d.b,present)}</pre></details>
            </label>;
          })}</div>
        </fieldset>)}
        {differences.length>10&&<div className="flex items-center justify-between gap-2"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1} de {Math.ceil(differences.length/10)}</span><button type="button" disabled={(page+1)*10>=differences.length} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>}
      </>}
    </div>
  </BaseModal>;
}
