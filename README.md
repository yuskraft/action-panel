# apan - `<action-panel>`

A side panel that becomes a drag-to-dismiss drawer on narrow screens. Native web component, **zero dependencies**, ~3 kB gzipped.

## Install

```bash
npm install apan
```

```js
import "apan/define";
```

Or straight from a CDN, no build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/apan/dist/define.js"></script>
```

## Usage

```html
<action-panel id="panel">
  <h2 slot="title">Action Panel</h2>

  <label for="email">Email</label>
  <input id="email" type="email" />

  <div slot="footer">
    <button id="cancel">Cancel</button>
    <button id="confirm">Confirm</button>
  </div>
</action-panel>

<script type="module">
  import "apan/define";

  const panel = document.getElementById("panel");
  panel.show();
  panel.addEventListener("close", () => console.log("closed"));
</script>
```

### Registering under a different name

The default entry is side-effect free, so you can avoid a tag-name collision:

```js
import { ActionPanel } from "apan";

customElements.define("my-panel", ActionPanel);
```

## API

| Method | |
| --- | --- |
| `show()` | Opens it modally. No-op if already open. |
| `hide()` | Closes it. No-op if already closed. |
| `toggle()` | |
| `open` | Read-only boolean. |

| Event | Fires |
| --- | --- |
| `open` | After opening |
| `close` | After closing — by button, backdrop, <kbd>Esc</kbd>, or drag-dismiss |

The `open` attribute is reflected onto the host while it's open, so you can style off it.

## Styling

Three layers, all reachable from outside the component.

**Slotted content is your light DOM** — the panel's body, title, and footer are your markup, styled by your own CSS or Tailwind exactly as if the panel weren't there. Only the chrome is encapsulated.

**Custom properties:**

```css
action-panel {
  --ap-width: 26rem;                             /* desktop panel width */
  --ap-radius: 1rem;                             /* drawer corner radius */
  --ap-bg: Canvas;
  --ap-fg: CanvasText;
  --ap-border: color-mix(in oklab, CanvasText 14%, transparent);
  --ap-scrim: color-mix(in oklab, black 45%, transparent);
  --ap-duration: 0.32s;                          /* open/close only, not the drag */
  --ap-ease: cubic-bezier(0.32, 0.72, 0, 1);
}
```

Defaults use the `Canvas`/`CanvasText` system colors, so it follows light and dark mode with no configuration. Point them at your own tokens to theme it:

```css
action-panel {
  --ap-bg: var(--background);
  --ap-fg: var(--foreground);
}
```

**Parts**, for the chrome:

```css
action-panel::part(dialog) { box-shadow: 0 0 60px rgb(0 0 0 / 0.2); }
action-panel::part(header) { border-bottom: 1px solid #eee; }
action-panel::part(close)  { border-radius: 9999px; }
action-panel::part(body)   { padding-inline: 2rem; }
action-panel::part(footer) { justify-content: space-between; }
```

## Behaviour

Under 768px it becomes a bottom sheet with a grab handle. Drag it by the handle or the header:

- **Momentum projection** decides dismissal from where the drag would come to rest, not from raw distance — so a flick dismisses and a slow drag to the same point doesn't.
- **Interruptible.** Grab it mid-animation and it continues from its current position.
- **Rubber-banding** past the top edge, with rising resistance.
- Holding still before release drops the throw, so a paused drag won't fling.

`prefers-reduced-motion: reduce` keeps the fade and drops the travel; the drag still tracks, but release resolves without the spring.

## Browser support

Chrome 117+, Safari 17.5+, Firefox 129+ — set by `@starting-style` and `transition-behavior: allow-discrete`.

Below that it degrades rather than breaks: the panel still opens, closes, traps focus, and responds to <kbd>Esc</kbd>; it just appears instantly instead of animating.

## Development

```bash
npm run dev        # demo at localhost:5173
npm run build      # package -> dist/
npm run typecheck
```

## License

MIT
