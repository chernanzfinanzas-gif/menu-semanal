# Asistente de Alimentación

App de menús semanales, recetas bajas en sodio y lista de la compra.

**La app está publicada en: https://chernanzfinanzas-gif.github.io/menu-semanal/**

Ábrela en el móvil y usa «Añadir a pantalla de inicio» para tenerla como una app más.

## Configuración de la sincronización

En **Ajustes → Sincronizar con GitHub**:

| Campo | Valor |
|---|---|
| Usuario | `chernanzfinanzas-gif` |
| Repositorio | `menu-semanal-datos` |
| Rama | `main` |
| Clave | token con permiso *Contents: Read and write* sobre ese repositorio |

Los datos personales (menús, despensa, recetas propias) viven en el repositorio **privado**
`menu-semanal-datos`, en el fichero `datos/estado.json`. Este repositorio, el público,
solo contiene el código y el recetario de partida.

## Qué hace

- **Menú**: planifica las cinco tomas de cada día (desayuno, almuerzo, comida, merienda y cena).
  Cada día muestra la sal total con semáforo: verde hasta 1,5 g, ámbar hasta 2 g, rojo por encima.
  Con un clic aplicas la Semana A o la Semana B completas. En el móvil se ve un día cada vez,
  con una barra de días arriba y un punto de color por día.
- **Recetas**: 44 recetas de partida con ingredientes, pasos y sal por ración. Se buscan
  por ingrediente, por toma o por herramienta (Lékué, airfryer, microondas…), se editan y se añaden las tuyas.
- **Compra**: genera la lista de la semana a partir del menú, agrupada por sección del supermercado
  y calculada para el número de personas configurado. Con «Ocultar comprados» para llevarla por el súper.
- **Despensa**: marca lo que tienes; se descuenta automáticamente de la compra.
- **Compra en Amazon**: el botón «Preparar compra» genera el texto de la lista. Se lo pasas a Claude
  en el chat y Claude abre Amazon en el navegador y va añadiendo los productos al carrito.

## Publicar cambios: el buzón

Igual que en los demás proyectos. Los ficheros nuevos se dejan en `_publicar/` y se sube todo
de una vez desde **«Menú Semanal - Publicar.bat»**, que abre un menú con todas las opciones.

```
_publicar/
├── (la raíz es la zona de descarga: el script clasifica por el nombre)
├── raiz/        → raíz del repositorio (index.html, sw.js, manifest, README)
├── css/  js/  datos/  iconos/  docs/
├── enviado/AAAA-MM-DD/        ← lo ya publicado se mueve aquí
└── reemplazados/AAAA-MM-DD/   ← respaldo de lo que «Traer del repo» sustituye
```

Opciones del menú:

| Opción | Qué hace |
|---|---|
| **1 · Publicar al repo** | Comprueba, enseña los destinos, espera un ENTER y sube todo en un commit |
| **2 · Prueba en seco** | Lo mismo, pero sin subir ni mover nada |
| **3 · Qué me falta por publicar** | Compara tu carpeta con lo publicado y trae al buzón lo distinto |
| **4 · Traer del repo** | Cuando el repositorio va por delante de tu carpeta |
| **5 · Abrir el buzón** | Abre `_publicar/` en el explorador |
| **6 · Abrir la app** | Abre la web publicada en el navegador |

**Antes de subir comprueba**, y si algo falla no sube nada:

- que ningún fichero lleve dentro una clave de GitHub;
- que los `.js` tengan sintaxis válida y los `.json` sean JSON correcto;
- que ninguna receta use un ingrediente que no existe;
- que ninguna plantilla llame a una receta borrada;
- que el `index.html` no cargue ficheros que no vayan a estar en el repositorio.

Y avisa, sin bloquear, de ingredientes que ya no usa ninguna receta, recetas sin pasos
o ficheros muy pesados. Valida el resultado final: mezcla lo del buzón con lo ya publicado.

La clave del buzón va en `C:\Users\carlo\publicar-token-menu.txt`: fine-grained, solo el
repositorio `menu-semanal`, permiso *Contents: Read and write*. No es la misma que usa la app.

## Ficheros

| Fichero | Qué es |
|---|---|
| `index.html` | la app |
| `css/estilos.css` | aspecto, con la adaptación al móvil |
| `js/almacen.js` | datos, cálculo de sal y lista de la compra |
| `js/github.js` | sincronización con el repositorio de datos |
| `js/app.js` | pantallas |
| `js/util.js` | fechas, formatos y utilidades |
| `datos/ingredientes.js` | catálogo con la sal de cada alimento |
| `datos/recetas.js` | recetario |
| `datos/actividades.js` | actividades y su MET |
| `iconos/khb/*.webp` | los nueve logos KHB |
| `media/*` | el vídeo de entrada y sus carteles |
| `datos/plantillas.js` | Semana A y Semana B |
| `docs/pauta-baja-en-sal.md` | la pauta nutricional de referencia |
| `publicar.py` | el buzón (solo en local, no se publica) |
| `Menú Semanal - Publicar.bat` | el menú de publicación (solo en local) |

## Copias de seguridad

En Ajustes puedes descargar una copia completa en un fichero y restaurarla en cualquier momento.
«Recargar recetario original» repone las recetas e ingredientes de fábrica sin tocar tus menús.

## Créditos

- **Logos KHB** e **imágenes del vídeo de entrada**: diseños propios.
- **Música del vídeo de entrada**: «Next Level_Medium 1», de Grand_Project (Roman Dudchyk),
  descargada de [Pixabay](https://pixabay.com/music/) bajo la Pixabay Content License —
  uso libre, también comercial, sin atribución obligatoria. Se cita porque es de justicia.
  El fragmento usado está recortado y con fundido; el resto del tema no se distribuye aquí.

El vídeo de entrada arranca **siempre sin sonido**. Solo suena si pulsas el botón del altavoz,
y solo durante esa apertura.
