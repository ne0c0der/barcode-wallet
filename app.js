// Barcode Wallet — everything is stored in localStorage on this device only.
const LS_KEY = 'barcode-wallet-codes-v1';

const $ = (id) => document.getElementById(id);
const genForm = $('genForm');
const textInput = $('textInput'), labelInput = $('labelInput'), formatInput = $('formatInput');
const previewBox = $('previewBox');
const savedList = $('savedList'), emptyMsg = $('emptyMsg');
const overlay = $('overlay'), overlaySvg = $('overlaySvg'), overlayLabel = $('overlayLabel');

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function persist(codes) {
  localStorage.setItem(LS_KEY, JSON.stringify(codes));
}

function drawBarcode(svg, text, format, compact) {
  // JsBarcode throws on characters invalid for the format; surface it cleanly.
  JsBarcode(svg, text, {
    format,
    width: compact ? 2 : 3,
    height: compact ? 64 : 120,
    displayValue: true,
    background: '#ffffff',
    lineColor: '#000000',
    margin: compact ? 8 : 16,
  });
}

function updatePreview() {
  const text = textInput.value.trim();
  const format = formatInput.value;
  if (!text) {
    previewBox.innerHTML = '<span class="muted">Type something to preview</span>';
    return;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    drawBarcode(svg, text, format);
  } catch {
    previewBox.innerHTML = '<span class="error">This text does not fit ' + format + '. Try Code 128.</span>';
    return;
  }
  previewBox.innerHTML = '';
  previewBox.appendChild(svg);
}

textInput.addEventListener('input', updatePreview);
formatInput.addEventListener('change', updatePreview);

genForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  const format = formatInput.value;
  if (!text) { textInput.focus(); return; }
  // Validate encodability before saving.
  try {
    drawBarcode(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), text, format);
  } catch {
    previewBox.innerHTML = '<span class="error">This text does not fit ' + format + '. Try Code 128.</span>';
    return;
  }
  const codes = load();
  codes.unshift({
    id: 'c' + Date.now().toString(36),
    label: labelInput.value.trim() || text.slice(0, 24),
    text,
    format,
  });
  persist(codes);
  textInput.value = '';
  labelInput.value = '';
  updatePreview();
  render();
  $('savedPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function render() {
  const codes = load();
  savedList.innerHTML = '';
  emptyMsg.style.display = codes.length ? 'none' : 'block';
  for (const c of codes) {
    const li = document.createElement('li');
    li.className = 'note';
    li.dataset.id = c.id;
    li.title = 'Tap to scan fullscreen';

    const head = document.createElement('div');
    head.className = 'note-head';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = c.label;
    const actions = document.createElement('div');
    actions.className = 'note-actions';
    const save = document.createElement('button');
    save.className = 'save-btn';
    save.textContent = '⤓';
    save.setAttribute('aria-label', 'Save ' + c.label + ' to Photos');
    save.addEventListener('click', (e) => {
      e.stopPropagation();
      saveBarcodeImage(c, save);
    });
    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = '✕';
    del.setAttribute('aria-label', 'Delete ' + c.label);
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      persist(load().filter((x) => x.id !== c.id));
      render();
    });
    actions.append(save, del);
    head.append(name, actions);

    const codeWrap = document.createElement('div');
    codeWrap.className = 'note-code';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    codeWrap.appendChild(svg);
    try {
      drawBarcode(svg, c.text, c.format, true);
    } catch {
      codeWrap.textContent = 'Could not render this code.';
    }

    const meta = document.createElement('div');
    meta.className = 'note-meta';
    meta.textContent = c.format + ' · tap to scan';

    li.append(head, codeWrap, meta);
    li.addEventListener('click', () => { if (suppressCardClick) return; openOverlay(c); });
    attachReorder(li);
    savedList.appendChild(li);
  }
  $('reorderHint').hidden = codes.length < 2;
}

// Drag to reorder saved cards: long-press a card, then drag it up or down.
// The new order is saved to localStorage. Taps and page scrolling are unaffected.
let suppressCardClick = false;

function attachReorder(li) {
  let startX = 0, startY = 0, timer = 0, dragging = false;

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };
  const finish = (commit) => {
    clearTimeout(timer);
    cleanup();
    if (!dragging) return;
    dragging = false;
    if (commit) {
      const order = [...savedList.querySelectorAll('.note')].map((n) => n.dataset.id);
      const byId = new Map(load().map((c) => [c.id, c]));
      persist(order.map((id) => byId.get(id)).filter(Boolean));
      // The pointerup is followed by a click — swallow it so the overlay doesn't open.
      suppressCardClick = true;
      setTimeout(() => { suppressCardClick = false; }, 0);
    }
    render();
  };
  const onMove = (e) => {
    if (!dragging) {
      // Moved before the long-press fired: it's a scroll or tap, not a drag.
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 12) {
        clearTimeout(timer);
        cleanup();
      }
      return;
    }
    e.preventDefault();
    const cards = [...savedList.querySelectorAll('.note:not(.dragging)')];
    let before = null;
    for (const other of cards) {
      const r = other.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { before = other; break; }
    }
    savedList.insertBefore(li, before);
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);

  li.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.del-btn, .save-btn')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    timer = setTimeout(() => {
      dragging = true;
      li.classList.add('dragging');
      li.style.touchAction = 'none';
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
    }, 350);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });
}

let overlayCode = null;
function openOverlay(c) {
  overlayCode = c;
  overlayLabel.textContent = c.label;
  overlaySvg.innerHTML = '';
  drawBarcode(overlaySvg, c.text, c.format);
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeOverlay() {
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  overlayCode = null;
}
$('overlayClose').addEventListener('click', closeOverlay);
$('overlaySave').addEventListener('click', (e) => {
  e.stopPropagation();
  if (overlayCode) saveBarcodeImage(overlayCode, e.currentTarget);
});
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

// Save a barcode as a PNG image. On mobile this opens the share sheet so it
// can land straight in Photos; everywhere else it downloads the file.
let savingId = null;
async function saveBarcodeImage(c, btn) {
  if (savingId) return;
  savingId = c.id;
  if (btn) btn.disabled = true;
  try {
    const tmp = document.createElement('canvas');
    JsBarcode(tmp, c.text, {
      format: c.format,
      width: 3,
      height: 140,
      displayValue: true,
      background: '#ffffff',
      lineColor: '#000000',
      margin: 18,
      fontSize: 22,
    });
    const labelH = 76;
    const canvas = document.createElement('canvas');
    canvas.width = tmp.width;
    canvas.height = tmp.height + labelH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111111';
    ctx.font = '700 34px -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let label = c.label || 'barcode';
    while (ctx.measureText(label).width > canvas.width - 48 && label.length > 4) {
      label = label.slice(0, -2);
    }
    if (label !== c.label) label += '…';
    ctx.fillText(label, canvas.width / 2, labelH / 2);
    ctx.drawImage(tmp, 0, labelH);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('encode failed');
    const safe = (c.label || 'barcode').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'barcode';
    const file = new File([blob], safe + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: c.label });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } catch (err) {
    if (!err || err.name !== 'AbortError') alert('Could not save this image.');
  } finally {
    savingId = null;
    if (btn) btn.disabled = false;
  }
}

// Theme: light by default, dark optional. Persisted on this device.
const themeToggle = $('themeToggle');
const themeKnob = themeToggle.querySelector('.knob');
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('barcode-wallet-theme', t); } catch {}
  const dark = t === 'dark';
  themeKnob.textContent = dark ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-checked', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#101010' : '#F3EBDC');
}
let savedTheme = 'light';
try { savedTheme = localStorage.getItem('barcode-wallet-theme') || 'light'; } catch {}
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

render();
