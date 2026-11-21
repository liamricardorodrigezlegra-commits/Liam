# Ecos de Aethel

RPG isométrico de mundo abierto en pixel art, pensado para Android. Todo el arte (terreno, árboles, personajes, cielo, HUD y fuente) se genera por código al arrancar, así que el juego no depende de imágenes externas.

## Qué incluye

- **Mundo abierto**: una isla flotante de 160×160 casillas con cinco regiones: Prados de Lumen, Bosque Umbrío, Picos Albos, Arboleda Prisma y Ruinas de Aethel. Tiene acantilados por niveles, lagos, cascadas que caen al vacío y un mar de nubes debajo.
- **Ciclo de día y noche** con alba rosada, noche con luciérnagas y luces dinámicas.
- **HUD estilo ARPG clásico**: orbes de vida y maná, barra de experiencia, cinturón de pociones, minimapa isométrico con brújula hacia el objetivo y botones de habilidad con tiempo de recarga.
- **Combate**: ataque con espada, Orbe Ígneo (proyectil explosivo), Vendaval (golpe en área), Destello (esquiva rápida) y pociones. Hay cuatro tipos de enemigo con variantes según la región.
- **Misión**: despierta los tres obeliscos y derrota al Guardián del Velo en las ruinas centrales. Además hay cofres, gemas de poder, santuarios de curación y guardado automático.

## Controles

| Acción | Móvil | Teclado |
|---|---|---|
| Moverse | Desliza en la mitad izquierda | WASD / flechas |
| Atacar | Botón de espada | Espacio / J |
| Orbe Ígneo · Vendaval · Destello | Botones de habilidad | 1 · 2 · 3 (Shift = Destello) |
| Poción | Frasco del panel | Q |

## Jugar en el navegador

```bash
npm run serve   # abre http://localhost:8080
```

Se puede instalar como app desde Chrome para Android (menú → *Instalar app*) y funciona sin conexión.

## Generar el APK de Android

**Automático:** cada push ejecuta el workflow `Compilar APK de Android`. El APK queda en la pestaña *Actions* de GitHub, dentro del artefacto `ecos-de-aethel-apk`.

**Manual** (necesita Android Studio):

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android   # luego Build → Build APK
```
