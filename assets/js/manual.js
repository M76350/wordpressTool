let matches = [];
let currentMatch = -1;

// ── UNDO / REDO ──
let history = [];
let historyIndex = -1;

// ── LOCALSTORAGE PERSIST ──
const MLS = {
    save() {
        localStorage.setItem('mr_input',   document.getElementById('inputArea').value);
        localStorage.setItem('mr_find',    document.getElementById('findInput').value);
        localStorage.setItem('mr_replace', document.getElementById('replaceInput').value);
        localStorage.setItem('mr_output',  document.getElementById('outputArea').value);
    },
    restore() {
        const input   = localStorage.getItem('mr_input');
        const find    = localStorage.getItem('mr_find');
        const replace = localStorage.getItem('mr_replace');
        const output  = localStorage.getItem('mr_output');
        if (input)   document.getElementById('inputArea').value   = input;
        if (find)    document.getElementById('findInput').value   = find;
        if (replace) document.getElementById('replaceInput').value = replace;
        if (output)  document.getElementById('outputArea').value  = output;
        if (output && output.trim()) {
            document.getElementById('outputHighlight').innerHTML =
                '<span style="color:#6c7086;font-size:0.85em;">← Previous session restored. Run Find All to re-highlight.</span>';
        }
        if (input && find) render();
    },
    clear() {
        ['mr_input','mr_find','mr_replace','mr_output'].forEach(k => localStorage.removeItem(k));
    }
};

function saveHistory() {
    const val = document.getElementById('inputArea').value;
    history = history.slice(0, historyIndex + 1);
    history.push(val);
    historyIndex = history.length - 1;
    updateUndoRedoBtns();
    MLS.save();
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    document.getElementById('inputArea').value = history[historyIndex];
    updateUndoRedoBtns();
    MLS.save();
    render();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    document.getElementById('inputArea').value = history[historyIndex];
    updateUndoRedoBtns();
    MLS.save();
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
    if (found    !== null) document.getElementById('matchCount').textContent   = found;
    if (replaced !== null) document.getElementById('replaceCount').textContent = replaced;
    if (slugs    !== null) document.getElementById('slugCount').textContent    = slugs;
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

function onFindInput() { MLS.save(); render(); }

document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('inputArea');
    if (ta) {
        ta.addEventListener('input', () => {
            clearTimeout(ta._histTimer);
            ta._histTimer = setTimeout(saveHistory, 800);
        });
    }
    // Restore state from localStorage
    MLS.restore();
    updateUndoRedoBtns();

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
    setCount(matches.length, null, null);
    renderHighlightWithReplaced(newText, repl, '-' + repl.toLowerCase());
}

// ── REPLACE ALL ──
function replaceAll() {
    const text = getInput();
    const find = getFindWord();
    const repl = getReplWord();
    if (!find) { alert('Enter a word to find!'); return; }

    const count = isCaseInsensitive()
        ? (text.toLowerCase().split(find.toLowerCase()).length - 1)
        : (text.split(find).length - 1);

    if (count === 0) { alert(`"${find}" not found or already replaced!`); return; }

    const escFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let newText = isCaseInsensitive()
        ? text.replace(new RegExp(escFind, 'gi'), repl)
        : text.split(find).join(repl);

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
    setCount(0, count, slugCount);
    renderHighlightWithReplaced(newText, repl, lowSlug);
}

// ── RENDER WITH REPLACED HIGHLIGHTS ──
function renderHighlightWithReplaced(text, repl, lowSlug) {
    let html = escHtml(text);

    if (lowSlug && lowSlug !== '-') {
        html = html.split(escHtml(lowSlug)).join(`<span class="hl-replaced">${escHtml(lowSlug)}</span>`);
    }

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
    MLS.save();
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
    MLS.clear();
    document.getElementById('outputHighlight').innerHTML = 'Output will appear here...';
    render();
}
