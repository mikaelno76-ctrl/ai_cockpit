let linkedCloudFileHandle = null;
let autoSaveCloudEnabled = false;
function showAutosaveToast(msg) {
const t = document.getElementById('autosaveToast');
if (!t) return;
t.textContent = msg;
t.classList.add('visible');
setTimeout(() => t.classList.remove('visible'), 6500);
}
function idbOpenHandleStore() {
return new Promise((resolve, reject) => {
if (!window.indexedDB) return reject(new Error('IndexedDB saknas'));
const req = indexedDB.open('ai_cockpit_filehandle_db', 1);
req.onupgradeneeded = (e) => {
e.target.result.createObjectStore('handles');
};
req.onsuccess = (e) => resolve(e.target.result);
req.onerror = () => reject(req.error);
});
}
async function saveHandleToIdb(handle) {
try {
const db = await idbOpenHandleStore();
const tx = db.transaction('handles', 'readwrite');
tx.objectStore('handles').put(handle, 'cloudFile');
} catch (e) {}
}
async function loadHandleFromIdb() {
try {
const db = await idbOpenHandleStore();
return await new Promise((resolve) => {
const tx = db.transaction('handles', 'readonly');
const req = tx.objectStore('handles').get('cloudFile');
req.onsuccess = () => resolve(req.result || null);
req.onerror = () => resolve(null);
});
} catch (e) {
return null;
}
}
async function checkRememberedFileHandleOnStart() {
const remembered = await loadHandleFromIdb();
if (remembered) {
const btn = document.getElementById('reconnectSavedHandleBtn');
const status = document.getElementById('cloudFileStatus');
if (btn) {
btn.style.display = 'inline-flex';
btn.textContent = `🔄 Återkoppla "${remembered.name}"`;
}
if (status) {
status.textContent = `ℹ️ Tidigare kopplad fil hittades ("${remembered.name}"). Klicka på "🔄 Återkoppla" för att ge webbläsaren läs-/skrivbehörighet i denna session.`;
}
}
}
async function reconnectRememberedFileHandle() {
const remembered = await loadHandleFromIdb();
const status = document.getElementById('cloudFileStatus');
if (!remembered) return;
try {
const perm = await remembered.requestPermission({ mode: 'readwrite' });
if (perm === 'granted') {
linkedCloudFileHandle = remembered;
const file = await linkedCloudFileHandle.getFile();
const parsed = JSON.parse(await file.text());
if (confirmAndRestoreBundle(parsed, file.name)) {
status.textContent = `✅ Återkopplad till "${file.name}"!`;
} else {
status.textContent = `✅ Filkoppling till "${file.name}" aktiv (behöll nuvarande arbetsyta).`;
}
document.getElementById('reconnectSavedHandleBtn').style.display = 'none';
} else {
status.textContent = '⚠️ Behörighet nekades av webbläsaren.';
}
} catch (e) {
status.textContent = '❌ Kunde inte återkoppla filen: ' + e.message;
}
}
function buildFullCockpitBundle() {
return {
format: 'aicockpit-v9',
savedAt: new Date().toISOString(),
lastModified: treeData.lastModified || Date.now(),
activeThreadId,
currentProvider,
currentModel,
uiPrefs,
costLedger,
treeData
};
}
function confirmAndRestoreBundle(bundle, sourceName = 'filen') {
if (!bundle) return false;
const incomingTree = (bundle.treeData && bundle.treeData.id === 'root') ? bundle.treeData : (bundle.id === 'root' ? bundle : null);
if (!incomingTree) return false;
const incomingThreads = collectAllThreadsWithPaths(incomingTree).length;
const currentThreads = collectAllThreadsWithPaths(treeData).length;
const savedTimeStr = bundle.savedAt ? new Date(bundle.savedAt).toLocaleString('sv-SE') : 'okänd tidpunkt';
const ok = confirm(
`Vill du ersätta din nuvarande arbetsyta (${currentThreads} trådar) med innehållet från ${sourceName}?\n\n` +
`• Innehåller: ${incomingThreads} trådar\n` +
`• Sparad: ${savedTimeStr}`
);
if (!ok) return false;
treeData = incomingTree;
if (bundle.activeThreadId && findNode(treeData, bundle.activeThreadId)) {
activeThreadId = bundle.activeThreadId;
}
if (bundle.uiPrefs) uiPrefs = { ...uiPrefs, ...bundle.uiPrefs };
if (bundle.costLedger) costLedger = bundle.costLedger;
saveTree();
saveLedger();
saveUiPrefs();
applyUiPrefsToDom();
renderAll();
return true;
}
function openCloudSyncModal() {
openModal('cloudSyncModal');
}
async function linkAndSaveCloudFile() {
const status = document.getElementById('cloudFileStatus');
const payload = JSON.stringify(buildFullCockpitBundle(), null, 2);
if (window.showSaveFilePicker) {
try {
linkedCloudFileHandle = await window.showSaveFilePicker({
suggestedName: 'min_ai_cockpit.aicockpit',
types: [{ description: 'AI-Cockpit Molnfil', accept: { 'application/json': ['.aicockpit', '.json'] } }]
});
const writable = await linkedCloudFileHandle.createWritable();
await writable.write(payload);
await writable.close();
await saveHandleToIdb(linkedCloudFileHandle);
status.textContent = `✅ Kopplad & sparad till "${linkedCloudFileHandle.name}" (${new Date().toLocaleTimeString()})!`;
return;
} catch (e) {
if (e.name === 'AbortError') return;
status.textContent = '❌ Kunde inte spara direkt till filen: ' + e.message;
return;
}
}
const blob = new Blob([payload], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'min_ai_cockpit.aicockpit';
a.click();
setTimeout(() => URL.revokeObjectURL(url), 2000);
status.textContent = 'ℹ️ Din webbläsare stöder inte direkt filkoppling – filen "min_ai_cockpit.aicockpit" laddades ner vanligt.';
}
async function openLinkedCloudFile() {
const status = document.getElementById('cloudFileStatus');
if (window.showOpenFilePicker) {
try {
const [handle] = await window.showOpenFilePicker({
types: [{ description: 'AI-Cockpit Molnfil', accept: { 'application/json': ['.aicockpit', '.json'] } }]
});
linkedCloudFileHandle = handle;
await saveHandleToIdb(handle);
const file = await handle.getFile();
const text = await file.text();
const parsed = JSON.parse(text);
if (confirmAndRestoreBundle(parsed, `"${file.name}"`)) {
status.textContent = `✅ Läste in "${file.name}" (${new Date().toLocaleTimeString()})!`;
} else {
status.textContent = `ℹ️ Inläsning avbröts eller ogiltigt format i "${file.name}".`;
}
return;
} catch (e) {
if (e.name === 'AbortError') return;
status.textContent = '❌ Fel vid öppning av fil: ' + e.message;
return;
}
}
alert('Din webbläsare stöder inte direkt filkoppling. Använd knappen ⬆️ längst ner i vänstermenyn för att öppna din .aicockpit-fil.');
}
function toggleAutoSaveCloudFile(on) {
if (on && !linkedCloudFileHandle) {
alert('Välj eller återkoppla en fil först med knappen ovan innan du slår på autosparning.');
document.getElementById('autoSaveCloudFileChk').checked = false;
autoSaveCloudEnabled = false;
return;
}
autoSaveCloudEnabled = !!on;
}
async function maybeAutoSaveCloudFile() {
if (!autoSaveCloudEnabled) return;
const status = document.getElementById('cloudFileStatus');
if (!linkedCloudFileHandle) {
autoSaveCloudEnabled = false;
const chk = document.getElementById('autoSaveCloudFileChk');
if (chk) chk.checked = false;
showAutosaveToast('⚠️ Autosparning avbruten: filkopplingen saknas i denna session. Öppna ☁️ Molnsynk för att återkoppla.');
return;
}
try {
const writable = await linkedCloudFileHandle.createWritable();
await writable.write(JSON.stringify(buildFullCockpitBundle(), null, 2));
await writable.close();
if (status) status.textContent = `✅ Autosparad till "${linkedCloudFileHandle.name}" kl ${new Date().toLocaleTimeString()}`;
} catch (e) {
autoSaveCloudEnabled = false;
const chk = document.getElementById('autoSaveCloudFileChk');
if (chk) chk.checked = false;
if (status) status.textContent = `❌ Autosparning misslyckades: ${e.message}`;
showAutosaveToast(`⚠️ Autosparning till "${linkedCloudFileHandle.name}" misslyckades (${e.message}).`);
}
}
async function cloudApiUpload() {
const prov = document.getElementById('cloudApiProvider').value;
const token = document.getElementById('cloudApiToken').value.trim();
const status = document.getElementById('cloudApiStatus');
if (!token) { status.textContent = '⚠️ Ange ett OAuth Access Token först.'; return; }
status.textContent = '⏳ Laddar upp min_ai_cockpit.aicockpit...';
const content = JSON.stringify(buildFullCockpitBundle(), null, 2);
try {
if (prov === 'onedrive') {
const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/min_ai_cockpit.aicockpit:/content', {
method: 'PUT',
headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
body: content
});
if (res.status === 401 || res.status === 403) throw new Error('Token är ogiltig eller har gått ut (HTTP ' + res.status + ').');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
status.textContent = '✅ Uppladdad till Microsoft OneDrive (/min_ai_cockpit.aicockpit)!';
} else {
const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='min_ai_cockpit.aicockpit'+and+trashed=false", {
headers: { 'Authorization': `Bearer ${token}` }
});
if (searchRes.status === 401 || searchRes.status === 403) throw new Error('Token är ogiltig eller har gått ut (HTTP ' + searchRes.status + ').');
if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
const searchData = await searchRes.json();
const existingId = searchData?.files?.[0]?.id;
if (existingId) {
const upRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
method: 'PATCH',
headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
body: content
});
if (!upRes.ok) throw new Error(`HTTP ${upRes.status}`);
} else {
const meta = { name: 'min_ai_cockpit.aicockpit', mimeType: 'application/json' };
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
form.append('file', new Blob([content], { type: 'application/json' }));
const upRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}` },
body: form
});
if (!upRes.ok) throw new Error(`HTTP ${upRes.status}`);
}
status.textContent = '✅ Uppladdad till Google Drive (min_ai_cockpit.aicockpit)!';
}
} catch (e) {
status.textContent = '❌ Moln-API fel: ' + e.message;
}
}
async function cloudApiDownload() {
const prov = document.getElementById('cloudApiProvider').value;
const token = document.getElementById('cloudApiToken').value.trim();
const status = document.getElementById('cloudApiStatus');
if (!token) { status.textContent = '⚠️ Ange ett OAuth Access Token först.'; return; }
status.textContent = '⏳ Hämtar från molnet...';
try {
let data = null;
if (prov === 'onedrive') {
const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/min_ai_cockpit.aicockpit:/content', {
headers: { 'Authorization': `Bearer ${token}` }
});
if (res.status === 401 || res.status === 403) throw new Error('Token är ogiltig eller har gått ut (HTTP ' + res.status + ').');
if (res.status === 404) throw new Error('Filen min_ai_cockpit.aicockpit finns inte på OneDrive ännu.');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
data = await res.json();
} else {
const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='min_ai_cockpit.aicockpit'+and+trashed=false", {
headers: { 'Authorization': `Bearer ${token}` }
});
if (searchRes.status === 401 || searchRes.status === 403) throw new Error('Token är ogiltig eller har gått ut (HTTP ' + searchRes.status + ').');
if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
const searchData = await searchRes.json();
const fileId = searchData?.files?.[0]?.id;
if (!fileId) throw new Error('Hittade ingen min_ai_cockpit.aicockpit på Google Drive.');
const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
headers: { 'Authorization': `Bearer ${token}` }
});
if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`);
data = await dlRes.json();
}
if (confirmAndRestoreBundle(data, 'molnet')) {
status.textContent = '✅ Hämtad och inläst från molnet!';
} else {
status.textContent = 'ℹ️ Hämtningen avbröts eller innehöll ingen giltig arbetsyta.';
}
} catch (e) {
status.textContent = '❌ Kunde inte hämta: ' + e.message;
}
}
exportWorkspace = function() {
const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(buildFullCockpitBundle(), null, 2));
const a = document.createElement('a');
a.href = dataStr;
a.download = `ai_cockpit_v9_${Date.now()}.aicockpit`;
a.click();
};
importWorkspace = function(e) {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
try {
const parsed = JSON.parse(ev.target.result);
if (!confirmAndRestoreBundle(parsed, `"${file.name}"`)) {
}
} catch (err) {
alert('Kunde inte läsa filen: ' + err.message);
}
};
reader.readAsText(file);
e.target.value = '';
};
function openImportHistoryModal() {
const st = document.getElementById('importHistoryStatus');
if (st) st.style.display = 'none';
openModal('importHistoryModal');
}
function importPastedConversation() {
const raw = (document.getElementById('quickPasteThreadContent')?.value || '').trim();
if (!raw) {
alert('Klistra in konversationstexten i rutan först!');
return;
}
const title = (document.getElementById('quickPasteThreadTitle')?.value || '').trim() || `Inklistrad tråd (${new Date().toLocaleDateString('sv-SE')})`;
const folderName = (document.getElementById('importFolderName')?.value || '').trim() || 'Importerad Historik';
const newThread = {
id: 'imp_paste_' + Date.now(),
name: title.slice(0, 80),
type: 'thread',
messages: [
{
id: 'm_paste_' + Date.now(),
role: 'user',
text: raw,
inContext: true,
time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
]
};
let targetFolder = (treeData.children || []).find(c => c.type === 'folder' && c.name.startsWith(folderName));
if (!targetFolder) {
targetFolder = {
id: 'folder_imp_' + Date.now(),
name: folderName,
type: 'folder',
isOpen: true,
children: []
};
treeData.children.push(targetFolder);
}
targetFolder.children.push(newThread);
targetFolder.isOpen = true;
activeThreadId = newThread.id;
document.getElementById('quickPasteThreadContent').value = '';
document.getElementById('quickPasteThreadTitle').value = '';
saveTree();
renderAll();
const statusBox = document.getElementById('importHistoryStatus');
if (statusBox) {
statusBox.style.display = 'block';
statusBox.innerHTML = `✅ Skapade tråden <strong>${escapeHtml(newThread.name)}</strong> under "${escapeHtml(targetFolder.name)}"!`;
}
}
function handleExternalHistoryImport(event) {
const file = event.target.files?.[0];
if (!file) return;
const folderName = document.getElementById('importFolderName').value.trim() || 'Importerad Historik';
const maxThreads = parseInt(document.getElementById('importMaxThreads').value, 10) || 150;
const statusBox = document.getElementById('importHistoryStatus');
statusBox.style.display = 'block';
statusBox.textContent = '⏳ Läser och analyserar exportfil...';
const reader = new FileReader();
reader.onload = (ev) => {
try {
const raw = String(ev.target.result || '');
let parsed;
try {
parsed = JSON.parse(raw);
} catch (jsonErr) {
let cleanText = raw;
if (file.name.endsWith('.html') || /<html|<body|<div/i.test(raw)) {
const doc = new DOMParser().parseFromString(raw, 'text/html');
doc.querySelectorAll('style, script').forEach(el => el.remove());
cleanText = (doc.body ? doc.body.innerText : raw).replace(/\n{3,}/g, '\n\n').trim();
}
const singleThread = {
id: 'imp_txt_' + Date.now(),
name: file.name.replace(/\.[^.]+$/, ''),
type: 'thread',
messages: [{ id: 'm_' + Date.now(), role: 'user', text: cleanText || raw, inContext: true, time: 'Import' }]
};
treeData.children.push({
id: 'imp_f_' + Date.now(),
name: folderName,
type: 'folder',
isOpen: true,
children: [singleThread]
});
activeThreadId = singleThread.id;
saveTree();
renderAll();
statusBox.innerHTML = `✅ Importerade textfilen som 1 tråd under <strong>${escapeHtml(folderName)}</strong>!`;
return;
}
if (parsed.format?.startsWith('aicockpit') || parsed.id === 'root') {
if (confirmAndRestoreBundle(parsed, `"${file.name}"`)) {
statusBox.innerHTML = '✅ Hela din sparade AI-Cockpit-arbetsyta har lästs in!';
} else {
statusBox.innerHTML = 'ℹ️ Inläsningen avbröts.';
}
return;
}
const importedThreads = [];
let items = Array.isArray(parsed) ? parsed : (parsed.conversations || parsed.threads || [parsed]);
const isTakeoutFile = items.some(it => it && it.header && (it.title || it.safeHtmlItem));
if (isTakeoutFile) {
items = [...items].sort((a, b) => {
const ta = a?.time ? new Date(a.time).getTime() : 0;
const tb = b?.time ? new Date(b.time).getTime() : 0;
return ta - tb;
});
}
const takeoutThreadsByChatId = new Map();
let lastNoIdTakeoutThread = null;
const threadLimit = (maxThreads && maxThreads > 0) ? maxThreads : Infinity;
for (let i = 0; i < items.length && importedThreads.length < threadLimit; i++) {
const item = items[i];
if (!item || typeof item !== 'object') continue;
if (item.mapping && typeof item.mapping === 'object') {
const msgs = [];
const nodes = Object.values(item.mapping);
nodes.sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));
nodes.forEach(n => {
const m = n.message;
if (!m || !m.author) return;
const role = m.author.role;
if (role !== 'user' && role !== 'assistant') return;
const parts = m.content?.parts || [];
const text = parts.filter(p => typeof p === 'string').join('\n').trim();
if (!text) return;
msgs.push({
id: m.id || ('cgpt_' + Math.random().toString(36).slice(2, 9)),
role: role === 'assistant' ? 'assistant' : 'user',
provider: role === 'assistant' ? 'openai' : undefined,
model: m.metadata?.model_slug || (role === 'assistant' ? 'chatgpt-import' : undefined),
text,
inContext: true,
time: m.create_time ? new Date(m.create_time * 1000).toLocaleDateString('sv-SE') : ''
});
});
if (msgs.length > 0) {
importedThreads.push({
id: 'imp_cgpt_' + Date.now() + '_' + i,
name: (item.title || `ChatGPT Tråd ${i + 1}`).slice(0, 80),
type: 'thread',
messages: msgs
});
}
} else if (Array.isArray(item.chat_messages)) {
const msgs = [];
item.chat_messages.forEach(cm => {
const role = cm.sender === 'human' ? 'user' : 'assistant';
const text = (cm.text || (Array.isArray(cm.content) ? cm.content.map(c => c.text || '').join('\n') : '')).trim();
if (!text) return;
msgs.push({
id: cm.uuid || ('claude_' + Math.random().toString(36).slice(2, 9)),
role,
provider: role === 'assistant' ? 'anthropic' : undefined,
model: role === 'assistant' ? 'claude-import' : undefined,
text,
inContext: true,
time: cm.created_at ? String(cm.created_at).slice(0, 10) : ''
});
});
if (msgs.length > 0) {
importedThreads.push({
id: 'imp_claude_' + Date.now() + '_' + i,
name: (item.name || item.title || `Claude Tråd ${i + 1}`).slice(0, 80),
type: 'thread',
messages: msgs
});
}
} else if (item.header && (item.title || item.safeHtmlItem)) {
const promptText = String(item.title || '').replace(/^(Prompted|Frågade|Skickade)\s+/i, '').trim();
const htmlParts = (item.safeHtmlItem || []).map(h => {
const d = new DOMParser().parseFromString(h.html || '', 'text/html');
return (d.body ? d.body.innerText : '').trim();
}).filter(Boolean).join('\n\n');
if (!promptText && !htmlParts) continue;
const itTimeMs = item.time ? new Date(item.time).getTime() : 0;
const timeLabel = item.time ? String(item.time).slice(0, 16).replace('T', ' ') : '';
const rawUrl = String(item.titleUrl || '');
let chatId = '';
if (rawUrl.includes('/app/')) {
const seg = rawUrl.split('/app/')[1] || '';
chatId = seg.split(/[/?#&]/)[0].trim();
}
const newMsgs = [];
if (promptText) newMsgs.push({ id: 'gact_u_' + i, role: 'user', text: promptText, inContext: true, time: timeLabel });
if (htmlParts) newMsgs.push({ id: 'gact_b_' + i, role: 'assistant', provider: 'gemini', model: 'gemini-takeout', text: htmlParts, inContext: true, time: timeLabel });
if (chatId) {
let existingThread = takeoutThreadsByChatId.get(chatId);
if (existingThread) {
existingThread.messages.push(...newMsgs);
existingThread.lastModified = itTimeMs || Date.now();
} else {
const created = {
id: 'imp_gact_' + chatId + '_' + i,
name: (promptText || `Gemini Tråd ${importedThreads.length + 1}`).slice(0, 78),
type: 'thread',
origin: 'gemini',
lastModified: itTimeMs || Date.now(),
messages: newMsgs
};
takeoutThreadsByChatId.set(chatId, created);
importedThreads.push(created);
}
} else {
let canMergeWithPrev = false;
if (lastNoIdTakeoutThread && itTimeMs && lastNoIdTakeoutThread._lastTimeMs) {
const diffMinutes = (itTimeMs - lastNoIdTakeoutThread._lastTimeMs) / 60000;
if (diffMinutes >= 0 && diffMinutes <= 90) {
canMergeWithPrev = true;
} else if (diffMinutes > 90 && diffMinutes <= 1440) {
const prevText = lastNoIdTakeoutThread.messages.map(m => m.text).join(' ').toLowerCase();
const curWords = promptText.toLowerCase().replace(/[^a-zåäö0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 4);
if (curWords.some(w => prevText.includes(w)) || curWords.length <= 2) {
canMergeWithPrev = true;
}
}
}
if (canMergeWithPrev) {
lastNoIdTakeoutThread.messages.push(...newMsgs);
lastNoIdTakeoutThread._lastTimeMs = itTimeMs;
lastNoIdTakeoutThread.lastModified = itTimeMs || Date.now();
} else {
const created = {
id: 'imp_gact_' + Date.now() + '_' + i,
name: (promptText || `Gemini Samtal ${importedThreads.length + 1}`).slice(0, 78),
type: 'thread',
origin: 'gemini',
_lastTimeMs: itTimeMs,
lastModified: itTimeMs || Date.now(),
messages: newMsgs
};
lastNoIdTakeoutThread = created;
importedThreads.push(created);
}
}
} else if (Array.isArray(item.messages)) {
const msgs = [];
item.messages.forEach(gm => {
const role = (gm.role === 'user' || gm.author === 'user' || gm.creator?.name === 'User') ? 'user' : 'assistant';
const text = (gm.text || gm.content || '').trim();
if (!text) return;
msgs.push({
id: gm.id || ('gem_' + Math.random().toString(36).slice(2, 9)),
role,
provider: gm.provider || (role === 'assistant' ? 'gemini' : undefined),
model: gm.model || (role === 'assistant' ? 'gemini-import' : undefined),
text,
inContext: gm.inContext !== false,
time: gm.time || ''
});
});
if (msgs.length > 0) {
importedThreads.push({
id: 'imp_gen_' + Date.now() + '_' + i,
name: (item.title || item.name || `Importerad Tråd ${i + 1}`).slice(0, 80),
type: 'thread',
messages: msgs
});
}
}
}
if (importedThreads.length === 0) {
statusBox.textContent = '⚠️ Hittade inga konversationer i filen. Kontrollera att det är en conversations.json från ChatGPT/Claude eller Gemini.';
return;
}
const newFolder = {
id: 'folder_imp_' + Date.now(),
name: `${folderName} (${importedThreads.length} st)`,
type: 'folder',
isOpen: true,
children: importedThreads
};
treeData.children.push(newFolder);
activeThreadId = importedThreads[0].id;
saveTree();
renderAll();
statusBox.innerHTML = `✅ Klart! Pusslade ihop och importerade <strong>${importedThreads.length} sammanhängande konversationer</strong> till mappen "${escapeHtml(newFolder.name)}" (lagrat i IndexedDB utan 5MB-spärr)!`;
} catch (err) {
statusBox.textContent = '❌ Fel vid import: ' + err.message;
}
};
reader.readAsText(file);
event.target.value = '';
}
function healFragmentedThreadsInTree(targetFolderId = null) {
const all = collectAllThreadsWithPaths(treeData);
if (all.length < 2) {
alert('Det finns inte tillräckligt många trådar för att pussla ihop.');
return;
}
const ok = confirm(`Vill du analysera alla ${all.length} trådar i trädet och automatiskt sammanfoga avklippta småtrådar som hör till samma samtal/session?`);
if (!ok) return;
let mergedCount = 0;
const sorted = [...all].sort((a, b) => (a.thread.lastModified || 0) - (b.thread.lastModified || 0));
const toRemoveIds = new Set();
for (let i = 0; i < sorted.length; i++) {
const cur = sorted[i].thread;
if (toRemoveIds.has(cur.id)) continue;
for (let j = i + 1; j < sorted.length; j++) {
const next = sorted[j].thread;
if (toRemoveIds.has(next.id)) continue;
if (cur.origin && next.origin && cur.origin !== next.origin) continue;
const timeDiffMin = Math.abs((next.lastModified || 0) - (cur.lastModified || 0)) / 60000;
let shouldMerge = false;
if (cur.name && next.name && cur.name.trim().toLowerCase() === next.name.trim().toLowerCase() && timeDiffMin <= 2880) {
shouldMerge = true;
} else if (timeDiffMin <= 75) {
shouldMerge = true;
} else if (timeDiffMin <= 1440) {
const wCur = (cur.name || '').toLowerCase().replace(/[^a-zåäö0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 4);
const wNext = (next.name || '').toLowerCase().replace(/[^a-zåäö0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 4);
if (wCur.some(w => wNext.includes(w))) shouldMerge = true;
}
if (shouldMerge) {
cur.messages = mergeThreadMessages(cur.messages || [], next.messages || []);
cur.lastModified = Math.max(cur.lastModified || 0, next.lastModified || 0);
toRemoveIds.add(next.id);
mergedCount++;
}
}
}
if (mergedCount === 0) {
alert('Inga trådar behövde slås ihop.');
return;
}
function removeMerged(parent) {
if (!parent.children) return;
parent.children = parent.children.filter(c => !(c.type === 'thread' && toRemoveIds.has(c.id)));
parent.children.forEach(removeMerged);
}
removeMerged(treeData);
saveTree();
renderAll();
alert(`🎉 Klart! Pusslade ihop ${mergedCount} avklippta deltrådar. ${collectAllThreadsWithPaths(treeData).length} fullständiga trådar återstår nu i trädet!`);
}