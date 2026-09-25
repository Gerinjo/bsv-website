import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';

// Vite publishes PDF.js support files locally; they are fetched only if a PDF needs them.
const supportAssets = import.meta.glob('/node_modules/pdfjs-dist/{cmaps/*.bcmap,standard_fonts/*.{pfb,ttf},wasm/*.wasm}', {
  query: '?url', import: 'default', eager: true,
}) as Record<string, string>;
const assetByName = new Map(Object.entries(supportAssets).map(([path, url]) => [path.split('/').pop(), url]));
class LocalPdfAssets {
  async fetch({ filename }: { filename: string }) {
    const url = assetByName.get(filename);
    if (!url) throw new Error(`Missing PDF reader asset: ${filename}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PDF reader asset unavailable: ${filename}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}

async function initializeReader(root: HTMLElement) {
  const previous = root.querySelector<HTMLButtonElement>('[data-previous]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-next]')!;
  const pageInput = root.querySelector<HTMLInputElement>('[data-page]')!;
  const pageForm = root.querySelector<HTMLFormElement>('[data-page-form]')!;
  const zoomIn = root.querySelector<HTMLButtonElement>('[data-zoom-in]')!;
  const zoomOut = root.querySelector<HTMLButtonElement>('[data-zoom-out]')!;
  const fit = root.querySelector<HTMLButtonElement>('[data-fit]')!;
  const fullscreen = root.querySelector<HTMLButtonElement>('[data-fullscreen]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const paper = root.querySelector<HTMLElement>('[data-paper]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  let visiblePage: PDFPageProxy | undefined;
  let renderTask: RenderTask | undefined;
  let textLayer: { cancel(): void } | undefined;
  let pageNumber = 1;
  let zoom = 1;
  let revision = 0;
  let resizeTimer: ReturnType<typeof setTimeout>;

  try {
    const { getDocument, GlobalWorkerOptions, TextLayer } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = workerUrl;
    const loadingTask = getDocument({ url: root.dataset.pdf!, useWorkerFetch: false, BinaryDataFactory: LocalPdfAssets });
    const pdfDocument = await loadingTask.promise;
    root.querySelector<HTMLElement>('[data-controls]')!.hidden = false;
    pageInput.max = String(pdfDocument.numPages);
    root.querySelector<HTMLElement>('[data-page-count]')!.textContent = String(pdfDocument.numPages);
    pageInput.disabled = false;
    pageForm.querySelector('button')!.disabled = false;

    function updateControls() {
      pageInput.value = String(pageNumber);
      previous.disabled = pageNumber === 1;
      next.disabled = pageNumber === pdfDocument.numPages;
      zoomOut.disabled = zoom <= 0.5;
      zoomIn.disabled = zoom >= 3;
      fit.disabled = false;
      fit.textContent = zoom === 1 ? 'Ganze Seite' : `${Math.round(zoom * 100)} %`;
    }

    async function renderPage() {
      const request = ++revision;
      const requestedPage = pageNumber;
      renderTask?.cancel();
      textLayer?.cancel();
      stage.setAttribute('aria-busy', 'true');
      status.textContent = `Seite ${requestedPage} wird geladen …`;
      updateControls();
      try {
        const page = await pdfDocument.getPage(requestedPage);
        if (request !== revision) return;
        const natural = page.getViewport({ scale: 1 });
        const padding = getComputedStyle(stage);
        const width = stage.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
        const height = stage.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
        const scale = Math.min(width / natural.width, height / natural.height) * zoom;
        const viewport = page.getViewport({ scale });
        // Bound canvas memory on phones, including at high zoom levels.
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12_000_000 / (viewport.width * viewport.height)));
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute('aria-hidden', 'true');
        renderTask = page.render({ canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
        await renderTask.promise;
        if (request !== revision) return;
        const text = await page.getTextContent();
        if (request !== revision) return;
        const textContainer = window.document.createElement('div');
        textContainer.className = 'textLayer';
        paper.style.width = `${viewport.width}px`;
        paper.style.height = `${viewport.height}px`;
        paper.style.setProperty('--total-scale-factor', String(viewport.scale * viewport.userUnit));
        paper.replaceChildren(canvas, textContainer);
        const layer = new TextLayer({ textContentSource: text, container: textContainer, viewport });
        textLayer = layer;
        await layer.render();
        if (request !== revision) return;
        if (visiblePage && visiblePage.pageNumber !== page.pageNumber) visiblePage.cleanup();
        visiblePage = page;
        paper.dataset.renderedPage = String(requestedPage);
        stage.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        stage.setAttribute('aria-busy', 'false');
        status.textContent = `Seite ${requestedPage} von ${pdfDocument.numPages}`;
      } catch (error) {
        if (request !== revision || (error as Error).name === 'RenderingCancelledException') return;
        stage.setAttribute('aria-busy', 'false');
        status.textContent = 'Diese Seite konnte nicht angezeigt werden. Bitte erneut blättern oder das PDF öffnen.';
        console.error('Stadionheft: Seite konnte nicht geladen werden.', error);
      }
    }

    function goToPage(value: number) {
      if (!Number.isFinite(value)) { pageInput.value = String(pageNumber); return; }
      pageNumber = Math.max(1, Math.min(pdfDocument.numPages, Math.trunc(value)));
      void renderPage();
    }
    previous.addEventListener('click', () => goToPage(pageNumber - 1));
    next.addEventListener('click', () => goToPage(pageNumber + 1));
    pageForm.addEventListener('submit', (event) => { event.preventDefault(); goToPage(pageInput.valueAsNumber); });
    pageInput.addEventListener('change', () => goToPage(pageInput.valueAsNumber));
    zoomIn.addEventListener('click', () => { zoom = Math.min(3, zoom + 0.25); void renderPage(); });
    zoomOut.addEventListener('click', () => { zoom = Math.max(0.5, zoom - 0.25); void renderPage(); });
    fit.addEventListener('click', () => { zoom = 1; void renderPage(); });
    root.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goToPage(pageNumber + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    if (window.document.fullscreenEnabled && root.requestFullscreen) {
      fullscreen.hidden = false;
      fullscreen.addEventListener('click', async () => {
        try {
          if (window.document.fullscreenElement === root) await window.document.exitFullscreen();
          else await root.requestFullscreen();
        } catch { status.textContent = 'Vollbild ist gerade nicht verfügbar. Du kannst hier weiterblättern.'; }
      });
      window.document.addEventListener('fullscreenchange', () => {
        const label = window.document.fullscreenElement === root ? 'Vollbild schließen' : 'Vollbild öffnen';
        fullscreen.setAttribute('aria-label', label);
        fullscreen.title = label;
      });
    }
    let lastSize = '';
    const observer = new ResizeObserver(() => {
      const size = `${stage.clientWidth}:${stage.clientHeight}`;
      if (size === lastSize) return;
      lastSize = size;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void renderPage(), 150);
    });
    await renderPage();
    lastSize = `${stage.clientWidth}:${stage.clientHeight}`;
    observer.observe(stage);
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      revision++;
      clearTimeout(resizeTimer);
      observer.disconnect();
      renderTask?.cancel();
      textLayer?.cancel();
      void loadingTask.destroy();
    }, { once: true });
  } catch (error) {
    stage.setAttribute('aria-busy', 'false');
    status.textContent = 'Die Leseansicht konnte nicht geladen werden. Über „PDF öffnen“ kannst du das Heft direkt lesen.';
    console.error('Stadionheft: Leseansicht nicht verfügbar.', error);
  }
}

document.querySelectorAll<HTMLElement>('[data-magazine-reader]').forEach((reader) => void initializeReader(reader));
