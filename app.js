let map;
let favorites = JSON.parse(localStorage.getItem("fav")) || [];

// 🔥 cache OSM (évite rechargement)
let osmCache = {};

function initMap(lat, lon) {
  map = L.map('map').setView([lat, lon], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// fallback si OSM ne trouve rien
function detectBrandFallback(f) {
  if (f.enseigne) return f.enseigne.toUpperCase();

  const a = (f.adresse || "").toLowerCase();

  if (a.includes("total")) return "TOTAL";
  if (a.includes("carrefour")) return "CARREFOUR";
  if (a.includes("leclerc")) return "LECLERC";
  if (a.includes("intermarche")) return "INTERMARCHE";
  if (a.includes("bp")) return "BP";
  if (a.includes("shell")) return "SHELL";

  return "STATION";
}

// 🔥 UNE SEULE requête OSM pour toutes les stations
async function fetchOSMBrands(lat, lon) {
  try {
    const query = `
      [out:json];
      node["amenity"="fuel"](around:5000,${lat},${lon});
      out;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query
    });

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
    console.error("OSM ERROR", e);
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
  try {
    const url = `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=prix-des-carburants-en-france-flux-instantane-v2&rows=20&geofilter.distance=${lat},${lon},5000`;

    const res = await fetch(url);
    const data = await res.json();

    const container = document.getElementById("stations");
    container.innerHTML = "";

    if (!data.records || data.records.length === 0) {
      container.innerHTML = "Aucune station trouvée";
      return;
    }

    // 🔥 OSM (avec cache)
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    if (!osmCache[cacheKey]) {
      osmCache[cacheKey] = await fetchOSMBrands(lat, lon);
    }
    const osmData = osmCache[cacheKey];

    let cheapest = null;
    let cheapestPrice = Infinity;

    data.records.forEach(record => {
      const f = record.fields;
      const price = f.gazole_prix || f.sp95_prix || f.sp98_prix;

      if (price && price < cheapestPrice) {
        cheapestPrice = price;
        cheapest = f;
      }
    });

    // 🥇 meilleur prix
    if (cheapest) {
      container.innerHTML += `
        <div style="
          background: linear-gradient(135deg,#22c55e,#16a34a);
          padding:20px;
          border-radius:15px;
          margin-bottom:15px;
        ">
          <h2>🥇 Meilleur prix</h2>
          <h3>${cheapest.adresse}</h3>
          <p>${cheapest.ville}</p>
          <p style="font-size:24px;font-weight:bold">
            ${cheapestPrice} €
          </p>
        </div>
      `;
    }

    data.records.forEach(record => {
      const f = record.fields;

      const latStation = f.geom?.[0];
      const lonStation = f.geom?.[1];

      // 🔥 matching OSM approximatif
      let brand = "STATION";
      if (latStation && lonStation) {
        const key = `${latStation.toFixed(3)}_${lonStation.toFixed(3)}`;
        brand = osmData[key] || detectBrandFallback(f);
      }

      if (latStation && lonStation) {
        const icon = L.divIcon({
          html: `<div style="
            background:#22c55e;
            color:#000;
            padding:6px 10px;
            border-radius:12px;
            font-size:13px;
            font-weight:bold;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">
            ${f.gazole_prix || "-"}€
          </div>`,
          className: ""
        });

        L.marker([latStation, lonStation], { icon })
          .addTo(map)
          .bindPopup(`${brand} - ${f.adresse}`);
      }

      const isFav = favorites.includes(record.recordid);

      container.innerHTML += `
        <div style="
          background: linear-gradient(145deg,#1e293b,#0f172a);
          border-radius:15px;
          padding:15px;
          margin:10px 0;
          box-shadow:0 5px 15px rgba(0,0,0,0.4);
        ">
          <h3>${brand}</h3>
          <p>${f.adresse}</p>
          <p style="opacity:0.7">${f.ville}</p>

          <div style="margin-top:10px">
            <div>GAZOLE : ${f.gazole_prix || "-"}</div>
            <div>SP95 : ${f.sp95_prix || "-"}</div>
            <div>SP98 : ${f.sp98_prix || "-"}</div>
          </div>

          <button onclick="toggleFav('${record.recordid}')">
            ${isFav ? "⭐ Retirer" : "☆ Favori"}
          </button>
        </div>
      `;
    });

  } catch (error) {
    console.error(error);
    document.getElementById("stations").innerHTML = "Erreur de chargement";
  }
}

function toggleFav(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
  }

  localStorage.setItem("fav", JSON.stringify(favorites));
  alert("Favoris mis à jour");
}
