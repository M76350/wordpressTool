const CITIES = [
    "Delhi","Mumbai","Jaipur","Noida","Gurgaon","Ghaziabad",
    "Lucknow","Bangalore","Chennai","Saharanpur","Meerut",
    "Kanpur","Moradabad","Kolkata","Pune","Ludhiana","Jalandhar",
    "Hyderabad","India"
];

let currentIndex = 0;
let doneSet = new Set();
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── LOCALSTORAGE PERSIST ──
const LS = {
    save() {
        localStorage.setItem('ct_input',   document.getElementById('inputArea').value);
        localStorage.setItem('ct_output',  document.getElementById('outputArea').value);
        localStorage.setItem('ct_index',   currentIndex);
        localStorage.setItem('ct_done',    JSON.stringify([...doneSet]));
    },
    restore() {
        const input  = localStorage.getItem('ct_input');
        const output = localStorage.getItem('ct_output');
        const idx    = localStorage.getItem('ct_index');
        const done   = localStorage.getItem('ct_done');
        if (input  !== null) document.getElementById('inputArea').value  = input;
        if (output !== null) document.getElementById('outputArea').value = output;
        if (idx    !== null) currentIndex = parseInt(idx) || 0;
        if (done   !== null) doneSet = new Set(JSON.parse(done));
        if (output && output.trim()) {
            document.getElementById('outputHighlight').innerHTML =
                '<span style="color:#6c7086;font-size:0.85em;">← Previous session output restored. Run again to re-highlight.</span>';
        }
    },
    clear() {
        ['ct_input','ct_output','ct_index','ct_done'].forEach(k => localStorage.removeItem(k));
    }
};

// ── UNDO / REDO ──
let appHistory = [];
let appHistoryIndex = -1;

function appSaveHistory() {
    const val = document.getElementById('inputArea').value;
    appHistory = appHistory.slice(0, appHistoryIndex + 1);
    appHistory.push(val);
    appHistoryIndex = appHistory.length - 1;
    updateAppUndoRedo();
    LS.save();
}

function appUndo() {
    if (appHistoryIndex <= 0) return;
    appHistoryIndex--;
    document.getElementById('inputArea').value = appHistory[appHistoryIndex];
    updateAppUndoRedo();
    LS.save();
}

function appRedo() {
    if (appHistoryIndex >= appHistory.length - 1) return;
    appHistoryIndex++;
    document.getElementById('inputArea').value = appHistory[appHistoryIndex];
    updateAppUndoRedo();
    LS.save();
}

function updateAppUndoRedo() {
    const u = document.getElementById('undoBtn');
    const r = document.getElementById('redoBtn');
    if (u) u.disabled = appHistoryIndex <= 0;
    if (r) r.disabled = appHistoryIndex >= appHistory.length - 1;
}

document.addEventListener('DOMContentLoaded', () => {
    LS.restore();
    updateOpBox();
    buildList();
    updateAppUndoRedo();
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); appUndo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); appRedo(); }
    });
});

// ── CITY LIST ──
function buildList() {
    const el = document.getElementById('cityList');
    el.innerHTML = '';
    CITIES.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'city-item' + (doneSet.has(i) ? ' is-done' : i === currentIndex ? ' is-find' : i === currentIndex + 1 ? ' is-replace' : '');
        d.id = 'ci' + i;
        d.innerHTML = `<span class="city-sr">${i+1}.</span><span class="city-name">${c}</span><span class="city-tag ${doneSet.has(i)?'tag-done':i===currentIndex?'tag-find':i===currentIndex+1?'tag-replace':''}" id="ct${i}">${doneSet.has(i)?'done':i===currentIndex?'FIND':i===currentIndex+1?'NEXT':''}</span>`;
        d.onclick = () => jumpTo(i);
        el.appendChild(d);
    });
    const fi = document.getElementById('ci' + currentIndex);
    if (fi) fi.scrollIntoView({ block: 'nearest' });
}

function jumpTo(i) {
    if (i >= CITIES.length - 1) return;
    currentIndex = i;
    updateOpBox();
    buildList();
    hideNextBtn();
    resetSteps();
    LS.save();
}

function updateOpBox() {
    document.getElementById('opFind').textContent    = CITIES[currentIndex]     || '—';
    document.getElementById('opReplace').textContent = CITIES[currentIndex + 1] || '—';
    document.getElementById('progressLabel').textContent =
        `Step ${currentIndex + 1} of ${CITIES.length - 1}: ${CITIES[currentIndex]} → ${CITIES[currentIndex+1] || 'end'} | Manish Web Developer`;
}

// ── LOAD TEMPLATE ──
async function loadTemplate() {
    try {
        const r = await fetch('data/delhi-template.html');
        const t = await r.text();
        document.getElementById('inputArea').value = t;
        LS.save();
    } catch(e) {
        alert('Could not load delhi-template.html. Please paste the code manually.');
    }
}

// ── FLOW STEPS ──
function ss(id, state, b, t) {
    document.getElementById(id).className = 'flow-step ' + state;
    if (b !== null) document.getElementById(id+'b').textContent = b;
    if (t)          document.getElementById(id+'t').textContent = t;
}

function resetSteps() {
    ['s1','s2','s3','s4'].forEach(id => {
        document.getElementById(id).className = 'flow-step';
        document.getElementById(id+'b').textContent = '—';
    });
    document.getElementById('s1t').textContent = 'Finding word...';
    document.getElementById('s2t').textContent = 'Replacing...';
    document.getElementById('s3t').textContent = 'Fixing slugs...';
    document.getElementById('s4t').textContent = 'Output ready!';
}

// ── PROCESS POPUP ──
function ppShow() { document.getElementById('processPopup').classList.add('show'); }
function ppHide() { document.getElementById('processPopup').classList.remove('show'); }

function pps(id, state, b, t) {
    const el = document.getElementById(id);
    el.className = 'pp-step ' + (state === 'active' ? 'pp-active' : state === 'done' ? 'pp-done' : state === 'err' ? 'pp-err' : '');
    if (b !== null) document.getElementById(id+'b').textContent = b;
    if (t)          document.getElementById(id+'t').textContent = t;
}

function ppReset() {
    ['pp1','pp2','pp3','pp4'].forEach(id => {
        document.getElementById(id).className = 'pp-step';
        document.getElementById(id+'b').textContent = '—';
    });
    document.getElementById('pp1t').textContent = 'Finding word...';
    document.getElementById('pp2t').textContent = 'Replacing...';
    document.getElementById('pp3t').textContent = 'Fixing slugs...';
    document.getElementById('pp4t').textContent = 'Output ready!';
}

// ── MAIN REPLACE FLOW ──
async function startFlow() {
    const input    = document.getElementById('inputArea').value;
    const findWord = CITIES[currentIndex];
    const replWord = CITIES[currentIndex + 1];

    if (!input.trim()) { alert('Please paste your code or click "Load delhi-template.html" first!'); return; }
    if (!replWord)     { alert('No next city available!'); return; }

    const btn = document.getElementById('replaceBtn');
    btn.disabled = true;
    hideNextBtn();
    document.getElementById('outputArea').value = '';
    resetSteps();
    ppReset();
    ppShow();

    // STEP 1 — FIND
    ss('s1','active','...', `Finding "${findWord}"...`);
    pps('pp1','active','...', `Finding "${findWord}"...`);
    await delay(600);
    const escFind   = findWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const findRegex = new RegExp(escFind, 'gi');
    const count     = (input.match(findRegex) || []).length;
    if (count === 0) {
        ss('s1','err','0', `"${findWord}" not found!`);
        pps('pp1','err','0', `"${findWord}" not found!`);
        await delay(1200);
        ppHide();
        btn.disabled = false;
        return;
    }
    ss('s1','done', count, `"${findWord}" found ${count}×`);
    pps('pp1','done', count, `"${findWord}" found ${count}×`);

    // STEP 2 — REPLACE
    await delay(500);
    ss('s2','active','...', `"${findWord}" → "${replWord}"...`);
    pps('pp2','active','...', `"${findWord}" → "${replWord}"...`);
    await delay(700);
    let result = input.replace(findRegex, replWord);
    ss('s2','done', count, `${count} replacements done`);
    pps('pp2','done', count, `${count} replacements done`);

    // STEP 3 — SLUG FIX
    await delay(500);
    const capSlug     = '-' + replWord;
    const lowSlug     = '-' + replWord.toLowerCase();
    const findCapSlug = '-' + findWord;
    const findLowSlug = '-' + findWord.toLowerCase();

    ss('s3','active','...', `"${capSlug}" → "${lowSlug}"...`);
    pps('pp3','active','...', `"${capSlug}" → "${lowSlug}"...`);
    await delay(700);
    let slugCount = 0;

    if (capSlug !== lowSlug) {
        slugCount += result.split(capSlug).length - 1;
        result = result.split(capSlug).join(lowSlug);
    }
    if (findCapSlug !== lowSlug) {
        const e = result.split(findCapSlug).length - 1;
        if (e > 0) { slugCount += e; result = result.split(findCapSlug).join(lowSlug); }
    }
    if (findLowSlug !== lowSlug) {
        const e = result.split(findLowSlug).length - 1;
        if (e > 0) { slugCount += e; result = result.split(findLowSlug).join(lowSlug); }
    }
    ss('s3','done', slugCount, `${slugCount} slug(s) fixed`);
    pps('pp3','done', slugCount, `${slugCount} slug(s) fixed`);

    // STEP 4 — DONE
    await delay(400);
    ss('s4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    pps('pp4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    await delay(800);
    ppHide();

    document.getElementById('outputArea').value = result;
    renderHighlighted(input, result, findWord, replWord, lowSlug);
    appSaveHistory();

    doneSet.add(currentIndex);
    buildList();
    LS.save();

    const isLast = (currentIndex + 2 >= CITIES.length);
    if (isLast) {
        showCompletionPopup();
    } else {
        const nextFind = CITIES[currentIndex + 1];
        const nextRepl = CITIES[currentIndex + 2];
        document.getElementById('nextBtnLabel').textContent = `${nextFind}  →  ${nextRepl}`;
        showNextBtn();
    }
    btn.disabled = false;
}

function goNext() {
    const out = document.getElementById('outputArea').value;
    if (out.trim()) document.getElementById('inputArea').value = out;
    document.getElementById('outputArea').value = '';
    document.getElementById('outputHighlight').innerHTML = 'Output will appear here with highlights...';
    document.getElementById('cntFind').textContent    = '—';
    document.getElementById('cntReplace').textContent = '—';
    document.getElementById('cntSlug').textContent    = '—';
    currentIndex++;
    updateOpBox();
    buildList();
    hideNextBtn();
    resetSteps();
    LS.save();
}

// ── HIGHLIGHT ──
function renderHighlighted(original, result, findWord, replWord, lowSlug) {
    let html = escHtml(result);
    const escFind    = findWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const foundCount = (original.match(new RegExp(escFind, 'gi')) || []).length;
    const slugCount  = html.split(escHtml(lowSlug)).length - 1;
    const replCount  = escHtml(result).split(escHtml(replWord)).length - 1;

    html = html.split(escHtml(lowSlug)).join(`<span class="hl-slug">${escHtml(lowSlug)}</span>`);
    html = highlightWord(html, escHtml(replWord), 'hl-replace');

    document.getElementById('cntFind').textContent    = foundCount;
    document.getElementById('cntReplace').textContent = replCount;
    document.getElementById('cntSlug').textContent    = slugCount;
    document.getElementById('outputHighlight').innerHTML = html;
}

function highlightWord(html, word, cls) {
    const parts = html.split(word);
    let out = '';
    for (let i = 0; i < parts.length; i++) {
        out += parts[i];
        if (i < parts.length - 1) {
            const open  = (out.match(/<span/g)   || []).length;
            const close = (out.match(/<\/span>/g) || []).length;
            out += open > close ? word : `<span class="${cls}">${word}</span>`;
        }
    }
    return out;
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── POPUP ──
function showCompletionPopup() {
    document.getElementById('completionPopup').style.display = 'flex';
}

function restartFromDelhi() {
    document.getElementById('completionPopup').style.display = 'none';
    currentIndex = 0;
    doneSet.clear();
    document.getElementById('inputArea').value = '';
    document.getElementById('outputArea').value = '';
    document.getElementById('outputHighlight').innerHTML = 'Output will appear here with highlights...';
    document.getElementById('cntFind').textContent    = '—';
    document.getElementById('cntReplace').textContent = '—';
    document.getElementById('cntSlug').textContent    = '—';
    LS.clear();
    updateOpBox();
    buildList();
    hideNextBtn();
    resetSteps();
    loadTemplate();
}

function showNextBtn() { document.getElementById('nextBtn').classList.add('visible'); }
function hideNextBtn() { document.getElementById('nextBtn').classList.remove('visible'); }

function copyOutput() {
    const val = document.getElementById('outputArea').value;
    if (!val.trim()) { alert('Nothing to copy yet!'); return; }
    navigator.clipboard.writeText(val).then(() => {
        const b = document.getElementById('copyBtn');
        b.textContent = '✔ Copied!';
        setTimeout(() => b.textContent = 'Copy All', 2000);
    });
}

function clearAll() {
    document.getElementById('inputArea').value = '';
    document.getElementById('outputArea').value = '';
    document.getElementById('outputHighlight').innerHTML = 'Output will appear here with highlights...';
    document.getElementById('cntFind').textContent    = '—';
    document.getElementById('cntReplace').textContent = '—';
    document.getElementById('cntSlug').textContent    = '—';
    currentIndex = 0;
    doneSet.clear();
    LS.clear();
    updateOpBox();
    buildList();
    hideNextBtn();
    resetSteps();
}
