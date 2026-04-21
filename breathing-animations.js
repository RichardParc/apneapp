const canvas = document.getElementById("waveCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

if (canvas && ctx) {
  let width = 0;
  let height = 0;
  let waves = [];
  let stepX = 8;
  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.4,
    targetX: window.innerWidth * 0.5,
    targetY: window.innerHeight * 0.4,
    active: false,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stepX = width < 640 ? 10 : 8;
    createWaves();
  }

  function createWaves() {
    waves = [];
    const total = 5;

    for (let i = 0; i < total; i += 1) {
      waves.push({
        baseY: (height / total) * i,
        length: 0.0016 + Math.random() * 0.0022,
        amplitude: 16 + Math.random() * 34,
        speed: 0.00035 + Math.random() * 0.0007,
        offset: Math.random() * 1000,
        opacity: 0.12 + Math.random() * 0.18,
        thickness: 1 + Math.random() * 1.2,
        drift: 8 + Math.random() * 22,
      });
    }
  }

  function updatePointer(event) {
    const point = event.touches ? event.touches[0] : event;
    if (!point) return;
    pointer.targetX = point.clientX;
    pointer.targetY = point.clientY;
    pointer.active = true;
  }

  function releasePointer() {
    pointer.active = false;
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const now = time * 0.001;

    if (!pointer.active) {
      pointer.targetX += (width * 0.5 - pointer.targetX) * 0.02;
      pointer.targetY += (height * 0.38 - pointer.targetY) * 0.02;
    }

    pointer.x += (pointer.targetX - pointer.x) * 0.22;
    pointer.y += (pointer.targetY - pointer.y) * 0.22;

    const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
    glow.addColorStop(0, "rgba(118, 255, 244, 0.28)");
    glow.addColorStop(0.28, "rgba(56, 214, 255, 0.18)");
    glow.addColorStop(0.56, "rgba(35, 108, 255, 0.08)");
    glow.addColorStop(1, "rgba(4, 19, 31, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    waves.forEach((wave, index) => {
      ctx.beginPath();

      for (let x = -40; x < width + 40; x += stepX) {
        const waveA = Math.sin(x * wave.length + time * wave.speed + wave.offset) * wave.amplitude;
        const waveB = Math.cos(x * wave.length * 0.55 + time * wave.speed * 0.62 + wave.offset * 0.7) * (wave.amplitude * 0.38);
        const tide = Math.sin(now * 0.26 + index * 0.45) * wave.drift;
        const y = wave.baseY + tide + waveA + waveB;

        if (x === -40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const pulse = 0.86 + Math.sin(now * 0.95 + index * 0.4) * 0.18;
      const halo = 1 + Math.max(0, 1 - Math.abs(wave.baseY - pointer.y) / 180) * 1.8;
      ctx.strokeStyle = `rgba(76, 255, 233, ${wave.opacity * pulse * halo})`;
      ctx.lineWidth = wave.thickness;
      ctx.stroke();
    });

    window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", updatePointer, { passive: true });
  window.addEventListener("touchstart", updatePointer, { passive: true });
  window.addEventListener("touchmove", updatePointer, { passive: true });
  window.addEventListener("mouseleave", releasePointer, { passive: true });
  window.addEventListener("touchend", releasePointer, { passive: true });
  resize();
  draw(0);
}
