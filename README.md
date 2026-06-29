# 🏴‍☠️ Joc del Tresor - Catalunya

Una aplicació web interactiva per buscar tresors a Catalunya utilitzant coordenades parcials.

## 🎮 Com funciona

Introdueix els dígits de les coordenades que coneguis i el mapa mostrarà totes les zones possibles on podria estar el tresor. A mesura que descobreixes més dígits, l'àrea es va reduint!

## 🚀 Característiques

- **Coordenades parcials**: No cal tenir tots els dígits, funciona amb informació incompleta
- **Múltiples àrees**: Mostra tots els rectangles que compleixen les condicions
- **Validació per Catalunya**: Només permet valors vàlids dins del territori català
- **Mapa interactiu**: Basat en OpenStreetMap amb Leaflet
- **Interfície intuïtiva**: Inputs individuals per cada dígit amb navegació automàtica

## 📍 Format de coordenades

- **Latitud**: `4X.XXXXXX` (40-42)
- **Longitud**: `0-3X.XXXXXX` (0-3)

## 🛠️ Tecnologies

- HTML5
- JavaScript Vanilla
- OpenStreetMap + Leaflet
- GitHub Pages

## 📦 Instal·lació local

```bash
# Clonar el repositori
git clone https://github.com/[tu-usuario]/joc-del-tresor.git

# Obrir l'aplicació
cd joc-del-tresor/src
open index.html
```

## 🌐 Deploy a GitHub Pages

Aquesta aplicació es deploya automàticament a GitHub Pages quan es fa push a la branca `main` o `master`.

### Configuració necessària:

1. Ves a **Settings** > **Pages** del teu repositori
2. A **Source**, selecciona **GitHub Actions**
3. Fes push del codi i l'acció es desplegarà automàticament

La teva aplicació estarà disponible a: `https://[tu-usuario].github.io/joc-del-tresor/`

## 📝 Llicència

MIT
