# Isolated synchronization preview

Base: d3d3d61c4498c0e2093f20c8d1be8b9bfcb6fd36.

This branch must not be merged wholesale. Firebase initialization is disabled, local storage uses a separate key, the CSP blocks external connections, and Vercel production builds fail deliberately. Only fictional seed data is used.

Changes: serialize manual/auto saves, clone each submitted snapshot, acknowledge its fingerprint only, keep later edits pending, reject stale account acknowledgements, clean up visibility/online listeners, retry pending work after reconnection, and offer a separate local recovery JSON including trash. Linked media files are not embedded in the recovery JSON.

Tests: npm test; npm run build. Preview browsing checks local editing/export only, not actual cloud synchronization.

Still pending: cross-device conflict control, safe orphan deletion/tombstones, non-destructive migrations, account-scoped durable persistence, upload deduplication, complete cloud backups and isolated restore, Storage quota diagnosis, authenticated image access, emulator/integration and iPhone Safari validation. Do not promote until these protections and recovery requirements are addressed.

## Sprint 2: read-only legacy loading and deletion protection

Ordinary saves no longer delete documents missing from a local snapshot. Soft-deleted entities can still be saved with isDeleted. Permanent removal needs a future explicit tombstone/deletion protocol: removing an item locally alone may let it reappear on a later pull.

Legacy libraries are returned without uploading, migrating, or deleting anything. Saving over a legacy/unknown root is blocked pending verified recovery and an explicit migration workflow. Unknown schemas fail visibly at the service boundary; hydration error presentation still needs improvement.

The toolbar exposes Guardar copia in the isolated preview. This downloads a local recovery JSON, not a cloud save. Existing cloud controls remain conditional on Firebase being configured.

New tests execute the actual service through a TypeScript-transpiled in-memory adapter. They are not Firebase emulator or live integration tests. One test documents the remaining stale-device overwrite problem; passing that reproduction does not mean conflicts are fixed. Cross-device version enforcement, atomic multi-document commits, real Storage quota diagnosis, backups and restore remain pending.

## Sprint 3: optimistic concurrency (isolated preview only)

A verified load records an in-memory base revision per UID. Saves preflight the revision, then verify it again within one Firestore transaction containing every entity write and metadata. Conflicts fail without silently reloading the latest revision. Failed/uncertain commits invalidate the base until a verified reconciliation. New media receives unique filenames to avoid changing existing images before a transaction succeeds; failed saves may leave unreferenced uploads, and upload deduplication/cleanup remain pending.

This preview deliberately refuses more than 399 entities per atomic save before uploads. This is an implementation guard, not a claimed Firestore service limit. Large libraries need a staged revision design before production. IDs are validated before uploads. No absent entities are deleted.

Hydration no longer automatically pushes pending local data or applies remote data before checking pending edits. It preserves local content and exposes a persistent error notice with a recovery-copy action. Conflict resolution is conservative: merging and selecting a remote/local winner are not implemented. No cloud-enabled deployment or migration is authorized by this preview.

Tests use the actual service and a serial in-memory transaction adapter, not the Firebase emulator. Server retries, security rules, offline device recovery, full backup/restore, old clients that do not follow this protocol, explicit delete/tombstone handling, and actual Safari/device synchronization still require integration testing. Documentation: https://firebase.google.com/docs/firestore/manage-data/transactions


## Sprint 4 — Comparación local de copias

Menú de usuario → Comparar copias. Incluye un ejemplo ficticio y lectura de exportaciones o copias locales con papelera (máximo 20 MB por archivo). Las decisiones son explícitas por entidad o ajuste; la ausencia de un registro nunca se elige automáticamente. No escribe en el estado de la biblioteca ni en Firebase.

Permite descargar ambas originales sin resolver diferencias, o un archivo de revisión con originales completas, decisiones y propuesta. El archivo de revisión no es una importación de biblioteca: aún requiere validar relaciones, imágenes, pertenencia a cuenta y versión remota antes de poder aplicarse. La revisión permanece en memoria hasta descargarla. No descarga imágenes enlazadas. No implica resolución integral de conflictos ni restauración verificada.

Pruebas nuevas: contenido equivalente, orden de entidades y ajustes, decisiones pendientes, ausencia explícita, papelera, originales independientes, formatos e identificadores inválidos. La validación visual y entre dispositivos sigue pendiente.


## Sprint 5 — Comprobación parcial de propuestas

El comparador muestra e incluye en la descarga un informe de referencias conocidas: destinos ausentes, papelera y cruces de mundo, escenas, personajes, colecciones, carpetas y enlaces genealógicos. Inventaría campos conocidos de imágenes/audio/vídeo como embebidos, remotos no verificados o temporales. No descarga archivos, no prueba su integridad ni valida ciclos genealógicos, todos los complementos, pertenencia a cuenta o versión remota. No aplica propuestas, incluso sin advertencias. Pruebas sintéticas incluidas; validación visual y recuperación real pendientes.


## Sprint 6 — Fallos de Storage y archivos embebidos

Prevalidación de data URLs antes de iniciar subidas; conserva el origen y admite base64 y codificación porcentual. Mensajes distinguen cuota de Storage, autorización, interrupción y errores de Firestore, sin prometer persistencia local. Pruebas del preparador real con Storage simulado y del servicio Firestore verifican que un fallo deja originales y documentos intactos. No hay pruebas contra el bucket real ni solución confirmada de su cuota. Subidas repetidas y archivos huérfanos siguen pendientes.

Consulta de solo lectura: proyecto activo y Billing Enabled: Yes. Herramientas disponibles no exponen consumo ni cuotas del bucket; facturación habilitada no demuestra disponibilidad de cuota. Firestore no devolvió respaldos ni programaciones en la revisión previa; PITR desactivado. No se activó ningún servicio.


## Sprint 7 — Flujo habitual y combinación compatible

Menú simplificado: Guardar una copia y Copias y recuperación. La antigua importación que reemplazaba el store y enviaba a Firebase se sustituyó en el preview por preparación de revisión: conserva ambas entradas y no escribe en el store ni en Firebase. Herramientas avanzadas agrupadas; detalles JSON plegados y nombres de elementos visibles.

Planificador puro de tres versiones: versión común + dispositivo A + B. Preselecciona modificaciones de un solo lado y altas independientes; modificaciones concurrentes, ausencia de una base y borrados quedan para revisión. Detecta borrados coincidentes como bloqueos. El ejemplo usa una base ficticia y conserva esa base en la descarga. No se integra aún al autoguardado: requiere checkpoints por cuenta/version, aplicación atómica con control de revisión, recuperación y pruebas reales. Incluso sin conflictos canApply permanece false. La comparación por entidad es conservadora; dos campos distintos de la misma entidad todavía requieren revisión.


## Sprint 8 — Revisión legible

Referencia principal: sistema existente de StoryTable (fondo #111318, texto claro, rojo reservado para acción/selección); captura aportada por el usuario. Investigación externa de estilos bloqueada por suscripción inactiva; se usó la guía de accesibilidad/formularios disponible: controles nativos, foco visible, etiquetas completas y avisos de estado. Decisiones: versiones lado a lado en escritorio y apiladas en móvil; campos cambiados visibles, JSON secundario; progreso y filtro de pendientes; cinco elementos por página; archivo y ejemplo en sección secundaria. Sin imágenes remotas cargadas ni HTML importado interpretado.

Se conserva el flujo read-only. Integrar el diálogo al guardado requiere capturar remoto/base verificados y resolver revisión obsoleta; no se conectó el preview a Firebase. Pruebas de presentación de diferencias y preservación del texto. Validación visual pendiente si el navegador del entorno no está disponible.


## Sprint 9 — Captura automática al fallar un guardado por conflicto

El error de revisión incompatible tiene código explícito. La ruta real pushStoryBundle captura una instantánea local y lee la remota sin establecer una nueva base de guardado. Abre el comparador para la cuenta activa; no necesita archivos. Una captura en curso se comparte para evitar lecturas duplicadas, y un cambio de cuenta o limpieza invalida su resultado. Cerrar el diálogo no autoriza sobreescrituras ni elimina los originales. Una revisión pendiente bloquea nuevos envíos. Si falla la lectura remota, permanece el error y no se crea una propuesta vacía.

Alcance: código integrado y pruebas con adaptadores, Firebase sigue desactivado en este preview. La aplicación de decisiones, base común duradera, bibliotecas grandes y validación Firebase real siguen pendientes. Las capturas están en memoria: hay que descargar para preservarlas fuera de la sesión. En este entorno las herramientas Firebase dejaron de estar disponibles; no se verificaron cuotas ni datos reales en este sprint.
