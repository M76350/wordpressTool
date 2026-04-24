let history = [];
let histIdx  = -1;
let saveTimer = null;

// ── LOCALSTORAGE PERSIST ──
const TLS = {
    save() {
        localStorage.setItem('te_content', document.getElementById('textEditor').value);
    },
    restore() {
        const val = localStorage.getItem('te_content');
        if (val) {
            document.getElementById('textEditor').value = val;
            updateStats(); updateLineNumbers();
            document.getElementById('fileLabel').textContent = 'Restored';
        }
    },
    clear() { localStorage.removeItem('te_content'); }
};

// ── HISTORY ──
function saveHistory() {
    const val = document.getElementById('textEditor').value;
    history = history.slice(0, histIdx + 1);
    history.push(val);
    histIdx = history.length - 1;
    updateBtns();
}

function doUndo() {
    if (histIdx <= 0) return;
    histIdx--;
    document.getElementById('textEditor').value = history[histIdx];
    updateStats(); updateLineNumbers(); updateBtns();
}

function doRedo() {
    if (histIdx >= history.length - 1) return;
    histIdx++;
    document.getElementById('textEditor').value = history[histIdx];
    updateStats(); updateLineNumbers(); updateBtns();
}

function updateBtns() {
    document.getElementById('undoBtn').disabled = histIdx <= 0;
    document.getElementById('redoBtn').disabled = histIdx >= history.length - 1;
}

// ── INPUT ──
function onInput() {
    updateStats();
    updateLineNumbers();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveHistory(); TLS.save(); }, 600);
}

// ── LINE NUMBERS ──
function updateLineNumbers() {
    const lines = document.getElementById('textEditor').value.split('\n').length;
    document.getElementById('lineNumbers').textContent =
        Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

// ── STATS ──
function updateStats() {
    const val   = document.getElementById('textEditor').value;
    const lines = val.split('\n').length;
    const words = val.trim() === '' ? 0 : val.trim().split(/\s+/).length;
    document.getElementById('statLines').textContent = lines;
    document.getElementById('statWords').textContent = words;
    document.getElementById('statChars').textContent = val.length;
}

// ── CURSOR ──
function updateCursor() {
    const ta  = document.getElementById('textEditor');
    const txt = ta.value.substring(0, ta.selectionStart);
    const lines = txt.split('\n');
    document.getElementById('curLine').textContent = lines.length;
    document.getElementById('curCol').textContent  = lines[lines.length - 1].length + 1;
}

// ── LOAD FILE ──
async function loadFile() {
    try {
        const r = await fetch('data/cities.txt');
        if (!r.ok) throw new Error('Not found');
        const t = await r.text();
        document.getElementById('textEditor').value = t;
        document.getElementById('fileLabel').textContent = 'cities.txt';
        saveHistory(); updateStats(); updateLineNumbers();
        setStatus('✅ cities.txt loaded');
    } catch(e) {
        setStatus('Start typing or paste your text here');
    }
}

// ── DOWNLOAD ──
function saveFile() {
    const val  = document.getElementById('textEditor').value;
    const blob = new Blob([val], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'edited.txt';
    a.click();
    setStatus('✅ Downloaded!');
}

// ── COPY ──
function copyText() {
    const val = document.getElementById('textEditor').value;
    if (!val.trim()) { alert('Nothing to copy!'); return; }
    navigator.clipboard.writeText(val).then(() => setStatus('✅ Copied!'));
}

// ── CLEAR ──
function clearEditor() {
    if (!confirm('Clear editor?')) return;
    document.getElementById('textEditor').value = '';
    history = []; histIdx = -1;
    TLS.clear();
    updateStats(); updateLineNumbers(); updateBtns();
    document.getElementById('fileLabel').textContent = 'No file loaded';
    setStatus('Cleared');
}

// ── FIND & REPLACE ──
function doReplace() {
    const find = document.getElementById('frFind').value;
    const repl = document.getElementById('frReplace').value;
    if (!find) { alert('Enter a word to find!'); return; }
    const ta    = document.getElementById('textEditor');
    const count = ta.value.split(find).length - 1;
    if (count === 0) { alert(`"${find}" not found!`); return; }
    ta.value = ta.value.split(find).join(repl);
    saveHistory(); updateStats(); updateLineNumbers();
    document.getElementById('frMsg').textContent = `✔ ${count} replaced`;
    setTimeout(() => document.getElementById('frMsg').textContent = '', 3000);
}

// ── STATUS ──
function setStatus(msg) {
    document.getElementById('statusMsg').textContent = msg;
    setTimeout(() => document.getElementById('statusMsg').textContent = '', 3000);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('textEditor');
    ta.addEventListener('keyup',   updateCursor);
    ta.addEventListener('click',   updateCursor);
    ta.addEventListener('scroll',  () => { document.getElementById('lineNumbers').scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = ta.selectionStart;
            ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(ta.selectionEnd);
            ta.selectionStart = ta.selectionEnd = s + 4;
            onInput();
        }
    });
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
    });
    TLS.restore();
    // Only load file if no saved session exists
    if (!localStorage.getItem('te_content')) {
        loadFile();
    } else {
        saveHistory(); // put restored content in history
    }
});
