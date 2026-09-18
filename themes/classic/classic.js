/* CLASSIC — interactions */
(() => {
  "use strict";

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const rand = (a, b) => Math.random() * (b - a) + a;

  let music, musicReady = Promise.resolve(), popupTimer;

  function popup(text, ms = 2800) {
    const p = $(".normal-popup");
    if (!p) return;
    p.textContent = text;
    p.classList.add("is-visible");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => p.classList.remove("is-visible"), ms);
  }

  async function initMusic() {
    music = $("#birthdayMusic");
    const btn = $("#musicToggle");
    if (!music || !btn) return;

    musicReady = (async () => {
      try {
        const r = await fetch("data.json", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (d.music) {
          music.src = d.music;
          music.loop = true;
          music.load();
        }
      } catch (e) {
        console.error(e);
      }
    })();

    const updateIcon = () => {
      btn.textContent = music.paused || music.muted ? "🔇" : "🔊";
      btn.setAttribute("aria-label", music.paused || music.muted ? "Play music" : "Mute music");
      btn.title = music.paused || music.muted ? "Play music" : "Mute music";
    };

    btn.addEventListener("click", async e => {
      e.stopPropagation();
      await musicReady;
      try {
        if (music.paused) {
          music.muted = false;
          await music.play();
        } else {
          music.muted = !music.muted;
        }
      } catch (e) {
        console.error(e);
      }
      updateIcon();
    });

    music.addEventListener("play", updateIcon);
    music.addEventListener("pause", updateIcon);
    updateIcon();
  }

  function startAmbient() {
    const root = $(".ambient-particles");
    if (!root) return;

    const spawn = () => {
      const p = document.createElement("span");
      p.className = "ambient-particle" + (Math.random() > .72 ? " star" : "");
      p.textContent = p.classList.contains("star") ? "✦" : "";
      p.style.left = `${rand(2, 98)}vw`;
      p.style.top = `${rand(90, 105)}vh`;
      p.style.setProperty("--drift", `${rand(-90, 90)}px`);
      p.style.animationDuration = `${rand(7, 12)}s`;
      root.appendChild(p);
      setTimeout(() => p.remove(), 13000);
    };

    const amount = matchMedia("(max-width:700px)").matches ? 2 : 4;
    setInterval(() => {
      for (let i = 0; i < amount; i++) setTimeout(spawn, i * 120);
    }, 1800);
  }

  function confetti(count = 80) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "normal-confetti";
      p.style.left = `${rand(0, 100)}vw`;
      p.style.setProperty("--x", `${rand(-180, 180)}px`);
      p.style.animationDuration = `${rand(2.8, 5)}s`;
      p.style.animationDelay = `${rand(0, .5)}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 6000);
    }
  }

  function initIntro() {
    const intro = $(".normal-intro");
    const card = $(".card-cover");
    if (!intro || !card) return;

    card.addEventListener("click", async () => {
      await musicReady;
      try {
        if (music && music.paused) await music.play();
      } catch {}
      intro.classList.add("is-hidden");
      $(".normal-main")?.classList.add("is-visible");
    });
  }

  function initReveal() {
    const els = $$(".normal-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(e => e.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    }), { threshold: .12 });

    els.forEach(e => io.observe(e));
  }

  function initGallery() {
    const box = $("#normalLightbox");
    const image = $("#lightboxImage");
    if (!box || !image) return;

    $$(".normal-photo").forEach(card => {
      const img = $("img", card);
      if (!img || !img.getAttribute("src")) {
        card.style.display = "none";
        return;
      }

      card.addEventListener("click", () => {
        image.src = img.currentSrc || img.src;
        image.alt = img.alt;
        box.classList.add("is-open");
        box.setAttribute("aria-hidden", "false");
      });
    });

    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      image.removeAttribute("src");
    };

    box.addEventListener("click", close);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") close();
    });
  }

  function initCake() {
    const cake = $("#birthdayCakeModel");
    const box = $("#cakeBox");
    const hint = $(".cake-hint");
    if (!cake || !box || !hint) return;

    const activate = () => {
      hint.textContent = "Happy Birthday! 🎉";
      box.classList.remove("is-cutting", "is-cut", "is-celebrating");
      void box.offsetWidth;
      box.classList.add("is-celebrating");
      confetti(35);
      popup("Happy Birthday! 🎂🎉", 3200);
      setTimeout(() => box.classList.remove("is-celebrating"), 900);
    };

    // The model itself stays static; the box handles the click.
    box.addEventListener("click", activate);
    box.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", "Celebrate with the birthday cake");
  }

  function initEnvelope() {
    const env = $("#birthdayEnvelope");
    const msg = $("#envelopeMessage");
    if (!env || !msg) return;

    env.addEventListener("click", () => {
      env.classList.toggle("is-open");
      msg.classList.toggle("is-visible");
    });
  }

  function initFinal() {
    const btn = $("[data-normal-action='celebrate']");
    const celebration = $("#celebration");
    if (!btn || !celebration) return;

    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();

      celebration.classList.add("is-visible");
      celebration.setAttribute("aria-hidden", "false");
      confetti(matchMedia("(max-width:700px)").matches ? 45 : 90);
      popup("A little celebration just for you ♥", 4000);
    });

    celebration.addEventListener("click", () => {
      celebration.classList.remove("is-visible");
      celebration.setAttribute("aria-hidden", "true");
    });
  }

  initMusic();
  initIntro();
  initReveal();
  initGallery();
  initCake();
  initEnvelope();
  initFinal();
  startAmbient();
})();
