/* ==========================================================================
   MUTATION® — Interactions & scroll
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  /* ------------------------------------------------------------------
     1. Preloader (0 → 100, rideau, skippable, désactivé si reduced-motion)
  ------------------------------------------------------------------ */
  var preloader = document.getElementById("preloader");
  var preloaderCount = document.getElementById("preloader-count");

  function finishPreloader() {
    if (!preloader || preloader.classList.contains("is-done")) return;
    preloader.classList.add("is-done");
    document.body.classList.remove("preloading");
    setTimeout(function () {
      preloader.classList.add("is-hidden");
    }, 800);
  }

  if (prefersReducedMotion || !preloader) {
    if (preloader) preloader.classList.add("is-hidden");
  } else {
    document.body.classList.add("preloading");
    var start = performance.now();
    var DURATION = 1100; // < 1.5s au total avec le rideau

    (function tickPreloader(now) {
      if (preloader.classList.contains("is-done")) return;
      var progress = Math.min((now - start) / DURATION, 1);
      var value = Math.round(progress * 100);
      preloaderCount.textContent = String(value).padStart(3, "0");
      if (progress < 1) {
        requestAnimationFrame(tickPreloader);
      } else {
        finishPreloader();
      }
    })(start);

    // Skippable au clic ou au clavier
    preloader.addEventListener("click", finishPreloader);
    window.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        finishPreloader();
        window.removeEventListener("keydown", onKey);
      }
    });
  }

  /* ------------------------------------------------------------------
     2. Smooth scroll (Lenis via CDN, fallback natif)
  ------------------------------------------------------------------ */
  var lenis = null;
  if (!prefersReducedMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    function rafLenis(time) {
      lenis.raf(time);
      requestAnimationFrame(rafLenis);
    }
    requestAnimationFrame(rafLenis);
  }

  // Ancres internes : déléguées à Lenis si présent
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) { e.preventDefault(); return; }
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    });
  });

  /* ------------------------------------------------------------------
     3. Curseur custom (point + cercle avec lerp)
        Désactivé sur tactile ET si reduced-motion.
  ------------------------------------------------------------------ */
  if (!isTouch && !prefersReducedMotion) {
    var dot = document.getElementById("cursor-dot");
    var ring = document.getElementById("cursor-ring");
    if (dot && ring) {
      document.body.classList.add("has-custom-cursor");

      var mouseX = window.innerWidth / 2;
      var mouseY = window.innerHeight / 2;
      var ringX = mouseX;
      var ringY = mouseY;

      window.addEventListener("mousemove", function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = "translate(" + mouseX + "px," + mouseY + "px) translate(-50%,-50%)";
      }, { passive: true });

      (function animateRing() {
        ringX += (mouseX - ringX) * 0.16;
        ringY += (mouseY - ringY) * 0.16;
        ring.style.transform = "translate(" + ringX + "px," + ringY + "px) translate(-50%,-50%)";
        requestAnimationFrame(animateRing);
      })();

      // Grossit sur les éléments interactifs
      document.querySelectorAll("[data-cursor='hover'], a, button").forEach(function (el) {
        el.addEventListener("mouseenter", function () { ring.classList.add("is-active"); });
        el.addEventListener("mouseleave", function () { ring.classList.remove("is-active"); });
      });
    }
  }

  /* ------------------------------------------------------------------
     4. Manifesto — reveal mot par mot au scroll
  ------------------------------------------------------------------ */
  var manifestoText = document.getElementById("manifesto-text");
  var manifestoWords = [];
  if (manifestoText) {
    var words = manifestoText.textContent.trim().split(/\s+/);
    manifestoText.textContent = "";
    words.forEach(function (word, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      manifestoText.appendChild(span);
      if (i < words.length - 1) manifestoText.appendChild(document.createTextNode(" "));
      manifestoWords.push(span);
    });
    if (prefersReducedMotion) {
      manifestoWords.forEach(function (w) { w.classList.add("is-read"); });
    }
  }

  function updateManifesto() {
    if (!manifestoText || prefersReducedMotion || manifestoWords.length === 0) return;
    var rect = manifestoText.getBoundingClientRect();
    var vh = window.innerHeight;
    // Progression : 0 quand le haut du texte entre à 85% du viewport,
    // 1 quand le bas du texte atteint 45% du viewport.
    var startY = vh * 0.85;
    var endY = vh * 0.45;
    var total = (rect.height + (startY - endY));
    var progress = (startY - rect.top) / total;
    progress = Math.max(0, Math.min(1, progress));
    var readCount = Math.floor(progress * manifestoWords.length);
    manifestoWords.forEach(function (w, i) {
      w.classList.toggle("is-read", i < readCount);
    });
  }

  /* ------------------------------------------------------------------
     5. Reveal au scroll (études de cas) — IntersectionObserver
  ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------------
     6. Parallax léger sur les visuels de cas
  ------------------------------------------------------------------ */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));

  function updateParallax() {
    if (prefersReducedMotion || isTouch) return;
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      var center = rect.top + rect.height / 2;
      var offset = (center - vh / 2) / vh; // -0.5 → 0.5 env.
      var svg = el.querySelector("svg");
      if (svg) svg.style.setProperty("--parallax-y", (offset * -24).toFixed(1) + "px");
    });
  }

  /* Boucle scroll unique (manifesto + parallax) */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateManifesto();
      updateParallax();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     7. Compteurs animés
  ------------------------------------------------------------------ */
  var counters = document.querySelectorAll(".stat__num");

  function formatNumber(n) {
    return n.toLocaleString("fr-FR").replace(/ | /g, " ");
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (prefersReducedMotion) {
      el.textContent = formatNumber(target);
      return;
    }
    var startTime = null;
    var DURATION = 1600;
    function step(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / DURATION, 1);
      var eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      el.textContent = formatNumber(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    counters.forEach(animateCounter);
  } else {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ------------------------------------------------------------------
     8. Bouton magnétique (CTA)
  ------------------------------------------------------------------ */
  var magneticBtn = document.getElementById("magnetic-btn");
  var magneticInner = document.getElementById("magnetic-btn-inner");

  if (magneticBtn && magneticInner && !isTouch && !prefersReducedMotion) {
    var btnTargetX = 0, btnTargetY = 0;
    var btnX = 0, btnY = 0;
    var RADIUS = 140; // zone d'attraction en px

    window.addEventListener("mousemove", function (e) {
      var rect = magneticBtn.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dist = Math.hypot(dx, dy);
      if (dist < RADIUS + rect.width / 2) {
        btnTargetX = dx * 0.28;
        btnTargetY = dy * 0.28;
      } else {
        btnTargetX = 0;
        btnTargetY = 0;
      }
    }, { passive: true });

    (function animateMagnetic() {
      btnX += (btnTargetX - btnX) * 0.12;
      btnY += (btnTargetY - btnY) * 0.12;
      magneticBtn.style.transform = "translate(" + btnX.toFixed(2) + "px," + btnY.toFixed(2) + "px)";
      magneticInner.style.transform = "translate(" + (btnX * 0.35).toFixed(2) + "px," + (btnY * 0.35).toFixed(2) + "px)";
      requestAnimationFrame(animateMagnetic);
    })();
  }

})();
