// Injected into pages via scripting.executeScript; must stay self-contained and must not touch the DOM.
export function readSelection() {
  const selected = window.getSelection().toString();
  if (selected.trim() !== "") return selected;
  const el = document.activeElement;
  if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|url|tel|email|password)?$/i.test(el.type)))) {
    const { selectionStart: start, selectionEnd: end, value } = el;
    if (typeof start === "number" && typeof end === "number" && end > start && el.type !== "password") {
      return value.slice(start, end);
    }
  }
  return selected;
}
