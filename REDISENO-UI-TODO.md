# Rediseño general de interfaz

Objetivo: una interfaz administrativa sobria, amplia y consistente, con menos
contenedores anidados, títulos fuera de las superficies y color reservado para
estados o alertas reales.

## 0. Sistema transversal

- [x] Aplanar el encabezado general de las páginas y retirar la barra decorativa.
- [x] Definir un encabezado reutilizable para secciones, fuera de las tarjetas.
- [x] Unificar `input`, `select`, `textarea`, fechas y checkboxes.
- [x] Definir estados hover, foco, error, disabled y controles compactos.
- [x] Unificar radios, bordes, sombras y densidad de superficies.
- [ ] Migrar confirmaciones destructivas nativas a diálogos propios.
- [ ] Consolidar botones y menús de acciones en componentes reutilizables.

## 1. Inicio

- [x] Separar el saludo y las acciones de cualquier tarjeta.
- [x] Convertir los KPI en una única banda de métricas con divisores.
- [x] Retirar barras de color y gradientes decorativos de los indicadores.
- [x] Convertir el resumen prioritario en una sola superficie continua.
- [ ] Compactar gráficos vacíos y ofrecer acciones útiles cuando no hay datos.
- [ ] Revisar el panel operativo de empleados con la misma jerarquía.

## 2. Eventos

- [x] Usar encabezado plano y banda única de métricas.
- [x] Simplificar filtros y aplicar el nuevo sistema de campos.
- [ ] Unificar próximo evento y filtros en una sola barra contextual.
- [ ] Reemplazar las tarjetas internas de fecha/cliente/presupuesto por una grilla plana.
- [ ] Optimizar vista móvil del listado y las acciones por evento.

## 3. Presupuestos

- [x] Aplanar encabezado general y normalizar campos del editor.
- [ ] Reducir cajas dentro de la vista previa y del formulario por pasos.
- [ ] Hacer más evidente la relación evento → presupuesto → conversión.
- [ ] Simplificar listado de libres y estados vacíos.
- [ ] Revisar impresión/PDF después del rediseño visual del editor.

## 4. Proveedores y rubros

- [x] Mover título y descripción fuera de la superficie de datos.
- [x] Aplicar controles de formulario consistentes.
- [ ] Incorporar búsqueda, edición y estado vacío útil.
- [ ] Pasar acciones secundarias a menú contextual por fila.

## 5. Utileros

- [x] Aplanar encabezado y normalizar todos los campos.
- [ ] Reducir tarjetas internas en ficha, tarifas y resumen histórico.
- [ ] Mejorar navegación móvil entre listado y ficha.
- [ ] Compactar el estado vacío sin ocupar toda la pantalla.

## 6. Reportes

- [x] Aplanar encabezado y normalizar fechas/selectores.
- [ ] Separar configuración, resultados y exportación sin tarjetas anidadas.
- [ ] Convertir KPI de resultados en una banda continua.
- [ ] Compactar el estado previo y la visualización sin información.

## 7. Usuarios

- [x] Mover títulos de alta y equipo fuera de las superficies.
- [x] Aplicar el sistema de inputs y selects.
- [ ] Convertir permisos expandidos en panel lateral o diálogo.
- [ ] Reemplazar confirmación nativa de restablecimiento.
- [ ] Optimizar tabla para pantallas pequeñas.

## 8. Detalle de evento y formularios operativos

- [x] Normalizar controles de ingresos, proveedores, utileros y caja chica.
- [ ] Aplanar pestañas y encabezados del detalle.
- [ ] Reducir resúmenes repetidos dentro de cada módulo.
- [ ] Unificar tablas editables y edición inline.
- [ ] Revisar estados vacíos, errores y skeletons de cada pestaña.

## Criterios de cierre

- [ ] Sin desbordes horizontales entre 360 px y escritorio amplio.
- [ ] Navegación completa con teclado y foco visible.
- [ ] Contraste AA en texto, controles y estados.
- [ ] Sin colores semánticos usados como decoración.
- [ ] Lint, TypeScript y build de producción aprobados.
