(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.getElementById("nav");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  var hero = document.querySelector(".hero");
  var scrollBar = document.getElementById("scrollBar");
  var heroVideo = document.querySelector(".hero__video");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var threshold = hero ? hero.offsetHeight - 120 : 80;

    if (nav) nav.classList.toggle("is-scrolled", y > threshold);

    if (scrollBar) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(y / max, 1) : 0;
      scrollBar.style.width = (ratio * 100).toFixed(2) + "%";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Ouvrir le menu");
    }
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
  }

  if (navLinks) {
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 980) closeMenu();
  });

  var revealItems = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.body.classList.add("reveal-ready");
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  if (heroVideo) {
    var smallScreen = window.matchMedia("(max-width: 760px)").matches;
    if (reduceMotion || smallScreen) {
      heroVideo.pause();
      heroVideo.removeAttribute("autoplay");
      var sources = heroVideo.querySelectorAll("source");
      for (var i = 0; i < sources.length; i++) {
        sources[i].parentNode.removeChild(sources[i]);
      }
      heroVideo.removeAttribute("src");
      heroVideo.load();
    } else {
      heroVideo.addEventListener("loadeddata", function () {
        heroVideo.classList.add("is-ready");
      }, { once: true });

      if (heroVideo.readyState >= 2) heroVideo.classList.add("is-ready");
      var playPromise = heroVideo.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }
  }

  var counterEls = document.querySelectorAll("[data-count]");
  var fr = new Intl.NumberFormat("fr-FR");

  function formatCounter(el, value) {
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (decimals > 0) {
      return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }
    return fr.format(Math.round(value));
  }

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;

    if (reduceMotion) {
      el.textContent = formatCounter(el, target);
      return;
    }

    var duration = 1500;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatCounter(el, target * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatCounter(el, target);
      }
    }

    window.requestAnimationFrame(step);
  }

  var statsSection = document.getElementById("chiffres");
  if (statsSection && counterEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counterEls.forEach(animateCounter);
    } else {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            counterEls.forEach(animateCounter);
            counterObserver.disconnect();
          }
        });
      }, { threshold: 0.25 });
      counterObserver.observe(statsSection);
    }
  }

  var chainItems = Array.prototype.slice.call(document.querySelectorAll(".chain-item"));
  var chainImage = document.getElementById("chainImage");
  var chainNum = document.getElementById("chainNum");
  var chainLabel = document.getElementById("chainLabel");

  function setChainImage(src, alt) {
    if (!chainImage || !src) return;
    if (chainImage.getAttribute("src") === src) return;

    if (reduceMotion) {
      chainImage.src = src;
      chainImage.alt = alt;
      return;
    }

    chainImage.classList.add("is-changing");
    var next = new Image();

    next.onload = function () {
      chainImage.src = src;
      chainImage.alt = alt;
      window.setTimeout(function () {
        chainImage.classList.remove("is-changing");
      }, 40);
    };

    next.onerror = function () {
      chainImage.src = src;
      chainImage.alt = alt;
      chainImage.classList.remove("is-changing");
    };

    next.src = src;
  }

  chainItems.forEach(function (item) {
    item.addEventListener("click", function () {
      if (item.classList.contains("is-active")) return;

      chainItems.forEach(function (other) {
        other.classList.remove("is-active");
        other.setAttribute("aria-expanded", "false");
      });

      item.classList.add("is-active");
      item.setAttribute("aria-expanded", "true");

      var index = parseInt(item.getAttribute("data-step") || "0", 10);
      var label = item.getAttribute("data-label") || "";

      if (chainNum) chainNum.textContent = ("0" + (index + 1)).slice(-2);
      if (chainLabel) chainLabel.textContent = label;
      setChainImage(item.getAttribute("data-image"), label);
    });
  });

  var form = document.getElementById("joinForm");
  var status = document.getElementById("formStatus");

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        if (status) {
          status.textContent = "Merci de renseigner votre nom, un e-mail valide et l'objet de votre demande.";
          status.classList.add("is-error");
        }
        form.reportValidity();
        return;
      }

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var structure = (data.get("structure") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var sujet = (data.get("sujet") || "").toString().trim();
      var profil = (data.get("profil") || "").toString();
      var message = (data.get("message") || "").toString().trim();

      var body = [
        "Objet : " + (sujet || "—"),
        "Nom : " + name,
        "Structure : " + (structure || "—"),
        "E-mail : " + email,
        "Téléphone : " + (phone || "—"),
        "Profil : " + (profil || "—"),
        "",
        "Message :",
        message || "—"
      ].join("\n");

      var href = "mailto:contact@ipeb.bj?subject=" +
        encodeURIComponent((sujet || "Demande") + " — IPEB — " + name) +
        "&body=" + encodeURIComponent(body);

      if (status) {
        status.classList.remove("is-error");
        status.textContent = "Merci " + name + ". Votre logiciel de messagerie va s'ouvrir pour finaliser l'envoi.";
      }

      window.location.href = href;
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
