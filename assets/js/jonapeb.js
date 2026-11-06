(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Countdown
   * ------------------------------------------------------------------ */
  var countdown = document.getElementById("jonapebCountdown");

  if (countdown) {
    var target = new Date("2026-12-17T09:00:00+01:00").getTime();
    var cdDays = countdown.querySelector('[data-cd="days"]');
    var cdHours = countdown.querySelector('[data-cd="hours"]');
    var cdMinutes = countdown.querySelector('[data-cd="minutes"]');
    var cdSeconds = countdown.querySelector('[data-cd="seconds"]');
    var cdTimer = null;

    function pad(value) {
      return (value < 10 ? "0" : "") + value;
    }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        diff = 0;
        if (cdTimer) window.clearInterval(cdTimer);
      }

      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);

      if (cdDays) cdDays.textContent = pad(days);
      if (cdHours) cdHours.textContent = pad(hours);
      if (cdMinutes) cdMinutes.textContent = pad(minutes);
      if (cdSeconds) cdSeconds.textContent = pad(seconds);
    }

    tick();
    cdTimer = window.setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ *
   * Registration modal
   * ------------------------------------------------------------------ */
  var modal = document.getElementById("registrationModal");
  if (!modal) return;

  var form = document.getElementById("regForm");
  var success = document.getElementById("regSuccess");
  var status = document.getElementById("regStatus");
  var submitBtn = document.getElementById("regSubmit");
  var downloadBtn = document.getElementById("regDownload");
  var resetBtn = document.getElementById("regReset");
  var nameInput = document.getElementById("regName");
  var successName = document.getElementById("regSuccessName");
  var successId = document.getElementById("regSuccessId");
  var qrPreview = document.getElementById("regQrPreview");
  var currentPdf = null;
  var qrPreviewSrc = null;
  var lastFocus = null;

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", !!isError);
  }

  function getFocusable() {
    var nodes = modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (el) {
      return el.offsetParent !== null;
    });
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("reg-open");
    window.setTimeout(function () {
      if (form && !form.hidden && nameInput) {
        nameInput.focus();
      } else {
        var focusable = getFocusable();
        if (focusable.length) focusable[0].focus();
      }
    }, 80);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("reg-open");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  document.querySelectorAll("[data-open-registration]").forEach(function (button) {
    button.addEventListener("click", openModal);
  });

  modal.querySelectorAll("[data-reg-close]").forEach(function (element) {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (!modal.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    var focusable = getFocusable();
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function generatePassId() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var result = "";
    var cryptoObj = window.crypto || window.msCrypto;

    if (cryptoObj && cryptoObj.getRandomValues) {
      var values = new Uint32Array(8);
      cryptoObj.getRandomValues(values);
      for (var i = 0; i < values.length; i++) {
        result += alphabet[values[i] % alphabet.length];
      }
    } else {
      for (var j = 0; j < 8; j++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }

    return "JNP-26-" + result;
  }

  function slugify(value) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 30000);
  }

  function loadLogo() {
    return fetch("assets/img/logo-ipeb-180.png", { cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Logo indisponible");
        return response.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .catch(function () {
        return null;
      });
  }

  function createQrDataUrl(text) {
    return new Promise(function (resolve, reject) {
      try {
        var qr = window.qrcode(0, "M");
        qr.addData(text);
        qr.make();

        var image = new Image();
        image.onload = function () {
          var size = 384;
          var canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          var context = canvas.getContext("2d");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, size, size);
          context.imageSmoothingEnabled = false;
          context.drawImage(image, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = function () {
          reject(new Error("QR code illisible"));
        };
        image.src = qr.createDataURL(12, 4);
      } catch (error) {
        reject(error);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * PDF generation
   * ------------------------------------------------------------------ */
  function buildPdf(info, qrDataUrl) {
    var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDF) throw new Error("Bibliothèque PDF indisponible");

    return loadLogo().then(function (logo) {
      var doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      var navy = [10, 23, 48];
      var blue = [1, 39, 138];
      var gold = [255, 210, 31];
      var ink = [33, 29, 25];
      var muted = [111, 104, 95];
      var line = [233, 226, 216];
      var lightBlue = [243, 247, 252];
      var cream = [251, 248, 243];

      function fill(rgb) {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      }

      function textColor(rgb) {
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      }

      function drawColor(rgb) {
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      }

      /* ---------------- PAGE 1 — INVITATION ---------------- */
      fill(navy);
      doc.rect(0, 0, 210, 86, "F");
      fill(blue);
      doc.rect(0, 0, 6, 86, "F");
      fill(gold);
      doc.rect(0, 86, 210, 1.6, "F");

      if (doc.setGState && doc.GState) {
        doc.setGState(new doc.GState({ opacity: 0.09 }));
        fill([255, 255, 255]);
        doc.circle(186, 22, 38, "F");
        doc.circle(164, 80, 22, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));
      }

      if (logo) doc.addImage(logo, "PNG", 16, 14, 20, 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      textColor([255, 255, 255]);
      doc.text("IPEB", 40, 23);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      textColor([200, 214, 235]);
      doc.text("INTERPROFESSION DU POISSON D'ÉLEVAGE DU BÉNIN", 40, 28);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      textColor(gold);
      doc.setCharSpace(1);
      doc.text("ÉDITION 2026", 192, 20, { align: "right" });
      doc.setCharSpace(0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      textColor(gold);
      doc.setCharSpace(1.2);
      doc.text("INVITATION OFFICIELLE", 16, 52);
      doc.setCharSpace(0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      textColor([255, 255, 255]);
      doc.text("Journées Nationales", 16, 63);
      doc.text("du Poisson d'Élevage", 16, 72);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      textColor([210, 222, 240]);
      doc.text("17 – 18 décembre 2026   ·   Ouidah, Bénin", 16, 80);

      var y = 104;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      textColor(muted);
      doc.setCharSpace(1);
      doc.text("À L'ATTENTION DE", 16, y);
      doc.setCharSpace(0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      textColor(navy);
      var nameLines = doc.splitTextToSize(info.name, 178);
      doc.text(nameLines, 16, y + 10);
      y += 10 + nameLines.length * 8;

      if (info.structure) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        textColor(muted);
        doc.text(info.structure, 16, y + 1);
        y += 7;
      }

      if (info.fonction) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        textColor(blue);
        doc.text(info.fonction, 16, y + 1);
        y += 7;
      }

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      textColor(ink);
      var intro =
        "L'Interprofession du Poisson d'Élevage du Bénin (IPEB) a le plaisir de vous convier à la 4e édition des Journées Nationales du Poisson d'Élevage, le rendez-vous de référence de la filière aquacole béninoise.";
      var introLines = doc.splitTextToSize(intro, 178);
      doc.text(introLines, 16, y);
      y += introLines.length * 5.4 + 8;

      var cardY = y;
      var cardW = 56;
      var cardGap = 5;
      var cards = [
        { title: "DATES", line1: "17 – 18 décembre", line2: "2026" },
        { title: "LIEU", line1: "Ouidah, Bénin", line2: "Site officiel JoNaPEB" },
        { title: "ACCÈS", line1: "Sur inscription", line2: "Pass nominatif + QR" }
      ];

      cards.forEach(function (card, index) {
        var x = 16 + index * (cardW + cardGap);
        fill(lightBlue);
        doc.roundedRect(x, cardY, cardW, 24, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        textColor(blue);
        doc.setCharSpace(0.8);
        doc.text(card.title, x + 4, cardY + 7);
        doc.setCharSpace(0);

        doc.setFontSize(9);
        textColor(navy);
        doc.text(card.line1, x + 4, cardY + 13);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        textColor(muted);
        doc.text(card.line2, x + 4, cardY + 18);
      });

      y = cardY + 34;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      textColor(navy);
      doc.text("AU PROGRAMME", 16, y);
      y += 7;

      var program = [
        "Panels et tables rondes sur l'avenir de la filière",
        "Exposition des entreprises, innovations et équipements",
        "Rencontres B2B, ateliers et pitchs de projets",
        "Remise des distinctions et signature de partenariats"
      ];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      program.forEach(function (item) {
        fill(gold);
        doc.circle(17.5, y - 1.1, 1.1, "F");
        textColor(ink);
        doc.text(item, 22, y);
        y += 6.4;
      });

      y = 247;
      drawColor(gold);
      doc.setLineWidth(0.8);
      doc.line(16, y, 52, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      textColor(navy);
      doc.text("La Présidence de l'IPEB", 16, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      textColor(muted);
      doc.text("Interprofession du Poisson d'Élevage du Bénin", 16, y + 10.5);

      fill(navy);
      doc.rect(0, 278, 210, 19, "F");
      fill(gold);
      doc.rect(0, 278, 210, 0.8, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      textColor([255, 255, 255]);
      doc.text("contact@ipeb.bj", 16, 286);
      doc.text("JoNaPEB 2026 · Ouidah, Bénin", 194, 286, { align: "right" });

      textColor([160, 178, 205]);
      doc.setFontSize(6.5);
      doc.text("Invitation nominative — merci de présenter votre pass à l'entrée.", 16, 291);

      /* ---------------- PAGE 2 — PASS PARTICIPANT ---------------- */
      doc.addPage();

      fill([255, 255, 255]);
      doc.rect(0, 0, 210, 297, "F");

      fill(navy);
      doc.rect(0, 0, 210, 34, "F");
      fill(gold);
      doc.rect(0, 34, 210, 1.4, "F");

      if (logo) doc.addImage(logo, "PNG", 16, 8, 18, 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      textColor([255, 255, 255]);
      doc.text("IPEB", 38, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      textColor([200, 214, 235]);
      doc.text("INTERPROFESSION DU POISSON D'ÉLEVAGE DU BÉNIN", 38, 21);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      textColor(gold);
      doc.setCharSpace(0.8);
      doc.text("PASS PARTICIPANT", 192, 16, { align: "right" });
      doc.setCharSpace(0);

      var py = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      textColor(blue);
      doc.setCharSpace(1);
      doc.text("JONAPEB 2026", 16, py);
      doc.setCharSpace(0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      textColor(navy);
      doc.text("Pass d'accès", 16, py + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      textColor(muted);
      doc.text("17 – 18 décembre 2026 · Ouidah, Bénin", 16, py + 18);

      drawColor(line);
      doc.setLineWidth(0.3);
      doc.line(16, py + 25, 194, py + 25);

      var dy = py + 36;
      var fields = [
        ["PARTICIPANT", info.name],
        ["STRUCTURE", info.structure || "—"],
        ["FONCTION", info.fonction || "—"],
        ["PROFIL", info.profil],
        ["E-MAIL", info.email],
        ["TÉLÉPHONE", info.phone],
        ["PASS N°", info.passId]
      ];

      fields.forEach(function (field) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        textColor(muted);
        doc.setCharSpace(0.8);
        doc.text(field[0], 16, dy);
        doc.setCharSpace(0);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        textColor(navy);
        var valueLines = doc.splitTextToSize(String(field[1]), 112);
        doc.text(valueLines[0], 16, dy + 5.5);
        dy += 13;
      });

      var qx = 138;
      var qy = py + 32;
      var qs = 56;

      fill(lightBlue);
      doc.roundedRect(qx - 5, qy - 5, qs + 10, qs + 22, 3, 3, "F");
      doc.addImage(qrDataUrl, "PNG", qx, qy, qs, qs);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      textColor(blue);
      doc.setCharSpace(0.8);
      doc.text("SCANNEZ POUR CONTRÔLER", qx + qs / 2, qy + qs + 6, { align: "center" });
      doc.setCharSpace(0);

      var iy = 208;
      fill(cream);
      doc.roundedRect(16, iy, 178, 42, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      textColor(navy);
      doc.text("MODE D'EMPLOI", 22, iy + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      textColor(muted);
      var note =
        "Ce pass est nominatif et non transférable. Présentez le QR code ci-dessus, imprimé ou sur votre téléphone, à l'accueil du JoNaPEB les 17 et 18 décembre 2026. Une pièce d'identité pourra être demandée.";
      var noteLines = doc.splitTextToSize(note, 166);
      doc.text(noteLines, 22, iy + 16);

      drawColor(line);
      doc.setLineWidth(0.3);
      if (doc.setLineDashPattern) doc.setLineDashPattern([2, 2], 0);
      doc.line(16, 262, 194, 262);
      if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      textColor(muted);
      doc.setCharSpace(0.6);
      doc.text("PASS N° " + info.passId, 16, 270);
      doc.text("JONAPEB 2026", 194, 270, { align: "right" });
      doc.setCharSpace(0);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      textColor(navy);
      doc.text("contact@ipeb.bj · JoNaPEB 2026 · Ouidah, Bénin", 105, 291, { align: "center" });

      fill(gold);
      doc.rect(0, 294, 210, 3, "F");

      return doc.output("blob");
    });
  }

  /* ------------------------------------------------------------------ *
   * Submit
   * ------------------------------------------------------------------ */
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("");

    if (!form.checkValidity()) {
      setStatus("Merci de compléter tous les champs obligatoires.", true);
      form.reportValidity();
      return;
    }

    var hasQr = typeof window.qrcode === "function";
    var hasPdf = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (!hasQr || !hasPdf) {
      setStatus(
        "Le générateur de pass est momentanément indisponible. Vérifiez votre connexion puis réessayez.",
        true
      );
      return;
    }

    var data = new FormData(form);
    var info = {
      name: String(data.get("name") || "").trim(),
      structure: String(data.get("structure") || "").trim(),
      fonction: String(data.get("fonction") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      profil: String(data.get("profil") || "").trim(),
      city: String(data.get("city") || "").trim(),
      passId: generatePassId()
    };

    var label = submitBtn.querySelector("span");
    var previousLabel = label ? label.textContent : "";

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    if (label) label.textContent = "Génération du pass…";

    var qrText = [
      "JONAPEB 2026",
      "PASS " + info.passId,
      info.name,
      info.structure || "",
      "17-18 décembre 2026 · Ouidah, Bénin"
    ]
      .filter(Boolean)
      .join("\n");

    createQrDataUrl(qrText)
      .then(function (qrDataUrl) {
        qrPreviewSrc = qrDataUrl;
        return buildPdf(info, qrDataUrl);
      })
      .then(function (blob) {
        var filename =
          "Invitation-JoNaPEB-2026-" + (slugify(info.name) || "participant") + ".pdf";
        currentPdf = { blob: blob, filename: filename };
        downloadBlob(blob, filename);

        if (successName) successName.textContent = info.name.split(" ")[0];
        if (successId) successId.textContent = info.passId;
        if (qrPreview) qrPreview.src = qrPreviewSrc;

        form.hidden = true;
        success.hidden = false;
        setStatus("");

        var focusables = getFocusable();
        if (focusables.length) {
          var targetButton = document.getElementById("regDownload");
          if (targetButton) targetButton.focus();
        }
      })
      .catch(function (error) {
        if (window.console && console.error) console.error(error);
        setStatus(
          "Impossible de générer le pass pour le moment. Réessayez dans un instant.",
          true
        );
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
        if (label) label.textContent = previousLabel;
      });
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      if (currentPdf) downloadBlob(currentPdf.blob, currentPdf.filename);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      form.hidden = false;
      success.hidden = true;
      currentPdf = null;
      qrPreviewSrc = null;
      if (qrPreview) qrPreview.removeAttribute("src");
      setStatus("");
      if (nameInput) nameInput.focus();
    });
  }
})();
