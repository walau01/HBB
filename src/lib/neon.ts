// Night neon behaviour: tubes light one by one, left to right, when Night is
// switched on, and every 8–20s one visible tube does a tired double-blink.
// CSS in src/styles/neon.css does the drawing; this only sets attributes.
const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const STAGGER = 0.25;
let blinkTimer: number | undefined;
let lightingTimer: number | undefined;

const isNight = () => root.dataset.theme === "dark";

function visibleTubes() {
  return [...document.querySelectorAll<HTMLElement>("[data-neon]")].filter(
    (el) => {
      const box = el.getBoundingClientRect();
      return (
        box.width > 0 &&
        box.bottom > 0 &&
        box.top < innerHeight &&
        box.right > 0 &&
        box.left < innerWidth
      );
    },
  );
}

function scheduleBlink() {
  clearTimeout(blinkTimer);
  if (!isNight() || reducedMotion.matches) return;
  blinkTimer = window.setTimeout(
    () => {
      const tubes = visibleTubes();
      const tube = tubes[Math.floor(Math.random() * tubes.length)];
      if (tube && !document.hidden && !root.hasAttribute("data-lighting")) {
        tube.dataset.neonBlink = "";
        window.setTimeout(() => delete tube.dataset.neonBlink, 700);
      }
      scheduleBlink();
    },
    8000 + Math.random() * 12000,
  );
}

function lightUp() {
  const tubes = visibleTubes().sort(
    (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
  );
  tubes.forEach((el, i) => el.style.setProperty("--neon-order", String(i)));
  root.setAttribute("data-lighting", "");
  clearTimeout(lightingTimer);
  lightingTimer = window.setTimeout(
    () => root.removeAttribute("data-lighting"),
    (tubes.length * STAGGER + 1.3) * 1000,
  );
}

/** Call after the theme changes; `switchedOn` plays the flicker-on. */
export function syncNeon(switchedOn = false) {
  if (switchedOn && isNight() && !reducedMotion.matches) lightUp();
  if (!isNight()) root.removeAttribute("data-lighting");
  scheduleBlink();
}

reducedMotion.addEventListener("change", () => scheduleBlink());
