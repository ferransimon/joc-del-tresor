// Límites de Catalunya (aproximados)
const CATALUNYA_BOUNDS = {
    north: 42.9,
    south: 40.5,
    east: 3.4,
    west: 0.15
};

// Inicializar el mapa centrado en Catalunya
// maxZoom molt per sobre del natiu d'OSM (19): permet centrar-se amb precisió extrema.
// A partir de zoom ~25-26 alguns navegadors poden mostrar artefactes de precisió numèrica
// (formes que es desdibuixen o parpellegen) — assumit conscientment per l'usuari.
const map = L.map('map', { maxZoom: 30 }).setView([41.7, 1.8], 8);

// Añadir capa de OpenStreetMap
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 30,       // zoom màxim permès al mapa
    maxNativeZoom: 19  // a partir d'aquí, Leaflet amplia les tessel·les de zoom 19 en comptes de deixar-ho en blanc
}).addTo(map);

// Capa de satèl·lit (Esri World Imagery, gratuïta i sense clau d'API)
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 30,
    maxNativeZoom: 19
});

// Capa de carreteres (OpenStreetMap amb estil optimitzat per carreteres)
// Utilitzem Carto Light només amb carreteres, que destaca la xarxa viària
const roadsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 30,
    maxNativeZoom: 19
});

// Capa topogràfica amb boscos destacats (OpenTopoMap)
// Mostra clarament zones forestals en verd, així com relleu i característiques naturals
const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
    maxZoom: 30,
    maxNativeZoom: 17
});

// Renderer de canvas compartit: a diferència de l'SVG per defecte, no té problemes de
// precisió numèrica quan es fa zoom molt profund (imprescindible amb maxZoom: 30).
const sharedCanvasRenderer = L.canvas({ padding: 0.5 });

// Pane dedicat per a l'englobant, amb z-index superior a overlayPane (400) i markerPane (600):
// així el contorn blau sempre queda per sobre de tot (quadradets taronja inclosos),
// independentment de l'ordre en què es creïn els elements al DOM.
map.createPane('envelopePane');
map.getPane('envelopePane').style.zIndex = 650;
map.getPane('envelopePane').style.pointerEvents = 'none'; // no bloquejar clics als quadradets de sota
const envelopeRenderer = L.canvas({ pane: 'envelopePane', padding: 0.5 });

// Añadir polígono de límites de Catalunya (visual)
const catalunyaBorder = L.rectangle([
    [CATALUNYA_BOUNDS.south, CATALUNYA_BOUNDS.west],
    [CATALUNYA_BOUNDS.north, CATALUNYA_BOUNDS.east]
], {
    color: '#e74c3c',
    weight: 2,
    fillOpacity: 0.05,
    dashArray: '5, 10'
}).addTo(map);

// Grupo de capas para las áreas posibles
let areasLayer = L.layerGroup().addTo(map);

// Guarda quants dígits decimals s'han pogut aprofitar en l'últim càlcul (per mostrar-ho a l'estat)
let precisionInfo = null;

// Referencias a los elementos del DOM
const digitInputs = document.querySelectorAll('.digit-input');
const clearBtn = document.getElementById('clear-btn');
const fineToggle = document.getElementById('fine-toggle');
const satelliteToggle = document.getElementById('satellite-toggle');
const roadsToggle = document.getElementById('roads-toggle');
const topoToggle = document.getElementById('topo-toggle');

// Capa de "coordenada fina" (els quadradets vermells de precisió): desactivada per defecte.
let fineLayerEnabled = false;
if (fineToggle) {
    fineToggle.checked = false;
    fineToggle.addEventListener('change', () => {
        fineLayerEnabled = fineToggle.checked;
        updateMap();
    });
}

// Vista satèl·lit: desactivada per defecte (es veu el mapa OSM normal).
if (satelliteToggle) {
    satelliteToggle.checked = false;
    satelliteToggle.addEventListener('change', () => {
        if (satelliteToggle.checked) {
            // Desactivar altres vistes si estan actives
            if (roadsToggle && roadsToggle.checked) {
                roadsToggle.checked = false;
                map.removeLayer(roadsLayer);
            }
            if (topoToggle && topoToggle.checked) {
                topoToggle.checked = false;
                map.removeLayer(topoLayer);
            }
            map.removeLayer(osmLayer);
            map.addLayer(satelliteLayer);
            satelliteLayer.bringToBack();
        } else {
            map.removeLayer(satelliteLayer);
            map.addLayer(osmLayer);
            osmLayer.bringToBack();
        }
    });
}

// Vista carreteres: desactivada per defecte
if (roadsToggle) {
    roadsToggle.checked = false;
    roadsToggle.addEventListener('change', () => {
        if (roadsToggle.checked) {
            // Desactivar altres vistes si estan actives
            if (satelliteToggle && satelliteToggle.checked) {
                satelliteToggle.checked = false;
                map.removeLayer(satelliteLayer);
            }
            if (topoToggle && topoToggle.checked) {
                topoToggle.checked = false;
                map.removeLayer(topoLayer);
            }
            map.removeLayer(osmLayer);
            map.addLayer(roadsLayer);
            roadsLayer.bringToBack();
        } else {
            map.removeLayer(roadsLayer);
            map.addLayer(osmLayer);
            osmLayer.bringToBack();
        }
    });
}

// Vista topogràfica amb boscos: desactivada per defecte
if (topoToggle) {
    topoToggle.checked = false;
    topoToggle.addEventListener('change', () => {
        if (topoToggle.checked) {
            // Desactivar altres vistes si estan actives
            if (satelliteToggle && satelliteToggle.checked) {
                satelliteToggle.checked = false;
                map.removeLayer(satelliteLayer);
            }
            if (roadsToggle && roadsToggle.checked) {
                roadsToggle.checked = false;
                map.removeLayer(roadsLayer);
            }
            map.removeLayer(osmLayer);
            map.addLayer(topoLayer);
            topoLayer.bringToBack();
        } else {
            map.removeLayer(topoLayer);
            map.addLayer(osmLayer);
            osmLayer.bringToBack();
        }
    });
}
const latStatus = document.getElementById('lat-status');
const lngStatus = document.getElementById('lng-status');
const areasCount = document.getElementById('areas-count');
const precisionStatus = document.getElementById('precision-status');

// Estado actual - arrays de 8 dígitos [XX.XXXXXX]
const latDigits = new Array(8).fill('');
const lngDigits = new Array(8).fill('');

// Valores permitidos según la posición para Catalunya
const ALLOWED_VALUES = {
    lat: {
        0: ['4'],           // 40-42
        1: ['0', '1', '2'], // Depende del primer dígito, pero permitimos todos
    },
    lng: {
        0: ['0', '1', '2', '3'], // 0-3
        1: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], // Cualquier segundo dígito
    }
};

// Event listeners para cada input
digitInputs.forEach(input => {
    input.addEventListener('input', handleDigitInput);
    input.addEventListener('keydown', handleKeyDown);
    input.addEventListener('paste', handlePaste);
});

clearBtn.addEventListener('click', clearAll);

function handleDigitInput(e) {
    const input = e.target;
    const coord = input.dataset.coord;
    const index = parseInt(input.dataset.index);
    let value = input.value;

    // Solo permitir dígitos
    value = value.replace(/[^0-9]/g, '');

    if (value.length > 1) {
        value = value[value.length - 1];
    }

    // Validar que el valor sea permitido en esta posición
    if (value && !isValueAllowed(coord, index, value)) {
        input.value = '';
        return;
    }

    input.value = value;

    // Actualizar el array correspondiente
    if (coord === 'lat') {
        latDigits[index] = value;
    } else {
        lngDigits[index] = value;
    }

    // Añadir clase visual si está lleno
    if (value) {
        input.classList.add('filled');
        // Auto-focus al siguiente input
        focusNextInput(coord, index);
    } else {
        input.classList.remove('filled');
    }

    updateMap();
}

function isValueAllowed(coord, index, value) {
    // Solo validar los primeros dos dígitos
    if (index === 0 || index === 1) {
        const allowedForPosition = ALLOWED_VALUES[coord][index];
        if (allowedForPosition && !allowedForPosition.includes(value)) {
            return false;
        }

        // Validación especial para latitud
        if (coord === 'lat') {
            if (index === 0 && value !== '4') return false;
            if (index === 1) {
                const firstDigit = latDigits[0];
                // 40-42 son válidos
                if (firstDigit === '4' && parseInt(value) > 2) return false;
            }
        }

        // Validación especial para longitud
        if (coord === 'lng') {
            if (index === 0 && parseInt(value) > 3) return false;
        }
    }

    return true;
}

function handleKeyDown(e) {
    const input = e.target;
    const coord = input.dataset.coord;
    const index = parseInt(input.dataset.index);

    // Backspace: borrar y volver al anterior
    if (e.key === 'Backspace' && !input.value) {
        e.preventDefault();
        focusPrevInput(coord, index);
    }
    // Flecha izquierda: ir al anterior
    else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusPrevInput(coord, index);
    }
    // Flecha derecha: ir al siguiente
    else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusNextInput(coord, index);
    }
}

function handlePaste(e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9.]/g, '');
    const input = e.target;
    const coord = input.dataset.coord;
    const startIndex = parseInt(input.dataset.index);

    // Extraer solo los dígitos
    const digits = pastedData.replace(/\./g, '').split('');

    // Llenar desde la posición actual
    const inputs = document.querySelectorAll(`.digit-input[data-coord="${coord}"]`);
    let currentIndex = startIndex;

    digits.forEach(digit => {
        if (currentIndex < 8 && /[0-9]/.test(digit)) {
            const targetInput = inputs[currentIndex];
            targetInput.value = digit;
            targetInput.classList.add('filled');

            if (coord === 'lat') {
                latDigits[currentIndex] = digit;
            } else {
                lngDigits[currentIndex] = digit;
            }

            currentIndex++;
        }
    });

    updateMap();

    // Focus al siguiente input vacío o al último
    if (currentIndex < 8) {
        inputs[currentIndex].focus();
    }
}

function focusNextInput(coord, currentIndex) {
    if (currentIndex < 7) {
        const nextInput = document.querySelector(`.digit-input[data-coord="${coord}"][data-index="${currentIndex + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    }
}

function focusPrevInput(coord, currentIndex) {
    if (currentIndex > 0) {
        const prevInput = document.querySelector(`.digit-input[data-coord="${coord}"][data-index="${currentIndex - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.select();
            // Borrar el valor del input anterior
            prevInput.value = '';
            prevInput.classList.remove('filled');
            if (coord === 'lat') {
                latDigits[currentIndex - 1] = '';
            } else {
                lngDigits[currentIndex - 1] = '';
            }
            updateMap();
        }
    }
}

function clearAll() {
    latDigits.fill('');
    lngDigits.fill('');

    digitInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });

    areasLayer.clearLayers();
    if (map.hasLayer(precisionGrid)) {
        map.removeLayer(precisionGrid);
    }
    precisionInfo = null;
    updateStatus();
    updatePrecisionStatus();
    map.setView([41.7, 1.8], 8);

    // Focus al primer input de latitud
    document.querySelector('.digit-input[data-coord="lat"][data-index="0"]').focus();
}

function getCoordString(digits) {
    // Construir string: XX.XXXXXX (permite valores incompletos)
    let str = '';
    let hasContent = false;

    for (let i = 0; i < digits.length; i++) {
        if (digits[i]) {
            str += digits[i];
            hasContent = true;
        } else {
            break; // Parar cuando encontramos un vacío
        }
        // Añadir punto después del segundo dígito
        if (i === 1 && hasContent) {
            str += '.';
        }
    }
    return str;
}

function updateStatus() {
    const latStr = getCoordString(latDigits);
    const lngStr = getCoordString(lngDigits);

    latStatus.textContent = latStr || '-';
    lngStatus.textContent = lngStr || '-';
}

function updatePrecisionStatus() {
    if (!precisionStatus) return;

    if (!precisionInfo) {
        precisionStatus.textContent = '-';
        return;
    }

    const { lLat, lLng } = precisionInfo;
    precisionStatus.textContent = `Lat: ${lLat}/6 · Lng: ${lLng}/6 dígits decimals`;
}

// Capa de canvas per pintar MOLTES cel·les (milers o milions) sense l'aparell de
// Leaflet (que crearia un objecte DOM/SVG per rectangle i petaria el navegador).
// En comptes d'això, dibuixem directament sobre un <canvas> superposat al mapa,
// recalculant només quan cal (moviment, zoom o canvi de dades).
const PrecisionGridLayer = L.Layer.extend({
    initialize: function (options) {
        L.setOptions(this, options);
        this._latRanges = [];
        this._lngRanges = [];
    },

    setRanges: function (latRanges, lngRanges) {
        this._latRanges = latRanges;
        this._lngRanges = lngRanges;
        this._redraw();
    },

    onAdd: function (map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'precision-grid-canvas');
        this._canvas.style.position = 'absolute';
        this._canvas.style.pointerEvents = 'none'; // purament visual, no interactiu
        map.getPanes().overlayPane.appendChild(this._canvas);

        map.on('moveend zoomend resize', this._reset, this);
        this._reset();
    },

    onRemove: function (map) {
        L.DomUtil.remove(this._canvas);
        map.off('moveend zoomend resize', this._reset, this);
        this._canvas = null;
    },

    _reset: function () {
        if (!this._canvas) return;
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);

        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        this._redraw();
    },

    _redraw: function () {
        if (!this._canvas || !this._map) return;
        const ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';   // vermell fort, molt contrastat
        ctx.strokeStyle = 'rgba(120, 20, 15, 0.9)';  // vora vermell fosc, sempre visible
        ctx.lineWidth = 1;

        const map = this._map;
        const w = this._canvas.width;
        const h = this._canvas.height;

        // Mida mínima garantida en píxels: encara que la cel·la real sigui subpixel
        // a aquest zoom, es dibuixa com un requadre visible (centrat sobre la cel·la real)
        const MIN_CELL_PX = 6;

        for (let i = 0; i < this._latRanges.length; i++) {
            const latR = this._latRanges[i];
            for (let j = 0; j < this._lngRanges.length; j++) {
                const lngR = this._lngRanges[j];

                const p1 = map.latLngToContainerPoint([latR.max, lngR.min]);
                const p2 = map.latLngToContainerPoint([latR.min, lngR.max]);

                const x = Math.min(p1.x, p2.x);
                const y = Math.min(p1.y, p2.y);
                let rw = Math.abs(p2.x - p1.x);
                let rh = Math.abs(p2.y - p1.y);

                // Garantim una mida mínima visible, centrada sobre la cel·la real
                let drawX = x, drawY = y;
                if (rw < MIN_CELL_PX) {
                    drawX = x - (MIN_CELL_PX - rw) / 2;
                    rw = MIN_CELL_PX;
                }
                if (rh < MIN_CELL_PX) {
                    drawY = y - (MIN_CELL_PX - rh) / 2;
                    rh = MIN_CELL_PX;
                }

                // Saltar el que quedi fora de la finestra visible (estalvia moltíssim en zoom alt)
                if (drawX + rw < 0 || drawY + rh < 0 || drawX > w || drawY > h) continue;

                ctx.fillRect(drawX, drawY, rw, rh);
                ctx.strokeRect(drawX + 0.5, drawY + 0.5, rw - 1, rh - 1);
            }
        }
    }
});

const precisionGrid = new PrecisionGridLayer();

function updateMap() {
    updateStatus();
    areasLayer.clearLayers();
    if (map.hasLayer(precisionGrid)) {
        map.removeLayer(precisionGrid);
    }

    const latStr = getCoordString(latDigits);
    const lngStr = getCoordString(lngDigits);

    if (!latStr && !lngStr) {
        areasCount.textContent = '0';
        updatePrecisionStatus();
        return;
    }

    const { latRanges, lngRanges } = calculatePossibleAreas();
    const totalCombos = latRanges.length * lngRanges.length;
    areasCount.textContent = totalCombos.toLocaleString('ca-ES');
    updatePrecisionStatus();

    if (totalCombos === 0) return;

    // Rectangle englobant: el requadre mínim que conté TOTES les combinacions
    // possibles (encara que hi hagi buits reals entremig). Es dibuixa sempre,
    // com a fons, perquè es vegi una àrea gran i fàcil d'ubicar encara que els
    // quadradets exactes quedin petits o separats.
    const latMin = Math.min(...latRanges.map(r => r.min));
    const latMax = Math.max(...latRanges.map(r => r.max));
    const lngMin = Math.min(...lngRanges.map(r => r.min));
    const lngMax = Math.max(...lngRanges.map(r => r.max));

    if (fineLayerEnabled && totalCombos <= INTERACTIVE_RENDER_THRESHOLD) {
        // Poques combinacions: rectangles individuals amb popup (com fins ara)
        const areas = buildAreaList(latRanges, lngRanges);
        areas.forEach(area => drawArea(area));
    } else if (fineLayerEnabled) {
        // Moltes combinacions: canvas d'alta densitat (taronja superposat al blau)
        precisionGrid.addTo(map);
        precisionGrid.setRanges(latRanges, lngRanges);
    }

    // Contorn englobant: es dibuixa AL FINAL (a sobre de tota la resta) i sense
    // farciment, perquè mai quedi tapat pels quadradets taronja, per densos que siguin.
    drawEnvelope({ latMin, latMax, lngMin, lngMax });

    map.fitBounds([[latMin, lngMin], [latMax, lngMax]], { padding: [50, 50] });
}

// Pressupost de CÀLCUL (no de dibuix): fins a quantes cel·les combinades (lat x lng)
// intentem resoldre amb precisió exacta. Els dígits coneguts sempre son gratuïts;
// només "gastem" pressupost en dígits que cal endevinar. Amb un límit tan alt,
// pràcticament sempre arribarem a precisió total quan sigui matemàticament factible
// (p.ex. 3 dígits desconeguts a cada eix = 1.000 x 1.000 = 1.000.000, per sota del límit).
const COMPUTE_BUDGET = 4000000;

// A partir de quantes combinacions canviem el mode de dibuix: per sota, rectangles
// individuals de Leaflet amb popup (interactius). Per sobre, un únic canvas superposat
// (molt més ràpid, però sense popup individual per cel·la).
const INTERACTIVE_RENDER_THRESHOLD = 500;

// Calcula, per a un eix (lat o lng), quants dígits decimals CONSECUTIUS des de l'inici
// es poden "resoldre" (coneguts directament o ramificats) sense superar el pressupost
// combinat entre els dos eixos. Els dígits coneguts són sempre gratuïts (no consumeixen
// pressupost); només costen els dígits que cal endevinar (x10 cada un).
// Retorna { lLat, lLng }: quants dels 6 dígits decimals de cada eix queden "resolts".
function computeResolvedWindow(latDec, lngDec, budget) {
    let lLat = 0;
    let lLng = 0;
    let total = 1;

    while (lLat < 6 || lLng < 6) {
        const costLat = lLat < 6 ? (latDec[lLat] !== '' ? 1 : 10) : null;
        const costLng = lLng < 6 ? (lngDec[lLng] !== '' ? 1 : 10) : null;

        // Prioritat màxima: qualsevol extensió "gratuïta" (dígit ja conegut) s'aplica sempre.
        if (costLat === 1) { lLat++; continue; }
        if (costLng === 1) { lLng++; continue; }

        // A partir d'aquí, l'única extensió possible costa x10 (cal ramificar un dígit desconegut).
        const candidates = [];
        if (costLat === 10) candidates.push('lat');
        if (costLng === 10) candidates.push('lng');
        if (candidates.length === 0) break; // tots dos eixos ja estan complets

        // Preferim ampliar primer l'eix amb menys dígits resolts, per repartir la precisió
        // de forma equilibrada entre latitud i longitud.
        candidates.sort((a, b) => (a === 'lat' ? lLat : lLng) - (b === 'lat' ? lLat : lLng));

        let extended = false;
        for (const axis of candidates) {
            if (total * 10 <= budget) {
                total *= 10;
                if (axis === 'lat') lLat++; else lLng++;
                extended = true;
                break;
            }
        }
        if (!extended) break; // no queda pressupost per cap dels dos eixos
    }

    return { lLat, lLng };
}

// Genera els rangs (cel·les) possibles per a un eix, donada la part entera (coneguda)
// i la part decimal (array de 6 posicions, '' = desconegut), fins a "window" dígits
// decimals resolts. Els dígits desconeguts dins la finestra es ramifiquen en 0-9;
// els dígits més enllà de la finestra queden sense determinar (cel·la més gran).
function enumerateAxisRanges(intPart, decDigits, window, minBound, maxBound) {
    const unknownPositions = [];
    for (let i = 0; i < window; i++) {
        if (decDigits[i] === '') unknownPositions.push(i);
    }

    const combosCount = Math.pow(10, unknownPositions.length);
    const step = Math.pow(10, -window); // window=0 -> pas d'1 grau sencer
    const ranges = [];

    for (let combo = 0; combo < combosCount; combo++) {
        const filled = decDigits.slice(0, window);
        let remainder = combo;
        for (let k = unknownPositions.length - 1; k >= 0; k--) {
            filled[unknownPositions[k]] = String(remainder % 10);
            remainder = Math.floor(remainder / 10);
        }

        const decStr = filled.join('');
        const base = parseFloat(intPart + (decStr ? '.' + decStr : ''));
        const rangeMin = Math.max(base, minBound);
        const rangeMax = Math.min(base + step, maxBound);
        if (rangeMin < rangeMax) {
            ranges.push({ min: rangeMin, max: rangeMax });
        }
    }

    return ranges;
}

function calculatePossibleAreas() {
    const latIntKnown = latDigits[0] !== '' && latDigits[1] !== '';
    const lngIntKnown = lngDigits[0] !== '' && lngDigits[1] !== '';

    let latRanges, lngRanges;

    if (latIntKnown && lngIntKnown) {
        const latIntPart = latDigits[0] + latDigits[1];
        const lngIntPart = lngDigits[0] + lngDigits[1];
        const latDec = latDigits.slice(2);
        const lngDec = lngDigits.slice(2);

        const { lLat, lLng } = computeResolvedWindow(latDec, lngDec, COMPUTE_BUDGET);
        precisionInfo = { lLat, lLng }; // per mostrar-ho a la interfície

        latRanges = enumerateAxisRanges(latIntPart, latDec, lLat, CATALUNYA_BOUNDS.south, CATALUNYA_BOUNDS.north);
        lngRanges = enumerateAxisRanges(lngIntPart, lngDec, lLng, CATALUNYA_BOUNDS.west, CATALUNYA_BOUNDS.east);
    } else {
        // Encara no coneixem els 2 primers dígits d'algun eix: mantenim el comportament
        // original basat en el prefix conegut (divisió per graus sencers).
        precisionInfo = null;
        const latStr = getCoordString(latDigits);
        const lngStr = getCoordString(lngDigits);

        latRanges = latStr
            ? getCoordinateRanges(latStr, CATALUNYA_BOUNDS.south, CATALUNYA_BOUNDS.north)
            : [{ min: CATALUNYA_BOUNDS.south, max: CATALUNYA_BOUNDS.north }];
        lngRanges = lngStr
            ? getCoordinateRanges(lngStr, CATALUNYA_BOUNDS.west, CATALUNYA_BOUNDS.east)
            : [{ min: CATALUNYA_BOUNDS.west, max: CATALUNYA_BOUNDS.east }];
    }

    // Filtrar rangs que ni tan sols toquen Catalunya (fa que el recompte posterior sigui exacte)
    latRanges = latRanges.filter(r => r.max > CATALUNYA_BOUNDS.south && r.min < CATALUNYA_BOUNDS.north);
    lngRanges = lngRanges.filter(r => r.max > CATALUNYA_BOUNDS.west && r.min < CATALUNYA_BOUNDS.east);

    return { latRanges, lngRanges };
}

// Combina els rangs de tots dos eixos en una llista plana d'àrees {latMin,latMax,lngMin,lngMax}.
// Només s'ha de fer servir quan el nombre total és petit (mode interactiu); per a volums
// grans, el canvas fa la combinació ell mateix sense crear cap objecte intermedi.
function buildAreaList(latRanges, lngRanges) {
    const areas = [];
    latRanges.forEach(latRange => {
        lngRanges.forEach(lngRange => {
            areas.push({
                latMin: latRange.min,
                latMax: latRange.max,
                lngMin: lngRange.min,
                lngMax: lngRange.max
            });
        });
    });
    return areas;
}

function getCoordinateRanges(coordStr, minBound, maxBound) {
    const ranges = [];

    if (!coordStr) {
        // Sin coordenada, devolver todo el rango válido dividido en segmentos de 1 grado
        const minInt = Math.floor(minBound);
        const maxInt = Math.ceil(maxBound);

        for (let i = minInt; i < maxInt; i++) {
            const rangeMin = Math.max(i, minBound);
            const rangeMax = Math.min(i + 1, maxBound);
            if (rangeMin < rangeMax) {
                ranges.push({ min: rangeMin, max: rangeMax });
            }
        }
        return ranges;
    }

    // Determinar el rango basado en cuántos dígitos tenemos
    const hasDecimal = coordStr.includes('.');

    if (!hasDecimal) {
        // Solo parte entera sin punto decimal
        if (coordStr.length === 1) {
            // Un solo dígito: ej. "4" -> necesitamos generar 40-50
            // Esto representa 4X.XXXXXX, es decir todas las combinaciones de 40 a 49
            const firstDigit = parseInt(coordStr);
            const baseMin = firstDigit * 10;
            const baseMax = (firstDigit + 1) * 10;

            // Generar rangos para cada unidad dentro de este rango
            for (let i = baseMin; i < baseMax; i++) {
                const rangeMin = Math.max(i, minBound);
                const rangeMax = Math.min(i + 1, maxBound);
                if (rangeMin < rangeMax) {
                    ranges.push({ min: rangeMin, max: rangeMax });
                }
            }
        } else if (coordStr.length === 2) {
            // Dos dígitos: ej. "41" -> 41.0 a 42.0
            const base = parseFloat(coordStr);
            const min = Math.max(base, minBound);
            const max = Math.min(base + 1, maxBound);
            if (min < max) {
                ranges.push({ min, max });
            }
        }
    } else {
        // Tiene punto decimal: "41." -> 41.0 a 42.0, "41.4" -> 41.4 a 41.5
        const parts = coordStr.split('.');
        const intPart = parts[0];
        const decPart = parts[1] || '';

        if (decPart.length < 6) {
            // Con decimales incompletos: generar múltiples rangos, uno por cada
            // posible valor del SIGUIENTE dígito, subdividiendo la celda actual.
            // ej. "41.4" (precision=1, celda conocida = 0.1°) -> genera 10
            // subceldas de 0.01° cada una: 41.40-41.41, 41.41-41.42, ..., 41.49-41.50
            const precision = decPart.length;
            const step = Math.pow(10, -(precision + 1)); // paso del SIGUIENTE dígito
            const base = parseFloat(coordStr);

            // Generar 10 rangos (uno por cada dígito posible en la siguiente posición)
            for (let i = 0; i < 10; i++) {
                const rangeMin = Math.max(base + (i * step), minBound);
                const rangeMax = Math.min(base + ((i + 1) * step), maxBound);
                if (rangeMin < rangeMax) {
                    ranges.push({ min: rangeMin, max: rangeMax });
                }
            }
        } else {
            // Coordenada completa (6 decimales)
            const precision = decPart.length;
            const step = Math.pow(10, -precision);
            const base = parseFloat(coordStr);

            const min = Math.max(base, minBound);
            const max = Math.min(base + step, maxBound);

            if (min < max) {
                ranges.push({ min, max });
            }
        }
    }

    return ranges;
}

function isWithinCatalunya(latRange, lngRange) {
    // Verificar que haya intersección con los límites de Catalunya
    const latOverlap = latRange.max > CATALUNYA_BOUNDS.south && latRange.min < CATALUNYA_BOUNDS.north;
    const lngOverlap = lngRange.max > CATALUNYA_BOUNDS.west && lngRange.min < CATALUNYA_BOUNDS.east;

    return latOverlap && lngOverlap;
}

// Dibuixa el contorn englobant (blau, sense farciment) que marca el requadre mínim
// que conté totes les combinacions possibles. Viu en el seu propi pane (z-index alt)
// perquè sempre es vegi per sobre, encara que els quadradets taronja siguin molt densos.
function drawEnvelope(bounds) {
    const rectangle = L.rectangle([
        [bounds.latMin, bounds.lngMin],
        [bounds.latMax, bounds.lngMax]
    ], {
        pane: 'envelopePane',
        renderer: envelopeRenderer,
        color: '#1565c0',
        weight: 3,
        fill: false,
        dashArray: '8, 6'
    });
    rectangle.addTo(areasLayer);
}

function drawArea(area) {
    const bounds = [
        [area.latMin, area.lngMin],
        [area.latMax, area.lngMax]
    ];

    // Calcular opacidad basada en el tamaño del área (áreas más pequeñas más opacas)
    const areaSize = (area.latMax - area.latMin) * (area.lngMax - area.lngMin);
    const opacity = Math.max(0.15, Math.min(0.5, 1 / Math.log10(areaSize * 1000 + 10)));

    const rectangle = L.rectangle(bounds, {
        renderer: sharedCanvasRenderer,
        color: '#c0392b',
        weight: 1,
        fillColor: '#e74c3c',
        fillOpacity: opacity
    });

    const centerLat = (area.latMin + area.latMax) / 2;
    const centerLng = (area.lngMin + area.lngMax) / 2;

    const areaSizeDeg = {
        lat: area.latMax - area.latMin,
        lng: area.lngMax - area.lngMin
    };

    const approxKm = {
        lat: (areaSizeDeg.lat * 111).toFixed(2),
        lng: (areaSizeDeg.lng * 111 * Math.cos(centerLat * Math.PI / 180)).toFixed(2)
    };

    rectangle.bindPopup(`
        <strong>🎯 Àrea possible</strong><br>
        <strong>Centre:</strong> ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}<br>
        <strong>Rang Lat:</strong> ${area.latMin.toFixed(6)} - ${area.latMax.toFixed(6)}<br>
        <strong>Rang Lng:</strong> ${area.lngMin.toFixed(6)} - ${area.lngMax.toFixed(6)}<br>
        <strong>Mida aprox:</strong> ${approxKm.lat} × ${approxKm.lng} km
    `);

    rectangle.addTo(areasLayer);
}

// Inicializar el estado
updateStatus();

// Valors per defecte: evita haver de reintroduir-los cada vegada.
// Per canviar-los, edita aquests dos arrays (posa '' a les posicions desconegudes).
const DEFAULT_LAT_DIGITS = ['4', '1', '8', '', '', '0', '5', '3'];
const DEFAULT_LNG_DIGITS = ['0', '1', '', '', '', '3', '6', '9'];

function setDefaultValues() {
    DEFAULT_LAT_DIGITS.forEach((digit, index) => {
        if (!digit) return;
        latDigits[index] = digit;
        const input = document.querySelector(`.digit-input[data-coord="lat"][data-index="${index}"]`);
        if (input) {
            input.value = digit;
            input.classList.add('filled');
        }
    });
    DEFAULT_LNG_DIGITS.forEach((digit, index) => {
        if (!digit) return;
        lngDigits[index] = digit;
        const input = document.querySelector(`.digit-input[data-coord="lng"][data-index="${index}"]`);
        if (input) {
            input.value = digit;
            input.classList.add('filled');
        }
    });
    updateMap();
}

setDefaultValues();

// Focus al primer input buit al cargar
document.querySelector('.digit-input[data-coord="lat"][data-index="0"]').focus();
