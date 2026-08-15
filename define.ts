import { ActionPanel } from "./index.js";

export const TAG = "action-panel";

if (typeof customElements !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, ActionPanel);
}

export { ActionPanel };

declare global {
  interface HTMLElementTagNameMap {
    "action-panel": ActionPanel;
  }
}
