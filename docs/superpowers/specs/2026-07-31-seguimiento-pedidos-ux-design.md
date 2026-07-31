# Seguimiento de pedidos: diseño de interacción y estabilidad

## Objetivo

Corregir la interacción de preguía y preparación en la tabla y el editor de pedidos, alinear la actualización masiva con el patrón existente de cambio de estados y eliminar el error HTTP 500 que aparece en el primer cambio.

## Alcance

- Tabla principal de pedidos.
- Sección Envío del detalle/editor del pedido.
- Modal de actualización masiva de seguimiento.
- Solicitudes individuales y masivas de seguimiento.
- Notificación en tiempo real posterior a la actualización.
- Pruebas automatizadas de frontend y backend asociadas.

No se modificarán los permisos existentes ni el comportamiento de pedidos eliminados.

## Tabla de pedidos

Cada estado se mostrará como una etiqueta compacta, sin checkbox:

- `Sin preguía` / `Con preguía`.
- `Sin preparar` / `Preparado`.

Cuando el usuario tenga el permiso correspondiente, la etiqueta será un botón accesible. El clic cambiará de inmediato el texto y el estilo de la etiqueta. Sin permiso, se conservará la misma apariencia informativa, pero sin interacción.

El estado no dependerá solo del color: siempre incluirá texto e indicador visual. El control tendrá foco visible, etiqueta accesible y área de interacción suficiente sin aumentar innecesariamente la altura de las filas.

## Consolidación de clics

La interfaz aplicará una política de último valor solicitado:

1. Cada clic actualiza inmediatamente el estado visual local.
2. Se espera un intervalo corto antes de enviar la solicitud.
3. Los clics adicionales dentro del intervalo reemplazan el valor pendiente.
4. Nunca se ejecutan dos solicitudes simultáneas para el mismo pedido y campo.
5. Si el usuario vuelve a cambiar el valor durante una solicitud activa, solo se conserva el último valor y se envía, como máximo, una solicitud posterior cuando sea necesaria.
6. Una respuesta anterior no puede sobrescribir un valor más reciente elegido por el usuario.
7. Ante un fallo real, se restaura el último valor confirmado por el servidor y se muestra el error.

Esta coordinación se centralizará en una unidad reutilizable para que la tabla y el editor tengan el mismo comportamiento.

## Editor del pedido

Preguía y preparación aparecerán dentro de un bloque propio de `Seguimiento del envío`, integrado en la cuadrícula de la sección Envío. No se colocarán dentro del espacio flotante de Agencia o Dirección.

El bloque reutilizará las mismas etiquetas interactivas, estados, permisos y consolidación de clics de la tabla. El diseño seguirá los espaciados, bordes, tipografía y estados de foco ya utilizados por el editor.

## Actualización masiva

El modal seguirá la estructura visual y operativa del cambio masivo de estados. Tendrá:

- `Filtrar por preguía`: Todos, Sin preguía, Con preguía.
- `Filtrar por preparación`: Todos, Sin preparar, Preparados.
- `Ejecutar por`: Preguía o Preparación, limitado por los permisos del usuario.
- Valor final dependiente de la ejecución:
  - Preguía: Sin preguía o Con preguía.
  - Preparación: Sin preparar o Preparado.

Los filtros se aplicarán a los pedidos seleccionados y la vista previa mostrará cuántos pedidos serán modificados. La solicitud enviará únicamente los identificadores filtrados y un solo campo de seguimiento. El botón de confirmación permanecerá inactivo cuando no haya pedidos aplicables o no se haya elegido el valor final.

## Error HTTP 500

La actualización de seguimiento y la generación de su auditoría constituyen la operación principal. La notificación en tiempo real ocurre después. Una falla al construir o emitir esa notificación no debe convertir en error HTTP una actualización que ya fue confirmada en la base de datos.

La investigación verificará esta hipótesis mediante una prueba del controlador: si la actualización termina correctamente y la notificación falla, el endpoint debe responder con éxito y conservar el resultado de la operación. El fallo de notificación deberá registrarse para diagnóstico sin engañar al frontend ni inducir un segundo clic.

Si la reproducción demuestra otra causa anterior a la persistencia, se corregirá esa causa y se mantendrá la garantía de no ejecutar solicitudes paralelas.

## Permisos

- `sale_orders.preguide.update` habilita cambios individuales y masivos de preguía.
- `sale_orders.prepared.update` habilita cambios individuales y masivos de preparación.
- Sin el permiso de un campo, su estado continúa visible, pero no editable.
- El selector `Ejecutar por` solo ofrece operaciones autorizadas.
- Los pedidos eliminados permanecen en modo lectura.

## Manejo de errores

- Error de actualización: revertir al último valor confirmado y mostrar el mensaje normalizado del API.
- Error de notificación posterior a una actualización confirmada: registrar el problema, mantener respuesta exitosa y permitir la sincronización posterior.
- Cambio masivo parcialmente completado: conservar el resultado detallado existente y recargar la lista para reflejar los estados reales.

## Pruebas

### Frontend

- Las etiquetas no contienen checkboxes.
- Cada etiqueta muestra el texto correcto para ambos valores.
- Solo los campos autorizados son interactivos.
- Los clics rápidos generan una sola solicitud con el último valor.
- No existen solicitudes simultáneas para el mismo campo.
- Un fallo restaura el último valor confirmado.
- El bloque del editor ocupa una celda propia y no se superpone con Agencia/Dirección.
- El modal filtra los seleccionados por ambos estados y construye el payload dependiente de `Ejecutar por`.

### Backend

- Los endpoints individuales y masivos mantienen la validación de permisos.
- El cambio actualiza solamente el campo solicitado y crea su auditoría.
- Una falla de notificación posterior no produce HTTP 500 si la operación ya terminó correctamente.
- Los pedidos eliminados no pueden modificarse.

## Criterios de aceptación

- No hay checkbox visible en la columna de seguimiento de la tabla.
- El usuario puede alternar cada etiqueta con un clic y recibe respuesta visual inmediata.
- Una ráfaga de clics no sobrecarga el backend y termina en el último valor elegido.
- Los controles del editor no se superponen con otros campos.
- El modal masivo se entiende y opera igual que el cambio masivo de estados.
- El primer cambio válido no devuelve HTTP 500 por una falla posterior de tiempo real.
- Las pruebas enfocadas, compilación y lint de los archivos modificados finalizan correctamente.
