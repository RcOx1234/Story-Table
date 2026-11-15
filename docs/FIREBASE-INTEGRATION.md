# Pruebas de integración aisladas

Usan el SDK real de Firebase y los servicios de guardado del código, contra emuladores de Firestore y Storage. Proyecto fijo: demo-storytable-safety. No usan credenciales ni variables de la aplicación. El preview sigue desconectado.

Requisitos: Node 24, Java 21, npm ci.
Ejecutar:
```sh
npx -y firebase-tools@latest emulators:exec --project demo-storytable-safety --config firebase.integration.json --only firestore,storage "node --test --test-timeout=120000 tests/integration/firebase.test.mjs"
```

GitHub ejecuta lo mismo en la rama de preview. Las reglas usadas son los archivos de ejemplo existentes, equivalentes en permisos a las reglas publicadas consultadas el 14 de noviembre de 2026. No se despliegan reglas. Probar estas reglas no demuestra protección frente a enlaces de descarga con token ni equivale a una auditoría completa.

Cobertura: guardar y recargar con dos clientes; conservar documentos ausentes; dos guardados desde la misma versión; subir y recuperar bytes; denegar lectura/escritura entre usuarios; límite provisional de 399 entidades; lectura de legado sin migración.

Pendiente: aplicar revisión de conflictos y volver a guardar, grandes bibliotecas más allá del límite provisional, imágenes sin subidas repetidas, cierre/reapertura real en navegador, recuperación de respaldos, cuota real de Storage y pruebas en iPhone. El emulador no valida cuotas, facturación ni fiabilidad de una red móvil.

Consulta real de solo lectura: proyecto activo, Firestore STANDARD, PITR desactivado, protección contra eliminación desactivada; listas de respaldos administrados y programación vacías. No incluye copias externas o exportaciones del usuario. No se modificó producción, datos, reglas ni facturación.
