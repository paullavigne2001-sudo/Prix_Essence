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

    // 🥇 recherche station la moins chère
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

    // 🥇 affichage premium
    if (cheapest) {
      container.innerHTML += `
        <div style="
          background: linear-gradient(135deg,#22c55e,#16a34a);
          padding:20px;
          border-radius:15px;
          margin-bottom:15px;
          box-shadow:0 10px 25px rgba(0,0,0,0.3)
        ">
          <h2>🥇 Meilleur prix autour</h2>
          <h3>${cheapest.adresse}</h3>
          <p>${cheapest.ville}</p>
          <p style="font-size:24px;font-weight:bold">
            ⛽ ${cheapestPrice} €
          </p>
        </div>
      `;
    }

    // 🗺️ affichage stations
    data.records.forEach(record => {
      const f = record.fields;

      const latStation = f.geom?.[0];
      const lonStation = f.geom?.[1];

      // 🎯 marker avec prix
      if (latStation && lonStation) {
        const icon = L.divIcon({
          html: `<div style="
            background:#22c55e;
            color:black;
            padding:5px 8px;
            border-radius:10px;
            font-size:12px;
            font-weight:bold;
          ">
            ${f.gazole_prix || ""}
          </div>`,
          className: ""
        });

        L.marker([latStation, lonStation], { icon })
          .addTo(map)
          .bindPopup(f.adresse || "Station");
      }

      const isFav = favorites.includes(record.recordid);

      // 🎨 carte premium
      container.innerHTML += `
        <div style="
          background: linear-gradient(145deg,#1e293b,#0f172a);
          border-radius:15px;
          padding:15px;
          margin:10px 0;
          box-shadow:0 5px 15px rgba(0,0,0,0.4);
          transition:0.2s;
        ">
          <h3>${f.adresse || "Station"}</h3>
          <p style="opacity:0.7">${f.ville || ""}</p>

          <div style="display:flex;gap:10px;margin-top:10px">
            <span>⛽ ${f.gazole_prix || "-"}</span>
            <span>SP95 ${f.sp95_prix || "-"}</span>
            <span>SP98 ${f.sp98_prix || "-"}</span>
          </div>

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
