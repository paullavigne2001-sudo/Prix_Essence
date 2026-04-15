alert("JS chargé");
let map;
let favorites = JSON.parse(localStorage.getItem("fav")) || [];

function initMap(lat, lon) {
  map = L.map('map').setView([lat, lon], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

async function locate() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      initMap(lat, lon);
      loadStations(lat, lon);
    },
    err => {
      alert("Géolocalisation refusée");
    }
  );
}

async function loadStations(lat, lon) {
  const container = document.getElementById("stations");
  container.innerHTML = "⏳ Chargement...";

  try {
    const url = `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=prix-des-carburants-en-france-flux-instantane-v2&rows=10&geofilter.distance=${lat},${lon},5000`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("API error");
    }

    const data = await res.json();

    console.log("DATA:", data);

    if (!data.records || data.records.length === 0) {
      container.innerHTML = "Aucune station trouvée";
      return;
    }

    container.innerHTML = "";

    data.records.forEach(record => {
      const f = record.fields;

      const latS = f.geom?.[0];
      const lonS = f.geom?.[1];

      // Marker simple
      if (latS && lonS) {
        L.marker([latS, lonS])
          .addTo(map)
          .bindPopup(f.adresse || "Station");
      }

      const isFav = favorites.includes(record.recordid);

      container.innerHTML += `
        <div style="background:#1e293b;padding:15px;margin:10px;border-radius:10px;">
          <h3>${f.adresse || "Station"}</h3>
          <p>${f.ville || ""}</p>

          <div>
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
    console.error("ERREUR :", error);
    container.innerHTML = "❌ Erreur chargement données";
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
locate();
