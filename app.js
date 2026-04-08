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
    const url = `https://api.allorigins.win/raw?url=https://api.prix-carburants.gouv.fr/v1/stations?lat=${lat}&lon=${lon}`;
    
    const res = await fetch(url);
    const data = await res.json();

    console.log("DATA API :", data); // debug

    const container = document.getElementById("stations");
    container.innerHTML = "";

    if (!data.stations || data.stations.length === 0) {
      container.innerHTML = "Aucune station trouvée";
      return;
    }

    data.stations.slice(0,10).forEach(station => {

      // ✅ conversion tableau → objet
      const p = {};
      (station.prix || []).forEach(f => {
        p[f.carburant] = f.prix;
      });

      // Marker
      if (station.latitude && station.longitude) {
        L.marker([station.latitude, station.longitude])
          .addTo(map)
          .bindPopup(station.nom);
      }

      const isFav = favorites.includes(station.id);

      container.innerHTML += `
        <div class="card">
          <h3>${station.nom || "Station"}</h3>
          <p>${station.adresse || ""}</p>
          <p>⛽ Gazole : ${p.Gazole || "-"}</p>
          <p>⛽ SP95 : ${p.SP95 || "-"}</p>
          <p>⛽ SP98 : ${p.SP98 || "-"}</p>
          <button onclick="toggleFav('${station.id}')">
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
