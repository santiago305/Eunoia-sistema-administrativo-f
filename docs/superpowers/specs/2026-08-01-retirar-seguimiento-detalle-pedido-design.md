# Retirar seguimiento del detalle del pedido

## Objetivo

Eliminar del detalle y editor de pedidos el bloque visual `Seguimiento del envío`, donde actualmente se muestran las etiquetas de preguía y preparación.

## Alcance

- Retirar el bloque `Seguimiento del envío` de `SaleOrderShippingSection`.
- Eliminar la propiedad `tracking` de `SaleOrderShippingSection` y dejar de construirla en `SaleOrderEditor`.
- Actualizar la prueba del formulario de envío para confirmar que el bloque no se renderiza.
- Mantener `SaleOrderTrackingCell` y sus etiquetas en la tabla principal de Pedidos.
- Mantener sin cambios las acciones globales `Preguía`, `Sin preguía`, `Preparado` y `Sin preparar`.

## Diseño

El formulario de Envío conservará únicamente sus campos editables y adjuntos. No ocultará el seguimiento mediante estilos: se eliminarán el JSX, el import y la propiedad que quedaron dedicados a ese bloque. La tabla seguirá siendo la superficie de consulta del resultado de seguimiento, mientras que `Cambiar estado` seguirá siendo la única superficie para ejecutar las acciones globales.

## Pruebas

La prueba de `SaleOrderShippingSection` exigirá que, aunque se renderice el formulario de envío, no existan el texto `Seguimiento del envío` ni su contenedor anterior. Después se ejecutarán las pruebas del formulario, del componente de seguimiento usado en la tabla y de la pantalla de Pedidos, además del build del frontend.

## Fuera de alcance

- No modificar backend, base de datos, seeder ni workflows.
- No retirar la columna `Seguimiento` de la tabla.
- No modificar permisos ni acciones masivas.
