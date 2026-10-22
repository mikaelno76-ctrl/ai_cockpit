let ncState = {
isOpen: false,
activeSide: 'left', // 'left' eller 'right'
leftThreadId: null,
rightThreadId: null,
leftFocusIdx: 0,
rightFocusIdx: 0,
leftSelectedIds: new Set(),
rightSelectedIds: new Set(),
editingMsgRef: null
};
function openNortonCommander() {
const allThreads = collectAllThreadsWithPaths(treeData);
if (allThreads.length === 0) {
alert('Skapa minst en konversation först!');
return;
}
ncState.isOpen = true;
ncState.leftThreadId = activeThreadId || allThreads[0].thread.id;
const secondThread = allThreads.find(t => t.thread.id !== ncState.leftThreadId);
ncState.rightThreadId = secondThread ? secondThread.thread.id : ncState.leftThreadId;
ncState.leftSelectedIds.clear();
ncState.rightSelectedIds.clear();
ncState.leftFocusIdx = 0;
ncState.rightFocusIdx = 0;
document.getElementById('ncOverlay').classList.add('open');
renderNortonCommander();
}
function closeNortonCommander() {
ncState.isOpen = false;
document.getElementById('ncOverlay').classList.remove('open');
renderAll();
}
function setNcActivePane(side) {
ncState.activeSide = side;
document.getElementById('ncPane_left').classList.toggle('active-pane', side === 'left');
document.getElementById('ncPane_right').classList.toggle('active-pane', side === 'right');
renderNcPane('left');
renderNcPane('right');
}
function populateNcSelects() {
const allThreads = collectAllThreadsWithPaths(treeData);
['left', 'right'].forEach(side => {
const sel = document.getElementById('ncSelect_' + side);
if (!sel) return;
const curId = side === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
sel.innerHTML = '';
allThreads.forEach(({ thread, pathStr }) => {
const opt = document.createElement('option');
opt.value = thread.id;
const mCount = (thread.messages || []).length;
opt.textContent = `${pathStr} (${mCount} inlägg)`;
if (thread.id === curId) opt.selected = true;
sel.appendChild(opt);
});
});
}
function onNcThreadChange(side) {
const val = document.getElementById('ncSelect_' + side).value;
if (side === 'left') {
ncState.leftThreadId = val;
ncState.leftSelectedIds.clear();
ncState.leftFocusIdx = 0;
} else {
ncState.rightThreadId = val;
ncState.rightSelectedIds.clear();
ncState.rightFocusIdx = 0;
}
renderNortonCommander();
}
function renderNortonCommander() {
if (!ncState.isOpen) return;
populateNcSelects();
renderNcPane('left');
renderNcPane('right');
}
function renderNcPane(side) {
const threadId = side === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
const selectedSet = side === 'left' ? ncState.leftSelectedIds : ncState.rightSelectedIds;
let focusIdx = side === 'left' ? ncState.leftFocusIdx : ncState.rightFocusIdx;
const isPaneActive = ncState.activeSide === side;
const thread = findNode(treeData, threadId);
const listEl = document.getElementById('ncList_' + side);
const statusEl = document.getElementById('ncStatus_' + side);
if (!listEl || !statusEl) return;
listEl.innerHTML = '';
const msgs = thread?.messages || [];
if (focusIdx >= msgs.length) focusIdx = Math.max(0, msgs.length - 1);
if (side === 'left') ncState.leftFocusIdx = focusIdx;
else ncState.rightFocusIdx = focusIdx;
let totalTok = 0;
let selTok = 0;
msgs.forEach((m, idx) => {
if (!m.id) m.id = `nc_${side}_${idx}_${Date.now()}`;
const tok = countTokens(m.text);
totalTok += tok;
const isSel = selectedSet.has(m.id);
if (isSel) selTok += tok;
const isFoc = isPaneActive && idx === focusIdx;
const inCtx = m.inContext !== false;
const row = document.createElement('div');
row.className = 'nc-msg-row'
+ (isSel ? ' nc-selected' : '')
+ (isFoc ? ' nc-focused' : '')
+ (!inCtx ? ' nc-excluded' : '');
const roleStr = m.role === 'user' ? '👤 DU' : `🤖 ${(m.model || 'AI').slice(0, 6)}`;
const cleanPreview = (m.text || '').replace(/\s+/g, ' ').slice(0, 95);
row.innerHTML = `
<span>${isSel ? '★' : ''}${idx + 1}</span>
<span>${escapeHtml(roleStr)}</span>
<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${escapeHtml(cleanPreview)}</span>
<span>~${tok} tkn</span>
<span>${inCtx ? '🧠 PÅ' : '🛡️ AV'}</span>
`;
row.onclick = (e) => {
e.stopPropagation();
ncState.activeSide = side;
if (side === 'left') ncState.leftFocusIdx = idx;
else ncState.rightFocusIdx = idx;
if (e.ctrlKey || e.metaKey) {
if (selectedSet.has(m.id)) selectedSet.delete(m.id);
else selectedSet.add(m.id);
}
setNcActivePane(side);
};
row.oncontextmenu = (e) => {
e.preventDefault();
e.stopPropagation();
ncState.activeSide = side;
if (side === 'left') ncState.leftFocusIdx = idx;
else ncState.rightFocusIdx = idx;
if (selectedSet.has(m.id)) selectedSet.delete(m.id);
else selectedSet.add(m.id);
setNcActivePane(side);
return false;
};
row.ondblclick = (e) => {
e.stopPropagation();
ncState.activeSide = side;
if (side === 'left') ncState.leftFocusIdx = idx;
else ncState.rightFocusIdx = idx;
ncActionEdit();
};
listEl.appendChild(row);
});
statusEl.innerHTML = `
<span>★ Markerade: <strong>${selectedSet.size} st</strong> (~${selTok} tkn)</span>
<span>Totalt i tråd: ${msgs.length} inlägg (~${totalTok} tkn)</span>
`;
}
function getNcActiveContext() {
const side = ncState.activeSide;
const otherSide = side === 'left' ? 'right' : 'left';
const srcThreadId = side === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
const dstThreadId = otherSide === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
const srcThread = findNode(treeData, srcThreadId);
const dstThread = findNode(treeData, dstThreadId);
const selectedSet = side === 'left' ? ncState.leftSelectedIds : ncState.rightSelectedIds;
const focusIdx = side === 'left' ? ncState.leftFocusIdx : ncState.rightFocusIdx;
const msgs = srcThread?.messages || [];
let targetMsgs = msgs.filter(m => selectedSet.has(m.id));
if (targetMsgs.length === 0 && msgs[focusIdx]) {
targetMsgs = [msgs[focusIdx]];
}
return { side, otherSide, srcThread, dstThread, selectedSet, focusIdx, targetMsgs };
}
function ncActionHelp() {
alert(
'💾 AI-COCKPIT COMMANDER (NORTON COMMANDER-LÄGE):\n\n' +
'• HÖGERKLICKA på rader (eller tryck Insert / Mellanslag) för att markera dem i GULT (★).\n' +
'• TAB växlar mellan Vänster och Höger panel.\n' +
'• F2 slår PÅ/AV kontext-nålen (🧠/🛡️) på markerade rader.\n' +
'• F3 / F4 öppnar meddelandet för läsning eller direkt textredigering.\n' +
'• F5 KOPIERAR markerade meddelanden till andra panelens tråd.\n' +
'• F6 FLYTTAR markerade meddelanden till andra panelens tråd.\n' +
'• F7 skapar en ny tråd direkt.\n' +
'• F8 raderar markerade meddelanden.'
);
}
function ncActionToggleContext() {
const { srcThread, targetMsgs } = getNcActiveContext();
if (!srcThread || !targetMsgs.length) return;
targetMsgs.forEach(m => { m.inContext = (m.inContext === false); });
saveTree(srcThread.id);
renderNortonCommander();
}
function ncActionView() {
const { srcThread, focusIdx } = getNcActiveContext();
const m = srcThread?.messages?.[focusIdx];
if (!m) return;
ncState.editingMsgRef = null;
document.getElementById('ncEditModalTitle').textContent = `F3 View — [${m.role.toUpperCase()}] (${countWords(m.text)} ord)`;
const area = document.getElementById('ncEditModalTextarea');
area.value = m.text;
area.readOnly = true;
document.getElementById('ncEditSaveBtn').style.display = 'none';
openModal('ncEditModal');
}
function ncActionEdit() {
const { srcThread, focusIdx } = getNcActiveContext();
const m = srcThread?.messages?.[focusIdx];
if (!m) return;
ncState.editingMsgRef = { threadId: srcThread.id, msg: m };
document.getElementById('ncEditModalTitle').textContent = `F4 Edit — Redigera meddelande i "${srcThread.name}"`;
const area = document.getElementById('ncEditModalTextarea');
area.value = m.text;
area.readOnly = false;
document.getElementById('ncEditSaveBtn').style.display = 'inline-flex';
openModal('ncEditModal');
area.focus();
}
function saveNcEditedMessage() {
if (!ncState.editingMsgRef) return;
const newTxt = document.getElementById('ncEditModalTextarea').value;
ncState.editingMsgRef.msg.text = newTxt;
saveTree(ncState.editingMsgRef.threadId);
closeModal('ncEditModal');
renderNortonCommander();
}
function ncActionCopy() {
const { srcThread, dstThread, targetMsgs, selectedSet } = getNcActiveContext();
if (!srcThread || !dstThread || !targetMsgs.length) return;
if (srcThread.id === dstThread.id) {
alert('Välj två olika trådar i Vänster och Höger panel för att kopiera mellan dem!');
return;
}
if (!dstThread.messages) dstThread.messages = [];
targetMsgs.forEach(m => {
dstThread.messages.push({
...JSON.parse(JSON.stringify(m)),
id: 'nc_cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
});
});
selectedSet.clear();
saveTree(dstThread.id);
renderNortonCommander();
showAutosaveToast(`💾 F5 Kopierade ${targetMsgs.length} meddelanden till "${dstThread.name}"!`);
}
function ncActionMove() {
const { srcThread, dstThread, targetMsgs, selectedSet } = getNcActiveContext();
if (!srcThread || !dstThread || !targetMsgs.length) return;
if (srcThread.id === dstThread.id) {
alert('Välj två olika trådar i Vänster och Höger panel för att flytta meddelanden mellan dem!');
return;
}
const moveIds = new Set(targetMsgs.map(m => m.id));
if (!dstThread.messages) dstThread.messages = [];
dstThread.messages.push(...targetMsgs);
srcThread.messages = (srcThread.messages || []).filter(m => !moveIds.has(m.id));
selectedSet.clear();
saveTree(srcThread.id);
saveTree(dstThread.id);
renderNortonCommander();
showAutosaveToast(`💾 F6 Flyttade ${targetMsgs.length} meddelanden till "${dstThread.name}"!`);
}
function ncCreateNewThreadInPane(side) {
const name = prompt('Namn på ny tråd:');
if (!name || !name.trim()) return;
const newT = {
id: 't_nc_' + Date.now(),
name: name.trim(),
type: 'thread',
lastModified: Date.now(),
messages: []
};
if (!treeData.children) treeData.children = [];
treeData.children.push(newT);
if (side === 'left') ncState.leftThreadId = newT.id;
else ncState.rightThreadId = newT.id;
saveTree(newT.id);
renderNortonCommander();
}
function ncActionDelete() {
const { srcThread, targetMsgs, selectedSet } = getNcActiveContext();
if (!srcThread || !targetMsgs.length) return;
if (!confirm(`F8 Radera ${targetMsgs.length} meddelande(n) permanent ur "${srcThread.name}"?`)) return;
const delIds = new Set(targetMsgs.map(m => m.id));
srcThread.messages = (srcThread.messages || []).filter(m => !delIds.has(m.id));
selectedSet.clear();
saveTree(srcThread.id);
renderNortonCommander();
}
function ncActionSelectAll() {
const { srcThread, selectedSet } = getNcActiveContext();
if (!srcThread || !srcThread.messages) return;
if (selectedSet.size === srcThread.messages.length) {
selectedSet.clear();
} else {
srcThread.messages.forEach(m => selectedSet.add(m.id));
}
renderNortonCommander();
}
document.addEventListener('keydown', (e) => {
if (!ncState.isOpen) return;
if (document.getElementById('ncEditModal').classList.contains('open')) return;
const side = ncState.activeSide;
const threadId = side === 'left' ? ncState.leftThreadId : ncState.rightThreadId;
const thread = findNode(treeData, threadId);
const msgs = thread?.messages || [];
const selectedSet = side === 'left' ? ncState.leftSelectedIds : ncState.rightSelectedIds;
let focusIdx = side === 'left' ? ncState.leftFocusIdx : ncState.rightFocusIdx;
if (e.key === 'Tab') {
e.preventDefault();
setNcActivePane(side === 'left' ? 'right' : 'left');
} else if (e.key === 'ArrowDown') {
e.preventDefault();
focusIdx = Math.min(msgs.length - 1, focusIdx + 1);
if (side === 'left') ncState.leftFocusIdx = focusIdx; else ncState.rightFocusIdx = focusIdx;
renderNcPane(side);
} else if (e.key === 'ArrowUp') {
e.preventDefault();
focusIdx = Math.max(0, focusIdx - 1);
if (side === 'left') ncState.leftFocusIdx = focusIdx; else ncState.rightFocusIdx = focusIdx;
renderNcPane(side);
} else if (e.key === 'Insert' || e.key === ' ') {
e.preventDefault();
const m = msgs[focusIdx];
if (m) {
if (selectedSet.has(m.id)) selectedSet.delete(m.id);
else selectedSet.add(m.id);
focusIdx = Math.min(msgs.length - 1, focusIdx + 1);
if (side === 'left') ncState.leftFocusIdx = focusIdx; else ncState.rightFocusIdx = focusIdx;
renderNcPane(side);
}
} else if (e.key === 'F1') { e.preventDefault(); ncActionHelp(); }
else if (e.key === 'F2') { e.preventDefault(); ncActionToggleContext(); }
else if (e.key === 'F3') { e.preventDefault(); ncActionView(); }
else if (e.key === 'F4') { e.preventDefault(); ncActionEdit(); }
else if (e.key === 'F5') { e.preventDefault(); ncActionCopy(); }
else if (e.key === 'F6') { e.preventDefault(); ncActionMove(); }
else if (e.key === 'F7') { e.preventDefault(); ncCreateNewThreadInPane(side); }
else if (e.key === 'F8' || e.key === 'Delete') { e.preventDefault(); ncActionDelete(); }
else if (e.key === 'F9') { e.preventDefault(); ncActionSelectAll(); }
else if (e.key === 'F10' || e.key === 'Escape') { e.preventDefault(); closeNortonCommander(); }
});