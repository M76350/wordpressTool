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
    const di = document.getElementById('destInput');
    if (di) di.addEventListener('keydown', e => { if (e.key === 'Enter') applyDestination(); });
    const pi = document.getElementById('popupDestInput');
    if (pi) pi.addEventListener('keydown', e => { if (e.key === 'Enter') applyFromPopup(); });
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); appUndo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); appRedo(); }
    });
});

// ── CUSTOM MODAL ──
function showModal({ icon='⚡', title='', msg='', extra='', buttons=[] }) {
    document.getElementById('modalIcon').textContent  = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMsg').innerHTML     = msg;
    document.getElementById('modalExtra').innerHTML   = extra;
    const btns = document.getElementById('modalBtns');
    btns.innerHTML = '';
    buttons.forEach(b => {
        const el = document.createElement('button');
        el.className = `modal-btn ${b.cls || 'modal-btn-primary'}`;
        el.textContent = b.label;
        el.onclick = () => { closeModal(); b.action && b.action(); };
        btns.appendChild(el);
    });
    document.getElementById('customModal').classList.add('show');
}

function closeModal() {
    document.getElementById('customModal').classList.remove('show');
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('customModal')?.addEventListener('click', e => {
        if (e.target.id === 'customModal') closeModal();
    });
});

// ── QUICK COPY — 19 CITY BUTTONS ──
let generatedCodes = {};

// ── UPDATE BASE & REGENERATE ──
async function updateBaseAndRegenerate() {
    const code = document.getElementById('inputArea').value;
    if (!code.trim()) {
        showModal({ icon:'⚠️', title:'Input Empty', msg:'Paste your fixed Delhi code first!', buttons:[{label:'OK', cls:'modal-btn-cancel'}] });
        return;
    }
    const dest = document.getElementById('destInput')?.value?.trim();
    if (!dest) {
        showModal({ icon:'⚠️', title:'No Destination Set', msg:'Please set destination in the <strong style="color:#f9e2af;">New Destination</strong> field first!', buttons:[{label:'OK', cls:'modal-btn-cancel'}] });
        return;
    }
    showModal({
        icon: '🔄',
        title: 'Regenerate 19 Cities',
        msg: `Use pasted code as new base?<br><br>All 19 cities will be regenerated for <strong style="color:#f9e2af;">${dest}</strong> with correct images.`,
        buttons: [
            { label: `✅ Yes, Regenerate`, cls: 'modal-btn-success', action: async () => { await generateAllCityCodes(code, dest); } },
            { label: 'Cancel', cls: 'modal-btn-cancel' }
        ]
    });
}

function saveAsTemplate() {
    const code = document.getElementById('inputArea').value;
    if (!code.trim()) {
        showModal({ icon:'⚠️', title:'Input Empty', msg:'Paste your code first before saving as template.', buttons:[{label:'OK', cls:'modal-btn-cancel'}] });
        return;
    }
    showModal({
        icon: '💾',
        title: 'Save as Base Template',
        msg: 'Choose which template to update:',
        extra: `<div class="modal-choice-grid">
            <button class="modal-choice-btn c1" onclick="doSaveTemplate('1')">Delhi-sub</button>
            <button class="modal-choice-btn c2" onclick="doSaveTemplate('2')">Delhi-Parent</button>
            <button class="modal-choice-btn c3" onclick="doSaveTemplate('3')">India</button>
        </div>`,
        buttons: [{label:'Cancel', cls:'modal-btn-cancel'}]
    });
}

function doSaveTemplate(choice) {
    closeModal();
    const code  = document.getElementById('inputArea').value;
    const keys  = { '1': 'tpl_delhi', '2': 'tpl_parent', '3': 'tpl_india' };
    const names = { '1': 'Delhi-sub', '2': 'Delhi-Parent', '3': 'India' };
    localStorage.setItem(keys[choice], code);
    showModal({ icon:'✅', title:'Template Saved!', msg:`<strong style="color:#cba6f7;">${names[choice]}</strong> template updated.<br>Next time you click the button, this code will load.`, buttons:[{label:'Great!', cls:'modal-btn-success'}] });
}

async function generateAllCityCodes(baseCode, newDest) {
    generatedCodes = {};
    const panel  = document.getElementById('quickCopyPanel');
    const grid   = document.getElementById('quickCopyGrid');
    const status = document.getElementById('quickCopyStatus');
    if (!panel || !grid) return;

    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    grid.innerHTML = '';
    status.textContent = '';

    // Processing UI inside quick copy panel
    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = 'width:100%;margin-bottom:12px;';
    progressWrap.innerHTML = `
        <div style="font-size:0.82em;color:#cba6f7;font-weight:bold;margin-bottom:8px;">🌍 Destination: <span style="color:#f9e2af;">${newDest}</span></div>
        <div id="qcProgressBar" style="height:4px;background:#313244;border-radius:10px;overflow:hidden;margin-bottom:8px;">
            <div id="qcProgressFill" style="height:100%;width:0%;background:linear-gradient(90deg,#cba6f7,#89b4fa,#a6e3a1,#f9e2af);background-size:300% 100%;border-radius:10px;transition:width 0.4s ease;"></div>
        </div>
        <div id="qcCurrentCity" style="font-size:0.78em;color:#f9e2af;min-height:18px;"></div>
        <div id="qcCounts" style="font-size:0.72em;color:#6c7086;margin-top:4px;display:flex;gap:14px;">
            <span>Found: <b id="qcFind" style="color:#f5c2e7;">—</b></span>
            <span>Replaced: <b id="qcRepl" style="color:#89b4fa;">—</b></span>
            <span>Slugs: <b id="qcSlug" style="color:#a6e3a1;">—</b></span>
        </div>
    `;
    grid.appendChild(progressWrap);

    const totalCities = CITIES.length;

    for (let i = 0; i < totalCities; i++) {
        const city = CITIES[i];

        // Update progress UI
        const pct = Math.round(((i) / totalCities) * 100);
        document.getElementById('qcProgressFill').style.width = pct + '%';
        document.getElementById('qcCurrentCity').textContent = `⚙️ Processing: ${city} → ${newDest}...`;

        await new Promise(r => setTimeout(r, 120)); // real feeling delay

        // Build code for this city
        let code = baseCode;
        let totalFound = 0, totalRepl = 0, totalSlug = 0;

        // Apply city replacements up to index i
        for (let j = 0; j < i; j++) {
            const escF    = CITIES[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex   = new RegExp(escF, 'gi');
            const matches = (code.match(regex) || []).length;
            totalFound   += matches;
            totalRepl    += matches;
            code          = code.replace(regex, CITIES[j + 1]);

            // slug fix
            const capS = '-' + CITIES[j + 1];
            const lowS = '-' + CITIES[j + 1].toLowerCase();
            if (capS !== lowS) {
                const sc = code.split(capS).length - 1;
                totalSlug += sc;
                code = code.split(capS).join(lowS);
            }
        }

        generatedCodes[city] = code;

        // Update counts
        document.getElementById('qcFind').textContent = totalFound || '—';
        document.getElementById('qcRepl').textContent = totalRepl || '—';
        document.getElementById('qcSlug').textContent = totalSlug || '—';

        await new Promise(r => setTimeout(r, 80));
    }

    // 100% done
    document.getElementById('qcProgressFill').style.width = '100%';
    document.getElementById('qcCurrentCity').textContent = '✅ All cities ready!';

    await new Promise(r => setTimeout(r, 500));

    // Remove progress UI, show buttons
    grid.innerHTML = '';
    status.style.color = '#a6e3a1';
    status.textContent = `✅ ${totalCities} cities ready — click to copy`;

    // Show Delhi code in output area as preview
    if (generatedCodes['Delhi']) {
        document.getElementById('outputArea').value = generatedCodes['Delhi'];
        renderHighlighted(
            generatedCodes['Delhi'],
            generatedCodes['Delhi'],
            'Delhi', newDest,
            '-' + newDest.toLowerCase()
        );
    }

    CITIES.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        btn.className = 'qc-city-btn';
        btn.title = `Copy ${city} → ${newDest} code`;
        btn.onclick = () => quickCopy(city, btn, newDest);
        grid.appendChild(btn);
    });
}

function quickCopy(city, btn, dest) {
    const code = generatedCodes[city];
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        const wasCopied = btn.classList.contains('copied');

        btn.classList.add('copied');
        btn.textContent = wasCopied ? '✔✔ Re-copied!' : '✔ ' + city;

        // Show in output area
        document.getElementById('outputArea').value = code;
        renderHighlighted(code, code, city, dest, '-' + (dest||'').toLowerCase());

        // Brief flash for re-copy
        if (wasCopied) {
            btn.style.background = 'linear-gradient(135deg,#f9e2af,#fab387)';
            btn.style.color = '#1e1e2e';
            setTimeout(() => {
                btn.style.background = '';
                btn.style.color = '';
                btn.textContent = '✔ ' + city;
            }, 1000);
        }

        // Update status count
        const total  = document.querySelectorAll('.qc-city-btn').length;
        const done   = document.querySelectorAll('.qc-city-btn.copied').length;
        const status = document.getElementById('quickCopyStatus');
        if (status) {
            status.textContent = `✔ ${done}/${total} copied`;
            status.style.color = done === total ? '#a6e3a1' : '#f9e2af';
        }
    });
}

// ── DESTINATION REPLACE — Find: Denmark → New City ──
async function applyDestination() {
    const newDest = document.getElementById('destInput').value.trim();
    if (!newDest) { showModal({icon:'⚠️',title:'Enter Destination',msg:'Please type a destination country/city name.',buttons:[{label:'OK',cls:'modal-btn-cancel'}]}); return; }
    const input = document.getElementById('inputArea').value;
    if (!input.trim()) { showModal({icon:'📋',title:'No Template Loaded',msg:'Please load a template first using the buttons above.',buttons:[{label:'OK',cls:'modal-btn-cancel'}]}); return; }

    const oldDest   = 'Denmark';
    const escOld    = oldDest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const findRegex = new RegExp(escOld, 'gi');
    const count     = (input.match(findRegex) || []).length;

    ppReset(); ppShow();

    // STEP 1 — FIND
    pps('pp1','active','...', `Finding "${oldDest}"...`);
    ss('s1','active','...', `Finding "${oldDest}"...`);
    await delay(600);
    if (count === 0) {
        pps('pp1','err','0', `"${oldDest}" not found!`);
        ss('s1','err','0', `"${oldDest}" not found!`);
        await delay(1200); ppHide(); return;
    }
    pps('pp1','done', count, `"${oldDest}" found ${count}×`);
    ss('s1','done', count, `"${oldDest}" found ${count}×`);
    ppSetProgress(25);

    // STEP 2 — REPLACE (case-insensitive)
    await delay(500);
    pps('pp2','active','...', `"${oldDest}" → "${newDest}"...`);
    ss('s2','active','...', `"${oldDest}" → "${newDest}"...`);
    await delay(700);
    let result = input.replace(findRegex, newDest);
    pps('pp2','done', count, `${count} replacements done`);
    ss('s2','done', count, `${count} replacements done`);
    ppSetProgress(55);

    // STEP 3 — SLUG FIX: -Germany → -germany, -Denmark → -germany
    await delay(500);
    const capSlug    = '-' + newDest;
    const lowSlug    = '-' + newDest.toLowerCase();
    const oldCapSlug = '-' + oldDest;
    const oldLowSlug = '-' + oldDest.toLowerCase();
    pps('pp3','active','...', `"${capSlug}" → "${lowSlug}"...`);
    ss('s3','active','...', `"${capSlug}" → "${lowSlug}"...`);
    await delay(700);
    let slugCount = 0;
    if (capSlug !== lowSlug) {
        slugCount += result.split(capSlug).length - 1;
        result = result.split(capSlug).join(lowSlug);
    }
    if (oldCapSlug !== lowSlug) {
        const e = result.split(oldCapSlug).length - 1;
        if (e > 0) { slugCount += e; result = result.split(oldCapSlug).join(lowSlug); }
    }
    if (oldLowSlug !== lowSlug) {
        const e = result.split(oldLowSlug).length - 1;
        if (e > 0) { slugCount += e; result = result.split(oldLowSlug).join(lowSlug); }
    }
    pps('pp3','done', slugCount, `${slugCount} slug(s) fixed`);
    ss('s3','done', slugCount, `${slugCount} slug(s) fixed`);
    ppSetProgress(80);

    // STEP 4 — DONE
    await delay(400);
    pps('pp4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    ss('s4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    ppSetProgress(100);
    await delay(800);
    ppHide();

    document.getElementById('cntFind').textContent    = count;
    document.getElementById('cntReplace').textContent = count;
    document.getElementById('cntSlug').textContent    = slugCount;
    document.getElementById('inputArea').value = result;
    LS.save();

    currentIndex = 0; doneSet.clear();
    updateOpBox(); buildList(); hideNextBtn(); resetSteps();

    // Generate all 19 city codes instantly
    await generateAllCityCodes(result, newDest);

    document.getElementById('destStatus').style.color = '#a6e3a1';
    document.getElementById('destStatus').textContent = `✅ "Denmark" → "${newDest}" done! Now run 19 cities.`;
    setTimeout(() => {
        document.getElementById('destStatus').textContent = '';
        document.getElementById('destStatus').style.color = '#6c7086';
    }, 5000);
}

async function applyFromPopup() {
    const val = document.getElementById('popupDestInput').value.trim();
    if (!val) { showModal({icon:'⚠️',title:'Enter Destination',msg:'Please type a new destination country/city.',buttons:[{label:'OK',cls:'modal-btn-cancel'}]}); return; }
    document.getElementById('destInput').value = val;
    document.getElementById('completionPopup').style.display = 'none';
    await applyDestination();
}

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
async function loadTemplate(path) {
    const filePath = path || 'data/delhi-template.html';
    try {
        const r = await fetch(filePath);
        const t = await r.text();
        document.getElementById('inputArea').value = t;
        LS.save();
    } catch(e) {
        alert(`Could not load ${filePath}. Please paste the code manually.`);
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
function ppShow() {
    document.getElementById('processPopup').classList.add('show');
    document.querySelector('.process-popup').classList.add('processing');
    document.body.classList.add('processing');
    document.getElementById('ppProgress').style.width = '0%';
}
function ppHide() {
    document.querySelector('.process-popup').classList.remove('processing');
    document.body.classList.remove('processing');
    document.getElementById('processPopup').classList.remove('show');
}
function ppSetProgress(pct) { document.getElementById('ppProgress').style.width = pct + '%'; }

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

    if (!input.trim()) { showModal({icon:'📋',title:'No Code Found',msg:'Please paste your code or click a template button first.',buttons:[{label:'OK',cls:'modal-btn-cancel'}]}); return; }
    if (!replWord)     { showModal({icon:'✅',title:'All Cities Done!',msg:'All 19 cities have been processed.',buttons:[{label:'OK',cls:'modal-btn-success'}]}); return; }

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
    ppSetProgress(25);

    // STEP 2 — REPLACE
    await delay(500);
    ss('s2','active','...', `"${findWord}" → "${replWord}"...`);
    pps('pp2','active','...', `"${findWord}" → "${replWord}"...`);
    await delay(700);
    let result = input.replace(findRegex, replWord);
    ss('s2','done', count, `${count} replacements done`);
    pps('pp2','done', count, `${count} replacements done`);
    ppSetProgress(55);

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
    ppSetProgress(80);

    // STEP 4 — DONE
    await delay(400);
    ss('s4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    pps('pp4','done','✓', `Ready — ${result.length.toLocaleString()} chars`);
    ppSetProgress(100);
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
        setTimeout(() => showCompletionPopup(), 6000);
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
    document.getElementById('destSection').style.display = 'block';
    document.getElementById('completionPopup').style.display = 'flex';
    setTimeout(() => {
        const pi = document.getElementById('popupDestInput');
        if (pi) { pi.focus(); pi.value = ''; }
    }, 300);
}

function restartFromDelhi() {
    document.getElementById('completionPopup').style.display = 'none';
    document.getElementById('destSection').style.display = 'none';
    currentIndex = 0;
    doneSet.clear();
    document.getElementById('inputArea').value = '';
    document.getElementById('outputArea').value = '';
    document.getElementById('outputHighlight').innerHTML = 'Output will appear here with highlights...';
    document.getElementById('cntFind').textContent    = '—';
    document.getElementById('cntReplace').textContent = '—';
    document.getElementById('cntSlug').textContent    = '—';
    LS.clear();
    updateOpBox(); buildList(); hideNextBtn(); resetSteps();
    loadTemplate();
}

function showNextBtn() { document.getElementById('nextBtn').classList.add('visible'); }
function hideNextBtn() { document.getElementById('nextBtn').classList.remove('visible'); }

function copyOutput() {
    const val = document.getElementById('outputArea').value;
    if (!val.trim()) { alert('Nothing to copy yet!'); return; }
    navigator.clipboard.writeText(val).then(() => {
        const b = document.getElementById('copyBtn');
        const hl = document.getElementById('outputHighlight');
        b.textContent = '✔ Copied!';
        b.style.background = '#a6e3a1';
        hl.style.transition = 'background 0.3s, color 0.3s';
        hl.style.background = '#1a2e1a';
        hl.style.color = '#000000';
        setTimeout(() => {
            b.textContent = 'Copy All';
            b.style.background = '';
            hl.style.background = '';
            hl.style.color = '';
        }, 2000);
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
