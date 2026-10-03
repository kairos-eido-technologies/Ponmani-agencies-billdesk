/**
 * Utility for isolated printing of thermal receipts and A4 invoices.
 * By printing through a dedicated detached iframe, the main application DOM
 * (sidebars, tables, modals) is never included in the print spooler, ensuring:
 * 1. Exact 76mm / 80mm width with zero horizontal clipping.
 * 2. Natural document height that terminates immediately after the last printed line.
 * 3. Fast spooling to thermal printers like TVS RP 3230 without extra blank page feeds.
 */

export function printIsolatedReceipt(
  targetElement: HTMLElement,
  mode: "thermal" | "a4" = "thermal"
) {
  // Remove any previously created print iframe
  const existingIframe = document.getElementById("__receipt_print_frame__");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "__receipt_print_frame__";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const isThermal = mode === "thermal";
  const pageSize = isThermal ? "72mm auto" : "A4 portrait";
  const pageMargin = isThermal ? "0mm" : "8mm";
  const bodyWidth = isThermal ? "70mm" : "100%";

  // Collect active Tailwind & application styles
  const styleTags = Array.from(
    document.querySelectorAll("link[rel='stylesheet'], style")
  )
    .map((node) => node.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt</title>
      ${styleTags}
      <style>
        @page {
          size: ${pageSize} !important;
          margin: ${pageMargin} !important;
        }
        * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          width: ${bodyWidth} !important;
          max-width: ${bodyWidth} !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          font-family: 'Courier New', Courier, monospace;
        }
        .thermal-receipt {
          width: 70mm !important;
          max-width: 70mm !important;
          margin: 0 auto !important;
          padding: 1.5mm 1mm 0mm 1mm !important;
          height: auto !important;
          min-height: 0 !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .thermal-receipt,
        .thermal-receipt * {
          color: #000000 !important;
          font-weight: 700 !important;
          border-color: #000000 !important;
          -webkit-text-stroke: 0.2px #000000 !important;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: #ffffff;">
      <div id="print-root">
        ${targetElement.outerHTML}
      </div>
    </body>
    </html>
  `);
  doc.close();

  // Allow images/styles to settle before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Isolated print failed", e);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 250);
}

/**
 * Dedicated isolated print utility for barcode label printers (e.g. TVS LP 46 NEO BPLE).
 * Formats pages to exact label dimensions (default 100mm x 25mm / 4" x 1") with zero margins.
 */
export function printIsolatedLabels(
  htmlContent: string,
  widthMm: number = 100,
  heightMm: number = 25
) {
  const existingIframe = document.getElementById("__label_print_frame__");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "__label_print_frame__";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const cleanHtml = (htmlContent || "").trim();

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Barcode Label</title>
      <style>
        @page {
          size: ${widthMm}mm ${heightMm}mm !important;
          margin: 0mm !important;
          padding: 0mm !important;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          width: ${widthMm}mm !important;
          max-width: ${widthMm}mm !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          overflow: hidden !important;
          font-size: 0 !important;
          line-height: 0 !important;
        }
        .label-sheet {
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          max-height: ${heightMm}mm !important;
          max-width: ${widthMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background: #ffffff !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .label-sheet:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
        .label-sheet:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
          margin-bottom: 0 !important;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: #ffffff; overflow: hidden; font-size: 0; line-height: 0;">${cleanHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Isolated label print failed", e);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 200);
}
