# Resolución de conflictos en la rama de prueba

El diálogo de conflicto conectado ofrece Guardar versión revisada y Actualizar revisión. Los archivos importados y ejemplos siguen siendo propuestas descargables, sin aplicar.

El guardado se serializa con los guardados normales, vuelve a leer la nube, comprueba que la biblioteca local no haya cambiado y conserva ambas originales y la propuesta en localStorage bajo una clave nueva por operación y usuario. Si falla el respaldo, no aplica ni escribe. La versión revisada queda localmente pendiente antes del envío; solo la confirmación del envío marca esa instantánea como sincronizada. Las ediciones posteriores siguen pendientes. Si cambia la nube después de comprobarla, la transacción conserva el control de versión.

Una elección conserva el elemento completo de la versión seleccionada. En este flujo no se permite excluir IDs presentes en cualquiera de las originales. La sustitución completa de un documento seleccionado solo se usa en la resolución explícita; el guardado normal conserva su comportamiento previo. La revisión impide relaciones nuevas rotas detectables por el validador parcial, y referencias blob temporales. No valida todos los complementos ni integridad de archivos.

Las copias locales NO son un respaldo externo ni incluyen archivos enlazados. Todavía falta una interfaz de restauración de estos archivos locales. No borrar caché ni usar este flujo con datos personales hasta validar recuperación y el flujo completo en navegador conectado a un proyecto de pruebas separado.

El preview permanece sin Firebase. La integración se prueba con SDK real y emuladores, datos ficticios y proyecto demo-storytable-safety. Pendientes de lanzamiento: bibliotecas mayores de 399 elementos, subidas repetidas, cuota real, restauración y PC/iPhone. El registro de npm ci también informó dependencias vulnerables; hace falta evaluar exposición y actualizaciones antes de distribución.
