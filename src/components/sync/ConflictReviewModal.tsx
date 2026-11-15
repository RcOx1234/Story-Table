import { Check, ChevronLeft, ChevronRight, Download, Files, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { changedReviewFields, reviewValueText } from '@/lib/reviewPresentation';

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
export function ConflictReviewModal({open,onClose,initial,onApply,onRefresh}:{open:boolean;onClose:()=>void;initial?:{a:ReviewSource;b:ReviewSource};onApply?:(choices:Record<string,Choice>)=>Promise<void>;onRefresh?:()=>Promise<void>}) {
  const [a,setA]=useState<ReviewSource|null>(initial?.a??null),[b,setB]=useState<ReviewSource|null>(initial?.b??null);
  const [busy,setBusy]=useState(false);
  const actionPending=useRef(false);
  const [choices,setChoices]=useState<Record<string,Choice>>({});
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(0);
  const [onlyPending,setOnlyPending]=useState(false);
  const [automatic,setAutomatic]=useState(0);
  const [exampleBase,setExampleBase]=useState<LibraryCopy|null>(null);
  const requests=useRef({a:0,b:0});
  const differences=useMemo(()=>a&&b?compareCopies(a.library,b.library):[],[a,b]);
  const remaining=differences.filter(d=>!choices[d.key]).length;
  const validation=useMemo(()=>a&&b&&remaining===0?auditReviewedCopy(buildReviewedCopy(a.library,b.library,choices)):null,[a,b,choices,remaining]);
  const visibleDifferences=useMemo(()=>onlyPending?differences.filter(d=>!choices[d.key]):differences,[differences,choices,onlyPending]);
  const pageCount=Math.max(1,Math.ceil(visibleDifferences.length/5));
  const currentPage=Math.min(page,pageCount-1);
  const shown=visibleDifferences.slice(currentPage*5,currentPage*5+5);
  function select(side:Choice,label:string,original:unknown) {
    const source={label,original:structuredClone(original),library:readReviewCopy(original)};
    (side==='a'?setA:setB)(source);setChoices({});setOnlyPending(false);setAutomatic(0);setExampleBase(null);setPage(0);setError('');setNotice('');
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

  async function perform(action:()=>Promise<void>) {
    if(actionPending.current) return;
    actionPending.current=true;setBusy(true);setError('');
    try {await action();} catch(e) {setError(e instanceof Error?e.message:'No se confirmó el guardado. Tus cambios siguen pendientes.');}
    finally {actionPending.current=false;setBusy(false);}
  }

  return <BaseModal open={open} onClose={()=>{if(!actionPending.current) onClose();}} title="Revisar cambios" description="Elige qué conservar. Las dos versiones originales permanecen intactas." maxWidthClass="max-w-5xl"
    footer={<div className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-[#AAB0C0]">{a&&b?(remaining?remaining+' decisiones pendientes':(onApply?'Lista para guardar':'Revisión lista para descargar')):'Entorno de prueba · sin conexión a la nube'}</span>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={onClose} className="story-btn-secondary">Cerrar</button>{onRefresh&&<button type="button" disabled={busy} onClick={()=>void perform(onRefresh)} className="story-btn-secondary">Actualizar revisión</button>}{onApply&&<button type="button" disabled={busy||!a||!b||remaining>0} onClick={()=>void perform(()=>onApply(structuredClone(choices)))} className="story-btn-primary disabled:opacity-40">{busy?'Comprobando y guardando…':'Guardar versión revisada'}</button>}<button type="button" onClick={archive} disabled={!a||!b||remaining>0} className="story-btn-primary disabled:opacity-40"><Download size={16}/> Descargar revisión</button></div>
    </div>}>
    <div className="space-y-5 text-sm text-[#E8E9EB]">
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#161920] px-4 py-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#AAB0C0]"/>
        <p className="text-xs leading-relaxed text-[#BBC0CE]">{onApply?'Al guardar se conserva una copia local de ambas versiones y se comprueba de nuevo la nube. Las imágenes enlazadas necesitan respaldo aparte.':'Esta prueba prepara una propuesta; no la aplica ni guarda en Firebase. Descarga la revisión para conservar tus decisiones. Las imágenes enlazadas necesitan respaldo aparte.'}</p>
      </div>
      {!a&&!b&&<section className="rounded-2xl border border-white/10 bg-[#111318] px-5 py-7 sm:px-8">
        <GitCompareArrows size={28} className="mb-4 text-[#F16069]"/>
        <h3 className="text-xl font-semibold text-white">Quédate con los cambios que importan</h3>
        <p className="mt-2 max-w-xl leading-relaxed text-[#AAB0C0]">Prueba cómo se revisará un personaje editado en dos dispositivos. Los cambios compatibles ya estarán seleccionados.</p>
        <button type="button" onClick={sample} className="story-btn-primary mt-5">Probar con un ejemplo <ChevronRight size={16}/></button>
      </section>}
      {!onApply&&<details className="rounded-xl border border-white/10 px-4 py-3">
        <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Copias y herramientas de prueba</summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2"><button type="button" onClick={sample} className="story-btn-secondary">Cargar ejemplo</button><button type="button" className="story-btn-secondary" onClick={()=>{requests.current.a++;try{select('a','Biblioteca de este navegador',JSON.parse(JSON.stringify(getStorySlice())));}catch(e){setError(e instanceof Error?e.message:'No se pudo leer la biblioteca.');}}}>Usar este navegador como A</button></div>
          <div className="grid gap-3 sm:grid-cols-2">{(['a','b'] as const).map(side=><label key={side} className="block min-w-0 rounded-lg border border-white/10 p-3">
            <span className="font-medium">Versión {side.toUpperCase()}</span>
            <input className="mt-3 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" type="file" accept=".json,application/json" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file) void load(side,file);}} />
            <span className="mt-2 block break-all text-xs text-[#AAB0C0]">{(side==='a'?a:b)?.label??'Sin seleccionar'}</span>
          </label>)}</div>
        </div>
      </details>}
      {error&&<p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-red-200">{error}</p>}
      {notice&&<p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-950/30 p-3 text-emerald-200">{notice}</p>}
      {a&&b&&<>
        <section aria-label="Progreso de revisión" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs uppercase tracking-wider text-[#AAB0C0]">Tu revisión</p><h3 className="mt-1 text-2xl font-semibold text-white">{remaining===0?'Todo revisado':remaining+' '+(remaining===1?'cambio necesita':'cambios necesitan')+' tu decisión'}</h3></div>
            <span className="text-sm tabular-nums text-[#AAB0C0]">{differences.length-remaining} de {differences.length} elegidos</span>
          </div>
          <progress aria-label="Cambios revisados" value={differences.length-remaining} max={Math.max(1,differences.length)} className="h-1.5 w-full overflow-hidden rounded-full accent-[#D61E2B]"/>
          <p className="text-xs leading-relaxed text-[#AAB0C0]">{exampleBase?automatic+' cambios compatibles preseleccionados en este ejemplo. Puedes revisar y cambiar cualquier elección.':'No hay una versión común verificada entre estos archivos. Por eso las diferencias necesitan tu revisión.'}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#D61E2B]" checked={onlyPending} onChange={e=>{setOnlyPending(e.target.checked);setPage(0);}}/>Solo pendientes</label>
            <button type="button" className="flex min-h-11 items-center gap-2 text-xs text-[#BBC0CE] underline underline-offset-4" onClick={()=>download({format:'storytable-comparison-originals-v1',createdAt:new Date().toISOString(),a:{label:a.label,payload:a.original},b:{label:b.label,payload:b.original}})}><Download size={14}/> Descargar ambas originales</button>
          </div>
        </section>
        {shown.length===0&&<div role="status" className="rounded-xl border border-white/10 p-6 text-center"><Check size={24} className="mx-auto mb-2 text-emerald-300"/><p>{differences.length===0?'Las versiones tienen el mismo contenido.':'No quedan cambios pendientes.'}</p><p className="mt-1 text-xs text-[#AAB0C0]">{onApply?'Pulsa Guardar versión revisada para confirmar.':'Puedes descargar la revisión. Tu biblioteca sigue sin cambios.'}</p></div>}
        {shown.map(d=>{
          const fields=changedReviewFields(d.a,d.b);
          return <fieldset key={d.key} className="min-w-0 rounded-2xl border border-white/15 bg-[#111318] p-4 sm:p-5">
            <legend className="px-2 text-base font-semibold text-white">{displayName(d.a??d.b,d.id??names[d.collection]??d.collection)}</legend>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#AAB0C0]">{names[d.collection]??d.collection} · {fields.length} campos diferentes</span>
              <span className={'rounded-full px-2.5 py-1 text-xs '+(choices[d.key]?'bg-emerald-400/10 text-emerald-200':'bg-amber-400/10 text-amber-200')}>{choices[d.key]?'Elección preparada':'Pendiente'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">{(['a','b'] as const).map(side=>{
              const present=side==='a'?d.aPresent:d.bPresent,value=side==='a'?d.a:d.b,selected=choices[d.key]===side;
              return <div key={side} className={'min-w-0 rounded-xl border p-4 transition-colors '+(selected?'border-[#F16069] bg-[#D61E2B]/5':'border-white/10 bg-[#0D0F14]')}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input type="radio" disabled={busy} className="mt-1 h-4 w-4 shrink-0 accent-[#D61E2B]" name={d.key} checked={selected} onChange={()=>{setChoices(old=>({...old,[d.key]:side}));setNotice('');}}/>
                  <span className="min-w-0"><span className="block font-semibold">{present?'Conservar esta versión':'Excluir de la propuesta'}</span><span className="mt-1 block break-all text-xs text-[#AAB0C0]">Versión {side.toUpperCase()} · {(side==='a'?a:b).label}</span></span>
                </label>
                {!present?<p className="mt-4 rounded-lg bg-amber-400/5 p-3 leading-relaxed text-amber-100">Este elemento no aparece aquí. Elegir esta opción lo dejaría fuera de la propuesta. Las originales se conservan.</p>:<dl className="mt-4 space-y-4 border-t border-white/10 pt-4">
                  {fields.slice(0,6).map(field=><div key={field.key}><dt className="mb-1 text-xs font-medium text-[#AAB0C0]">{field.label}</dt><dd className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-[#ECEEF2]">{reviewValueText(side==='a'?field.a:field.b).slice(0,800)}{reviewValueText(side==='a'?field.a:field.b).length>800?' … (vista abreviada)':''}</dd></div>)}
                  {fields.length>6&&<p className="text-xs text-[#AAB0C0]">{fields.length-6} campos adicionales en el detalle.</p>}
                </dl>}
                <details className="mt-4 border-t border-white/10 pt-3"><summary className="cursor-pointer text-xs text-[#AAB0C0]">Detalle técnico de esta versión</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{readable(value,present)}</pre></details>
              </div>;
            })}</div>
            <p className="mt-3 text-xs text-[#AAB0C0]">La elección conserva el elemento completo de esa versión, no mezcla sus campos.</p>
          </fieldset>;
        })}
        {pageCount>1&&<nav aria-label="Páginas de cambios" className="flex items-center justify-between gap-2"><button type="button" className="story-btn-secondary disabled:opacity-40" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16}/>Anterior</button><span className="text-xs text-[#AAB0C0]">{currentPage+1} / {pageCount}</span><button type="button" className="story-btn-secondary disabled:opacity-40" disabled={currentPage===pageCount-1} onClick={()=>setPage(currentPage+1)}>Siguiente<ChevronRight size={16}/></button></nav>}
        {validation&&<details className="rounded-xl border border-white/10 p-4">
          <summary className="cursor-pointer font-medium">Comprobación de relaciones y archivos · {validation.issues.length} advertencias</summary>
          <div className="mt-3 space-y-3 text-xs text-[#BBC0CE]"><p>{validation.media.embedded} archivos embebidos · {validation.media.remoteUnverified} enlaces remotos sin verificar · {validation.media.temporary} enlaces temporales · {validation.media.otherUnverified} otras referencias.</p>
          <ul className="list-disc space-y-1 break-all pl-5">{validation.issues.slice(0,30).map((issue,i)=><li key={i}>{issue.path}: {({missing:'destino ausente',deleted:'destino en papelera','different-world':'destino de otro mundo','invalid-reference':'referencia inválida'})[issue.code]}</li>)}</ul>
          <p>El informe completo va en la descarga. Esta comprobación parcial no verifica imágenes remotas, genealogías completas, complementos ni la versión de la nube. No sustituye la comprobación de cuenta y nube al guardar.</p></div>
        </details>}
      </>}
      {(!a||!b)&&(a||b)&&<p className="flex items-center gap-2 text-[#AAB0C0]"><Files size={18}/>Selecciona la otra versión en «Copias y herramientas de prueba».</p>}
    </div>
  </BaseModal>;
}
