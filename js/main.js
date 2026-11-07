// Mark JS as available so reveal animations only hide content when they can run
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Mobile navigation ----------
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---------- Section entrances ----------
  // Siblings in the same group (cards in a grid, steps, quotes) arrive one after another;
  // the stagger is capped at four steps so nothing waits long. The hidden starting state
  // only exists under html.motion, which is set here, so without the observer the page
  // simply stays visible.
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    revealEls.forEach((el) => {
      const group = [...el.parentElement.children].filter((sib) => sib.classList.contains("reveal"));
      el.style.setProperty("--i", Math.min(group.indexOf(el), 3));
      el.querySelectorAll(".tags li").forEach((li, n) => li.style.setProperty("--n", Math.min(n, 6)));
    });
    document.documentElement.classList.add("motion");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // ---------- Workflow trace (hover pans the screenshot from trigger to END) ----------
  // Measures how far each tall screenshot can travel inside its frame and sets a duration
  // that keeps the pan at a readable, steady pace.
  const traceImgs = document.querySelectorAll(".work-card__media img");

  const measureTrace = (img) => {
    const frame = img.parentElement.clientHeight;
    const distance = Math.max(0, img.offsetHeight - frame);
    img.style.setProperty("--pan", `${-distance}px`);
    img.style.setProperty("--pan-time", `${Math.min(8, Math.max(2, distance / 450)).toFixed(2)}s`);
  };

  traceImgs.forEach((img) => {
    if (img.complete) measureTrace(img);
    img.addEventListener("load", () => measureTrace(img));
  });
  window.addEventListener("resize", () => traceImgs.forEach(measureTrace));

  // ---------- Rolling figures (case study stats) ----------
  // Each digit rolls up to its value once; the real number stays readable to screen readers.
  const rollEls = [...document.querySelectorAll("[data-roll]")];

  rollEls.forEach((el) => {
    const value = el.textContent.trim();
    const said = Object.assign(document.createElement("span"), { className: "visually-hidden", textContent: value });
    const shown = Object.assign(document.createElement("span"), { className: "roll__digits" });
    shown.setAttribute("aria-hidden", "true");
    let i = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) {
        shown.append(ch);
        continue;
      }
      const col = Object.assign(document.createElement("span"), { className: "roll__col" });
      const strip = Object.assign(document.createElement("span"), { className: "roll__strip" });
      strip.style.setProperty("--d", ch);
      strip.style.setProperty("--i", i++);
      for (let n = 0; n < 10; n++) strip.append(Object.assign(document.createElement("span"), { textContent: n }));
      col.append(strip);
      shown.append(col);
    }
    el.classList.add("roll");
    el.replaceChildren(said, shown);
  });

  if (rollEls.length && "IntersectionObserver" in window) {
    const rollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            rollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0 } // start as soon as any part shows, so a figure never rests at 0 on screen
    );
    rollEls.forEach((el) => rollObserver.observe(el));
  } else {
    rollEls.forEach((el) => el.classList.add("is-in"));
  }

  // ---------- Image lightbox (work page) ----------
  // Without JS (or <dialog> support) the links simply open the image itself.
  const lightbox = document.querySelector(".lightbox");

  if (lightbox && typeof lightbox.showModal === "function") {
    const lightboxImg = lightbox.querySelector(".lightbox__img");

    document.querySelectorAll("[data-lightbox]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const thumb = link.querySelector("img");
        const isTall = thumb && thumb.getAttribute("height") > thumb.getAttribute("width") * 1.5;

        lightboxImg.src = link.getAttribute("href");
        lightboxImg.alt = thumb ? thumb.alt : "";
        lightbox.classList.toggle("lightbox--tall", isTall);
        lightbox.showModal();
        lightbox.scrollTop = 0;
      });
    });

    lightbox.querySelector(".lightbox__close").addEventListener("click", () => lightbox.close());

    // Close when clicking the dark backdrop outside the image
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });
  }

  // ---------- Mobile sticky CTA ----------
  // Hidden while the intro or the contact band is on screen, so it never covers them.
  const mobileCta = document.querySelector("[data-mobile-cta]");
  const ctaTargets = [...document.querySelectorAll(".intro, .page-hero, #contact")];

  if (mobileCta && ctaTargets.length && "IntersectionObserver" in window) {
    const visible = new Set();
    const ctaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      mobileCta.classList.toggle("is-hidden", visible.size > 0);
    });
    ctaTargets.forEach((el) => ctaObserver.observe(el));
  } else if (mobileCta) {
    mobileCta.classList.remove("is-hidden");
  }

  // ---------- Copy email ----------
  // Falls back to selecting the address when the clipboard isn't available.
  const copyBtn = document.querySelector("#copy-email");
  const emailText = document.querySelector("#contact-email");

  if (copyBtn && emailText) {
    const selectEmail = () => {
      const range = document.createRange();
      range.selectNodeContents(emailText);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyBtn.textContent = "Press Ctrl+C to copy";
    };

    copyBtn.addEventListener("click", () => {
      if (!navigator.clipboard) {
        selectEmail();
        return;
      }
      navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => {
        copyBtn.textContent = "Email copied";
        setTimeout(() => { copyBtn.textContent = "Copy Email"; }, 2000);
      }, selectEmail);
    });
  }

  // ---------- Footer year ----------
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});
