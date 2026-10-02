// PDF.js 5.4.624 is bundled here: documents and images never leave this browser.
const $ = id => document.getElementById(id);
const studio = document.querySelector('.studio');
let deck = null, pageNumber = 1, requestId = 0, renderId = 0, renderTask = null;
let loadingTask = null, resizeTimer = 0, pdfLibrary = null;
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function error(message) { $('slideError').textContent = message; $('slideError').hidden = !message; }
function count() { return deck?.count || 0; }
function showLayout() {
 const visible = !!deck && $('workspaceLayout').value !== 'camera-script';
 document.body.classList.toggle('has-slides', visible);
 studio.classList.toggle('slides-focus', $('workspaceLayout').value === 'slides-focus');
 $('slidesPanel').hidden = !visible;
 $('keyboardHint').textContent = visible ? 'Space: scroll · Shift + ← →: cues' : 'Space: scroll · ← →: cue cards';
 if (visible) scheduleRender();
}
function updateNavigation() {
 $('prevSlide').disabled = !deck || pageNumber <= 1;
 $('nextSlide').disabled = !deck || pageNumber >= count();
 $('slideJump').disabled = !deck;
 $('slideJump').max = count(); $('slideJump').value = pageNumber;
 $('slideTotal').textContent = `of ${count()}`;
 $('slideCount').textContent = `Slide ${pageNumber} of ${count()}`;
}
function goTo(number) {
 if (!deck) return;
 const next = Math.max(1, Math.min(count(), Math.round(Number(number)) || 1));
 if (next === pageNumber) { $('slideJump').value = pageNumber; return; }
 pageNumber = next; updateNavigation(); renderSlide();
}
function dispose(old) {
 if (!old) return;
 if (old.pdf) old.pdf.destroy().catch(() => {});
 old.images?.forEach(image => URL.revokeObjectURL(image.url));
}
function cancelRender() { ++renderId; renderTask?.cancel(); renderTask = null; }
function scheduleRender() { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderSlide, 100); }
async function renderSlide() {
 if (!deck || $('slidesPanel').hidden) return;
 cancelRender(); const id = renderId, selected = deck, number = pageNumber;
 $('slideCanvas').hidden = true; $('slideImage').hidden = true;
 $('slideLoading').hidden = false; $('slideLoading').textContent = `Loading slide ${number}…`;
 $('slideRenderError').hidden = true;
 try {
  if (selected.pdf) {
   const page = await selected.pdf.getPage(number);
   if (id !== renderId || deck !== selected) return;
   const viewport = page.getViewport({scale: 1});
   const stage = $('slideStage'), width = Math.max(100, stage.clientWidth - 28), height = Math.max(100, stage.clientHeight - 28);
   const scale = Math.min(width / viewport.width, height / viewport.height);
   const ratio = Math.min(window.devicePixelRatio || 1, 2);
   const output = page.getViewport({scale: scale * ratio});
   // Render offscreen so rapid navigation never draws two pages into one canvas.
   const buffer = document.createElement('canvas'); buffer.width = Math.ceil(output.width); buffer.height = Math.ceil(output.height);
   const task = page.render({canvasContext: buffer.getContext('2d'), viewport: output, background: '#fff'});
   renderTask = task; await task.promise;
   if (id !== renderId || deck !== selected) return;
   const canvas = $('slideCanvas'); canvas.width = buffer.width; canvas.height = buffer.height;
   canvas.style.width = `${Math.floor(viewport.width * scale)}px`; canvas.style.height = `${Math.floor(viewport.height * scale)}px`;
   canvas.getContext('2d').drawImage(buffer, 0, 0);
   canvas.setAttribute('aria-label', `Slide ${number} of ${selected.count} from ${selected.name}`); canvas.hidden = false;
   renderTask = null;
  } else {
   const item = selected.images[number - 1];
   const loaded = new Image(); loaded.src = item.url; await loaded.decode();
   if (id !== renderId || deck !== selected) return;
   $('slideImage').src = item.url; $('slideImage').alt = `Slide ${number} of ${selected.count}: ${item.name}`; $('slideImage').hidden = false;
  }
 } catch (failure) {
  if (id !== renderId || failure.name === 'RenderingCancelledException') return;
  $('slideRenderError').textContent = 'This slide could not be displayed. Try another slide or export the deck as a new PDF.';
  $('slideRenderError').hidden = false;
 } finally { if (id === renderId) $('slideLoading').hidden = true; }
}
async function loadFiles(files) {
 if (!files.length) return;
 const pdfs = files.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
 const images = files.every(f => imageTypes.has(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name));
 if (files.some(f => /\.(pptx?|key)$/i.test(f.name))) { error('PowerPoint and Keynote files need to be exported as PDF first. Then choose Load slides.'); return; }
 if (!((pdfs.length === 1 && files.length === 1) || images)) { error('Choose one PDF, or a set of PNG, JPG or WebP slide images. PowerPoint and Keynote decks need to be exported as PDF first.'); return; }
 if (files.reduce((sum,f) => sum + f.size,0) > 100 * 1024 * 1024) { error('Choose a deck smaller than 100 MB. Export a smaller PDF or fewer slide images.'); return; }
 const id = ++requestId; let candidate = null;
 error(''); $('loadSlides').textContent = 'Opening…'; $('loadSlides').disabled = true;
 try {
  if (pdfs.length) {
   const file = pdfs[0];
   pdfLibrary ||= import('./vendor/pdfjs/pdf.mjs');
   const pdfjs = await pdfLibrary;
   pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
   const bytes = new Uint8Array(await file.arrayBuffer());
   if (id !== requestId) return;
   const task = pdfjs.getDocument({data: bytes, isEvalSupported: false,
    cMapUrl: new URL('./vendor/pdfjs/cmaps/', import.meta.url).href, cMapPacked: true,
    standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('./vendor/pdfjs/wasm/', import.meta.url).href});
   loadingTask = task;
   const pdf = await task.promise;
   candidate = {pdf, count: pdf.numPages, name: file.name};
   loadingTask = null;
   // Verify the first page before replacing a previously loaded deck.
   await pdf.getPage(1);
  } else {
   const sorted = [...files].sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
   candidate = {images: sorted.map(file => ({url: URL.createObjectURL(file), name: file.name})), count: sorted.length, name: sorted.length === 1 ? sorted[0].name : `${sorted.length} slide images · filename order`};
   for (const item of candidate.images) { const img = new Image(); img.src = item.url; await img.decode(); }
  }
  if (id !== requestId) { dispose(candidate); return; }
  cancelRender(); const old = deck; deck = candidate; candidate = null; pageNumber = 1;
  $('slideFileName').textContent = deck.name; $('slideFileName').title = deck.name;
  $('workspaceLayout').disabled = false; $('unloadSlides').hidden = false;
  if ($('workspaceLayout').value === 'camera-script') $('workspaceLayout').value = 'balanced';
  updateNavigation(); showLayout(); dispose(old);
  $('announcement').textContent = `${deck.count} slides loaded. Use the arrow keys to rehearse.`;
 } catch (failure) {
  dispose(candidate);
  if (id !== requestId) return;
  if (loadingTask) { loadingTask.destroy().catch(() => {}); loadingTask = null; }
  error(failure.name === 'PasswordException' ? 'This PDF is password-protected. Save an unlocked copy and load it here.' : 'These slides could not be opened. Try a fresh PDF export or PNG, JPG or WebP images. Any previously loaded deck is still available.');
 } finally {
  if (id === requestId) { $('loadSlides').textContent = deck ? 'Replace slides' : 'Load slides'; $('loadSlides').disabled = false; }
 }
}
$('loadSlides').addEventListener('click', () => $('slideFiles').click());
$('slideFiles').addEventListener('change', e => { const files = Array.from(e.target.files || []); e.target.value = ''; loadFiles(files); });
$('prevSlide').addEventListener('click', () => goTo(pageNumber - 1));
$('nextSlide').addEventListener('click', () => goTo(pageNumber + 1));
$('slideJump').addEventListener('change', e => goTo(e.target.value));
$('slideJump').addEventListener('keydown', e => { if (e.key === 'Enter') { goTo(e.target.value); $('slideStage').focus(); } });
$('workspaceLayout').addEventListener('change', showLayout);
$('unloadSlides').addEventListener('click', () => {
 ++requestId; clearTimeout(resizeTimer); cancelRender(); loadingTask?.destroy().catch(() => {}); loadingTask = null;
 const old = deck; deck = null; pageNumber = 1; dispose(old);
 $('slideCanvas').width = 1; $('slideCanvas').height = 1; $('slideImage').removeAttribute('src');
 $('slideFileName').textContent = 'PDF or slide images · stays in this tab'; $('slideFileName').removeAttribute('title');
 $('loadSlides').textContent = 'Load slides'; $('loadSlides').disabled = false;
 $('workspaceLayout').disabled = true; $('unloadSlides').hidden = true; error(''); showLayout(); updateNavigation();
});
document.addEventListener('keydown', e => {
 if (!deck || $('slidesPanel').hidden || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.isComposing || document.querySelector('dialog[open]') || !$('editorView').hidden) return;
 const inControl = e.target.closest('input,textarea,select,button,a,video,[contenteditable="true"]');
 if (inControl && !['prevSlide','nextSlide'].includes(inControl.id)) return;
 if (['ArrowRight','ArrowLeft','PageDown','PageUp','Home','End'].includes(e.key)) {
  e.preventDefault();
  goTo(e.key === 'Home' ? 1 : e.key === 'End' ? count() : pageNumber + (['ArrowRight','PageDown'].includes(e.key) ? 1 : -1));
 }
}, true);
new ResizeObserver(scheduleRender).observe($('slideStage'));

async function loadDemo() {
 const button = $('demoSlides'); button.disabled = true;
 try {
  const response = await fetch(new URL('./demo/spacex-demo.pdf', import.meta.url));
  if (!response.ok) throw new Error('demo unavailable');
  await loadFiles([new File([await response.arrayBuffer()], 'SpaceX educational demo.pdf', {type: 'application/pdf'})]);
 } catch { error('Demo slides could not load. You can download the demo PDF below and choose Load slides.'); }
 finally { button.disabled = false; }
}
$('demoSlides').addEventListener('click', loadDemo);
// Loading the bundled demo never touches user files or browser storage.
loadDemo();
