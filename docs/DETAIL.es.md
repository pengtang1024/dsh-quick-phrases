# Frases rápidas

## Qué hace

Añade una fila de botones de frase (`继续`, `提交`, `推送`, `发版` …) junto al cuadro de entrada. Al hacer clic en un botón se envía directamente el **texto** de esa frase; el botón muestra solo su **etiqueta**. Ambas cosas se editan por separado, de modo que el botón puede ser corto mientras el mensaje enviado es una frase completa.

**El comportamiento al hacer clic se puede cambiar** (por defecto: enviar directamente):

- **Enviar directamente (predeterminado)**: con el cuadro de entrada vacío y sin archivos adjuntos, un solo clic envía la frase.
- **Rellenar el cuadro de entrada**: solo escribe el texto en el borrador; enviarlo o no queda en tus manos.

En ambos modos, si el cuadro de entrada **ya contiene texto que estabas escribiendo o archivos adjuntos**, el clic no los sobrescribe: la frase se inserta en la posición del cursor.

## Dónde se coloca

La posición de la fila de frases se puede cambiar en cualquier momento desde la página de ajustes; el cambio se aplica de inmediato:

| Posición | Ranura | Notas |
| --- | --- | --- |
| Debajo del cuadro de entrada (predeterminado) | `conversation.composer.dock` | Una fila completa bajo la tarjeta de entrada; es la más holgada, ideal para muchas frases. |
| Encima del cuadro de entrada | `conversation.input.dock` | Una fila completa sobre la tarjeta de entrada. Su ancho y centrado siguen la geometría de la tarjeta dock del anfitrión (`--dsh-composer-card-max-width` / `--dsh-composer-side-clearance` / `--dsh-composer-dock-inset`), de modo que se alinea con los bordes interiores de la tarjeta; además se coloca por encima de la barra de cola y del panel de tareas, para no separarlos de la tarjeta. |
| A la derecha de la fila de herramientas | `conversation.input.right` | Dentro de la fila de herramientas del cuadro de entrada (`+`, permisos, selector de modelo), para tener los botones cerca del cursor; el espacio es limitado, así que la fila se desplaza horizontalmente. |

Las tres filas se registran, pero solo se renderiza la seleccionada; cambiar de posición es un simple redibujado, no una recarga de la página.

## Plegar y ocultar

La fila de frases no debe estorbar al escribir, así que se puede plegar temporalmente y su forma habitual es un ajuste:

- **Plegar manualmente**: haz clic en `收起 ▾` al final de la fila y toda la fila se reduce a una pequeña píldora `▸ 快捷短语`; haz clic en la píldora para desplegarla temporalmente y de nuevo en «收起» para plegarla.
- **Plegar automáticamente** (predeterminado): con «Cuando el cuadro de entrada tiene contenido» ajustado a «Plegar automáticamente», la fila se reduce a la píldora en cuanto hay texto o archivos adjuntos, y se despliega de nuevo al vaciar el borrador. Elige «Mantener visible» para que la fila completa permanezca.

Desplegar la píldora y hacer clic en una frase se comporta igual que con la fila abierta: si el cuadro de entrada ya tiene contenido, el texto se inserta en el cursor y no sobrescribe el borrador.

El desplegable **Mostrar fila de frases** de los ajustes unifica la forma habitual en tres opciones:

- **Mostrar la fila completa**: la fila permanece visible y el botón «收起» del final sigue plegándola temporalmente;
- **Plegar en una píldora**: solo queda una pequeña píldora junto al cuadro de entrada; haz clic en ella para desplegar;
- **Ocultar por completo**: la fila desaparece por completo de la interfaz, **sin dejar siquiera la píldora**; no se muestra nada. Para recuperarla hay que volver a **Ajustes → Frases rápidas** y cambiar el desplegable a una de las dos primeras opciones (al elegir «Ocultar por completo» se indica «整排已隐藏» junto al desplegable). Al volver a «Mostrar la fila completa» se borra además el estado plegado y la fila completa reaparece directamente.

El botón `收起 ▾` del final equivale a elegir «Plegar en una píldora». Este desplegable no guarda un estado propio: su valor se deriva de `dsh.quick-phrases.hidden.v1` (que tiene prioridad) y `dsh.quick-phrases.collapsed.v1`, y al cambiarlo se escriben ambas claves existentes.

### Descarte automático en pantallas estrechas

Al estrecharse la ventana, la fila descarta sus controles **uno por uno según el ancho real disponible**, sin ajustes y sin un punto fijo en píxeles (el cálculo usa el ancho medido, así que funciona igual con nombres cortos y largos):

1. primero el botón **收起** (el menos importante);
2. después el acceso **Gestionar**;
3. y luego las frases **de la última hacia atrás**, conservando las primeras.

En una extensión extrema **solo queda la primera frase útil**, la fila nunca se vacía y, si no hay frases, los accesos de plegar y gestionar siguen disponibles. Al ensanchar la ventana, los controles vuelven según las mismas reglas.

Aunque el botón de plegar desaparezca en pantallas estrechas, la fila aún se puede plegar: un borrador la reduce a la píldora con «Plegar automáticamente», o puedes elegir «Plegar en una píldora» en el desplegable «Mostrar fila de frases». Si el acceso de gestión desaparece, **Ajustes → Frases rápidas** sigue abriendo el administrador. Los tres estados, el plegado automático y la ocultación de frases no cambian.

Una frase concreta se puede ocultar con el interruptor del **ojo** en su tarjeta del administrador: al ocultarla, su botón deja de aparecer en la fila, pero la tarjeta sigue en el administrador marcada como «已隐藏»; vuelve a hacer clic para mostrarla de nuevo.

## Gestionar frases

Abre **Ajustes → Frases rápidas**. La página tiene dos partes: arriba, cinco ajustes de comportamiento; abajo, la lista de frases.

> **Mejora de diseño en pantallas estrechas**: en pantallas estrechas (≤560px) el administrador solo ajusta el diseño: la etiqueta va junto al desplegable, las explicaciones se conservan completas, los objetivos táctiles crecen, los botones de sección comparten fila, los márgenes se reducen y el texto largo se ajusta en cualquier punto; **no se elimina ningún elemento ni cambia la función** (mecanismo distinto del descarte por anchura de la fila, descrito más arriba).

**Ajustes de comportamiento** (se aplican al seleccionarlos, sin reiniciar). Valores, valor predeterminado y efecto de los cinco:

| Opción | Valores | Valor predeterminado | Efecto |
| --- | --- | --- | --- |
| Posición de visualización | Debajo del cuadro de entrada / Encima del cuadro de entrada / A la derecha de la fila de herramientas | Debajo del cuadro de entrada | Determina en qué ranura aparece la fila; al cambiarla se mueve de inmediato. Los detalles de cada posición están en «Dónde se coloca», más arriba. |
| Al hacer clic en una frase | Enviar directamente / Rellenar el cuadro de entrada | Enviar directamente | «Enviar directamente» envía la frase con un clic cuando el cuadro está vacío y no hay adjuntos; «Rellenar el cuadro de entrada» solo escribe el texto en el borrador. En ambos modos, si ya hay texto o adjuntos, se inserta en el cursor sin sobrescribir el borrador. |
| Mostrar fila de frases | Mostrar la fila completa / Plegar en una píldora / Ocultar por completo | Mostrar la fila completa | Controla la forma habitual de la fila: «Plegar en una píldora» deja una pequeña píldora desplegable; «Ocultar por completo» no renderiza nada, ni siquiera la píldora, y solo se puede recuperar desde esta página. Elegir «Mostrar la fila completa» borra también el estado plegado. Ver «Plegar y ocultar», más arriba. |
| Entrada de gestión | Botón de texto / Icono de engranaje / Ocultar entrada | Botón de texto | Aspecto del botón «Gestionar» al final de la fila. El icono de engranaje conserva el nombre accesible «Gestionar» y el mismo comportamiento al hacer clic; «Ocultar entrada» deja de mostrar el botón, pero la fila sigue funcionando y se puede entrar en esta página desde aquí. |
| Cuando el cuadro de entrada tiene contenido | Plegar automáticamente / Mantener visible | Plegar automáticamente | Si la fila se reduce a la píldora cuando aparece un borrador o archivos adjuntos. «Plegar automáticamente» la despliega al vaciar el borrador; «Mantener visible» mantiene la fila completa. |

**Lista de frases** (una tarjeta por frase):

- **Arrastrar para reordenar**: sujeta el tirador de la izquierda y arrastra hacia arriba o abajo; al soltar, la tarjeta queda en su nueva posición. También puedes moverla de a un paso con **↑ / ↓** a la derecha de la tarjeta. El orden de la lista es el orden de izquierda a derecha de los botones en la fila.
- **Etiqueta**: la primera línea de la tarjeta es el texto del botón; haz clic para editarla directamente (p. ej. `提交`).
- **Texto a enviar**: el cuadro grande de abajo, compatible con varias líneas.
- **Vista previa del botón**: al pie de cada tarjeta se muestra en tiempo real cómo queda el botón y cuántos caracteres envía, para comprobar si la etiqueta es demasiado ancha.
- **Ojo**: oculta o restaura esa frase. Al ocultarla, el botón desaparece de la fila y la tarjeta permanece en el administrador con una insignia «已隐藏».
- **✕**: el primer clic solo cambia el botón a «Confirmar»; hay que hacer clic de nuevo en menos de cuatro segundos para borrar de verdad y evitar borrados accidentales.
- **Añadir frase**: agrega una tarjeta vacía y coloca el cursor en la etiqueta; **Restaurar valores predeterminados** entra en estado de confirmación con un clic y restaura las cuatro frases integradas con el segundo.

Los cambios se guardan y aplican al instante, sin reiniciar. Las frases se guardan en el almacenamiento local del navegador (clave `localStorage` `dsh.quick-phrases.v1`; la posición en `dsh.quick-phrases.placement.v1`, el comportamiento al hacer clic en `dsh.quick-phrases.click.v1`, el estado plegado en `dsh.quick-phrases.collapsed.v1`, la opción de plegado automático en `dsh.quick-phrases.autohide.v1`, el estado de ocultación total en `dsh.quick-phrases.hidden.v1` y el estilo de la entrada de gestión en `dsh.quick-phrases.manage.v1`), con el aislamiento de almacenamiento web de DSH: al cambiar de equipo o borrar los datos del sitio se pierden. El desplegable «Mostrar fila de frases» no ocupa una clave nueva: lee y escribe `hidden.v1` y `collapsed.v1`.

## Abrirlo desde el cuadro de entrada

El botón **Gestionar** al final de la fila lleva a la misma página de ajustes (si la fila está plegada en una píldora, despliégrala primero). La entrada de gestión se puede cambiar a un icono de engranaje u ocultar en los ajustes; una vez oculta, la fila ya no muestra el botón y **Ajustes → Frases rápidas** es la forma de entrar. Si la interfaz actual aún no ha montado la entrada de ajustes, se muestra «请在『设置 — 快捷短语』中管理».

## Estilo

Botones, campos y tarjetas usan los tokens semánticos del anfitrión (`--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-*`) y siguen los temas claro y oscuro de DSH. El color de primer plano del botón principal toma `--dsw-alias-label-primary-foreground`, igual que la variante primary del botón del anfitrión, para garantizar el contraste en ambos temas.

## Límites

- Las frases son texto plano: no se interpretan variables ni se ejecutan comandos.
- Solo aparecen junto al cuadro de entrada de la sesión; no afectan a las tareas en segundo plano ni a las tareas programadas.
- El idioma sigue el idioma de la interfaz de DSH (chino / inglés); las cuatro frases predeterminadas también se generan localizadas según el idioma.

## Más información

- Detalles de implementación (ranuras, capa de datos, estilos y pruebas): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Contribuir: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Informes de seguridad: [SECURITY.md](../SECURITY.md)
