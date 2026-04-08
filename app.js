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
  const res = await fetch(`https://api.prix-carburants.gouv.fr/v1/stations?lat=${lat}&lon=${lon}`);
  const data = await res.json();

  const container = document.getElementById("stations");
  container.innerHTML = "";

  data.stations.slice(0,10).forEach(station => {
    const p = station.prix || {};

    // Marker
    if (station.latitude && station.longitude) {
      L.marker([station.latitude, station.longitude])
        .addTo(map)
        .bindPopup(station.nom);
    }

    const isFav = favorites.includes(station.id);

    container.innerHTML += `
      <div class="card">
        <h3>${station.nom}</h3>
        <p>${station.adresse}</p>
        <p>⛽ ${p.Gazole || "-"} €</p>
        <button onclick="toggleFav('${station.id}')">
          ${isFav ? "⭐ Retirer" : "☆ Favori"}
        </button>
      </div>
    `;
  });
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
