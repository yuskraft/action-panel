const styles = /* css */ `
:host {
  --ap-width: 26rem;
  --ap-radius: 1rem;
  --ap-bg: Canvas;
  --ap-fg: CanvasText;
  --ap-border: color-mix(in oklab, CanvasText 14%, transparent);
  --ap-scrim: color-mix(in oklab, black 45%, transparent);
  --ap-duration: 0.32s;
  --ap-ease: cubic-bezier(0.32, 0.72, 0, 1);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
dialog {
  margin: 0;
  padding: 0;
  max-width: none;
  max-height: none;
  border: none;
  color: var(--ap-fg);
  background: var(--ap-bg);
  overflow: clip;
  display: flex;
  flex-direction: column;
  transition:
    translate var(--ap-duration) var(--ap-ease),
    opacity var(--ap-duration) var(--ap-ease),
    overlay var(--ap-duration) var(--ap-ease) allow-discrete,
    display var(--ap-duration) var(--ap-ease) allow-discrete;
}
dialog:not([open]) {
  display: none;
}
dialog.gesture {
  transition: none;
  will-change: translate;
}
dialog::backdrop {
  background: var(--ap-scrim);
  opacity: 0;
  transition:
    opacity var(--ap-duration) var(--ap-ease),
    overlay var(--ap-duration) var(--ap-ease) allow-discrete,
    display var(--ap-duration) var(--ap-ease) allow-discrete;
}
dialog[open]::backdrop {
  opacity: 1;
}
dialog {
  inset: 0 0 0 auto;
  height: 100dvh;
  width: var(--ap-width);
  translate: 100% 0;
  opacity: 0.4;
}
dialog[open] {
  translate: 0 0;
  opacity: 1;
}
@starting-style {
  dialog[open] {
    translate: 100% 0;
    opacity: 0.4;
  }
}
@media (max-width: 767px) {
  dialog {
    inset: auto 0 0 0;
    height: auto;
    width: 100%;
    max-height: 90dvh;
    border-radius: var(--ap-radius) var(--ap-radius) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    translate: 0 100%;
    opacity: 1;
  }
  dialog[open] {
    translate: 0 0;
  }
  @starting-style {
    dialog[open] {
      translate: 0 100%;
    }
  }
}
.handle {
  display: none;
}
@media (max-width: 767px) {
  .handle {
    display: block;
    flex: none;
    width: 2.5rem;
    height: 0.3rem;
    margin: 0.6rem auto 0.2rem;
    border-radius: 999px;
    background: color-mix(in oklab, CanvasText 25%, transparent);
    touch-action: none;
    cursor: grab;
  }
}
header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
}
header ::slotted(*) {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.title {
  flex: 1 1 auto;
  min-width: 0;
}
.close {
  flex: none;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ap-border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
.close:hover {
  background: color-mix(in oklab, CanvasText 8%, transparent);
}
.body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.5rem 1.5rem 1.5rem;
  touch-action: pan-y;
}
footer {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--ap-border);
}
footer[hidden] {
  display: none;
}
@media (max-width: 767px) {
  header {
    touch-action: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  dialog {
    opacity: 0;
    translate: none;
    transition:
      opacity 0.2s ease,
      overlay 0.2s ease allow-discrete,
      display 0.2s ease allow-discrete;
  }
  dialog[open] {
    opacity: 1;
    translate: none;
  }
  dialog::backdrop {
    transition:
      opacity 0.2s ease,
      overlay 0.2s ease allow-discrete,
      display 0.2s ease allow-discrete;
  }
  @starting-style {
    dialog[open] {
      opacity: 0;
    }
  }
}
`;

const sheet = new CSSStyleSheet();
sheet.replaceSync(styles);

const TEMPLATE = `
  <dialog part="dialog">
    <div class="handle" aria-hidden="true"></div>
    <header part="header">
      <div class="title"><slot name="title"></slot></div>
      <button class="close" type="button" aria-label="Close" part="close">&times;</button>
    </header>
    <div class="body" part="body"><slot></slot></div>
    <footer part="footer"><slot name="footer"></slot></footer>
  </dialog>
`;

const DRAWER = "(max-width: 767px)";
const REDUCED = "(prefers-reduced-motion: reduce)";

const SPRING_DAMPING = 1;
const SPRING_RESPONSE = 0.3;
const SPRING_EPSILON = 0.5;
const SPRING_EPSILON_V = 5;

const DISMISS_FRACTION = 0.5;
const DECELERATION = 0.998;
const STALE_VELOCITY_MS = 100;
const RUBBERBAND = 0.55;

const MAX_VELOCITY = 6000;

const project = (velocity: number) =>
  ((velocity / 1000) * DECELERATION) / (1 - DECELERATION);

const rubberband = (overshoot: number, dimension: number) =>
  (overshoot * dimension * RUBBERBAND) /
  (dimension + RUBBERBAND * Math.abs(overshoot));

export class ActionPanel extends HTMLElement {
  #dialog!: HTMLDialogElement;
  #drawer = window.matchMedia(DRAWER);
  #reduced = window.matchMedia(REDUCED);

  #dragging = false;
  #pointerId: number | null = null;
  #origin = 0;
  #height = 0;
  #lastY = 0;
  #lastT = 0;
  #velocity = 0;

  #offset = 0;
  #springV = 0;
  #raf = 0;

  connectedCallback() {
    if (!this.#dialog) this.#render();

    this.#dialog.addEventListener("click", this.#onLightDismiss);
    this.#dialog.addEventListener("close", this.#onNativeClose);
    this.#dialog
      .querySelector(".close")!
      .addEventListener("click", () => this.hide());

    this.#drawer.addEventListener("change", this.#syncGesture);
    this.#syncGesture();
  }

  disconnectedCallback() {
    this.#drawer.removeEventListener("change", this.#syncGesture);
    this.#teardownGesture();
    this.#settle();
  }

  show() {
    if (this.#dialog.open) return;
    this.#settle();
    this.#dialog.showModal();
    this.setAttribute("open", "");
    this.dispatchEvent(new CustomEvent("open"));
  }

  hide() {
    if (!this.#dialog.open) return;
    this.#dialog.close();
  }

  toggle() {
    this.#dialog.open ? this.hide() : this.show();
  }

  get open() {
    return this.#dialog?.open ?? false;
  }

  #render() {
    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [sheet];
    root.innerHTML = TEMPLATE;
    this.#dialog = root.querySelector("dialog")!;

    const footer = root.querySelector("footer")!;
    const footerSlot = footer.querySelector("slot")!;
    const syncFooter = () =>
      footer.toggleAttribute("hidden", footerSlot.assignedNodes().length === 0);
    footerSlot.addEventListener("slotchange", syncFooter);
    syncFooter();
  }

  #onNativeClose = () => {
    this.removeAttribute("open");
    this.#settle();
    this.#dialog.style.translate = "";
    this.#dialog.classList.remove("gesture");
    this.dispatchEvent(new CustomEvent("close"));
  };

  #settle() {
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#offset = 0;
    this.#springV = 0;
  }

  #onLightDismiss = (e: MouseEvent) => {
    const r = this.#dialog.getBoundingClientRect();
    const outside =
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom;
    if (outside) this.hide();
  };

  #syncGesture = () => {
    if (this.#drawer.matches) this.#setupGesture();
    else this.#teardownGesture();
  };

  #setupGesture() {
    this.#dialog.addEventListener("pointerdown", this.#onPointerDown);
  }

  #teardownGesture() {
    this.#dialog.removeEventListener("pointerdown", this.#onPointerDown);
  }

  #onPointerDown = (e: PointerEvent) => {
    if (!this.#dialog.open) return;
    if (!this.#drawer.matches) return;
    if (this.#dragging) return;
    const fromGrip = (e.target as Element).closest(".handle, header");
    if (!fromGrip) return;

    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#springV = 0;

    this.#dragging = true;
    this.#pointerId = e.pointerId;
    this.#origin = e.clientY - this.#offset;
    this.#height = this.#dialog.getBoundingClientRect().height;
    this.#lastY = e.clientY;
    this.#lastT = e.timeStamp;
    this.#velocity = 0;
    this.#dialog.classList.add("gesture");
    try {
      this.#dialog.setPointerCapture(e.pointerId);
    } catch {
    }

    this.#dialog.addEventListener("pointermove", this.#onPointerMove);
    this.#dialog.addEventListener("pointerup", this.#onPointerUp);
    this.#dialog.addEventListener("pointercancel", this.#onPointerUp);
  };

  #onPointerMove = (e: PointerEvent) => {
    if (!this.#dragging || e.pointerId !== this.#pointerId) return;

    const dy = e.clientY - this.#origin;
    this.#offset = dy < 0 ? -rubberband(-dy, this.#height) : dy;

    const dt = e.timeStamp - this.#lastT;
    if (dt > 0) this.#velocity = (e.clientY - this.#lastY) / dt;
    this.#lastY = e.clientY;
    this.#lastT = e.timeStamp;

    this.#draw();
  };

  #onPointerUp = (e: PointerEvent) => {
    if (!this.#dragging || e.pointerId !== this.#pointerId) return;
    this.#dragging = false;
    try {
      this.#dialog.releasePointerCapture(this.#pointerId);
    } catch {
    }
    this.#pointerId = null;
    this.#dialog.removeEventListener("pointermove", this.#onPointerMove);
    this.#dialog.removeEventListener("pointerup", this.#onPointerUp);
    this.#dialog.removeEventListener("pointercancel", this.#onPointerUp);

    const stale = e.timeStamp - this.#lastT > STALE_VELOCITY_MS;
    const raw = stale ? 0 : this.#velocity * 1000; // px/s
    const velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, raw));
    const dismiss =
      this.#offset + project(velocity) > this.#height * DISMISS_FRACTION;

    if (this.#reduced.matches) {
      if (dismiss) this.#dismiss();
      else {
        this.#settle();
        this.#dialog.style.translate = "";
        this.#dialog.classList.remove("gesture");
      }
      return;
    }

    if (dismiss) {
      this.#spring(this.#height, velocity, () => this.#dismiss());
    } else {
      this.#spring(0, velocity, () => {
        this.#dialog.style.translate = "";
        this.#dialog.classList.remove("gesture");
      });
    }
  };

  #dismiss() {
    this.#settle();
    this.#dialog.style.translate = "";
    this.#dialog.classList.remove("gesture");
    this.hide();
  }

  #draw() {
    this.#dialog.style.translate = `0 ${this.#offset}px`;
  }

  #spring(target: number, velocity: number, done: () => void) {
    cancelAnimationFrame(this.#raf);
    this.#springV = velocity;

    const w = (2 * Math.PI) / SPRING_RESPONSE;
    const descending = target < this.#offset;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30));
      last = now;

      const a =
        -(w * w) * (this.#offset - target) - 2 * SPRING_DAMPING * w * this.#springV;
      this.#springV += a * dt;
      this.#offset += this.#springV * dt;

      const reached = descending
        ? this.#offset <= target
        : this.#offset >= target;
      const settled =
        Math.abs(this.#offset - target) < SPRING_EPSILON &&
        Math.abs(this.#springV) < SPRING_EPSILON_V;

      if (reached || settled) {
        this.#offset = target;
        this.#springV = 0;
        this.#raf = 0;
        this.#draw();
        done();
        return;
      }

      this.#draw();
      this.#raf = requestAnimationFrame(step);
    };

    this.#raf = requestAnimationFrame(step);
  }
}

customElements.define("action-panel", ActionPanel);

declare global {
  interface HTMLElementTagNameMap {
    "action-panel": ActionPanel;
  }
}
