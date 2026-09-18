/* ROMANTIC — interactions */
(() => {
  "use strict";
  const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
  const random=(a,b)=>Math.random()*(b-a)+a;

  const isCompact = window.matchMedia("(max-width:600px)").matches;

  function spawnHeart(){
    const h=document.createElement("span");
    h.className="romantic-heart"+(Math.random()>.75?" is-glow":"");
    h.textContent=Math.random()>.2?"♥":"♡";
    h.style.left=`${random(3,97)}vw`; h.style.top=`${random(85,105)}vh`;
    h.style.fontSize=`${random(14,26)}px`;
    h.style.setProperty("--x",`${random(-120,120)}px`);
    h.style.setProperty("--rotation",`${random(-30,30)}deg`);
    h.style.animationDuration=`${random(7,12)}s`;
    document.body.appendChild(h);
    setTimeout(()=>h.remove(),13000);
  }
  function spawnHearts(n=8){for(let i=0;i<n;i++)setTimeout(spawnHeart,i*100)}

  function spawnPetal(){
    const p=document.createElement("span");
    p.className="romantic-petal";
    p.style.left=`${random(3,97)}vw`; p.style.top=`${random(-8,-2)}vh`;
    p.style.setProperty("--x",`${random(-90,90)}px`);
    p.style.setProperty("--rotation",`${random(120,320)}deg`);
    p.style.animationDuration=`${random(8,13)}s`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),14000);
  }

  function spawnDust(){
    const d=document.createElement("span");
    d.className="romantic-dust";
    d.style.left=`${random(3,97)}vw`; d.style.top=`${random(80,105)}vh`;
    d.style.setProperty("--x",`${random(-40,40)}px`);
    d.style.animationDuration=`${random(9,15)}s`;
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),16000);
  }

  let ambientTimer=null;
  function startAmbientParticles(){
    if(ambientTimer)return;
    const heartInterval=isCompact?2200:1300;
    ambientTimer=setInterval(spawnHeart,heartInterval);
    setInterval(spawnPetal,isCompact?7000:4200);
    setInterval(spawnDust,isCompact?4200:2600);
  }

  function initIntro(){
    const intro=$(".romantic-intro"), start=$("[data-romantic-start]");
    if(!intro||!start)return;
    const unlock=()=>{
      if(intro.classList.contains("is-hidden"))return;
      playBirthdayMusic(); intro.classList.add("is-hidden");
      $(".romantic-main")?.classList.add("is-visible"); spawnHearts(18);
      startAmbientParticles();
    };
    start.addEventListener("click",unlock);
    start.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();unlock()}});
  }

  function initReveal(){
    const items=$$(".romantic-reveal");
    if(!("IntersectionObserver"in window)){items.forEach(x=>x.classList.add("is-visible"));return}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add("is-visible");io.unobserve(e.target)}
    }),{threshold:.12});
    items.forEach(x=>io.observe(x));
  }

  function initGallery(){
    const box=$("#photoLightbox"), image=$("#lightboxImage");
    if(!box||!image)return;
    $$(".polaroid").forEach(card=>{
      const img=$("img",card);
      if(!img||!img.getAttribute("src"))return;
      card.addEventListener("click",()=>{
        image.src=img.src; image.alt=img.alt||"Birthday memory";
        box.classList.add("is-visible"); box.setAttribute("aria-hidden","false");
      });
    });
    const close=()=>{
      box.classList.remove("is-visible"); box.setAttribute("aria-hidden","true");
      image.removeAttribute("src");
    };
    /* Any click/tap on the popup closes it; there is no close button. */
    box.addEventListener("click",close);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&box.classList.contains("is-visible"))close()});
  }

  function initJar(){
    const button=$("#heartJarButton"), box=$("#jarMessage"), text=$("#jarMessage p");
    const jarModel=$("#heartJarModel");
    if(!button||!box||!text)return;

    // The supplied model includes a "promo" watermark plane on its own
    // dedicated material (confirmed via inspection - no other visible
    // geometry shares it), so it's hidden by making that one material
    // fully transparent rather than touching any of the jar/heart meshes.
    const hideJarWatermark=()=>{
      try{
        const materials=jarModel?.model?.materials||[];
        const watermark=materials.find(material=>material.name==="material_4");
        const factor=watermark?.pbrMetallicRoughness?.baseColorFactor;
        if(factor){
          watermark.pbrMetallicRoughness.setBaseColorFactor([factor[0],factor[1],factor[2],0]);
        }
      }catch(error){console.error("Jar material error:",error)}
    };
    if(jarModel){
      jarModel.addEventListener("load",hideJarWatermark);
      if(jarModel.loaded)hideJarWatermark();
    }

    const messages=[
      "If I could put every beautiful moment with you into this jar, it still wouldn't be big enough.",
      "Some people become memories. Some become home. You somehow became both.",
      "A little reminder: you are loved, appreciated, and worth celebrating.",
      "If happiness had a shape, I think it would look like the moments that make you smile.",
      "Keep this heart: life is better with you in it. ♥",
      "Another year, another collection of moments I hope you treasure forever."
    ];
    let last=-1;
    button.addEventListener("click",e=>{
      e.preventDefault();
      let i; do{i=Math.floor(Math.random()*messages.length)}while(messages.length>1&&i===last);
      last=i; text.textContent=messages[i]; box.classList.remove("active");
      requestAnimationFrame(()=>box.classList.add("active")); spawnHearts(10);
    });
  }

  initIntro(); initReveal(); initGallery(); initJar();
})();

let birthdayMusic=null, birthdayMusicReady=Promise.resolve();
function playBirthdayMusic(){return birthdayMusic?birthdayMusic.play().catch(()=>{}):Promise.resolve()}
async function initMusic(){
  const music=document.getElementById("birthdayMusic"), button=document.getElementById("musicToggle");
  if(!music)return; birthdayMusic=music;
  birthdayMusicReady=(async()=>{
    try{
      const response=await fetch("data.json",{cache:"no-store"}); if(!response.ok)return;
      const data=await response.json(); if(!data.music)return;
      music.src=data.music; music.loop=true; music.preload="auto"; music.load(); await playBirthdayMusic();
      if(button)button.textContent="🔊 Music";
    }catch(error){console.error("Music error:",error)}
  })();
  if(button)button.addEventListener("click",async()=>{
    await birthdayMusicReady;
    try{
      if(music.paused){music.muted=false;await music.play();button.textContent="🔊 Music";return}
      music.muted=!music.muted; button.textContent=music.muted?"🔇 Muted":"🔊 Music";
    }catch(error){console.error("Music playback failed:",error)}
  });
}
initMusic();
