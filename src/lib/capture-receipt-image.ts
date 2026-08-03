/**
 * Receipt & PO image capture utility.
 * Uses dom-to-image-more which reads computed styles directly
 * and never touches document.styleSheets, making it immune to the
 * oklch() parse errors that break html2canvas with Tailwind v4.
 *
 * Key insight: A4Receipt renders at 210mm (794px) but CSS scale() shrinks it
 * to fit the preview panel. We must reset scale=1 on the .a4-sheet before
 * capturing so the image is generated at true A4 width, not the shrunken preview.
 */

// @ts-ignore - dom-to-image-more has no built-in TS types
import domtoimage from "dom-to-image-more";

export function triggerDownload(dataUrl: string, filename: string) {
  try {
    const a = document.createElement("a");
    a.download = filename;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Download error:", e);
  }
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && navigator.clipboard && (window as any).ClipboardItem) {
      const item = new (window as any).ClipboardItem({
        "image/png": new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas blob error"));
            },
            "image/png"
          );
        }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (e) {
    console.warn("Clipboard copy failed:", e);
  }
  return false;
}

async function copyDataUrlToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && (window as any).ClipboardItem) {
      const item = new (window as any).ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (e) {
    console.warn("Clipboard copy failed:", e);
  }
  return false;
}

/**
 * Detects which document type we are capturing and returns
 * the correct pixel width for the image.
 *
 * - Thermal receipt: 302px (80mm @ 96dpi)
 * - A4 invoice:      794px (210mm @ 96dpi)
 * - Purchase Order:  natural element width
 */
function getDocumentWidth(el: HTMLElement): number {
  // Thermal receipt — 80mm paper
  if (el.classList.contains("thermal-receipt") || el.querySelector(".thermal-receipt")) {
    return 302;
  }
  // A4 sheet — 210mm paper
  if (el.classList.contains("a4-sheet") || el.querySelector(".a4-sheet")) {
    return 794;
  }
  // Purchase Order or other — natural layout width
  return Math.max(el.scrollWidth, el.offsetWidth, 600);
}

/**
 * Converts a DOM element to a PNG image using dom-to-image-more,
 * copies it to clipboard only (no download).
 */
export async function captureReceiptAsImage(
  targetElement: HTMLElement,
  _downloadFilename: string // kept for API compatibility
): Promise<boolean> {
  if (!targetElement) return false;

  // --- STEP 1: Find the actual printable inner element ---
  // BillViewerModal passes the wrapper ref; the real content is .a4-sheet or .thermal-receipt
  const innerA4 = targetElement.querySelector(".a4-sheet") as HTMLElement | null;
  const innerThermal = targetElement.querySelector(".thermal-receipt") as HTMLElement | null;
  const captureEl = innerA4 || innerThermal || targetElement;

  // --- STEP 2: Hide any UI-only elements (buttons etc.) that shouldn't appear in the image ---
  const captureHideEls = Array.from(
    captureEl.querySelectorAll("[data-capture-hide='true']")
  ) as HTMLElement[];
  const prevDisplays: string[] = captureHideEls.map((el) => el.style.display);
  captureHideEls.forEach((el) => { el.style.display = "none"; });

  // --- STEP 3: Temporarily reset CSS transform scale to 1 so we capture at true size ---
  const prevTransform = captureEl.style.transform;
  const prevMarginBottom = captureEl.style.marginBottom;
  const prevTransformOrigin = captureEl.style.transformOrigin;

  captureEl.style.transform = "none";
  captureEl.style.marginBottom = "0";
  captureEl.style.transformOrigin = "top center";

  // Allow layout to update
  await new Promise((r) => setTimeout(r, 40));

  const captureWidth = getDocumentWidth(captureEl);
  const captureHeight = Math.max(captureEl.scrollHeight, captureEl.offsetHeight, 400) + 32;

  let success = false;
  try {
    const dataUrl: string = await domtoimage.toPng(captureEl, {
      width: captureWidth,
      height: captureHeight,
      bgcolor: "#ffffff",
      scale: 2,
      style: {
        transform: "none",
        overflow: "visible",
        maxHeight: "none",
      },
    });

    await copyDataUrlToClipboard(dataUrl);
    success = true;
  } catch (err) {
    console.error("dom-to-image-more failed:", err);
    success = false;
  } finally {
    // --- STEP 4: Restore original transform and hidden elements ---
    captureEl.style.transform = prevTransform;
    captureEl.style.marginBottom = prevMarginBottom;
    captureEl.style.transformOrigin = prevTransformOrigin;
    captureHideEls.forEach((el, i) => { el.style.display = prevDisplays[i]; });
  }

  return success;
}
