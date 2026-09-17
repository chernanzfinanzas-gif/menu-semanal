# Asistente de Alimentación

App de menús semanales, recetas bajas en sodio y lista de la compra.
Funciona en el ordenador y en el móvil, sin instalar nada.

## Qué hace

- **Menú**: planifica las cinco tomas de cada día (desayuno, almuerzo, comida, merienda y cena).
  Cada día muestra la sal total del día con semáforo: verde hasta 1,5 g, ámbar hasta 2 g, rojo por encima.
  Con un clic aplicas la Semana A o la Semana B completas.
- **Recetas**: 44 recetas de partida con ingredientes, pasos y sal por ración. Puedes buscarlas
  por ingrediente, por tipo de comida o por herramienta (Lékué, airfryer, microondas…), editarlas y añadir las tuyas.
- **Compra**: genera la lista de la semana a partir del menú, agrupada por sección del supermercado
  y calculada para el número de personas configurado. Lo que ya tienes en casa no aparece.
- **Despensa**: marca lo que tienes; se descuenta automáticamente de la compra.
- **Compra en Amazon**: el botón «Preparar compra» genera el texto de la lista. Se lo pasas a Claude
  en el chat y Claude abre Amazon en tu navegador y va añadiendo los productos al carrito.

## Cómo publicarla (una sola vez)

1. Crea un repositorio nuevo en GitHub (por ejemplo `menu-semanal`). Puede ser privado.
2. Sube todos estos ficheros a la raíz del repositorio.
3. En el repositorio: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.
4. En un par de minutos la app estará en `https://TUUSUARIO.github.io/menu-semanal/`.
5. Ábrela en el móvil y usa «Añadir a pantalla de inicio»: queda como una app más.

## Cómo sincronizar el móvil y el ordenador

En **Ajustes → Sincronizar con GitHub** rellena usuario, repositorio, rama y una clave personal
(*fine-grained token* con permiso de **Contents: Read and write** sobre ese repositorio).

A partir de ahí, cada cambio se guarda solo en `datos/estado.json` del repositorio y el otro
dispositivo lo recoge al abrir la app. La clave se queda guardada en cada dispositivo y **nunca**
se sube al repositorio.

## Ficheros

| Fichero | Qué es |
|---|---|
| `index.html` | la app |
| `css/estilos.css` | aspecto |
| `js/almacen.js` | datos, cálculo de sal y lista de la compra |
| `js/github.js` | sincronización con el repositorio |
| `js/app.js` | pantallas |
| `datos/ingredientes.js` | catálogo con la sal de cada alimento |
| `datos/recetas.js` | recetario |
| `datos/plantillas.js` | Semana A y Semana B |
| `datos/estado.json` | lo tuyo: menús, despensa y recetas propias (lo crea la app) |
| `docs/pauta-baja-en-sal.md` | la pauta nutricional de referencia |

## Copias de seguridad

En Ajustes puedes descargar una copia completa en un fichero y restaurarla en cualquier momento.
«Recargar recetario original» repone las recetas e ingredientes de fábrica sin tocar tus menús.
