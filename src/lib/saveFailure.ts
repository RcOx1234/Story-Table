
/** User-facing save errors; no claim that local browser persistence succeeded. */
export function formatSaveFailure(error:unknown):string {
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  const pending=' El guardado en la nube no se confirmó. Conserva una copia local y no borres la caché.';
  if(code==='storage/quota-exceeded') return 'Firebase Storage rechazó la subida por una restricción de cuota. Hay que comprobar consumo, límites y facturación del bucket; este error por sí solo no identifica cuál.'+pending;
  if(code==='storage/unauthorized'||code==='storage/unauthenticated') return 'No se pudo autorizar la subida de archivos. Hay que revisar sesión y permisos de Storage.'+pending;
  if(code==='storage/retry-limit-exceeded'||code==='storage/canceled') return 'La subida se interrumpió o agotó sus reintentos.'+pending;
  if(code==='storage/bucket-not-found'||code==='storage/project-not-found') return 'No se encontró el bucket o proyecto de Storage configurado.'+pending;
  if(code==='permission-denied'||code==='firestore/permission-denied') return 'Firestore rechazó el guardado por permisos.'+pending;
  if(code==='resource-exhausted'||code==='firestore/resource-exhausted') return 'Firestore informó que se agotó un recurso o cuota. No confirma que el documento sea demasiado grande.'+pending;
  if(code==='invalid-argument'||code==='firestore/invalid-argument') return 'Firestore rechazó datos o parámetros del guardado.'+pending;
  if(code==='unavailable'||code==='firestore/unavailable') return 'No se pudo completar la conexión con Firestore.'+pending;
  if(error instanceof Error&&error.message) return error.message;
  return 'No se pudo confirmar el guardado en Firebase. Conserva una copia local.';
}
