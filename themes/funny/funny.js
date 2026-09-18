/* =========================================================
   FUNNY BIRTHDAY THEME
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const random = (min, max) =>
    Math.random() * (max - min) + min;

  const removeAfter = (element, ms) =>
    setTimeout(() => element.remove(), ms);

  /* ---------- Funny Intro ---------- */

  function initFunnyIntro() {
    const intro = $(".funny-intro");
    if (!intro) return;

    const button = $("[data-funny-start]", intro);
    const bar = $(".funny-loading-bar", intro);

    let started = false;

    const start = () => {
      playBirthdayMusic();
      if (started) return;
      started = true;

      let progress = 0;

      const messages = [
        "Checking birthday age...",
        "Calculating cake requirements...",
        "Loading embarrassing memories...",
        "Downloading dad jokes...",
        "Preparing chaos...",
        "Almost ready..."
      ];

      const timer = setInterval(() => {
        progress += random(8, 18);

        if (bar) {
          bar.style.width = `${Math.min(progress, 100)}%`;
        }

        if (progress < 100) {
          const text = $(".funny-loading-text", intro);

          if (text) {
            text.textContent =
              messages[Math.floor(random(0, messages.length))];
          }
        }

        if (progress >= 100) {
          clearInterval(timer);

          showFunnyExplosion("GO!");

          setTimeout(() => {
            intro.classList.add("is-hidden");

            const main = $(".funny-main");
            if (main) main.classList.add("is-visible");

            showFunnyPopup(
              "WARNING: Too much birthday energy detected. 😂"
            );

            spawnFunnyEmojis(10);
          }, 700);
        }
      }, 180);
    };

    if (button) {
      button.addEventListener("click", start);
    } else {
      setTimeout(start, 800);
    }
  }

  /* ---------- Floating Emojis ---------- */

  function spawnFunnyEmoji() {
    const emojis = [
      "😂", "🤣", "😎", "🤡", "🐱", "🐸",
      "🍕", "🎂", "💀", "🔥", "🗿", "👀"
    ];

    const element = document.createElement("span");

    element.className = "funny-float";
    element.textContent =
      emojis[Math.floor(random(0, emojis.length))];

    element.style.left = `${random(2, 98)}vw`;
    element.style.top = `${random(80, 105)}vh`;

    element.style.setProperty(
      "--drift",
      `${random(-180, 180)}px`
    );

    element.style.setProperty(
      "--rotation",
      `${random(-360, 360)}deg`
    );

    element.style.animationDuration =
      `${random(4, 7)}s`;

    document.body.appendChild(element);
    removeAfter(element, 7500);
  }

  function spawnFunnyEmojis(count = 8) {
    for (let i = 0; i < count; i++) {
      setTimeout(spawnFunnyEmoji, i * 100);
    }
  }

  function startFunnyEmojis() {
    setInterval(spawnFunnyEmoji, 1300);
  }

  /* ---------- Popup ---------- */

  let popupTimer;

  function showFunnyPopup(text, duration = 2800) {
    let popup = $(".funny-popup");

    if (!popup) {
      popup = document.createElement("div");
      popup.className = "funny-popup";
      document.body.appendChild(popup);
    }

    popup.textContent = text;
    popup.classList.add("is-visible");

    clearTimeout(popupTimer);

    popupTimer = setTimeout(() => {
      popup.classList.remove("is-visible");
    }, duration);
  }

  /* ---------- Scroll Reveal ---------- */

  function initFunnyReveal() {
    const elements = $$(".funny-reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: .15 }
    );

    elements.forEach(element => observer.observe(element));
  }

  /* ---------- Scroll Messages ---------- */

  function initFunnyPopups() {
    const elements = $$("[data-funny-popup]");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          showFunnyPopup(entry.target.dataset.funnyPopup);
          observer.unobserve(entry.target);
        });
      },
      { threshold: .5 }
    );

    elements.forEach(element => observer.observe(element));
  }

  /* ---------- Shake ---------- */

  function shake(element) {
    if (!element) return;

    element.classList.remove("funny-shake");
    void element.offsetWidth;
    element.classList.add("funny-shake");
  }

  /* ---------- Explosion ---------- */

  function showFunnyExplosion(text = "HAHA!") {
    const element = document.createElement("div");

    element.className = "funny-explosion";
    element.textContent = text;

    document.body.appendChild(element);
    removeAfter(element, 800);
  }

  /* ---------- Cake ---------- */

  function initFunnyCake() {
    const cake = $(".funny-cake");
    if (!cake) return;

    const candles = $$(".funny-candle", cake);

    cake.addEventListener("click", () => {
      const active = candles.filter(
        candle => !candle.classList.contains("is-blown")
      );

      if (!active.length) {
        showFunnyExplosion("ALREADY DEAD 💀");
        return;
      }

      active.forEach(candle =>
        candle.classList.add("is-blown")
      );

      shake(cake);

      setTimeout(() => {
        showFunnyExplosion("POOF! 🎂");
        launchFunnyConfetti(60);
        spawnFunnyEmojis(15);

        showFunnyPopup(
          cake.dataset.message ||
          "Congratulations. You survived another year. 😂",
          4000
        );
      }, 250);
    });
  }

  /* ---------- Confetti ---------- */

  function launchFunnyConfetti(count = 50) {
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");

      piece.className = "funny-confetti";
      piece.style.left = `${random(0, 100)}vw`;

      piece.style.setProperty(
        "--x",
        `${random(-200, 200)}px`
      );

      piece.style.animationDuration =
        `${random(2, 4.5)}s`;

      piece.style.animationDelay =
        `${random(0, .5)}s`;

      document.body.appendChild(piece);
      removeAfter(piece, 5500);
    }
  }
let chaosTimer = null;

async function showRandomFunnyGif() {
    try {
        const response = await fetch("gifs/gifs.json");
        const gifs = await response.json();

        if (!gifs.length) return;

        const box = document.getElementById("chaosGifBox");

        clearTimeout(chaosTimer);

        const gif = gifs[Math.floor(Math.random() * gifs.length)];

        box.innerHTML = `
            <img
                src="gifs/${gif}"
                class="funny-chaos-gif"
                alt="Birthday chaos">
        `;

        chaosTimer = setTimeout(() => {
            box.innerHTML = `<span>🎁</span>`;
        }, 5000);

    } catch (error) {
        console.error("Could not load funny GIFs:", error);
    }
}
  /* ---------- Funny Buttons ---------- */

  function initFunnyButtons() {
    $$("[data-funny-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.funnyAction;

        switch (action) {
          case "chaos":
              shake(button);
              showFunnyExplosion("CHAOS!");
              spawnFunnyEmojis(20);
              showRandomFunnyGif();
              break;

          case "roast": {
            const roasts = [
              "You're not getting older. You're just becoming a premium human. 😂",
              "Your birth certificate is basically a historical document now. 📜😂",
              "Don't worry about your age. Even your calculator stopped counting. 💀",
              "You've reached the age where your back needs a loading screen. 😂",
              "You're not old... you're just running on a very vintage operating system. 🗿",
              "Another year older, another year closer to becoming the family tech-support department. 💻😂",
              "At this point, your childhood memories qualify as archived data. 📦😂",
              "Your knees just sent a formal complaint about your birthday celebration. 💀",
              "You're aging like a phone battery: technically working, but nobody trusts the percentage. 🔋😂",
              "Congratulations! Your warranty expired years ago. 🎂💀",
              "You have officially unlocked a new level of saying 'back in my day.' 😂",
              "Your age is now classified as premium historical content. 🏛️😂",
              "You're not aging. You're collecting experience points... very slowly. 🎮😂",
              "Another birthday? Bro is farming XP in real life. 🎮🔥",
              "Your face has more character development than most TV shows. 😂",
              "You are proof that time really does fly when you're having questionable decisions. 🫡😂",
              "Your birthday cake needs more candles than your Wi-Fi needs passwords. 🎂🔥",
              "At this age, blowing out candles counts as cardio. 💨😂",
              "You're one birthday away from becoming the person who gives unsolicited life advice. 😭",
              "Happy birthday! Your childhood has officially become retro. 📼😂"
            ];

            const roast =
              roasts[Math.floor(
                Math.random() * roasts.length
              )];

            showFunnyPopup(
              roast,
              5000
            );

            showFunnyExplosion("🔥 ROASTED!");

            shake(button);

            break;
          }

          case "celebrate":
            launchFunnyConfetti(90);
            spawnFunnyEmojis(25);
            showFunnyExplosion("PARTY!!!");
            break;

          default:
            showFunnyPopup(
              button.dataset.message ||
              "Something suspicious happened. 😂"
            );
        }
      });
    });
  }

  /* ---------- Gallery / Lightbox ---------- */

  function initFunnyGallery() {

    const photos = $$(".funny-photo img");

    if (!photos.length) return;

    const lightbox = document.createElement("div");

    lightbox.className = "funny-lightbox";

    lightbox.innerHTML = `
      <img alt="Birthday memory">
    `;

    document.body.appendChild(lightbox);

    const image = $("img", lightbox);

    const close = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
      image.src = "";
    };

    photos.forEach(photo => {

      photo.parentElement.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          image.src =
            photo.currentSrc ||
            photo.src;

          image.alt =
            photo.alt ||
            "Birthday memory";

          lightbox.classList.add("is-open");
          document.body.style.overflow = "hidden";
        }
      );

    });

    /*
       Clicking anywhere on the popup closes it,
       including clicking directly on the photo.
    */
    lightbox.addEventListener(
      "click",
      close
    );

    document.addEventListener(
      "keydown",
      event => {

        if (event.key === "Escape") {
          close();
        }

      }
    );
  }

  /* ---------- Finale ---------- */

  function funnyFinale(
    message = "Happy Birthday, you absolute legend! 😂🎂"
  ) {
    showFunnyExplosion("HAPPY BIRTHDAY!");
    launchFunnyConfetti(120);
    spawnFunnyEmojis(30);

    setTimeout(() => {
      showFunnyPopup(message, 6000);
    }, 500);
  }

  function initFunnyFinale() {
    $$("[data-funny-finale]").forEach(button => {
      button.addEventListener("click", () => {
        funnyFinale(button.dataset.funnyFinale);
      });
    });
  }

  /* ---------- Init ---------- */

  initFunnyIntro();
  startFunnyEmojis();
  initFunnyReveal();
  initFunnyPopups();
  initFunnyCake();
  initFunnyButtons();
  initFunnyGallery();
  initFunnyFinale();

})();

/* =========================
   MUSIC
========================= */

let birthdayMusic = null;
let birthdayMusicReady = Promise.resolve();

function playBirthdayMusic() {
    return birthdayMusic ? birthdayMusic.play().catch(() => {}) : Promise.resolve();
}

async function initMusic() {
    const music = document.getElementById("birthdayMusic");
    const button = document.getElementById("musicToggle");
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

            // Try automatic playback once. Browsers may block this.
            await playBirthdayMusic();

            if (button) button.textContent = "🔊 Music";
        } catch (error) {
            console.error("Music error:", error);
        }
    })();

    if (button) {
        button.addEventListener("click", async () => {
            await birthdayMusicReady;
            try {
                if (music.paused) {
                    music.muted = false;
                    await music.play();
                    button.textContent = "🔊 Music";
                    return;
                }

                music.muted = !music.muted;
                button.textContent = music.muted ? "🔇 Muted" : "🔊 Music";
            } catch (error) {
                console.error("Music playback failed:", error);
            }
        });
    }
}

initMusic();
