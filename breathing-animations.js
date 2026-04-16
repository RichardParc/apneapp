const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");

let width, height;
let waves = [];

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  createWaves();
}

window.addEventListener("resize", resize);

function createWaves() {
  waves = [];

  const total = 12; // 🔥 más líneas

  for (let i = 0; i < total; i++) {
    waves.push({
      baseY: (height / total) * i,
      length: 0.002 + Math.random() * 0.003,
      amplitude: 10 + Math.random() * 25,
      speed: 0.0005 + Math.random() * 0.001,
      offset: Math.random() * 1000,
      opacity: 0.08 + Math.random() * 0.12
    });
  }
}

resize();

function draw(time) {
  ctx.clearRect(0, 0, width, height);

  waves.forEach((wave, index) => {
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const y =
        wave.baseY +
        Math.sin(x * wave.length + time * wave.speed + wave.offset) *
          wave.amplitude;

      ctx.lineTo(x, y);
    }


    ctx.strokeStyle = `rgba(47,216,192, ${wave.opacity})`;
    ctx.lineWidth = 1.2;

    ctx.stroke();
  });

  requestAnimationFrame(draw);
}

draw(0);