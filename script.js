
// INITIALIZE MAP

const map = L.map("map").setView(
    [12.8797, 121.7740],
    6
);


// SATELLITE IMAGERY

const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 21,
        attribution: "Tiles &copy; Esri"
    }
).addTo(map);


// PLACE LABELS OVER SATELLITE

const labels = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution: "Labels &copy; Esri",
        pane: "overlayPane"
    }
).addTo(map);


// MAP LAYERS

const baseMaps = {
    "Satellite": satellite
};

const overlayMaps = {
    "Place Labels": labels
};

L.control.layers(baseMaps, overlayMaps).addTo(map);


// MARKER GROUP

const markerLayer = L.layerGroup().addTo(map);


// HTML ELEMENTS

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const status = document.getElementById("status");
const searchButton = document.getElementById("searchButton");


// SEARCH LOCATION

let lastSearchTime = 0;

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const city = input.value.trim();

    if (city.length < 2) {
        status.textContent = "Please enter a location.";
        return;
    }

    // Respect Nominatim rate limit
    const now = Date.now();

    if (now - lastSearchTime < 1100) {
        status.textContent =
            "Please wait a moment before searching again.";
        return;
    }

    lastSearchTime = now;

    markerLayer.clearLayers();

    status.textContent = "Searching location...";

    searchButton.disabled = true;
    searchButton.textContent = "Searching...";

    try {

        // NOMINATIM SEARCH API

        const url = new URL(
            "https://nominatim.openstreetmap.org/search"
        );

        url.search = new URLSearchParams({
            q: city + ", Philippines",
            format: "jsonv2",
            addressdetails: "1",
            countrycodes: "ph",
            limit: "8"
        });

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Search request failed.");
        }

        const locations = await response.json();

        if (!locations || locations.length === 0) {

            status.textContent =
                "No location found. Try another search.";

            return;
        }

        const bounds = [];

        // CREATE MARKERS

        locations.forEach(function(place) {

            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);

            const coords = [lat, lon];

            bounds.push(coords);

            const marker = L.marker(coords)
                .addTo(markerLayer);

            // LOCATION DETAILS

            const popupContent = `
                <div class="popup-content">
                    <h3>${escapeHTML(place.name || place.display_name.split(",")[0])}</h3>

                    <p>${escapeHTML(place.display_name)}</p>

                    <small>
                        Type: ${escapeHTML(place.type || "Location")}
                    </small>
                </div>
            `;

            marker.bindPopup(popupContent);

        });

        // AUTOMATIC ZOOM

        if (bounds.length === 1) {

            map.setView(bounds[0], 17);

        } else {

            map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 16
            });

        }

        status.textContent =
            locations.length + " location(s) found.";

        // OPEN FIRST RESULT

        const firstMarker = markerLayer.getLayers()[0];

        if (firstMarker) {
            firstMarker.openPopup();
        }

    } catch (error) {

        console.error(error);

        status.textContent =
            "Unable to search. Check your internet connection and try again.";

    } finally {

        searchButton.disabled = false;
        searchButton.textContent = "Search";

    }

});


// PROTECT POPUP CONTENT

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, function(char) {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];

    });

}
