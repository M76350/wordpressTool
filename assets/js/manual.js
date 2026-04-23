let matches = [];
let currentMatch = -1;
let replaceCount = 0;

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

// ── RENDER (live as user types) ──
function render() {
    const text = getInput();
    const find = getFindWord();
    if (!find.trim()) {
        document.getElementById('outputHighlight').innerHTML = escHtml(text) || 'Output will appear here...';
        document.getElementById('outputArea').value = text;
        document.getElementById('matchCount').textContent = 0;
        matches = []; currentMatch = -1;
        return;
    }
    buildMatches();
    renderHighlight();
}

function onFindInput() { render(); }

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

    document.getElementById('matchCount').textContent = matches.length;
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
        const matchedWord = text.slice(pos, pos + find.length);
        html += `<span class="hl-find${i === currentMatch ? ' current' : ''}" data-idx="${i}">${escHtml(matchedWord)}</span>`;
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
    replaceCount++;
    document.getElementById('replaceCount').textContent = replaceCount;

    buildMatches();
    if (currentMatch >= matches.length) currentMatch = matches.length - 1;
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

    if (count === 0) { alert(`"${find}" not found!`); return; }

    // Step 1: word replace
    let newText = isCaseInsensitive()
        ? text.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), repl)
        : text.split(find).join(repl);

    // Step 2: slug fix — -Repl → -repl
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
    replaceCount += count;
    document.getElementById('replaceCount').textContent = replaceCount;
    document.getElementById('slugCount').textContent    = slugCount;
    document.getElementById('matchCount').textContent   = 0;
    matches = []; currentMatch = -1;

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
            const openSpans  = (out.match(/<span/g)   || []).length;
            const closeSpans = (out.match(/<\/span>/g) || []).length;
            out += openSpans > closeSpans
                ? escHtml(repl)
                : `<span class="hl-replace-word">${escHtml(repl)}</span>`;
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
    matches = []; currentMatch = -1; replaceCount = 0;
    document.getElementById('matchCount').textContent   = 0;
    document.getElementById('replaceCount').textContent = 0;
    document.getElementById('slugCount').textContent    = 0;
    render();
}
