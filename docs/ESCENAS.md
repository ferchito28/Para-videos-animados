# Formato de `escenas.json`

Cada video vive en `proyectos/<nombre>/`:

```
proyectos/mi-video/
  voz.mp3        ← la voz en off (también .wav, .m4a, .ogg, .flac)
  guion.txt      ← el texto exacto del guion (opcional, mejora los subtítulos)
  escenas.json   ← el storyboard
```

Render:

```bash
node tools/render.mjs proyectos/mi-video --fotos     # una imagen por escena para revisar (segundos)
node tools/render.mjs proyectos/mi-video --preview   # video rápido a media resolución
node tools/render.mjs proyectos/mi-video             # video final 1080x1920 → output/mi-video/video.mp4
node tools/render.mjs proyectos/mi-video --desde 10 --hasta 20   # solo un tramo
```

La primera vez se transcribe la voz (`palabras.json`) para sincronizar subtítulos y escenas.

## Estructura general

```json
{
  "titulo": "Por qué los barcos llevaban gatos",
  "subtitulos": { "palabras": 3, "caracteres": 16 },
  "musica": { "archivo": "musica.mp3", "volumen": 0.12 },
  "escenas": [ { ... }, { ... } ]
}
```

## Escena

| Campo | Qué hace |
|---|---|
| `desde` | Frase de la voz donde empieza la escena (ej. `"No era el capitán"`). La primera escena empieza en 0. También vale `inicio` en segundos. |
| `set` | Escenario 3D (lista abajo). |
| `setOpts` | Opciones del set, ej. `{ "noche": true }`, `{ "tormenta": true, "hundir": true }`, `{ "color": "#2b4c7e" }`. |
| `camara` | Movimiento de cámara (abajo). |
| `personajes` | Lista de personajes y animales. |
| `props` | Lista de objetos 3D. |
| `rotulo` | Texto grande arriba: `"1975"` o `{ "texto": "1975", "subtitulo": "...", "desde": "frase", "duracion": 2 }`. |
| `transicion` | `"zoom"` (por defecto), `"flash"` o `"corte"`. |

## Sets

`estudio` (fondo liso, `color`), `carcel` (`noche`), `tunel`, `calle` (`noche`, `color`), `banco`, `barco` (`noche`, `tormenta`, `hundir`), `desierto` (`piramides`), `laboratorio`, `oficina`, `bosque` (`noche`), `ferrocarril`, `castillo`, `casa`, `templo`.

Zona de actuación: `x` de -3 a 3 (izquierda a derecha), `z` de -1 (fondo) a 2 (cerca de la cámara).

## Personajes

```json
{ "id": "preso", "tipo": "preso", "pos": [-1, 0], "accion": "caminar", "a": [2, 0], "mira": "derecha", "habla": true, "objeto": "pico" }
```

- **Tipos humanos:** hombre, mujer, nino, nina, anciano, preso, guardia, policia, marinero, capitan, pirata, cientifico, obrero, soldado, rey, reina, chef, vaquero, granjero, ejecutivo, doctor, romano, egipcio, vikingo, explorador.
- **Animales:** gato, perro, rata, loro, caballo, gallina (con `color`).
- **Personalizar:** `piel` (clara, media, morena, oscura o hex), `pelo` (corto, largo, coletas, peinado, rapado, calvo, loco, egipcio), `colorPelo`, `camisa` (color, `"rayas"`, `"bata"`, `"marinero"`), `pantalon`, `sombrero` (policia, capitan, marinero, pirata, casco, militar, corona, chef, vaquero, paja, safari, copa, gorra, laurel, vikingo), `barba` (sombra, bigote, completa, larga), `lentes`, `parche`, `corbata`, `capa`, `falda`, `escala`.
- **Objeto en la mano (`objeto`):** pala, pico, cuchara, antorcha, espada, papel, bolsa, martillo, lupa, llave, botella, linterna, telescopio, libro.
- **`habla: true`:** mueve la boca mientras suena la voz.
- **`cara`:** normal, feliz, sorpresa, asustado, enojado, triste, pensativo, dormido.

### Acciones

quieto, hablar, caminar, correr (con `a: [x, z]` destino), cavar, senalar, sorpresa, asustado, celebrar, saludar, pensar, empujar, cargar, dormir, triste, enojado.

Varias acciones en una misma escena, sincronizadas con la voz:

```json
"acciones": [
  { "accion": "cavar" },
  { "accion": "sorpresa", "desde": "un banco" },
  { "accion": "correr", "a": [3, 0], "en": 2.5 }
]
```

(`desde` = frase de la voz; `en` = segundos desde el inicio de la escena.)

## Cámara

```json
"camara": { "tipo": "acercar", "objetivo": "preso", "distancia": 6, "altura": 0.8, "sacudir": 1, "inclinar": 8 }
```

Tipos: `frente`, `acercar`, `alejar`, `paneo` (`de`, `a`), `orbita`, `arriba`, `abajo`, `detalle` (primer plano), `plano` (plano general), `seguir`.
`objetivo` = id de un personaje o `[x, y, z]`. `sacudir` = temblor, `inclinar` = grados de inclinación.

## Props

```json
{ "tipo": "cofre", "pos": [1.5, -0.5], "y": 0, "escala": 1, "rot": 0.3, "anim": "aparecer", "retraso": 1.2 }
```

caja, barril, jarron, monedas, lingotes, cofre, roca, mesa, silla, cartel (`texto`), letrero (`texto`), canon, bala, ancla, botella, lampara, reloj, globo, libros, saco (`texto`), arbol, tren, coche, barco_mini, fuego, hoyo, montana_rusa.

Animaciones (`anim`): flotar, girar, temblar, aparecer, caer.
