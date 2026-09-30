import { Lang } from "./schema";
import { cleanExtractedText as clean } from "./text";

/*
  Reads a PDF entirely in the browser, so the CV never leaves the user's device for this step:
  1. text layer via pdf.js (fast, exact)
  2. if the PDF is a scan (no text layer): render each page and run OCR with Tesseract (WASM).
  Only the OCR engine and its language model are downloaded (from a CDN); the file itself is not uploaded.
*/

const MAX_PAGES = 4; // a CV is 1-3 pages; bounds the OCR time
const RENDER_SCALE = 3; // sharper canvas = better OCR
const CONFIDENCE_OK = 70; // below this, try the Chinese model as well
const CONFIDENCE_MIN = 40; // below this, the text is noise

export type PdfProgress =
  | { phase: "text" }
  | { phase: "ocr-load" }
  | { phase: "ocr"; page: number; total: number };

export interface PdfResult {
  text: string;
  pages: number;
  usedOcr: boolean;
}

export async function readPdfInBrowser(
  file: File,
  lang: Lang,
  onProgress: (p: PdfProgress) => void,
): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const total = Math.min(doc.numPages, MAX_PAGES);

  // 1) text layer
  onProgress({ phase: "text" });
  let text = "";
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("") + "\n";
  }
  if (clean(text).length >= 40) return { text: clean(text), pages: doc.numPages, usedOcr: false };

  // 2) OCR for scans. German + English first (fast). If the engine is unsure (e.g. a Chinese CV),
  //    retry with the Chinese model and keep the better result. Chinese UI users start with it directly.
  onProgress({ phase: "ocr-load" });
  const { createWorker } = await import("tesseract.js");

  const runOcr = async (languages: string[]) => {
    const worker = await createWorker(languages);
    try {
      let out = "";
      let confidenceSum = 0;
      for (let i = 1; i <= total; i++) {
        onProgress({ phase: "ocr", page: i, total });
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        const { data } = await worker.recognize(canvas);
        out += data.text + "\n\n";
        confidenceSum += data.confidence;
        canvas.width = canvas.height = 0; // free the memory
      }
      return { text: clean(out), confidence: confidenceSum / total };
    } finally {
      await worker.terminate();
    }
  };

  // German first: umlauts are the most common OCR mistake for CVs written in Germany.
  let best = await runOcr(lang === "zh" ? ["deu", "eng", "chi_sim"] : ["deu", "eng"]);
  if (lang !== "zh" && best.confidence < CONFIDENCE_OK) {
    const chinese = await runOcr(["chi_sim", "eng"]);
    if (chinese.confidence > best.confidence) best = chinese;
  }
  // Very low confidence means garbage: report "no text" instead of feeding noise to the AI.
  return { text: best.confidence < CONFIDENCE_MIN ? "" : best.text, pages: doc.numPages, usedOcr: true };
}
