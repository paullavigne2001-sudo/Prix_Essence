let map;
let favorites = JSON.parse(localStorage.getItem("fav")) || [];
let osmCache = {};

function initMap(lat, lon) {
  map = L.map('map').setView([lat, lon], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLon = (lon2 - lon1) * Math.PI/180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function detectBrandFallback(f) {
  if (f.enseigne) return f.enseigne.toUpperCase();
  return "STATION";
}

// 🔥 OSM sécurisé (timeout + non bloquant)
async function fetchOSMBrands(lat, lon) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const query = `
      [out:json];
      node["amenity"="fuel"](around:5000,${lat},${lon});
      out;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error("OSM error");

    const data = await res.json();

    const map = {};

    data.elements.forEach(el => {
      if (el.lat && el.lon) {
        const key = `${el.lat.toFixed(3)}_${el.lon.toFixed(3)}`;
        map[key] = el.tags?.brand || el.tags?.name || "STATION";
      }
    });

    return map;

  } catch (e) {
    console.warn("OSM indisponible");
    return {};
  }
}

async function locate() {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    initMap(lat, lon);
    loadStations(lat, lon);
  });
}

async function loadStations(lat, lon) {
  const container = document.getElementById("stations");
  container.innerHTML = "⏳ Recherche des meilleures stations...";

  try {
    const url = `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=prix-des-carburants-en-france-flux-instantane-v2&rows=20&geofilter.distance=${lat},${lon},5000`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.innerHTML = "Aucune station trouvée";
      return;
    }

    // 🔥 OSM non bloquant + cache
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    let osmData = {};

    try {
      if (!osmCache[cacheKey]) {
        osmCache[cacheKey] = fetchOSMBrands(lat, lon); // PAS await ici
      }
      osmData = await osmCache[cacheKey];
    } catch {
      osmData = {};
    }

    const stations = data.records.map(record => {
      const f = record.fields;

      const latS = f.geom?.[0];
      const lonS = f.geom?.[1];

      const price = f.gazole_prix || f.sp95_prix || f.sp98_prix || 999;
      const distance = latS ? getDistance(lat, lon, latS, lonS) : 999;

      return { record, f, price, distance, latS, lonS };
    });

    stations.sort((a, b) =>
      (a.price * 0.7 + a.distance * 0.3) -
      (b.price * 0.7 + b.distance * 0.3)
    );

    const cheapest = stations[0];

    container.innerHTML = "";

    // 🥇 meilleur
    if (cheapest) {
      container.innerHTML += `
        <div class="card best">
          <h2>🥇 Meilleur prix</h2>
          <h3>${cheapest.f.adresse}</h3>
          <p>${cheapest.f.ville}</p>
          <p>${cheapest.price} €</p>
        </div>
      `;
    }

    stations.slice(0,10).forEach(s => {
      let brand = "STATION";

      if (s.latS) {
        const key = `${s.latS.toFixed(3)}_${s.lonS.toFixed(3)}`;
        brand = osmData[key] || detectBrandFallback(s.f);
      }

      if (s.latS) {
        const icon = L.divIcon({
          html: `<div style="
            background:#22c55e;
            padding:5px 8px;
            border-radius:10px;
            font-weight:bold;
          ">${s.price}€</div>`,
          className: ""
        });

        L.marker([s.latS, s.lonS], { icon })
          .addTo(map)
          .bindPopup(brand);
      }

      const isFav = favorites.includes(s.record.recordid);

      container.innerHTML += `
        <div class="card" onclick="window.open('https://www.google.com/maps?q=${s.latS},${s.lonS}')">
          <h3>${brand}</h3>
          <p>${s.f.adresse}</p>
          <p>${s.f.ville}</p>

          <div>
            <div>GAZOLE : ${s.f.gazole_prix || "-"}</div>
            <div>SP95 : ${s.f.sp95_prix || "-"}</div>
            <div>SP98 : ${s.f.sp98_prix || "-"}</div>
          </div>

          <button onclick="event.stopPropagation();toggleFav('${s.record.recordid}')">
            ${isFav ? "⭐ Retirer" : "☆ Favori"}
          </button>

          <br><br>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${s.latS},${s.lonS}" target="_blank">
            🚗 Itinéraire
          </a>
        </div>
      `;
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = "Erreur de chargement";
  }
}

function toggleFav(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
  }

  localStorage.setItem("fav", JSON.stringify(favorites));
}
