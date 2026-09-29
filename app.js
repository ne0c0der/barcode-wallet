// Barcode Wallet — everything is stored in localStorage on this device only.
const LS_KEY = 'barcode-wallet-codes-v1';

const $ = (id) => document.getElementById(id);
const codeText = $('codeText'), codeFormat = $('codeFormat'), codeLabel = $('codeLabel');
const previewWrap = $('previewWrap'), preview = $('preview');
const savedList = $('savedList'), emptyMsg = $('emptyMsg');
const overlay = $('scanOverlay'), scanCode = $('scanCode'), scanLabel = $('scanLabel');

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

$('generateBtn').addEventListener('click', () => {
  const text = codeText.value.trim();
  if (!text) { codeText.focus(); return; }
  try {
    drawBarcode(preview, text, codeFormat.value);
    previewWrap.classList.remove('hidden');
  } catch (e) {
    alert('That text can\'t be encoded as ' + codeFormat.value + '. Try Code 128, which accepts any text.');
  }
});

$('saveBtn').addEventListener('click', () => {
  const text = codeText.value.trim();
  if (!text) return;
  const codes = load();
  codes.unshift({
    id: Date.now().toString(36),
    label: codeLabel.value.trim() || text,
    text,
    format: codeFormat.value,
  });
  persist(codes);
  codeText.value = ''; codeLabel.value = '';
  previewWrap.classList.add('hidden');
  render();
});

function render() {
  const codes = load();
  savedList.innerHTML = '';
  emptyMsg.style.display = codes.length ? 'none' : 'block';
  for (const c of codes) {
    const li = document.createElement('li');
    li.className = 'note';
    li.title = 'Tap to scan fullscreen';

    const head = document.createElement('div');
    head.className = 'note-head';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = c.label;
    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = '✕';
    del.setAttribute('aria-label', 'Delete ' + c.label);
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      persist(load().filter((x) => x.id !== c.id));
      render();
    });
    head.append(name, del);

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
    li.addEventListener('click', () => openOverlay(c));
    savedList.appendChild(li);
  }
}

function openOverlay(c) {
  scanLabel.textContent = c.label;
  drawBarcode(scanCode, c.text, c.format);
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeOverlay() {
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}
$('closeOverlay').addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

render();
