const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Opens the browser print dialog with a clean letter layout ("Save as PDF").
 * Uses a hidden iframe, so no pop-up is needed. Returns false if printing is unavailable.
 */
export function printLetter(opts: { lang: string; title: string; salutation: string; body: string }): boolean {
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const html = `<!doctype html><html lang="${escapeHtml(opts.lang)}"><head><meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { margin: 26mm 24mm; }
  body { font-family: Georgia, "Times New Roman", "Songti SC", "Noto Serif SC", serif; font-size: 12pt; line-height: 1.6; color: #111; }
  h1 { font-size: 16pt; margin: 0 0 18pt; line-height: 1.3; }
  .salutation { margin: 0 0 12pt; }
  p { margin: 0 0 12pt; white-space: normal; }
</style></head><body>
<h1>${escapeHtml(opts.title)}</h1>
<p class="salutation">${escapeHtml(opts.salutation)}</p>
${paragraphs}
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 200);
  return true;
}
