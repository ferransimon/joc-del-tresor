// Límites de Catalunya (aproximados)
const CATALUNYA_BOUNDS = {
    north: 42.9,
    south: 40.5,
    east: 3.4,
    west: 0.15
};

// Inicializar el mapa centrado en Catalunya
const map = L.map('map').setView([41.7, 1.8], 8);

// Añadir capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

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

// Referencias a los elementos del DOM
const digitInputs = document.querySelectorAll('.digit-input');
const clearBtn = document.getElementById('clear-btn');
const latStatus = document.getElementById('lat-status');
const lngStatus = document.getElementById('lng-status');
const areasCount = document.getElementById('areas-count');

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
    updateStatus();
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

function updateMap() {
    updateStatus();
    areasLayer.clearLayers();

    const latStr = getCoordString(latDigits);
    const lngStr = getCoordString(lngDigits);

    if (!latStr && !lngStr) {
        areasCount.textContent = '0';
        return;
    }

    const possibleAreas = calculatePossibleAreas(latStr, lngStr);
    areasCount.textContent = possibleAreas.length;

    possibleAreas.forEach(area => {
        drawArea(area);
    });

    if (possibleAreas.length > 0) {
        const bounds = L.latLngBounds(possibleAreas.map(area => [
            [area.latMin, area.lngMin],
            [area.latMax, area.lngMax]
        ]).flat());
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function calculatePossibleAreas(latStr, lngStr) {
    const areas = [];

    // Determinar rangos de latitud
    let latRanges = [];
    if (latStr) {
        latRanges = getCoordinateRanges(latStr, CATALUNYA_BOUNDS.south, CATALUNYA_BOUNDS.north);
    } else {
        latRanges = [{ min: CATALUNYA_BOUNDS.south, max: CATALUNYA_BOUNDS.north }];
    }

    // Determinar rangos de longitud
    let lngRanges = [];
    if (lngStr) {
        lngRanges = getCoordinateRanges(lngStr, CATALUNYA_BOUNDS.west, CATALUNYA_BOUNDS.east);
    } else {
        lngRanges = [{ min: CATALUNYA_BOUNDS.west, max: CATALUNYA_BOUNDS.east }];
    }

    // Combinar todos los rangos posibles
    latRanges.forEach(latRange => {
        lngRanges.forEach(lngRange => {
            // Verificar que el área esté dentro de Catalunya
            if (isWithinCatalunya(latRange, lngRange)) {
                areas.push({
                    latMin: latRange.min,
                    latMax: latRange.max,
                    lngMin: lngRange.min,
                    lngMax: lngRange.max
                });
            }
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

        if (decPart === '') {
            // Solo punto, sin decimales: "41." -> 41.0 a 42.0
            const base = parseFloat(intPart);
            const min = Math.max(base, minBound);
            const max = Math.min(base + 1, maxBound);
            if (min < max) {
                ranges.push({ min, max });
            }
        } else if (decPart.length < 6) {
            // Con decimales incompletos: generar múltiples rangos
            // ej. "41.4" -> genera 41.40-41.41, 41.41-41.42, ..., 41.49-41.50
            const precision = decPart.length;
            const step = Math.pow(10, -precision);
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

function drawArea(area) {
    const bounds = [
        [area.latMin, area.lngMin],
        [area.latMax, area.lngMax]
    ];

    // Calcular opacidad basada en el tamaño del área (áreas más pequeñas más opacas)
    const areaSize = (area.latMax - area.latMin) * (area.lngMax - area.lngMin);
    const opacity = Math.max(0.15, Math.min(0.5, 1 / Math.log10(areaSize * 1000 + 10)));

    const rectangle = L.rectangle(bounds, {
        color: '#3498db',
        weight: 1,
        fillColor: '#3498db',
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

// Focus al primer input al cargar
document.querySelector('.digit-input[data-coord="lat"][data-index="0"]').focus();
