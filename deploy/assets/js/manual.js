let matches = [];
let currentMatch = -1;

// ── UNDO / REDO HISTORY ──
let history = [];
let historyIndex = -1;

function saveHistory() {
    const val = document.getElementById('inputArea').value;
    // Remove any redo states ahead
    history = history.slice(0, historyIndex + 1);
    history.push(val);
    historyIndex = history.length - 1;
    updateUndoRedoBtns();
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    document.getElementById('inputArea').value = history[historyIndex];
    updateUndoRedoBtns();
    render();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    document.getElementById('inputArea').value = history[historyIndex];
    updateUndoRedoBtns();
    render();
}

function updateUndoRedoBtns() {
    const u = document.getElementById('undoBtn');
    const r = document.getElementById('redoBtn');
    if (u) u.disabled = historyIndex <= 0;
    if (r) r.disabled = historyIndex >= history.length - 1;
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getInput()    { return document.getElementById('inputArea').value; }
function getFindWord() { return document.getElementById('findInput').value; }
function getReplWord() { return document.getElementById('replaceInput').value; }
function isCaseInsensitive() {
    const el = document.getElementById('caseInsensitive');
    return el ? el.checked : false;
}

function setCount(found, replaced, slugs) {
    document.getElementById('matchCount').textContent   = found   !== null ? found   : document.getElementById('matchCount').textContent;
    document.getElementById('replaceCount').textContent = replaced !== null ? replaced : document.getElementById('replaceCount').textContent;
    document.getElementById('slugCount').textContent    = slugs   !== null ? slugs   : document.getElementById('slugCount').textContent;
}

// ── RENDER ──
function render() {
    const text = getInput();
    const find = getFindWord();
    if (!find.trim()) {
        document.getElementById('outputHighlight').innerHTML = escHtml(text) || 'Output will appear here...';
        document.getElementById('outputArea').value = text;
        setCount(0, null, null);
        matches = []; currentMatch = -1;
        return;
    }
    buildMatches();
    renderHighlight();
}

function onFindInput() { render(); }

// Save initial state when user pastes/types in input
document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('inputArea');
    if (ta) {
        ta.addEventListener('input', () => {
            // Debounce history save on manual typing
            clearTimeout(ta._histTimer);
            ta._histTimer = setTimeout(saveHistory, 800);
        });
    }
    updateUndoRedoBtns();
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });
});

// ── BUILD MATCHES ──
function buildMatches() {
    const text = getInput();
    const find = getFindWord();
    matches = [];
    if (!find) return;

    if (isCaseInsensitive()) {
        const textLow = text.toLowerCase();
        const findLow = find.toLowerCase();
        let idx = 0;
        while ((idx = textLow.indexOf(findLow, idx)) !== -1) {
            matches.push(idx);
            idx += findLow.length;
        }
    } else {
        let idx = 0;
        while ((idx = text.indexOf(find, idx)) !== -1) {
            matches.push(idx);
            idx += find.length;
        }
    }
    setCount(matches.length, null, null);
    if (currentMatch >= matches.length) currentMatch = matches.length - 1;
}

// ── RENDER HIGHLIGHT ──
function renderHighlight() {
    const text = getInput();
    const find = getFindWord();
    if (!text) { document.getElementById('outputHighlight').innerHTML = 'Output will appear here...'; return; }
    if (!find) { document.getElementById('outputHighlight').innerHTML = escHtml(text); return; }

    let html = '';
    let last = 0;
    matches.forEach((pos, i) => {
        html += escHtml(text.slice(last, pos));
        const word = text.slice(pos, pos + find.length);
        html += `<span class="hl-find${i === currentMatch ? ' current' : ''}" data-idx="${i}">${escHtml(word)}</span>`;
        last = pos + find.length;
    });
    html += escHtml(text.slice(last));

    document.getElementById('outputHighlight').innerHTML = html || 'Output will appear here...';
    document.getElementById('outputArea').value = text;

    if (currentMatch >= 0) {
        const el = document.querySelector(`.hl-find[data-idx="${currentMatch}"]`);
        if (el) el.scrollIntoView({ block: 'center' });
    }
}

// ── FIND ALL ──
function findAll() {
    buildMatches();
    if (matches.length === 0) { alert(`"${getFindWord()}" not found!`); return; }
    currentMatch = 0;
    renderHighlight();
}

// ── NAVIGATE ──
function navMatch(dir) {
    if (matches.length === 0) { findAll(); return; }
    currentMatch = (currentMatch + dir + matches.length) % matches.length;
    renderHighlight();
}

// ── REPLACE CURRENT ──
function replaceCurrent() {
    if (matches.length === 0) { alert('Click "Find All" first!'); return; }
    if (currentMatch < 0) currentMatch = 0;

    const text = getInput();
    const find = getFindWord();
    const repl = getReplWord();
    const pos  = matches[currentMatch];

    const newText = text.slice(0, pos) + repl + text.slice(pos + find.length);
    document.getElementById('inputArea').value = newText;
    saveHistory();

    buildMatches();
    if (currentMatch >= matches.length) currentMatch = matches.length - 1;

    // Count how many replaced so far = original - remaining
    const remaining = matches.length;
    setCount(remaining, null, null);
    renderHighlightWithReplaced(newText, repl, '-' + repl.toLowerCase());
}

// ── REPLACE ALL ──
function replaceAll() {
    const text = getInput();
    const find = getFindWord();
    const repl = getReplWord();
    if (!find) { alert('Enter a word to find!'); return; }

    // Count matches
    const count = isCaseInsensitive()
        ? (text.toLowerCase().split(find.toLowerCase()).length - 1)
        : (text.split(find).length - 1);

    if (count === 0) { alert(`"${find}" not found or already replaced!`); return; }

    // Step 1: word replace
    const escFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let newText = isCaseInsensitive()
        ? text.replace(new RegExp(escFind, 'gi'), repl)
        : text.split(find).join(repl);

    // Step 2: slug fix
    const capSlug     = '-' + repl;
    const lowSlug     = '-' + repl.toLowerCase();
    const findCapSlug = '-' + find;
    const findLowSlug = '-' + find.toLowerCase();
    let slugCount = 0;

    if (capSlug !== lowSlug) {
        slugCount += newText.split(capSlug).length - 1;
        newText = newText.split(capSlug).join(lowSlug);
    }
    if (findCapSlug !== lowSlug) {
        const e = newText.split(findCapSlug).length - 1;
        if (e > 0) { slugCount += e; newText = newText.split(findCapSlug).join(lowSlug); }
    }
    if (findLowSlug !== lowSlug) {
        const e = newText.split(findLowSlug).length - 1;
        if (e > 0) { slugCount += e; newText = newText.split(findLowSlug).join(lowSlug); }
    }

    document.getElementById('inputArea').value = newText;
    saveHistory();
    matches = []; currentMatch = -1;

    // Show exact counts for THIS operation only
    setCount(0, count, slugCount);
    renderHighlightWithReplaced(newText, repl, lowSlug);
}

// ── RENDER WITH REPLACED HIGHLIGHTS ──
function renderHighlightWithReplaced(text, repl, lowSlug) {
    let html = escHtml(text);

    // GREEN: fixed slugs
    if (lowSlug && lowSlug !== '-') {
        html = html.split(escHtml(lowSlug)).join(`<span class="hl-replaced">${escHtml(lowSlug)}</span>`);
    }

    // BLUE: replaced word — skip inside existing spans
    const parts = html.split(escHtml(repl));
    let out = '';
    for (let i = 0; i < parts.length; i++) {
        out += parts[i];
        if (i < parts.length - 1) {
            const open  = (out.match(/<span/g)   || []).length;
            const close = (out.match(/<\/span>/g) || []).length;
            out += open > close ? escHtml(repl) : `<span class="hl-replace-word">${escHtml(repl)}</span>`;
        }
    }

    document.getElementById('outputHighlight').innerHTML = out;
    document.getElementById('outputArea').value = text;
}

// ── COPY ──
function copyOutput() {
    const val = document.getElementById('outputArea').value || document.getElementById('inputArea').value;
    if (!val.trim()) { alert('Nothing to copy!'); return; }
    navigator.clipboard.writeText(val).then(() => {
        const b = document.querySelector('.copy-btn');
        b.textContent = '✔ Copied!';
        setTimeout(() => b.textContent = 'Copy All', 2000);
    });
}

// ── CLEAR ALL ──
function clearAll() {
    document.getElementById('findInput').value    = '';
    document.getElementById('replaceInput').value = '';
    matches = []; currentMatch = -1;
    history = []; historyIndex = -1;
    setCount(0, 0, 0);
    updateUndoRedoBtns();
    render();
}
