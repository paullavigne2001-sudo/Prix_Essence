let map;
let favorites = JSON.parse(localStorage.getItem("fav")) || [];

function initMap(lat, lon) {
  map = L.map('map').setView([lat, lon], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
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

    console.log("DATA API :", data);

    const container = document.getElementById("stations");
    container.innerHTML = "";

    if (!data.records || data.records.length === 0) {
      container.innerHTML = "Aucune station trouvée";
      return;
    }

    data.records.forEach(record => {
      const f = record.fields;

      // coordonnées
      const latStation = f.geom?.[0];
      const lonStation = f.geom?.[1];

      if (latStation && lonStation) {
        L.marker([latStation, lonStation])
          .addTo(map)
          .bindPopup(f.adresse || "Station");
      }

      const isFav = favorites.includes(record.recordid);

      container.innerHTML += `
        <div class="card">
          <h3>${f.adresse || "Station"}</h3>
          <p>${f.ville || ""}</p>
          <p>⛽ Gazole : ${f.gazole_prix || "-"}</p>
          <p>⛽ SP95 : ${f.sp95_prix || "-"}</p>
          <p>⛽ SP98 : ${f.sp98_prix || "-"}</p>
          <button onclick="toggleFav('${record.recordid}')">
            ${isFav ? "⭐ Retirer" : "☆ Favori"}
          </button>
        </div>
      `;
    });

  } catch (error) {
    console.error("ERREUR API :", error);
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
