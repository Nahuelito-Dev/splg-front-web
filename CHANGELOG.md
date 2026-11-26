# Changelog

Todas las versiones publicadas de este proyecto.

## v2.4.0 - 2026-11-26

### Funcionalidades

- **seguridad:** ✨ la misma política de contraseña del back en los formularios del panel (7ec0c47)
- **recupero:** ✨ riesgo del cliente en el caso y en su ficha, y el retiro aprovechando la hoja (8e6ae78)
- **despacho:** ✨ choferes a medir por calle y el orden por calle en «Cómo viene el despacho» (fbdc26d)
- **recompra:** ✨ ajuste de cada cliente y hora del aviso en las próximas recompras y en su ficha (815b294)
- **hoja-de-ruta:** ✨ tiempo de atención por parada sugerido y vigente, con el modo fijo o aprendido (711c942)
- **despacho:** ✨ método de asignación en «Cómo viene el despacho» y en el detalle del pedido (bca4791)
- **avisos:** ✨ pantalla «Avisos enviados» y avisos del pedido en su detalle (ee75693)
- **reportes:** ✨ utilización por vehículo con desglose de costos, gráfico y CSV (0813227)
- **reportes:** ✨ resumen y ventas por chofer por GraphQL, con los mismos efectos de error que REST (98ea026)
- **pedidos:** ✨ visitas fallidas: listado con filtros, historial de visitas en el pedido y fijar la nueva visita (a6ae9ba)
- **pagos:** ✨ el panel deja de ofrecer la transferencia en configuración, cobros y reservas; salida para cerrar pedidos viejos (6f12e25)

### Correcciones

- **reportes:** 🐛 tipos de utilización generados, costo/km una sola vez y sin la transferencia en el texto (7991765)

## v2.3.0 - 2026-11-23

### Funcionalidades

- **efectivo:** ✨ efectivo cobrado y no rendido por chofer en el panel (e930c13)
- **pedidos:** ✨ dónde y cuándo se confirmó la entrega en el detalle del pedido (a45458c)
- **taller:** ✨ acierto antes y después de la corrección y «Aprobar pago» en las cuotas de seguro (57d63c9)
- **pagos:** ✨ el panel deja de ofrecer la transferencia y su recargo para lo nuevo (8bcff57)
- **seguimiento:** ✨ rediseño de las vistas de vehículos (4476e1e)
- **plataforma:** ✨ logo de la empresa y foto de las personas en las pantallas de plataforma (8ebb23c)
- **catalogo:** ✨ foto de proveedores, envases, cargas y productos en el panel (6f70e69)
- **vehiculos:** ✨ foto del vehículo en pedidos, chofer, hojas de ruta y tablero de flota (02c0600)
- **panel:** ✨ fotos de vehículos y personas donde el dato ya llegaba (6f91207)
- **distribuidoras:** ✨ logo de la empresa en la tabla de plataforma (8cc0a55)
- **flota:** ✨ tablero de tareas de flota tipo Trello con arrastrar y soltar (2eb54f4)
- **despacho:** ✨ sección «Cómo viene el despacho» con las métricas de M1 (e5a13ab)
- **modulos:** ✨ tarjeta «Acierto de la predicción» en recompra y planificador de taller (4fc29d2)

### Mantenimiento

- **mensajes:** ✅ esperar el hilo antes de buscar la lista en el test de la conversación (a7cd2e1)
- 🔧 licencia propietaria de OrixTech (e54b19a)
- ✅ datos de ejemplo con un nombre de distribuidora neutro (e62fb88)

## v2.2.0 - 2026-11-17

### Funcionalidades

- **chat:** ✨ asignación automática en el panel: estado en línea, equipo de mensajes, topes y aviso de colisión (8b) (4e4dd20)
- **roles:** ✨ roles del personal, cambiar rol y alta de admins con su rol (e07ce20)
- **chat:** ✨ etiquetas de la bandeja, tiempo de respuesta esperado y cierre por inactividad en el panel (7c) (34d682d)
- **observabilidad:** ✨ errores y trazas del panel en Sentry (7845702)
- **assistant:** ✨ probador del asistente, preguntas sin respuesta y lote de pruebas en el panel (7b) (3b0afc8)

### Mantenimiento

- **marca:** 🔧 aclarar que OrixTech es Nahuel Wagner en el pie del menú (8f8be5c)
- **release:** 👷 el release nocturno despacha el deploy y corre fuera de la hora en punto (97e84d1)

## v2.1.0 - 2026-11-17

### Funcionalidades

- **chat:** ✨ métricas de mensajes y tablero de soporte en el panel (B4) (411eb2e)
- **chat:** ✨ adjuntos en el chat del panel (CH7) (e7f66b9)

### Correcciones

- **auth:** 🐛 mensajes claros cuando falla el ingreso (cff5787)
- **hosting:** 🐛 la pestaña abierta se actualiza sola con la versión nueva (e522b79)
- **hosting:** 🐛 cabeceras de seguridad en todas las rutas del panel (41fcd5e)

### Mantenimiento

- **kit:** 💄 componentes comunes del panel según la auditoría de diseño (d57e12a)
- 👷 más tiempo para el deploy (el gate en GitHub tarda ~20 min) (37f43f1)
- 👷 avisos de Telegram con versión, cambios, paso que falló y duración (57ea3ad)

## v2.0.0 - 2026-11-16

### Funcionalidades

- **mensajes:** ✨ notas internas con menciones, encuesta, fuentes del asistente y botones del cliente (88b3d3f)
- **chat:** ✨ insignias de la bandeja, asignar con fotos y edición rechazada sin perder el texto (23c56e1)
- **chat:** ✨ asistente que contesta solo, conversaciones esperando y topes de OrixTech en el panel (B3) (36367a8)
- **chat:** ✨ tarjeta Asistente con vista previa y sugerencias en la bandeja (B1) (7ad9bd0)
- **mapas:** ✨ Google Maps en todo el panel y hoja de ruta completa (32889ae)
- **assistant:** ✨ base de conocimiento del asistente y preguntas de ejemplo en el panel (CH-BOT B2) (14f6785)
- **chat:** ✨ la persona va en el encabezado de la conversación (99bdda1)
- **chat:** ✨ fotos de perfil en la bandeja y panel de contexto más claro (5e7d2f9)
- **chat:** ✨ bandeja de mensajes con clientes y choferes en el panel (CH4) (a0e268d)
- **platform:** ✨ módulos por distribuidora en el panel (P2) (296120b)
- **ui:** ✨ todo el panel de la distribuidora toma su tema (30690dc)
- **chat:** ✨ chat con la plataforma y tickets en los dos paneles (CH2) (0f1092e)
- **ui:** ✨ todo el panel toma el tema de la distribuidora y paletas preestablecidas (d3f6237)
- **ui:** ✨ apariencia propia de cada distribuidora en el panel (#1) (50a4677)
- **platform:** ✨ pantalla de sesiones de soporte (f884ecd)
- **route-sheets:** ✨ seguimiento y operación de la hoja de ruta automática (6362955)
- **platform:** ✨ panel de plataforma OrixTech (e40de9b)
- **stock:** ✨ ubicación del galpón en el mapa y acceso desde el aviso de la hoja de ruta (7beaad3)
- **soporte:** ✨ modo soporte en el panel y accesos de soporte para la empresa (b406a3c)
- **hojas-de-ruta:** ✨ pantalla de planificación y edición de las hojas de ruta con la API v2 (9583769)
- **configuracion:** ✨ vencimiento de pedidos sin chofer y radio de «Llegué» en Parámetros del despacho (bc1487d)
- **flota:** ✨ documentos del vehículo y foto de la patente escaneados en la ficha (f8d9cb9)
- **lectura-documentos:** ✨ pantalla del lector de documentos con propuestas, gasto del mes y lectura a pedido (01055ba)
- **recupero:** el aviso de «Correr ahora» informa los casos cerrados porque el envase ya es del cliente (F35 E5) (505ffd1)
- **pedidos:** muestra en el detalle las vacías recibidas de las esperadas por renglón (F35) (4686c79)
- **configuración:** tarjeta «Cobro de envases» con el interruptor por distribuidora y aviso de tipos sin precio de envase (F35) (5438fac)
- **pedidos:** cargo de envases en la cotización del pedido telefónico y en el detalle del pedido (F35 E3) (db8a72e)
- **clientes:** tarjeta «Envases» en la ficha con ajuste manual e historial (F35 E2) (793b0bc)
- **catalogo:** precio del envase por tipo de garrafa en el alta, la edición, la tabla y la ficha (F35 E1) (dfa1a47)
- **monitoreo:** corridas de los procesos automáticos, avisos y tablero (F31) (f90d647)
- **personal:** estado de la documentación en el listado de empleados (CU-180) (f4407f4)
- **despacho:** choferes por terminar su entrega como candidatos de la asignación automática (CU-013) (55948dd)
- **recorridos:** «Armar ahora» explica en un diálogo por qué no se armó el lote (e31786b)
- **panel:** saca comisiones del chofer, que cobra un sueldo mensual (51c158b)
- **panel:** tablero y reportes muestran los totales que calcula el back (e10642e)
- **panel:** el total de la carga de combustible lo cotiza el back (8b8e534)
- **panel:** cierre de caja, conciliación de MP y costos de flota tal como los calcula el back (eed6599)
- **panel:** saldo de la reserva, estadísticas del cliente y diferencia de la rendición tal como las calcula el back (bcc91d5)
- **panel:** estado del pago de Mercado Pago con su motivo e historial, retención por fraude liberable y avisos de reclamo, contracargo y fraude (6ea0887)
- **panel:** el precio de cada promoción es el que calcula el back; el formulario ya no hace la cuenta (232803c)
- **panel:** recargos por medio de pago configurables y el detalle del pedido con el recargo que calcula el back (75d55b3)
- **recorridos:** agrupación de pedidos por recorrido (M4) en el panel (21e8c3d)
- **envases:** recupero de envases no devueltos (M5) en el panel (a62e566)
- **clientes:** recompra anticipada (M3) en el panel (7f506b9)
- **configuracion:** cuenta de Mercado Pago propia de la distribuidora (79e1224)
- **flota:** M2 planificador de taller — casos, próximos vencimientos, parámetros y próxima ventana en la ficha del vehículo (bad3be0)
- **caja:** pantalla Ingresos y egresos con resultado de caja, gráfico por período y categorías (fe57f8f)
- **caja:** conciliación con Mercado Pago: corridas, diferencias por tipo, aplicar ajustes y bajar el reporte (67feca1)
- **caja:** cajas de cobro, cobros sin asentar y el cobro en caja de cada pedido (9de3ed6)
- **caja:** registrar el pago de tareas, neumáticos, siniestros, combustible y compras desde cualquier caja (5a566a6)
- **multas:** pagar y registrar el pago con comprobante escaneado al subirlo, desde la multa y la ficha del vehículo (56daa82)
- **personas:** foto de perfil en lugar de las iniciales en todo el panel (d69462a)
- **auditoria:** la auditoría de datos lee la API v2, con filtro de origen, sesiones y origen técnico (9bf7a81)
- **seguros:** pestaña Seguro en la ficha del vehículo, pago con comprobante escaneado al subirlo y página Aseguradoras (c9aba01)
- **avisos:** la campana muestra los vencimientos y lleva a la tarea o a la documentación del legajo (67dcc68)
- **avisos:** bandeja de notificaciones en el panel: campana con los avisos guardados y página Notificaciones (27a122a)
- **pedidos:** el panel no ofrece asignar chofer a un pedido de Mercado Pago sin pagar y explica por qué (cb4bfa4)
- **fotos:** foto de proveedores, envases y cargas en sus fichas del panel (6ce48c0)
- **notificaciones:** el panel reconecta tras la sesión vencida y avisa incidencias y reclamos nuevos (e945be7)
- **adjuntos:** Word, Excel y CSV en los adjuntos y comprobantes en rendición, caja y cuenta corriente (08f58f8)
- **clientes:** baja por distribuidora (lógica), pestaña de dados de baja y reactivación (API v2) (cd6178b)
- **transferencia:** datos bancarios de la distribuidora y comprobantes del cliente en el pedido, con aviso en vivo (API v2) (f5ed617)
- **importacion:** asistente de importación masiva de garrafas, precios, stock y proveedores (API v2) (4b1f0cb)
- **pdf:** abrir desde el panel los PDF del back (API v2): remito, recibo, rendición, liquidación, cierre de caja y ventas (3f6abe1)
- **exportes:** exportar CSV y Excel con todas las filas filtradas desde el back (API v2) en todos los listados (86e7598)
- **ui:** input de imágenes único con arrastrar y soltar, vista previa y acciones visibles en táctiles (623d72e)
- **notificaciones:** el panel avisa cuando el cliente modifica un pedido, se reintegra un pago o un express pasa a reparto común (7ccd927)
- **api:** el panel consume /api/v1 y tipos regenerados con el contrato de la tanda 2 de validaciones (1ede16c)
- **validaciones:** el panel valida lo mismo que el back (motivo de cancelación, patentes, franjas, zonas, catálogo, caja, stock y fechas) (d909e0e)
- **panel:** las altas largas pasan a página (legajo, combustible, siniestro, chofer y empresa), aviso de cambios sin guardar con el router de datos (49cd13b)
- **panel:** reserva con seña desde el alta de pedido, ficha de caja con historial de sesiones y aviso de reintegros fallidos (5ffc704)
- **panel:** kit al estilo Minimal — confirmación propia, tema centralizado, campos de formulario, barra de filtros, contenedor de página, encabezados de tarjeta, densidad y acciones secundarias (53b4a76)
- **despacho:** el tablero pide al back el orden por antigüedad y las entregas de hoy por fecha de entrega (7a66466)
- **panel:** ficha del cliente con KPIs y cuenta corriente, tablero de despacho, archivos de documentación y panel lateral de detalle (57d8e9a)
- **panel:** pestañas por estado con contador, cifras de la API, exportar CSV y filtros en la URL en los listados (2195f28)
- **panel:** caja de efectivo al pagar compras, multas y combustible (515049c)
- **panel:** editar y dar de baja administradores, ficha de incidencia, cotización en el alta telefónica, vigencia por serie y caja en los cobros del admin (a9e0d42)
- **finanzas:** caja, rendiciones, cuentas corrientes, comisiones y tablero financiero en el panel (C-20) (edd199e)
- **panel:** compra express, reintegros y modalidad de entrega en el alta telefónica (C-17) (9f03bf2)
- **flota:** combustible, multas, siniestros, neumáticos y costos en el panel (C-18) (9d402a0)
- **personal:** documentación, asistencia, licencias y tablero de personal en el panel (C-08) (d623043)
- **panel:** procesos automáticos, productos dados de baja, zonas vencidas y quién recibe el pedido (C-07, C-10) (d27f617)
- **clientes:** la ficha muestra el consumo declarado y la garrafa habitual (cf277b2)
- **envases:** vigencia de envases y bloqueo del despacho de un envase vencido (CU-132 a CU-135) (c6ca3da)
- **m1:** parámetros del despacho y tareas programadas en Configuración (1809ef5)
- **panel:** historial real de estados en la ficha del pedido y recargo por medio de pago (8a40d72)
- **panel:** cobros del administrador, transferencias, reintegros y bloqueo sin distribuidora (f964823)
- **panel:** motivo obligatorio en la entrega manual del pedido (f1a48a9)
- **panel:** stock y compras: galpones, saldos, ajustes, transferencias, conciliación, proveedores, órdenes, recepciones, cargas del camión y control de despacho (1682a2c)
- **panel:** estado de pago en pedidos, cobros impagos con resolución, reporte de cobros, aviso en vivo y quitar foto de reclamo (3d6d79d)
- **panel:** legajos con foto, documentación y egreso; adjuntos genéricos firmados y alta de incidencias y reclamos con archivo (1a80cd3)
- **panel:** el stock del producto se cambia con un ajuste; el formulario de edición ya no lo manda (dd96474)
- **panel:** fotos de S3 firmadas y renovables en usuarios, vehículos, productos, incidencias, reclamos y logo (b42aacb)
- **panel:** auditoría de datos, ficha de administradores y alta/edición/baja lógica en franjas, envases, pedidos, reclamos, incidencias y calificaciones (fc0c721)
- **ui:** fila de acciones Ver / Editar / Eliminar con íconos en las tablas (b76cda6)
- **panel:** descargas por URL firmada, foto del reclamo, filtros de la API y envases en las fichas (148fc48)
- **panel:** patrones de gestión en todas las pantallas (323c456)
- **panel:** rediseño con barra, tablero, ficha y remito, reportes, calendario y kanban (2ffcc77)
- **panel:** flota, fichas, rediseño de pantallas y cobertura de la API (3263275)
- **panel:** puesta a punto profesional, sistema visual Brasa y el panel al día con la API (b60026c)
- panel adaptado a la API del 26/09 y sin validación de clientes (97edf6e)
- **firebase:** apuntar el panel admin al proyecto splg-gas (7e5e772)

### Correcciones

- **seguimiento:** 🐛 la hora del mapa siempre en hora argentina de 24 h (c30e43d)
- **mensajes:** 🐛 tarjetas con margen y franjas de atención en una sola lista (59b0f51)
- **panel:** 🐛 quitar import sin uso en UserRefLink (425a02a)
- **panel:** 🐛 sin foto al lado de los nombres enlazados (d270e3e)
- **panel:** 🐛 textos sin planes ni módulos para la distribuidora (3a30dee)
- **ui:** 🐛 ids aleatorios que funcionan también fuera de HTTPS (7f91a31)
- **ui:** 🐛 spinner de carga de página centrado en el contenido (48094fc)
- **panel:** 🐛 la póliza abre con su aseguradora y el formulario de zonas queda a la vista en el celular (b96ddd5)
- **panel:** 🐛 las pantallas de la plataforma redirigen al inicio a un admin de empresa y el CI corre los tests en UTC en paralelo (94f4529)
- **panel:** 🐛 sin distribuidora elegida, el superadmin no pide pagos de pedidos, reintegros ni planes de flota (d91b65e)
- **panel:** la búsqueda de vehículos sin coincidencias dice «Sin resultados» y los gráficos no avisan tamaño en la primera pintada (350e46a)
- **errores:** el id inválido se reconoce por el code del back, no por el texto (a824d86)
- **mensajes:** errores y respuestas de la API en castellano, sin ids ni texto interno (bc120e8)
- **panel:** fechas de calendario sin corrimiento de un día (legajo, zonas, cupos, comisiones, rendiciones, liquidaciones) (8ec0d59)
- **panel:** la sesión se renueva con Firebase en vez de vencer a la hora; avisos claros al cerrarla (369dd2a)
- **flota:** el turno de la tarea se muestra y edita en día argentino y sólo se manda si cambió (92d839f)
- **panel:** la tabla de recupero de envases entra en pantalla (790813b)
- **pedidos:** el modal de asignar chofer lista a los habilitados y validados, no sólo a los en línea (17e9d7b)
- **panel:** revisión final — formularios que conservan cambios ante una recarga fallida, franja de reserva validada, tests sin depender de la hora, contrato al día y formularios en el kit (57c1135)
- **panel:** el mapa no tapa el encabezado, Pedidos en cinco columnas, estados críticos destacados y zona para soltar archivos (cdf4a97)
- **finanzas:** el resumen de Cajas y Rendiciones no deja tarjetas cargando y rotula bien las rendiciones (7dbba5e)
- **envases:** mover un envase a «con el cliente» pide el pedido (441b511)
- **panel:** reintentar devoluciones pendientes y express sin devolver (d97728e)
- **panel:** blindaje de la revisión integral (adjuntos, remito, legajos, puestos, listas y stock) (84f0e27)
- **panel:** historial del reclamo en castellano y un solo juego de migas en las fichas (ac2566e)
- **panel:** renovar el token de Firebase en vez de cerrar la sesión cuando vence (57fcae8)
- **orders:** el boton de cancelar pedido no funcionaba (08e134b)
- **auth:** pedir el usuario con token, no por la instancia publica (689741d)

### Mejoras internas

- **hoja-de-ruta:** ♻️ sin la pestaña «Vista del chofer» (61e7623)
- **menu:** ♻️ ordena el menú lateral por área de trabajo (79eaa43)
- **menu:** separar Clientes, Personal y Flota; todo lo de vehículos dentro de Flota (a90800b)
- **marca:** el panel deja de llevar el nombre de la distribuidora (fcd40d8)

### Documentacion

- la documentación del repo pasa a splg-docs; queda un README que apunta allí (0bfd6e7)

### Mantenimiento

- ✅ más margen de espera para los tests en el runner de GitHub (9722493)
- 👷 release nocturno automático de develop a main (ce69626)
- **mensajes:** ✅ esperar el texto rescatado antes de comprobar el cuadro (0bd2290)
- 👷 el deploy corre el gate completo antes de publicar (160376d)
- 👷 el deploy sólo acepta commits que ya están en main (5da2232)
- 👷 deploy del panel a Firebase Hosting con avisos a Telegram (a761f48)
- 👷 el workflow de deploy lee el webhook de Slack por env (secrets no va en un if) (c67ee98)
- **api:** regenera los tipos con los códigos documentados en la tanda T5 (2ccb34d)
- **api:** tipos regenerados del OpenAPI con el precio del envase y la lectura de documentos (f33f6e2)
- **api:** tipos con los intentos del código de entrega (fa11686)
- **personal:** el egreso muestra el rechazo por rendición pendiente; tipos al día (fc52392)
- vuelve la revisión automática de cada PR (5ca16e1)
- saca la configuración local del entorno y los revisores automáticos del repositorio (e0e5bcf)
- checks en cada PR a develop y revisores automáticos (Claude, Qodo y CodeRabbit) en castellano (9c5e667)
- **api:** tipos generados con el contrato final del back (seña de reserva y checkout) (b87448e)
- **panel:** tipos regenerados tras el blindaje de stock (overReserved, déficit de reservas, remainingBalance) (6be3606)
- AGENTS.md para el equipo de agentes y checks en cada PR (e2e3e3c)
- la version se calcula sola en cada merge a main (aa081e2)
- tag y Release automaticos al mergear a main (bfd188e)

