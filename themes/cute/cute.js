/* CUTE BIRTHDAY THEME */
(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const random = (min, max) => Math.random() * (max - min) + min;

  let popupTimer;
  let birthdayMusic = null;
  let birthdayMusicReady = Promise.resolve();

  const removeAfter = (element, ms) => setTimeout(() => element.remove(), ms);

  /* ---------- Music ---------- */

  function playBirthdayMusic() {
    return birthdayMusic ? birthdayMusic.play().catch(() => {}) : Promise.resolve();
  }

  async function initMusic() {
    const music = $("#birthdayMusic");
    const button = $("#musicToggle");
    if (!music) return;

    birthdayMusic = music;

    birthdayMusicReady = (async () => {
      try {
        const response = await fetch("data.json", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.music) return;

        music.src = data.music;
        music.loop = true;
        music.preload = "auto";
        music.load();

        // One autoplay attempt. The envelope click is the fallback user gesture.
        await playBirthdayMusic();
        if (button) button.textContent = music.paused ? "Music" : "Playing";
      } catch (error) {
        console.error("Music error:", error);
      }
    })();

    button?.addEventListener("click", async () => {
      await birthdayMusicReady;
      try {
        if (music.paused) {
          music.muted = false;
          await music.play();
          button.textContent = "Playing";
        } else {
          music.muted = !music.muted;
          button.textContent = music.muted ? "Muted" : "Playing";
        }
      } catch (error) {
        console.error("Music playback failed:", error);
      }
    });
  }

  /* ---------- Intro ---------- */

  function initCuteIntro() {
    const intro = $(".cute-intro");
    const envelope = $(".envelope");
    if (!intro || !envelope) return;

    let opened = false;

    const open = async () => {
      if (opened) return;
      opened = true;

      // User gesture fallback for blocked autoplay.
      await birthdayMusicReady;
      await playBirthdayMusic();

      envelope.classList.add("is-open");
      sparkleBurst(innerWidth / 2, innerHeight / 2, 18);
      spawnHearts(10);

      setTimeout(() => {
        intro.classList.add("is-hidden");
        $(".cute-main")?.classList.add("is-visible");
      }, 1100);
    };

    envelope.addEventListener("click", open);
    envelope.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  }

  /* ---------- Scroll Reveal ---------- */

  function initScrollReveal() {
    const elements = $$(".cute-reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);

        if (entry.target.classList.contains("cute-final")) {
          launchBalloons(12);
          sparkleBurst(innerWidth / 2, innerHeight * .45, 16);
        }
      });
    }, { threshold: .15 });

    elements.forEach(element => observer.observe(element));
  }

  /* ---------- Floating Particles ---------- */

/* ---------- Floating Particles ---------- */

function spawnFloatSymbol() {
    const element = document.createElement("span");

    element.className = "cute-float";
    element.textContent =
        Math.random() < 0.55 ? "💗" : "🌸";

    element.style.left = `${random(5, 95)}vw`;
    element.style.top = `${random(78, 105)}vh`;
    element.style.setProperty("--drift", `${random(-120, 120)}px`);
    element.style.setProperty("--rotation", `${random(-180, 180)}deg`);
    element.style.animationDuration = `${random(6, 10)}s`;

    document.body.appendChild(element);
    removeAfter(element, 10500);
}

function spawnHearts(count = 8) {
    for (let i = 0; i < count; i++) {
        setTimeout(spawnFloatSymbol, i * 100);
    }
}

function startFloatingSymbols() {
    setInterval(spawnFloatSymbol, 1500);
}

  /* ---------- Photo Lightbox ---------- */

  function initPhotoGallery() {
    const lightbox = $(".cute-lightbox");
    const image = $("img", lightbox);
    const photos = $$(".cute-photo img");

    if (!lightbox || !image || !photos.length) return;

    const close = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      image.src = "";
    };

    photos.forEach(photo => {
      photo.parentElement.addEventListener("click", () => {
        image.src = photo.currentSrc || photo.src;
        image.alt = photo.alt;
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
      });
    });

    lightbox.addEventListener("click", close);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") close();
    });
  }

  /* ---------- Popup ---------- */

  function showCutePopup(text, duration = 3000) {
    const popup = $(".cute-popup");
    if (!popup) return;
    popup.textContent = text;
    popup.classList.add("is-visible");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => popup.classList.remove("is-visible"), duration);
  }

  /* ---------- Sparkles ---------- */

  function sparkleBurst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement("span");
      sparkle.className = "cute-sparkle";
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = random(45, 130);
      sparkle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);

      document.body.appendChild(sparkle);
      removeAfter(sparkle, 900);
    }
  }

  /* ---------- Sparkly Cursor ---------- */

  function initSparklyCursor() {
    if (!matchMedia("(pointer:fine)").matches) return;

    let lastX = 0;
    let lastY = 0;

    document.addEventListener("mousemove", event => {
      const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      if (distance < 22) return;

      lastX = event.clientX;
      lastY = event.clientY;

      const sparkle = document.createElement("span");
      sparkle.className = "cursor-sparkle";
      sparkle.style.left = `${event.clientX}px`;
      sparkle.style.top = `${event.clientY}px`;
      sparkle.style.setProperty("--dx", `${random(-12, 12)}px`);
      sparkle.style.setProperty("--dy", `${random(8, 22)}px`);

      document.body.appendChild(sparkle);
      removeAfter(sparkle, 750);
    });
  }

  /* ---------- Gift ---------- */

  let giftTimer;

  async function showRandomGiftGif(gift) {
    try {
      const response = await fetch("gifs/gifs.json", { cache: "no-store" });
      const gifs = await response.json();
      if (!Array.isArray(gifs) || !gifs.length) return;

      clearTimeout(giftTimer);

      const gif = gifs[Math.floor(Math.random() * gifs.length)];
      let image = $(".cute-gift-random-gif", gift);
      if (!image) {
        image = document.createElement("img");
        image.className = "cute-gift-random-gif";
        image.alt = "Cute birthday surprise";
        gift.appendChild(image);
      }

      image.src = `gifs/${gif}`;
      gift.classList.add("is-open");

      giftTimer = setTimeout(() => {
        gift.classList.remove("is-open");
      }, 5000);
    } catch (error) {
      console.error("Could not load gift GIFs:", error);
    }
  }

  function initGift() {
    $$(".cute-gift").forEach(gift => {
      const open = () => {
        gift.classList.remove("shake");
        void gift.offsetWidth;
        gift.classList.add("shake");
        showRandomGiftGif(gift);
      };

      gift.addEventListener("click", open);
      gift.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }

  /* ---------- Cake ---------- */

  function initCake() {
    const cake = $("#birthdayCakeModel");
    const knife = $(".cute-knife");
    const smoke = $(".cute-cake-smoke");
    const hint = $(".cake-hint");
    if (!cake) return;

    // 0 = candles burning, 1 = blown out, 2 = cut, 3+ = celebrating
    let state = 0;

    // The candles' flames are separate geometry in the model (their own
    // "fire" nodes sharing one "fire" material), so blowing them out is
    // done through model-viewer's real material API rather than faking it.
    const extinguishFlames = () => {
      try {
        const material = cake.model?.materials?.find(m => m.name === "fire") || cake.model?.materials?.[5];
        if (!material) return;
        material.setAlphaMode?.("BLEND");
        material.pbrMetallicRoughness?.setBaseColorFactor?.([1, 1, 1, 0]);
      } catch (error) {
        console.error("Cake material error:", error);
      }
    };

    const blowOutCandles = () => {
      extinguishFlames();
      smoke?.classList.add("is-blown");
      if (hint) hint.textContent = "Now cut the cake";
      showCutePopup("Make a wish!", 2200);
    };

    const cutCake = () => {
      cake.classList.add("is-cut");
      knife?.classList.add("is-cut");

      try {
        cake.cameraOrbit = "-12deg 72deg auto";
        setTimeout(() => { cake.cameraOrbit = "12deg 72deg auto"; }, 350);
        setTimeout(() => { cake.cameraOrbit = "0deg 72deg auto"; }, 700);
      } catch (_) {}

      setTimeout(() => {
        const rect = cake.getBoundingClientRect();
        sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height * .35, 20);
        if (hint) hint.textContent = "Click the cake again";
      }, 700);
    };

    const celebrate = () => {
      const rect = cake.getBoundingClientRect();
      sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height * .35, 24);
      launchConfetti(45);
      launchBalloons(10);
      spawnHearts(10);
      if (hint) hint.textContent = "Happy Birthday!";
      showCutePopup("HAPPY BIRTHDAY!", 3500);
    };

    const handleCakeInteraction = () => {
      if (state === 0) {
        state = 1;
        blowOutCandles();
      } else if (state === 1) {
        state = 2;
        cutCake();
      } else {
        state = 3;
        celebrate();
      }
    };

    cake.addEventListener("click", handleCakeInteraction);
    cake.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCakeInteraction();
      }
    });
  }

  /* ---------- Balloons ---------- */

  function launchBalloons(count = 12) {
    const container = $(".final-balloons");
    if (!container || container.dataset.started === "true") return;

    container.dataset.started = "true";
    const colors = ["#ff8fb9", "#c9a7ff", "#ffe69a", "#b9efd8", "#ffb2cf"];

    for (let i = 0; i < count; i++) {
      const balloon = document.createElement("span");
      balloon.className = "cute-balloon";
      balloon.style.left = `${random(3, 94)}%`;
      balloon.style.background = colors[i % colors.length];
      balloon.style.color = colors[i % colors.length];
      balloon.style.animationDuration = `${random(7, 11)}s`;
      balloon.style.animationDelay = `${random(0, 2)}s`;
      balloon.style.setProperty("--drift", `${random(-90, 90)}px`);
      balloon.style.setProperty("--rotation", `${random(-15, 15)}deg`);
      container.appendChild(balloon);
      removeAfter(balloon, 13000);
    }
  }

  /* ---------- Confetti / Final Celebration ---------- */

  function launchConfetti(count = 45) {
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "cute-confetti";
      piece.style.left = `${random(0, 100)}vw`;
      piece.style.setProperty("--x", `${random(-160, 160)}px`);
      piece.style.animationDuration = `${random(2.5, 5)}s`;
      piece.style.animationDelay = `${random(0, .7)}s`;
      document.body.appendChild(piece);
      removeAfter(piece, 6000);
    }
  }

  function initCelebrationButton() {
    $("[data-cute-celebrate]")?.addEventListener("click", event => {
      const button = event.currentTarget;
      launchBalloons(14);
      spawnHearts(20);
      launchConfetti(80);
      sparkleBurst(innerWidth / 2, innerHeight / 2, 30);
      showCutePopup(button.dataset.cuteCelebrate || "Happy Birthday!", 4500);
    });
  }

  initMusic();
  initCuteIntro();
  startFloatingSymbols();
  initScrollReveal();
  initPhotoGallery();
  initSparklyCursor();
  initGift();
  initCake();
  initCelebrationButton();
})();
