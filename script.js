    const canvas = document.getElementById("art");
    const ctx = canvas.getContext("2d");
    const source = document.createElement("canvas");
    source.width = 480;
    source.height = 380;
    const art = source.getContext("2d", { willReadFrequently: true });
    const toggle = document.getElementById("toggle");
    const timeline = document.getElementById("timeline");
    const elapsedLabel = document.getElementById("elapsed");
    const colorButton = document.getElementById("color-button");
    const speedButton = document.getElementById("speed-button");
    const ramp = ".:;=+*xo%#&@";
    const glitch = "01<>{}[]#$%&*+=?!ABXZ";
    const petals = [];
    const palettes = [
      { name: "Rose", halo: [203, 45, 99], stops: [[179, 5, 51], [255, 31, 97], [255, 107, 158], [255, 204, 216]] },
      { name: "Violet", halo: [137, 82, 210], stops: [[63, 24, 117], [123, 58, 205], [190, 133, 239], [239, 216, 255]] },
      { name: "Blue", halo: [57, 123, 215], stops: [[9, 48, 119], [35, 101, 193], [105, 174, 241], [213, 239, 255]] },
      { name: "Sunset", halo: [232, 103, 47], stops: [[135, 32, 18], [220, 73, 29], [255, 143, 59], [255, 218, 147]] }
    ];
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    let running = true;
    let seeking = false;
    let time = 0;
    let previous = performance.now();
    let paletteIndex = 0;
    let speedIndex = 2;

    function smooth(a, b, x) {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    }

    function seeded(n) {
      const value = Math.sin(n * 127.1 + 8.7) * 43758.5453;
      return value - Math.floor(value);
    }

    function colorAt(progress, tint) {
      const stops = palettes[paletteIndex].stops;
      const position = Math.max(0, Math.min(0.999, progress)) * (stops.length - 1);
      const index = Math.floor(position);
      const mix = position - index;
      const color = stops[index].map((value, i) =>
        Math.round((value * (1 - mix) + stops[index + 1][i] * mix) * tint)
      );
      return `rgb(${color[0]},${color[1]},${color[2]})`;
    }

    const layers = [
      { count: 6, length: 1.00, width: 0.34, open: 80, start: 2.0, end: 5.2, azimuth: 0.00, tint: 1.00 },
      { count: 6, length: 0.80, width: 0.30, open: 58, start: 2.3, end: 5.5, azimuth: Math.PI / 6, tint: 0.95 },
      { count: 5, length: 0.62, width: 0.27, open: 40, start: 2.6, end: 5.8, azimuth: 0.30, tint: 0.90 },
      { count: 4, length: 0.46, width: 0.24, open: 26, start: 2.9, end: 6.1, azimuth: 0.90, tint: 0.85 }
    ];

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const index = layerIndex * 10 + i;
        petals.push({
          ...layer,
          layer: layerIndex,
          index,
          angle: layer.azimuth + Math.PI * 2 * i / layer.count + (seeded(index) - 0.5) * 0.16,
          length: layer.length * (0.95 + seeded(index + 30) * 0.1),
          start: layer.start + (seeded(index + 50) - 0.5) * 0.2,
          delay: 7.6 + layerIndex * 0.22 + seeded(index + 80) * 0.35
        });
      }
    });

    function drawPetal(petal, t, cx, cy, scale) {
      const progress = smooth(petal.start, petal.end, t);
      const drift = Math.max(0, t - petal.delay);
      const fade = 1 - smooth(petal.delay + 0.05, petal.delay + 1.5, t);
      if (fade <= 0.01) return;

      const length = petal.length * scale * (0.12 + 0.88 * progress);
      const width = petal.width * scale * (0.2 + 0.8 * progress);
      const opening = petal.open * Math.PI / 180 * progress;
      const angle = petal.angle + 0.4 + t * 0.32;
      const outward = 0.08 + Math.sin(opening) * length * 0.18;
      const driftRadius = drift * drift * 60;
      const x = cx + Math.cos(angle) * (outward + driftRadius) - Math.sin(angle) * drift * 18;
      const y = cy + Math.sin(angle) * (outward + driftRadius) - Math.cos(opening) * length * 0.12 - drift * drift * 10;

      art.save();
      art.translate(x, y);
      art.rotate(angle);
      art.globalAlpha = fade;

      const tip = length * Math.sin(opening) + length * 0.1;
      const lift = length * Math.cos(opening) * 0.30;
      art.beginPath();
      art.moveTo(0, 0);
      art.bezierCurveTo(tip * 0.22, -width * 0.55 - lift * 0.15, tip * 0.72, -width * 0.62 - lift * 0.45, tip, -lift);
      art.bezierCurveTo(tip * 1.02, -lift + width * 0.4, tip * 0.75, -lift + width * 0.88, tip * 0.48, -lift + width * 0.74);
      art.bezierCurveTo(tip * 0.25, -lift + width * 0.63, tip * 0.12, width * 0.45, 0, 0);
      art.closePath();

      const gradient = art.createLinearGradient(0, 0, tip, -lift);
      gradient.addColorStop(0, colorAt(0, petal.tint));
      gradient.addColorStop(0.48, colorAt(0.52, petal.tint));
      gradient.addColorStop(1, colorAt(1, petal.tint));
      art.fillStyle = gradient;
      art.fill();

      art.strokeStyle = `rgba(255,230,238,${0.18 + progress * 0.24})`;
      art.lineWidth = 0.7;
      art.beginPath();
      art.moveTo(2, 0);
      art.quadraticCurveTo(tip * 0.52, -lift * 0.55, tip, -lift);
      art.stroke();

      if (drift > 0) {
        art.fillStyle = colorAt((petal.index % 7) / 7, petal.tint);
        for (let i = 0; i < 10; i++) {
          const angle = i * 2.4 + t * 3 + petal.index;
          const radius = 4 + ((i * 13 + petal.index * 7) % 25);
          art.globalAlpha = fade * 0.8;
          art.fillRect(tip * 0.65 + Math.cos(angle) * radius, -lift + Math.sin(angle) * radius, 1.4, 1.4);
        }
      }
      art.restore();
    }

    function drawScene(t) {
      const width = source.width;
      const height = source.height;
      art.fillStyle = "#020309";
      art.fillRect(0, 0, width, height);

      const grow = smooth(2.2, 6.1, t);
      const fly = smooth(7.6, 9.0, t);
      const cx = width * 0.5 - fly * 5;
      const cy = height * 0.57 - fly * 28;
      const haloColor = palettes[paletteIndex].halo;
      const halo = art.createRadialGradient(cx, cy, 2, cx, cy, 150);
      halo.addColorStop(0, `rgba(${haloColor.join(",")},${0.08 + grow * 0.07})`);
      halo.addColorStop(1, "rgba(2,3,9,0)");
      art.fillStyle = halo;
      art.fillRect(0, 0, width, height);

      const stem = smooth(1.0, 3.2, t);
      if (stem > 0) {
        art.strokeStyle = "#3b8050";
        art.lineWidth = 3;
        art.beginPath();
        art.moveTo(width * 0.5, height);
        art.quadraticCurveTo(width * 0.49, height * 0.79, cx, cy + 10);
        art.stroke();
        art.fillStyle = "#347344";
        art.beginPath();
        art.ellipse(width * 0.5 - 24, height * 0.82, 24 * stem, 8 * stem, -0.5, 0, Math.PI * 2);
        art.fill();
        art.beginPath();
        art.ellipse(width * 0.5 + 25, height * 0.76, 26 * stem, 8 * stem, 0.48, 0, Math.PI * 2);
        art.fill();
      }

      for (let i = petals.length - 1; i >= 0; i--) {
        drawPetal(petals[i], t, cx, cy, 150);
      }

      const centerSize = 2 + smooth(3, 5.5, t) * 18;
      const centerFade = 1 - smooth(8.7, 9.7, t);
      for (let i = 0; i < 520; i++) {
        const radius = Math.sqrt((i + 0.5) / 520);
        const angle = i * 2.39996323;
        art.globalAlpha = centerFade;
        art.fillStyle = radius < 0.45 ? "#ffd164" : "#e89532";
        art.fillRect(cx + Math.cos(angle) * radius * centerSize, cy + Math.sin(angle) * radius * centerSize * 0.72, 1.3, 1.3);
      }
      art.globalAlpha = 1;
    }

    function drawTyping(t) {
      const message = "Nierabasma()";
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.56;
      ctx.save();
      ctx.font = "bold 12px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (t < 0.3) {
        if (Math.floor(t * 4) % 2 === 0) ctx.fillText("_", centerX, centerY);
      } else if (t < 0.85) {
        const count = Math.floor((t - 0.3) / 0.55 * message.length) + 1;
        ctx.fillText(message.slice(0, count) + "_", centerX, centerY);
      } else if (t < 1.3) {
        const progress = 1 - (t - 0.85) / 0.45;
        for (let i = 0; i < message.length; i++) {
          if (seeded(i + Math.floor(t * 30)) > progress) continue;
          const char = seeded(i * 5 + Math.floor(t * 70)) < 0.6
            ? glitch[Math.floor(seeded(i + Math.floor(t * 100)) * glitch.length)]
            : message[i];
          ctx.fillStyle = `rgba(255,${Math.floor(255 * progress * 0.6)},${Math.floor(255 * progress * 0.75)},1)`;
          ctx.fillText(char, centerX - message.length * 5 + i * 10 + 5, centerY);
        }
      } else if (t > 9.35 && Math.floor(t * 2.2) % 2 === 0) {
        ctx.fillStyle = "#dce6ff";
        ctx.fillText("_", centerX, centerY);
      }
      ctx.restore();
    }

    function render(t) {
      drawScene(t);
      const pixels = art.getImageData(0, 0, source.width, source.height).data;
      const columns = Math.min(112, Math.max(42, Math.floor(canvas.clientWidth / 7.5)));
      const cellWidth = canvas.width / columns;
      const cellHeight = cellWidth * 1.2;
      const rows = Math.floor(canvas.height / cellHeight);
      const fontSize = cellWidth * 1.25;
      ctx.fillStyle = "#020309";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${fontSize}px Consolas, 'DejaVu Sans Mono', monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          let red = 0;
          let green = 0;
          let blue = 0;
          let luminance = 0;
          const x0 = Math.floor(col * source.width / columns);
          const x1 = Math.max(x0 + 1, Math.floor((col + 1) * source.width / columns));
          const y0 = Math.floor(row * source.height / rows);
          const y1 = Math.max(y0 + 1, Math.floor((row + 1) * source.height / rows));
          const samples = (x1 - x0) * (y1 - y0);
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const offset = (y * source.width + x) * 4;
              const r = pixels[offset];
              const g = pixels[offset + 1];
              const b = pixels[offset + 2];
              red += r;
              green += g;
              blue += b;
              luminance += (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
            }
          }
          const brightness = luminance / samples;
          if (brightness < 0.035) continue;
          const shade = Math.pow(brightness, 0.58);
          const index = Math.min(ramp.length - 1, Math.floor(shade * (ramp.length - 1)));
          ctx.fillStyle = `rgb(${Math.min(255, Math.round(red / samples * 1.28 + 14))},${Math.min(255, Math.round(green / samples * 1.24 + 10))},${Math.min(255, Math.round(blue / samples * 1.2 + 12))})`;
          ctx.fillText(ramp[index], col * cellWidth, row * cellHeight);
        }
      }
      drawTyping(t);
    }

    function frame(now) {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (running && !seeking) {
        time = (time + delta * speeds[speedIndex]) % 10;
        timeline.value = time.toFixed(2);
      }
      elapsedLabel.textContent = time.toFixed(1);
      render(time);
      requestAnimationFrame(frame);
    }

    toggle.addEventListener("click", () => {
      running = !running;
      toggle.textContent = running ? "Pause" : "Play";
    });
    colorButton.addEventListener("click", () => {
      paletteIndex = (paletteIndex + 1) % palettes.length;
      colorButton.textContent = `Flower color: ${palettes[paletteIndex].name}`;
      render(time);
    });
    speedButton.addEventListener("click", () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      speedButton.textContent = `Speed: ${speeds[speedIndex]}x`;
    });
    timeline.addEventListener("input", () => {
      time = Number(timeline.value);
      elapsedLabel.textContent = time.toFixed(1);
      render(time);
    });
    timeline.addEventListener("pointerdown", () => { seeking = true; });
    timeline.addEventListener("pointerup", () => { seeking = false; });
    timeline.addEventListener("keydown", () => { seeking = true; });
    timeline.addEventListener("keyup", () => { seeking = false; });
    requestAnimationFrame(frame);
