// iOS Safari has a long-standing bug where elements using backdrop-filter
// (every glass-style widget/nav bar in this app) don't reliably repaint
// when a CSS custom property they depend on changes via a JS-driven
// class/attribute toggle -- the blurred layer keeps compositing with
// stale pixels until something forces a reflow, which shows up as a hard
// color seam across part of the screen right after switching theme or
// site style. Toggling display off/on forces the browser to redo layout
// and repaint everything against the new colors.
export function forceRepaint() {
  const { body } = document;
  body.style.display = "none";
  // Reading a layout property forces the browser to flush the pending
  // style change above before the next line re-shows the body.
  void body.offsetHeight;
  body.style.display = "";
}
