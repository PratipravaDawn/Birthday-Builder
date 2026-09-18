(() => {
"use strict";

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];

const intro = $("#dreamIntro");
const enter = $("#enterDream");
const main = $("#dreamMain");
const moon = $("#dreamMoon");
const lightbox = $("#photoLightbox");
const lightboxImage = $("#lightboxImage");

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
}

/* Intro */
enter?.addEventListener("click", () => {
  playBirthdayMusic();
  intro?.classList.add("is-hidden");
  document.body.classList.add("dream-started");
  setTimeout(() => $("#hero")?.focus?.(), 500);
});

/* Buttons */
$$(".scroll-next").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    scrollToSection(btn.dataset.target);
  });
});

/* Stars */
function addStars() {
  const field = $("#starField");
  if (!field) return;
  const count = matchMedia("(max-width:700px)").matches ? 34 : 62;

  for (let i=0;i<count;i++) {
    const star = document.createElement("span");
    star.className = "dream-star" + (i % 11 === 0 ? " special" : "");
    star.style.left = `${3 + Math.random()*94}%`;
    star.style.top = `${5 + Math.random()*86}%`;
    star.style.setProperty("--dur", `${2.2 + Math.random()*3.8}s`);
    star.style.animationDelay = `${Math.random()*4}s`;

    if (star.classList.contains("special")) {
      star.addEventListener("click", () => sparkleAt(star));
    }
    field.appendChild(star);
  }
}
function sparkleAt(source) {
  for (let i=0;i<9;i++) {
    const s = document.createElement("span");
    s.className = "dream-star";
    s.style.position = "fixed";
    const r = source.getBoundingClientRect();
    s.style.left = `${r.left + (Math.random()-.5)*40}px`;
    s.style.top = `${r.top + (Math.random()-.5)*40}px`;
    s.style.animation = "twinkle .7s ease-out forwards";
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),800);
  }
}
function shootingStar() {
  const layer = $("#shootingStars");
  if (!layer || document.hidden) return;
  const s = document.createElement("span");
  s.className = "shooting-star";
  s.style.left = `${70 + Math.random()*35}%`;
  s.style.top = `${8 + Math.random()*45}%`;
  layer.appendChild(s);
  setTimeout(()=>s.remove(),1400);
}
function scheduleShootingStar() {
  shootingStar();
  setTimeout(scheduleShootingStar, 5000 + Math.random()*8000);
}
addStars();
setTimeout(scheduleShootingStar, 3500);

/* Moon */
moon?.addEventListener("click", () => {
  moon.animate(
    [{transform:"scale(1)"},{transform:"scale(1.12)"},{transform:"scale(1)"}],
    {duration:650,easing:"ease-out"}
  );
  sparkleAt(moon);
});

/* Reveal */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold:.14});
$$(".reveal").forEach(el => revealObserver.observe(el));

/* Gallery */
function openLightbox(src, alt) {
  if (!src) return;
  lightboxImage.src = src;
  lightboxImage.alt = alt || "Birthday memory";
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden","true");
  lightboxImage.removeAttribute("src");
  document.body.style.overflow = "";
}
$$(".memory-photo").forEach(card => {
  const img = $("img", card);
  if (!img?.getAttribute("src")) {
    card.remove();
    return;
  }
  card.addEventListener("click", () => openLightbox(img.src, img.alt));
});
lightbox?.addEventListener("click", closeLightbox);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeLightbox();
});

/* Cake */
// The pond cake is a visual birthday moment only.
// No floating HTML candles or cake-cutting interaction.
const cakeWish = $("#cakeWish");
cakeWish?.classList.add("show");


/* Paint Your Wish */
const wishCanvas = $("#wishCanvas");
const paintHint = $("#paintHint");
const clearWish = $("#clearWish");
const finishWish = $("#finishWish");
const wishInSky = $("#wishInSky");
const paintTools = $$(".paint-tool");

let paintCtx = null;
let paintTool = "brush";
let painting = false;
let lastPoint = null;
let hasPaint = false;

function resizeWishCanvas(preserve = false) {
  if (!wishCanvas) return;

  const rect = wishCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const old = preserve && wishCanvas.width && wishCanvas.height
    ? document.createElement("canvas")
    : null;

  if (old) {
    old.width = wishCanvas.width;
    old.height = wishCanvas.height;
    old.getContext("2d").drawImage(wishCanvas, 0, 0);
  }

  wishCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  wishCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  paintCtx = wishCanvas.getContext("2d");
  paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (old) {
    paintCtx.drawImage(old, 0, 0, old.width, old.height, 0, 0, rect.width, rect.height);
  }
}

function canvasPoint(event) {
  const rect = wishCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function drawMark(x, y) {
  if (!paintCtx) return;

  if (paintTool === "star") {
    paintCtx.save();
    paintCtx.shadowColor = "#ffe28b";
    paintCtx.shadowBlur = 18;
    paintCtx.fillStyle = "#ffe28b";
    paintCtx.font = "26px serif";
    paintCtx.textAlign = "center";
    paintCtx.textBaseline = "middle";
    paintCtx.fillText("✦", x, y);
    paintCtx.restore();
    return;
  }

  if (paintTool === "heart") {
    paintCtx.save();
    paintCtx.shadowColor = "#ffd7e5";
    paintCtx.shadowBlur = 16;
    paintCtx.fillStyle = "#ffd7e5";
    paintCtx.font = "25px serif";
    paintCtx.textAlign = "center";
    paintCtx.textBaseline = "middle";
    paintCtx.fillText("♥", x, y);
    paintCtx.restore();
    return;
  }

  if (paintTool === "glow") {
    paintCtx.save();
    const g = paintCtx.createRadialGradient(x, y, 0, x, y, 24);
    g.addColorStop(0, "rgba(255,238,169,.95)");
    g.addColorStop(.28, "rgba(255,221,111,.48)");
    g.addColorStop(1, "rgba(255,221,111,0)");
    paintCtx.fillStyle = g;
    paintCtx.beginPath();
    paintCtx.arc(x, y, 24, 0, Math.PI * 2);
    paintCtx.fill();
    paintCtx.restore();
    return;
  }

  paintCtx.save();
  paintCtx.strokeStyle = "#ffe7a4";
  paintCtx.lineWidth = 3;
  paintCtx.lineCap = "round";
  paintCtx.lineJoin = "round";
  paintCtx.shadowColor = "#ffe19a";
  paintCtx.shadowBlur = 7;
  paintCtx.beginPath();
  paintCtx.moveTo(lastPoint.x, lastPoint.y);
  paintCtx.lineTo(x, y);
  paintCtx.stroke();
  paintCtx.restore();
}

function startPaint(event) {
  if (!wishCanvas || !paintCtx) return;
  event.preventDefault();

  painting = true;
  lastPoint = canvasPoint(event);
  hasPaint = true;
  paintHint?.classList.add("is-hidden");

  if (wishCanvas.setPointerCapture) {
    try { wishCanvas.setPointerCapture(event.pointerId); } catch {}
  }

  if (paintTool !== "brush") {
    drawMark(lastPoint.x, lastPoint.y);
  }
}

function movePaint(event) {
  if (!painting || !wishCanvas || !paintCtx) return;
  event.preventDefault();

  const point = canvasPoint(event);

  if (paintTool === "brush") {
    drawMark(point.x, point.y);
  } else {
    drawMark(point.x, point.y);
  }

  lastPoint = point;
}

function stopPaint() {
  painting = false;
  lastPoint = null;
}

if (wishCanvas) {
  resizeWishCanvas();
  wishCanvas.addEventListener("pointerdown", startPaint);
  wishCanvas.addEventListener("pointermove", movePaint);
  wishCanvas.addEventListener("pointerup", stopPaint);
  wishCanvas.addEventListener("pointercancel", stopPaint);
  wishCanvas.addEventListener("pointerleave", stopPaint);

  window.addEventListener("resize", () => resizeWishCanvas(true));
}

paintTools.forEach(tool => {
  tool.addEventListener("click", () => {
    paintTool = tool.dataset.tool || "brush";
    paintTools.forEach(t => t.classList.toggle("active", t === tool));
  });
});

clearWish?.addEventListener("click", () => {
  if (!wishCanvas || !paintCtx) return;
  const rect = wishCanvas.getBoundingClientRect();
  paintCtx.clearRect(0, 0, rect.width, rect.height);
  hasPaint = false;
  paintHint?.classList.remove("is-hidden");
});

finishWish?.addEventListener("click", () => {
  if (!wishCanvas || !hasPaint) {
    scrollToSection("finale");
    return;
  }

  const dataUrl = wishCanvas.toDataURL("image/png");
  if (wishInSky) {
    wishInSky.style.backgroundImage = `url("${dataUrl}")`;
    wishInSky.parentElement?.classList.add("wish-ready");
  }
  scrollToSection("finale");
});

/* Final sky */
const finaleObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const layer = $("#finaleStars");
    if (!layer || layer.dataset.started) return;
    layer.dataset.started = "1";

    const count = matchMedia("(max-width:700px)").matches ? 28 : 55;
    for (let i=0;i<count;i++) {
      const s = document.createElement("span");
      s.className = "final-spark";
      s.style.left = `${Math.random()*100}%`;
      s.style.top = `${55 + Math.random()*45}%`;
      s.style.setProperty("--dx", `${(Math.random()-.5)*180}px`);
      s.style.animationDelay = `${Math.random()*1.8}s`;
      layer.appendChild(s);
    }
  });
}, {threshold:.35});
const finale = $("#finale");
if (finale) finaleObserver.observe(finale);

/* Music */
let birthdayMusic = null;
let musicReady = Promise.resolve();

function playBirthdayMusic() {
  return birthdayMusic ? birthdayMusic.play().catch(()=>{}) : Promise.resolve();
}
async function initMusic() {
  const audio = $("#birthdayMusic");
  const button = $("#musicToggle");
  if (!audio) return;

  birthdayMusic = audio;
  musicReady = (async () => {
    try {
      const response = await fetch("data.json", {cache:"no-store"});
      if (!response.ok) return;
      const data = await response.json();
      if (!data.music) {
        if (button) button.textContent = "♪";
        return;
      }
      audio.src = data.music;
      audio.loop = true;
      audio.load();
    } catch (err) {
      console.error("Dreamy music:", err);
    }
  })();

  button?.addEventListener("click", async () => {
    await musicReady;
    try {
      if (audio.paused) {
        audio.muted = false;
        await audio.play();
        button.textContent = "🔊";
      } else {
        audio.muted = !audio.muted;
        button.textContent = audio.muted ? "🔇" : "🔊";
      }
    } catch (err) {
      console.error("Music playback:", err);
    }
  });
}
initMusic();
})();
