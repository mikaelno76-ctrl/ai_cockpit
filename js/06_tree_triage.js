function detectThreadOrigin(thread) {
if (thread.origin) return thread.origin;
const id = String(thread.id || '').toLowerCase();
const name = String(thread.name || '').toLowerCase();
if (id.includes('cgpt') || name.includes('chatgpt') || name.includes('openai')) return 'openai';
if (id.includes('claude') || name.includes('claude')) return 'anthropic';
if (id.includes('gact') || id.includes('gem') || name.includes('gemini')) return 'gemini';
if (name.includes('mistral') || name.includes('mirage') || name.includes('le chat')) return 'mistral';
if (name.includes('grok')) return 'grok';
const msgs = thread.messages || [];
for (const m of msgs) {
if (m.provider) return m.provider;
const mod = String(m.model || '').toLowerCase();
if (mod.includes('gpt')) return 'openai';
if (mod.includes('claude')) return 'anthropic';
if (mod.includes('gemini')) return 'gemini';
if (mod.includes('mistral') || mod.includes('codestral')) return 'mistral';
if (mod.includes('grok')) return 'grok';
}
return 'gemini';
}
function normalizeAllThreadsMetadata(node = treeData) {
if (!node) return;
if (node.type === 'thread' && node.id !== INTERCOM_THREAD_ID) {
node.origin = detectThreadOrigin(node);
if (!node.lastModified) node.lastModified = Date.now();
}
if (node.children) {
node.children.forEach(c => normalizeAllThreadsMetadata(c));
}
}
function threadMatchesRusticQuery(thread, rawQuery) {
if (!rawQuery || !rawQuery.trim()) return true;
const q = rawQuery.trim().toLowerCase();
const hayTitle = String(thread.name || '').toLowerCase();
const hayMsgs = (thread.messages || []).map(m => String(m.text || '').toLowerCase()).join('\n');
const fullHaystack = hayTitle + '\n' + hayMsgs;
const parts = q.split(/\s+/);
if (!q.includes(' -') && !q.includes(' not ')) {
if (fullHaystack.includes(q)) return true;
}
for (const token of parts) {
if (!token) continue;
if (token.startsWith('-') && token.length > 1) {
const neg = token.slice(1);
if (fullHaystack.includes(neg)) return false;
} else {
if (!fullHaystack.includes(token)) return false;
}
}
return true;
}
function sortNodeChildrenList(children, sortMode) {
if (!Array.isArray(children) || sortMode === 'default') return children;
const copy = [...children];
copy.sort((a, b) => {
if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
if (sortMode === 'tokens_desc') {
return getNodeMetrics(b).tokens - getNodeMetrics(a).tokens;
}
if (sortMode === 'tokens_asc') {
return getNodeMetrics(a).tokens - getNodeMetrics(b).tokens;
}
if (sortMode === 'origin') {
const oa = detectThreadOrigin(a);
const ob = detectThreadOrigin(b);
if (oa !== ob) return oa.localeCompare(ob, 'sv');
return getNodeMetrics(b).tokens - getNodeMetrics(a).tokens;
}
if (sortMode === 'date_desc') {
return (b.lastModified || 0) - (a.lastModified || 0);
}
if (sortMode === 'name_asc') {
return String(a.name || '').localeCompare(String(b.name || ''), 'sv');
}
return 0;
});
return copy;
}
function onRusticSearchInput() {
currentRusticQuery = document.getElementById('rusticSearchInput')?.value || '';
renderTree();
}
function clearRusticSearch() {
const inp = document.getElementById('rusticSearchInput');
if (inp) inp.value = '';
currentRusticQuery = '';
renderTree();
}
function onTreeSortChange() {
currentTreeSortMode = document.getElementById('treeSortSelect')?.value || 'default';
renderTree();
}
renderTree = function() {
normalizeAllThreadsMetadata(treeData);
const container = document.getElementById('treeContainer');
if (!container) return;
container.innerHTML = '';
const q = (currentRusticQuery || '').trim();
let matchedThreadCount = 0;
function nodeHasMatchingDescendant(node) {
if (node.id === INTERCOM_THREAD_ID || node.hiddenIntercom) return false;
if (node.type === 'thread') {
return threadMatchesRusticQuery(node, q);
}
return (node.children || []).some(c => nodeHasMatchingDescendant(c));
}
function buildDom(node, depth) {
if (node.id === INTERCOM_THREAD_ID || node.hiddenIntercom) return null;
if (node.id === 'root') {
const sortedRootChildren = sortNodeChildrenList(node.children || [], currentTreeSortMode);
sortedRootChildren.forEach(c => {
const dom = buildDom(c, 0);
if (dom) container.appendChild(dom);
});
return null;
}
if (q && !nodeHasMatchingDescendant(node)) {
return null;
}
if (node.type === 'thread' && q) {
matchedThreadCount++;
}
const wrapper = document.createElement('div');
wrapper.className = 'tree-node';
const row = document.createElement('div');
const isFolder = node.type === 'folder';
const isActive = node.id === activeThreadId;
row.className = 'tree-row' + (isActive ? ' active' : '');
row.style.paddingLeft = (depth * 14 + 8) + 'px';
const metrics = getNodeMetrics(node);
const left = document.createElement('div');
left.className = 'tree-left';
const folderOpen = q ? true : node.isOpen;
const icon = isFolder ? (folderOpen ? '📂' : '📁') : '💬';
const hasMem = node.memory && node.memory.trim() ? '<span class="mem-dot" title="Har eget långtidsminne">🧠</span>' : '';
let originBadgeHtml = '';
if (!isFolder) {
const orig = detectThreadOrigin(node);
const origLabels = { gemini: 'GEM', openai: 'GPT', anthropic: 'CLD', grok: 'GRK', mistral: 'MIS', ollama: 'LOC' };
originBadgeHtml = `<span class="origin-badge origin-${orig}" title="Ursprung: ${orig}">${origLabels[orig] || 'AI'}</span>`;
}
left.innerHTML = `<span>${icon}</span>${originBadgeHtml}<span class="tree-name">${escapeHtml(node.name)}</span>${hasMem}`;
const stats = document.createElement('span');
stats.className = 'tree-stats';
stats.textContent = `${metrics.words}o · ${metrics.tokens}t`;
const tools = document.createElement('div');
tools.className = 'tree-tools';
if (isFolder) {
const addThreadBtn = document.createElement('button');
addThreadBtn.className = 'icon-btn';
addThreadBtn.textContent = '＋';
addThreadBtn.onclick = (e) => { e.stopPropagation(); createNode(node.id, 'thread'); };
const addFolderBtn = document.createElement('button');
addFolderBtn.className = 'icon-btn';
addFolderBtn.textContent = '📁';
addFolderBtn.onclick = (e) => { e.stopPropagation(); createNode(node.id, 'folder'); };
tools.appendChild(addThreadBtn);
tools.appendChild(addFolderBtn);
}
const memBtn = document.createElement('button');
memBtn.className = 'icon-btn';
memBtn.title = 'Långtidsminne för denna ' + (isFolder ? 'mapp (ärvs av undertrådar)' : 'tråd');
memBtn.textContent = '🧠';
memBtn.onclick = (e) => { e.stopPropagation(); openMemoryModal(node.id); };
tools.appendChild(memBtn);
const renameBtn = document.createElement('button');
renameBtn.className = 'icon-btn';
renameBtn.textContent = '✎';
renameBtn.onclick = (e) => { e.stopPropagation(); renameNodePrompt(node.id); };
const delBtn = document.createElement('button');
delBtn.className = 'icon-btn';
delBtn.textContent = '🗑️';
delBtn.onclick = (e) => { e.stopPropagation(); deleteNode(node.id); };
tools.appendChild(renameBtn);
tools.appendChild(delBtn);
row.appendChild(left);
row.appendChild(stats);
row.appendChild(tools);
row.onclick = () => {
if (isFolder) {
node.isOpen = !node.isOpen;
saveTree();
renderTree();
} else {
activeThreadId = node.id;
renderAll();
if (window.innerWidth <= 860) toggleSidebar(false);
}
};
wrapper.appendChild(row);
if (isFolder && folderOpen && node.children) {
const sortedKids = sortNodeChildrenList(node.children, currentTreeSortMode);
sortedKids.forEach(c => {
const childDom = buildDom(c, depth + 1);
if (childDom) wrapper.appendChild(childDom);
});
}
return wrapper;
}
buildDom(treeData, 0);
const batchBox = document.getElementById('rusticBatchBox');
const matchLbl = document.getElementById('rusticMatchCountLbl');
if (batchBox && matchLbl) {
if (q) {
batchBox.classList.add('visible');
matchLbl.textContent = `🔨 "${q}": ${matchedThreadCount} tråd${matchedThreadCount === 1 ? '' : 'ar'}`;
} else {
batchBox.classList.remove('visible');
}
}
};
const _origCollectAllThreadsWithPaths = collectAllThreadsWithPaths;
collectAllThreadsWithPaths = function(node, pathNames = [], out = []) {
if (!node || node.id === INTERCOM_THREAD_ID || node.hiddenIntercom) return out;
const currentPath = node.id === 'root' ? [] : [...pathNames, node.name];
if (node.type === 'thread') {
out.push({ thread: node, pathStr: currentPath.join(' › ') });
}
if (node.children) {
node.children.forEach(c => collectAllThreadsWithPaths(c, currentPath, out));
}
return out;
};
function moveMatchingThreadsByQueryToFolder(queryStr, targetFolderName) {
const q = (queryStr || '').trim();
if (!q) {
alert('Skriv ett sökord först!');
return;
}
const all = collectAllThreadsWithPaths(treeData);
const matchingIds = new Set(
all.filter(({ thread }) => threadMatchesRusticQuery(thread, q)).map(x => x.thread.id)
);
if (matchingIds.size === 0) {
alert(`Inga trådar matchade "${q}".`);
return;
}
const folderName = (targetFolderName || prompt(`Flytta alla ${matchingIds.size} trådar som nämner "${q}" till vilken mapp/katalog?`, `Projekt: ${q}`) || '').trim();
if (!folderName) return;
const extractedThreads = [];
function extractRec(parent) {
if (!parent.children) return;
const keep = [];
parent.children.forEach(c => {
if (c.type === 'thread' && matchingIds.has(c.id)) {
extractedThreads.push(c);
} else {
keep.push(c);
if (c.type === 'folder') extractRec(c);
}
});
parent.children = keep;
}
extractRec(treeData);
let destFolder = (treeData.children || []).find(c => c.type === 'folder' && c.name.toLowerCase() === folderName.toLowerCase());
if (!destFolder) {
destFolder = {
id: 'folder_triage_' + Date.now(),
name: folderName,
type: 'folder',
isOpen: true,
children: []
};
treeData.children.unshift(destFolder);
}
destFolder.isOpen = true;
destFolder.children.push(...extractedThreads);
saveTree();
renderAll();
if (ncState.isOpen) renderNortonCommander();
showAutosaveToast(`🔨 Släggsöket flyttade ${extractedThreads.length} trådar till mappen "${destFolder.name}"!`);
}
function moveAllRusticMatchesToFolder() {
moveMatchingThreadsByQueryToFolder(currentRusticQuery, '');
}
function openAutoTriageModal() {
const qInp = document.getElementById('triageKeywordInput');
if (qInp && currentRusticQuery && !qInp.value) qInp.value = currentRusticQuery;
openModal('autoTriageModal');
}
function runAutoTriageByOrigin() {
normalizeAllThreadsMetadata(treeData);
const all = collectAllThreadsWithPaths(treeData);
if (all.length === 0) return;
const originNames = {
gemini: '🟦 Arkiv: Google Gemini',
openai: '🟩 Arkiv: ChatGPT / OpenAI',
anthropic: '🟧 Arkiv: Claude / Anthropic',
grok: '🟪 Arkiv: Grok / xAI',
mistral: '🟪 Arkiv: Mistral / Mirage',
ollama: '⬜ Arkiv: Lokal Ollama'
};
const byOrigin = {};
const movedIds = new Set();
all.forEach(({ thread }) => {
const orig = detectThreadOrigin(thread);
if (!byOrigin[orig]) byOrigin[orig] = [];
byOrigin[orig].push(thread);
movedIds.add(thread.id);
});
function removeThreadsRec(parent) {
if (!parent.children) return;
parent.children = parent.children.filter(c => !(c.type === 'thread' && movedIds.has(c.id)));
parent.children.forEach(removeThreadsRec);
}
removeThreadsRec(treeData);
Object.keys(byOrigin).forEach(orig => {
const list = byOrigin[orig];
if (!list || !list.length) return;
const fName = originNames[orig] || `Arkiv: ${orig}`;
let folder = (treeData.children || []).find(c => c.type === 'folder' && c.name === fName);
if (!folder) {
folder = { id: 'f_orig_' + orig + '_' + Date.now(), name: fName, type: 'folder', isOpen: true, children: [] };
treeData.children.push(folder);
}
folder.children.push(...list);
});
saveTree();
renderAll();
closeModal('autoTriageModal');
showAutosaveToast(`🗂️ Sorterade in ${movedIds.size} trådar i mappar efter AI-ursprung!`);
}
function runAutoTriageSmallThreads() {
const all = collectAllThreadsWithPaths(treeData);
const smallIds = new Set(
all.filter(({ thread }) => getNodeMetrics(thread).tokens < 500).map(x => x.thread.id)
);
if (smallIds.size === 0) {
alert('Hittade inga småtrådar under 500 tokens!');
return;
}
const extracted = [];
function extractSmallRec(parent) {
if (!parent.children) return;
const keep = [];
parent.children.forEach(c => {
if (c.type === 'thread' && smallIds.has(c.id)) extracted.push(c);
else {
keep.push(c);
if (c.type === 'folder') extractSmallRec(c);
}
});
parent.children = keep;
}
extractSmallRec(treeData);
const fName = '⚡ Snabba Småfrågor (<500t)';
let folder = (treeData.children || []).find(c => c.type === 'folder' && c.name === fName);
if (!folder) {
folder = { id: 'f_small_' + Date.now(), name: fName, type: 'folder', isOpen: false, children: [] };
treeData.children.push(folder);
}
folder.children.push(...extracted);
saveTree();
renderAll();
closeModal('autoTriageModal');
showAutosaveToast(`🪶 Flyttade ${extracted.length} småtrådar (<500 tokens) till "${fName}"!`);
}
function runAutoTriageByKeyword() {
const kw = (document.getElementById('triageKeywordInput')?.value || '').trim();
const targetF = (document.getElementById('triageTargetFolderInput')?.value || '').trim() || `Projekt: ${kw}`;
if (!kw) {
alert('Ange ett sökord först!');
return;
}
closeModal('autoTriageModal');
moveMatchingThreadsByQueryToFolder(kw, targetF);
}
populateNcSelects = function() {
normalizeAllThreadsMetadata(treeData);
let allThreads = collectAllThreadsWithPaths(treeData);
const ncQ = (document.getElementById('ncRusticFilterInput')?.value || '').trim();
const ncSort = document.getElementById('ncThreadSortSelect')?.value || 'default';
if (ncQ) {
allThreads = allThreads.filter(({ thread }) => threadMatchesRusticQuery(thread, ncQ));
}
if (ncSort !== 'default') {
allThreads.sort((a, b) => {
if (ncSort === 'tokens_desc') return getNodeMetrics(b.thread).tokens - getNodeMetrics(a.thread).tokens;
if (ncSort === 'tokens_asc') return getNodeMetrics(a.thread).tokens - getNodeMetrics(b.thread).tokens;
if (ncSort === 'origin') return detectThreadOrigin(a.thread).localeCompare(detectThreadOrigin(b.thread), 'sv');
if (ncSort === 'name_asc') return String(a.thread.name || '').localeCompare(String(b.thread.name || ''), 'sv');
return 0;
});
}
['left', 'right'].forEach(side => {
const sel = document.getElementById('ncSelect_' + side);
if (!sel) return;
const curId = side === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
sel.innerHTML = '';
allThreads.forEach(({ thread, pathStr }) => {
const opt = document.createElement('option');
opt.value = thread.id;
const m = getNodeMetrics(thread);
const orig = detectThreadOrigin(thread).toUpperCase().slice(0, 3);
opt.textContent = `[${orig}] ${pathStr} (${(thread.messages || []).length} inlägg • ~${m.tokens}t)`;
if (thread.id === curId) opt.selected = true;
sel.appendChild(opt);
});
if (allThreads.length > 0 && !allThreads.some(t => t.thread.id === curId)) {
if (side === 'left') ncState.leftThreadId = allThreads[0].thread.id;
else ncState.rightThreadId = allThreads[Math.min(1, allThreads.length - 1)].thread.id;
}
});
};
function ncMoveMatchingThreadsToFolder() {
const ncQ = (document.getElementById('ncRusticFilterInput')?.value || '').trim();
if (!ncQ) {
alert('Skriv först ett sökord i rutan "SLÄGGSÖK & TRÅDFILTER I NC" (t.ex. AI cockpit) för att välja vilka trådar som ska flyttas!');
return;
}
moveMatchingThreadsByQueryToFolder(ncQ, '');
}