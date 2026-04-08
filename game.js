const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let player = {
  x: 150,
  y: 440,
  width: 50,
  height: 50
};

let drops = [];
let obstacles = [];
let score = 0;

// 🎮 Contrôles tactile + souris
canvas.addEventListener("mousemove", e => {
  player.x = e.offsetX - 25;
});

canvas.addEventListener("touchmove", e => {
  const rect = canvas.getBoundingClientRect();
  player.x = e.touches[0].clientX - rect.left - 25;
});

// Génération objets
function spawn() {
  if (Math.random() < 0.05) {
    drops.push({
      x: Math.random() * 300,
      y: 0,
      size: 20
    });
  }

  if (Math.random() < 0.03) {
    obstacles.push({
      x: Math.random() * 300,
      y: 0,
      size: 30
    });
  }
}

// Collision
function collide(a, b) {
  return a.x < b.x + b.size &&
         a.x + a.width > b.x &&
         a.y < b.y + b.size &&
         a.y + a.height > b.y;
}

// Boucle
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Joueur
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  spawn();

  // Gouttes (bonus)
  drops.forEach((d, i) => {
    d.y += 4;

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();

    if (collide(player, d)) {
      score += 10;
      drops.splice(i, 1);
    }
  });

  // Obstacles
  obstacles.forEach((o, i) => {
    o.y += 5;

    ctx.fillStyle = "red";
    ctx.fillRect(o.x, o.y, o.size, o.size);

    if (collide(player, o)) {
      alert("Game Over ! Score: " + score);
      document.location.reload();
    }
  });

  document.getElementById("score").innerText = "Score: " + score;

  requestAnimationFrame(update);
}

update();
