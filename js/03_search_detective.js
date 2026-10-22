let _lastRuleGenInstruction = '';
let _cachedSearchStats = null;
let _searchDebounceTimer = null;
function collectAllThreadsWithPaths(node, pathNames = [], out = []) {
if (!node || node.id === '__intercom__' || node.hiddenIntercom) return out;
const currentPath = node.id === 'root' ? [] : [...pathNames, node.name];
if (node.type === 'thread') {
out.push({ thread: node, pathStr: currentPath.join(' › ') });
}
if (node.children) {
node.children.forEach(c => collectAllThreadsWithPaths(c, currentPath, out));
}
return out;
}
function onAgentSinglePromptInput() {
const cur = (document.getElementById('agentSearchInstruction')?.value || '').trim();
if (cur !== _lastRuleGenInstruction) {
const kwEl = document.getElementById('agentKeywordsInput');
const ctxEl = document.getElementById('agentContextWordsInput');
if (kwEl) kwEl.value = '';
if (ctxEl) ctxEl.value = '';
}
if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
_searchDebounceTimer = setTimeout(() => {
scanThreadsForAgentPreview();
}, 350);
}
function buildLocalFallbackSearchSpec(instruction) {
const stopWords = new Set(['jag', 'vill', 'hitta', 'alla', 'ställen', 'bland', 'mina', 'trådar', 'där', 'när', 'som', 'det', 'och', 'att', 'för', 'med', 'om', 'har', 'var', 'eller', 'från', 'till', 'kan', 'ska', 'inte', 'varit', 'pratade', 'skrev', 'något', 'några']);
const lower = instruction.toLowerCase();
const isUserFocused = /\b(jag|mina|mitt|mig)\b/.test(lower) && !/\b(du|ai|boten)\b/.test(lower);
const rawWords = lower.replace(/[^a-zåäö0-9\s-]/gi, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
const satireSignals = /\b(raljera|raljerar|driver|driva|skämtar|hånar|såga|sågar|ironi|satir)\b/i.test(instruction);
const primary = rawWords.filter(w => !/^(raljera|driver|driva|skämta|känsl|stolt|glad|arg|frustrer)/.test(w));
const context = satireSignals
? ['idiot', 'galen', 'absurd', 'cirkus', 'haveri', 'haha', 'herregud', 'allvarligt', 'skämt', 'katastrof', 'geni', 'clown']
: ['bra', 'dåligt', 'problem', 'glad', 'stolt', 'idé', 'lösa', 'viktigt', 'tänkte', 'tycker'];
return {
primaryTerms: primary.length ? primary : rawWords.slice(0, 5),
contextTerms: context,
maxDistanceWords: 35,
roleFocus: isUserFocused ? 'user' : 'both',
explanation: 'Lokalt genererad JS-instruktion utifrån din prompt.'
};
}
async function generateAiSearchRules() {
const instruction = (document.getElementById('agentSearchInstruction')?.value || '').trim();
if (!instruction) {
alert('Skriv först i rutan vad du vill leta efter!');
return false;
}
const selVal = document.getElementById('agentArchitectModelSelect')?.value || 'gemini:gemini-4.0-argon';
let [prov, mod] = selVal.split(':');
const explainEl = document.getElementById('agentRuleExplainText');
if (!hasLiveKey(prov)) {
const fallbackProv = ['gemini', 'openai', 'anthropic', 'grok'].find(p => hasLiveKey(p));
if (fallbackProv) {
prov = fallbackProv;
mod = PROVIDERS[prov].models[0].id;
} else {
const localSpec = buildLocalFallbackSearchSpec(instruction);
document.getElementById('agentKeywordsInput').value = localSpec.primaryTerms.join(', ');
document.getElementById('agentContextWordsInput').value = localSpec.contextTerms.join(', ');
document.getElementById('agentProximityInput').value = String(localSpec.maxDistanceWords);
document.getElementById('agentRoleFilterSelect').value = localSpec.roleFocus;
_lastRuleGenInstruction = instruction;
if (explainEl) {
explainEl.textContent = `ℹ️ Ingen API-nyckel inlagd än – skapade lokal JS-instruktion: Kärnord [${localSpec.primaryTerms.join(', ')}]`;
}
scanThreadsForAgentPreview();
return true;
}
}
if (explainEl) {
explainEl.textContent = `⏳ Steg 1: ${mod} analyserar din prompt och konstruerar sökinstruktionen åt JavaScriptet...`;
}
const sys = [
'Du är Steg 1 (Guld-arkitekten) i en 3-stegs Sökdetektiv för ett stort chattarkiv.',
'Användaren har skrivit EN vanlig prompt om vad hen letar efter.',
'Din uppgift är att tänka ut vilken instruktion JavaScriptet behöver för att blixtsnabbt hitta dessa ställen i tusentals chattmeddelanden:',
'- primaryTerms: 3 till 10 ordstammar/namn/ämnesord som MÅSTE finnas i närheten (t.ex. ["trump", "donald", "maga", "president", "usa"]). Gemener.',
'- contextTerms: 6 till 15 ordstammar, uttryck, slang, känsloord eller tonmarkörer som fångar HUR användaren pratar om ämnet.',
'- maxDistanceWords: Max antal ord mellan primaryTerms och contextTerms (vanligtvis 25 till 45).',
'- roleFocus: "user", "assistant" eller "both".',
'Svara ENBART med giltig JSON:',
'{"primaryTerms": ["ord1", "ord2"], "contextTerms": ["ton1", "uttryck2"], "maxDistanceWords": 35, "roleFocus": "user", "explanation": "Kort beskrivning på svenska"}'
].join('\n');
try {
const r = await callAI(prov, mod, [{ role: 'user', text: `Användarens sökprompt: "${instruction}"` }], sys, { maxTokens: 650, noTools: true, callerName: 'Sökdetektiv: Steg 1' });
chargeLedger(prov, mod, r.inTok ?? 150, r.outTok ?? 140);
const jsonMatch = r.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('Kunde inte tolka JSON från Guld-arkitekten.');
const parsed = JSON.parse(jsonMatch[0]);
if (Array.isArray(parsed.primaryTerms)) {
document.getElementById('agentKeywordsInput').value = parsed.primaryTerms.join(', ');
}
if (Array.isArray(parsed.contextTerms)) {
document.getElementById('agentContextWordsInput').value = parsed.contextTerms.join(', ');
}
if (parsed.maxDistanceWords) {
document.getElementById('agentProximityInput').value = String(parsed.maxDistanceWords);
}
if (parsed.roleFocus && ['both', 'user', 'assistant'].includes(parsed.roleFocus)) {
document.getElementById('agentRoleFilterSelect').value = parsed.roleFocus;
}
_lastRuleGenInstruction = instruction;
if (explainEl) {
explainEl.textContent = `👑 ${mod} -> JS-instruktion: ${parsed.explanation || 'Sökprofil klar!'}`;
}
scanThreadsForAgentPreview();
return true;
} catch (e) {
const localSpec = buildLocalFallbackSearchSpec(instruction);
document.getElementById('agentKeywordsInput').value = localSpec.primaryTerms.join(', ');
document.getElementById('agentContextWordsInput').value = localSpec.contextTerms.join(', ');
_lastRuleGenInstruction = instruction;
scanThreadsForAgentPreview();
return true;
}
}
async function buildSearchAgentMatchesAsync(progressCallback = null) {
const instruction = (document.getElementById('agentSearchInstruction')?.value || '').trim();
let kwRaw = (document.getElementById('agentKeywordsInput')?.value || '').trim();
let ctxRaw = (document.getElementById('agentContextWordsInput')?.value || '').trim();
const maxDist = parseInt(document.getElementById('agentProximityInput')?.value || '30', 10) || 30;
const roleFocus = document.getElementById('agentRoleFilterSelect')?.value || 'both';
let primaryTerms = kwRaw ? kwRaw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
let contextTerms = ctxRaw ? ctxRaw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
if (primaryTerms.length === 0 && contextTerms.length === 0 && instruction) {
const quickSpec = buildLocalFallbackSearchSpec(instruction);
primaryTerms = quickSpec.primaryTerms;
contextTerms = quickSpec.contextTerms;
}
const allThreads = collectAllThreadsWithPaths(treeData);
let totalArchiveTokens = 0;
let totalArchiveMessages = 0;
const candidateHits = [];
const totalThreadsCount = allThreads.length;
const chunkSize = 150; // Bearbeta 150 trådar i taget och släpp sedan webbläsartråden för 60fps rendering
for (let tIdx = 0; tIdx < totalThreadsCount; tIdx++) {
const { thread, pathStr } = allThreads[tIdx];
const msgs = thread.messages || [];
const titleLower = (thread.name || '').toLowerCase();
for (let idx = 0; idx < msgs.length; idx++) {
const m = msgs[idx];
const txt = (m.text || '').trim();
if (!txt) continue;
totalArchiveMessages++;
totalArchiveTokens += countTokens(txt);
if (primaryTerms.length === 0 && contextTerms.length === 0) continue;
const lower = txt.toLowerCase();
const words = lower.split(/\s+/);
let score = 0;
const reasons = [];
const posA = [];
const posB = [];
for (let wIdx = 0; wIdx < words.length; wIdx++) {
const w = words[wIdx];
if (primaryTerms.some(term => w.includes(term))) posA.push(wIdx);
if (contextTerms.some(term => w.includes(term))) posB.push(wIdx);
}
const titleHitA = primaryTerms.some(term => titleLower.includes(term));
if (titleHitA) score += 3;
if (posA.length > 0) {
score += posA.length * 4;
reasons.push(`${posA.length} ämnesord`);
}
if (posB.length > 0) {
score += posB.length * 2;
reasons.push(`${posB.length} tonord`);
}
if (roleFocus === 'user' && m.role === 'user') {
score += 5;
reasons.push('👤 Ditt inlägg');
} else if (roleFocus === 'assistant' && m.role === 'assistant') {
score += 5;
}
if (posA.length > 0 && posB.length > 0) {
let minFoundDist = 999999;
for (const a of posA) {
for (const b of posB) {
const d = Math.abs(a - b);
if (d < minFoundDist) minFoundDist = d;
}
}
if (minFoundDist <= maxDist) {
score += 14;
reasons.push(`🔥 Ton+Ämne nära (${minFoundDist} ord)`);
}
}
if (posA.length > 0 || (titleHitA && posB.length > 0)) {
const prevMsg = idx > 0 ? msgs[idx - 1] : null;
const nextMsg = idx + 1 < msgs.length ? msgs[idx + 1] : null;
let snippetBlock = '';
if (prevMsg && prevMsg.text) {
snippetBlock += `  (Föregående [${prevMsg.role === 'user' ? 'Jag' : 'AI'}]: ${prevMsg.text.slice(0, 180).replace(/\n+/g, ' ')}...)\n`;
}
snippetBlock += `▶ TRÄFF [${m.role === 'user' ? 'Jag' : 'AI'}] (Poäng: ${score} • ${reasons.join(', ')}):\n${txt}`;
if (nextMsg && nextMsg.text) {
snippetBlock += `\n  (Följande [${nextMsg.role === 'user' ? 'Jag' : 'AI'}]: ${nextMsg.text.slice(0, 180).replace(/\n+/g, ' ')}...)`;
}
candidateHits.push({
thread,
pathStr,
msg: m,
score,
snippetBlock
});
}
}
if (tIdx % chunkSize === 0 || tIdx === totalThreadsCount - 1) {
if (progressCallback) {
const pct = Math.round(((tIdx + 1) / totalThreadsCount) * 100);
progressCallback({
current: tIdx + 1,
total: totalThreadsCount,
percent: pct,
foundHits: candidateHits.length
});
}
await new Promise(r => setTimeout(r, 0));
}
}
candidateHits.sort((a, b) => b.score - a.score);
const topHits = candidateHits.slice(0, 35);
const groupedByThread = new Map();
topHits.forEach(h => {
const key = `${h.thread.name} (${h.pathStr})`;
if (!groupedByThread.has(key)) groupedByThread.set(key, []);
groupedByThread.get(key).push(h.snippetBlock);
});
const formattedBlocks = [];
groupedByThread.forEach((blocks, threadHeader) => {
formattedBlocks.push(`=== KÄLLTRÅD: "${threadHeader}" ===\n${blocks.join('\n---\n')}`);
});
const combinedCorpus = formattedBlocks.join('\n\n');
const filteredTokens = countTokens(combinedCorpus);
const savedPct = totalArchiveTokens > 0 ? Math.max(0, Math.round((1 - (filteredTokens / totalArchiveTokens)) * 100)) : 0;
return {
threadCount: groupedByThread.size,
totalThreads: totalThreadsCount,
messageCount: topHits.length,
totalArchiveMessages,
totalArchiveTokens,
savedPct,
corpus: combinedCorpus,
tokens: filteredTokens
};
}
function buildSearchAgentMatchesFast() {
const allThreads = collectAllThreadsWithPaths(treeData);
let totalArchiveTokens = 0;
let totalArchiveMessages = 0;
allThreads.forEach(({ thread }) => {
(thread.messages || []).forEach(m => {
totalArchiveMessages++;
totalArchiveTokens += (m._cachedTokens || countTokens(m.text || ''));
});
});
return {
totalThreads: allThreads.length,
totalArchiveMessages,
totalArchiveTokens,
tokens: 3500, // Schablon för estimat innan körning
savedPct: 95
};
}
function scanThreadsForAgentPreview() {
const box = document.getElementById('agentCostWarningBox');
if (!box) return;
const stats = buildSearchAgentMatchesFast();
const archVal = document.getElementById('agentArchitectModelSelect')?.value || 'gemini:gemini-4.0-argon';
const [archProv, archMod] = archVal.split(':');
const selVal = document.getElementById('agentModelSelect')?.value || 'gemini:gemini-3.5-flash-lite';
const [prov, mod] = selVal.split(':');
const step1Usd = calculateCallCostUsd(archProv, archMod, 220, 160);
const step3Usd = calculateCallCostUsd(prov, mod, stats.tokens + 250, 900);
const totalEstUsd = step1Usd + step3Usd;
box.innerHTML = `
<div>
🐕 <strong>Arkivstatus:</strong> ${stats.totalArchiveMessages.toLocaleString('sv-SE')} meddelanden i ${stats.totalThreads.toLocaleString('sv-SE')} trådar (~${stats.totalArchiveTokens.toLocaleString('sv-SE')} tokens totalt).<br>
⚡ <strong>3-stegskalkyl:</strong> 👑 ${escapeHtml(archMod)} (Steg 1) + 🐕 JS Blodhund (Steg 2, gratis) + 🛡️ ${escapeHtml(mod)} (Steg 3) = <strong style="color:#fde68a;">Totalt ~${formatCurrency(totalEstUsd, 3)}</strong>.
</div>
`;
}
function openSearchAgentModal() {
scanThreadsForAgentPreview();
openModal('searchAgentModal');
setTimeout(() => document.getElementById('agentSearchInstruction')?.focus(), 80);
}
async function runSearchAndCollectAgent() {
const instruction = document.getElementById('agentSearchInstruction').value.trim();
if (!instruction) {
alert('Skriv först i rutan vad du vill att Sökdetektiven ska hitta!');
document.getElementById('agentSearchInstruction')?.focus();
return;
}
const outBox = document.getElementById('agentResultTextarea');
const btn = document.getElementById('runSearchAgentBtn');
const progressContainer = document.getElementById('agentSearchProgressContainer');
const progressBar = document.getElementById('agentSearchProgressBar');
const progressText = document.getElementById('agentSearchProgressText');
btn.disabled = true;
if (progressContainer) progressContainer.style.display = 'block';
temporarilyRaiseCircuitBreaker(15, 'heavy');
try {
const kwVal = (document.getElementById('agentKeywordsInput')?.value || '').trim();
if (!kwVal || _lastRuleGenInstruction !== instruction) {
btn.textContent = '⏳ Steg 1/3: 4.0 Argon tänker...';
outBox.value = '🧠 Steg 1/3: 4.0 Argon analyserar din prompt och skriver sökinstruktionen åt JavaScriptet...';
if (progressText) progressText.textContent = '🧠 Steg 1/3: Guld-arkitekten konstruerar sökregler...';
if (progressBar) progressBar.style.width = '15%';
await generateAiSearchRules();
}
btn.textContent = '⏳ Steg 2/3: Söker i trådar...';
outBox.value = '🐕 Steg 2/3: JavaScript-blodhunden finkammar ditt chattarkiv tråd för tråd...';
const stats = await buildSearchAgentMatchesAsync((prog) => {
if (progressBar) progressBar.style.width = `${Math.min(90, 15 + Math.round(prog.percent * 0.65))}%`;
if (progressText) {
progressText.innerHTML = `🐕 Steg 2/3: Söker i tråd <strong>${prog.current.toLocaleString('sv-SE')}</strong> / ${prog.total.toLocaleString('sv-SE')} (${prog.percent}%) • <span style="color:#6ee7b7;">${prog.foundHits} heta träffar funna hittills</span>`;
}
});
if (stats.messageCount === 0) {
if (progressBar) progressBar.style.width = '100%';
outBox.value = '⚠️ JavaScriptet hittade inga meddelanden som matchade ämnet bland dina trådar. (Klicka på "🔧 Se under huven" för att bredda sökorden).';
return;
}
const selVal = document.getElementById('agentModelSelect').value;
const [prov, chosenMod] = selVal.split(':');
if (!document.getElementById('agentNewThreadTitle').value.trim()) {
document.getElementById('agentNewThreadTitle').value = `Sökdetektiv: ${instruction.slice(0, 38)}`;
}
if (!hasLiveKey(prov)) {
if (progressBar) progressBar.style.width = '100%';
if (progressText) progressText.textContent = '✅ Klart! (Visar lokala träffar då API-nyckel saknas)';
outBox.value =
`📌 LOKAL BLODHUNDS-RAPPORT (ingen API-nyckel för ${PROVIDERS[prov].name} – visar de ${stats.messageCount} högst rankade träffarna direkt):\n` +
`DIN PROMPT: ${instruction}\n\n` +
stats.corpus;
return;
}
const check = await confirmCostIfHigh(prov, chosenMod, stats.tokens + 250, 900, '3-stegs Sökdetektiven');
if (!check.ok) return;
const mod = check.mod;
btn.textContent = `⏳ Steg 3/3: ${mod} sållar...`;
if (progressBar) progressBar.style.width = '90%';
if (progressText) progressText.innerHTML = `🛡️ Steg 3/3: <strong>${escapeHtml(mod)}</strong> granskar ${stats.messageCount} kandidater och skriver rapporten...`;
outBox.value = `🛡️ Steg 3/3: ${mod} läser de ${stats.messageCount} utvalda träffarna (~${stats.tokens} tokens), kastar falsklarm och sammanställer din rapport...`;
const sys = [
'Du är Steg 3 i en 3-stegs Sökdetektiv (Verifierare & Sammanställare).',
'Steg 1 (Gemini 4.0 Argon) har översatt användarens prompt till sökregler, och Steg 2 (ett lokalt JavaScript) har plockat ut de mest misstänkta textutdragen ur användarens arkiv.',
'Din uppgift är att:',
'1. Läsa igenom utdragen och SÅLLA BORT alla falsklarm (där orden råkade nämnas men inte alls motsvarar det användaren bad om).',
'2. Sammanställa alla äkta träffar snyggt och överskådligt med direkta citat och exakt vilken KÄLLTRÅD de kommer ifrån.',
'3. På slutet nämna kort hur många falsklarm du sållade bort.',
'Hitta aldrig på citat eller fakta som inte finns i utdragen.'
].join('\n');
const userPrompt = `ANVÄNDARENS SÖKPROMPT: ${instruction}\n\nMISSTÄNKTA TEXTUTDRAG FRÅN JAVASCRIPTET ATT SÅLLA OCH SAMMANSTÄLLA:\n\n${stats.corpus}`;
const r = await callAI(prov, mod, [{ role: 'user', text: userPrompt }], sys, { maxTokens: 3000, noTools: true, callerName: 'Sökdetektiv: Steg 3' });
chargeLedger(prov, mod, r.inTok ?? (stats.tokens + 250), r.outTok ?? countTokens(r.text));
if (progressBar) progressBar.style.width = '100%';
if (progressText) progressText.innerHTML = `✅ <strong>Sökning klar!</strong> Rapport sammanställd av ${escapeHtml(mod)}.`;
outBox.value =
`🕵️ VERIFIERAD RAPPORT FRÅN SÖKDETEKTIVEN (Steg 1: 4.0 Argon ➔ Steg 2: JS Blodhund ➔ Steg 3: ${mod})\n` +
`Prompt: "${instruction}"\n` +
`Genomsökt: ${stats.messageCount} heta kandidater i ${stats.threadCount} trådar (~${stats.tokens} tkn, sparade ${stats.savedPct}% tokens)\n\n` +
r.text;
} catch (e) {
outBox.value = `⚠️ Fel vid körning av Sökdetektiven: ${e.message}`;
} finally {
btn.disabled = false;
btn.textContent = '🕵️ Kör Sökdetektiven nu! ➤';
}
}
function saveAgentResultAsNewThread() {
const resText = document.getElementById('agentResultTextarea').value.trim();
const title = document.getElementById('agentNewThreadTitle').value.trim() || 'Sök & Samla-rapport';
if (!resText) {
alert('Kör Sökdetektiven först så att det finns ett resultat att spara.');
return;
}
const newThread = {
id: 't_agent_' + Date.now(),
name: title,
type: 'thread',
lastModified: Date.now(),
messages: [
{
id: 'm_agent_' + Date.now(),
role: 'assistant',
provider: currentProvider,
model: currentModel,
text: resText,
inContext: true,
time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
]
};
treeData.children.push(newThread);
activeThreadId = newThread.id;
saveTree(newThread.id);
renderAll();
closeModal('searchAgentModal');
}