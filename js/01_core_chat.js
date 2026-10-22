let currencySettings = JSON.parse(localStorage.getItem('ai_cockpit_currency_v16')) || {
selected: 'SEK',
rates: { SEK: 9.92, EUR: 0.92, USD: 1.0, NOK: 10.60 },
symbols: { SEK: 'kr', EUR: '€', USD: '$', NOK: 'kr' },
lastUpdated: 'Okt 2026 (9,92 kr/USD)'
};
const PROVIDERS = {
gemini: {
name: 'Google Gemini',
color: '#3b82f6',
models: [
{ id: 'gemini-4.0-argon', apiId: 'gemini-4.0-argon', candidates: ['gemini-4.0-argon', 'gemini-4.0-argon-preview', 'gemini-3.1-pro-preview', 'gemini-3.0-pro', 'gemini-2.5-pro'], name: 'Gemini 4.0 Argon (👑 Guld)', tier: 'flagship', inPrice: 2.00, outPrice: 10.00, cachedPrice: 0.10, note: 'Intro till 30 nov (sedan $4/$20)' },
{ id: 'gemini-3.8-flash', apiId: 'gemini-3.8-flash', candidates: ['gemini-3.8-flash', 'gemini-3.8-flash-preview', 'gemini-3.1-flash', 'gemini-3.0-flash', 'gemini-2.5-flash'], name: 'Gemini 3.8 Flash (⚡ Silver)', tier: 'balanced', inPrice: 0.75, outPrice: 3.75, cachedPrice: 0.075, note: 'Intro till 31 dec (sedan $1,50/$7,50)' },
{ id: 'gemini-3.5-flash-lite', apiId: 'gemini-3.5-flash-lite', candidates: ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite-preview', 'gemini-3.1-flash-lite', 'gemini-3.0-flash-lite', 'gemini-2.5-flash-lite'], name: 'Gemini 3.5 Flash-Lite (🛡️ Volym)', tier: 'local', inPrice: 0.30, outPrice: 2.50, cachedPrice: 0.03, note: 'Snabb volymmodell' }
]
},
openai: {
name: 'ChatGPT / OpenAI',
color: '#10b981',
models: [
{ id: 'gpt-6-astra', name: 'GPT-6 Astra (👑 Ultra-Flaggskepp)', tier: 'flagship', inPrice: 10.00, outPrice: 50.00, cachedPrice: 1.00, note: 'Responses API • Tung analys' },
{ id: 'gpt-5.5', name: 'GPT-5.5 (👑 Tung Avancerad)', tier: 'flagship', inPrice: 5.00, outPrice: 30.00, cachedPrice: 0.50, note: 'Responses API' },
{ id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol (👑 Standard Flaggskepp)', tier: 'flagship', inPrice: 2.00, outPrice: 10.00, cachedPrice: 0.10, note: 'Bäst pris/prestanda i toppklass' },
{ id: 'gpt-4.1-mini', name: 'GPT-4.1 mini (⚡ Silver)', tier: 'balanced', inPrice: 0.40, outPrice: 1.60, cachedPrice: 0.10, note: 'Snabb vardagsmodell' },
{ id: 'gpt-6-luna', name: 'GPT-6 Luna (🛡️ Volym • Superbillig)', tier: 'local', inPrice: 0.10, outPrice: 0.50, cachedPrice: 0.01, note: 'Lättviktsmodell (0,99 kr / 4,96 kr)' }
]
},
anthropic: {
name: 'Claude / Anthropic',
color: '#f59e0b',
models: [
{ id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (👑 Tungviktare)', tier: 'flagship', inPrice: 4.00, outPrice: 20.00, cachedPrice: 0.20, note: 'Flat rate över hela 1M context' },
{ id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (👑 Guld)', tier: 'flagship', inPrice: 2.00, outPrice: 10.00, cachedPrice: 0.10, note: 'Flat rate över hela 1M context' },
{ id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5 (⚡ Silver ≤100k)', tier: 'balanced', inPrice: 0.10, outPrice: 0.50, cachedPrice: 0.01, longCtxThreshold: 100000, longCtxMultiplier: 5, note: '5× dyrare när kontext >100k tokens!' }
]
},
grok: {
name: 'Grok / xAI',
color: '#ec4899',
models: [
{ id: 'grok-4.7', name: 'Grok 4.7 (👑 Guld • Billigast utdata i toppklass!)', tier: 'flagship', inPrice: 2.00, outPrice: 6.00, cachedPrice: 0.50, longCtxThreshold: 200000, longCtxMultiplier: 2, note: 'Short-context <200k (2× pris ≥200k)' },
{ id: 'grok-4.3', name: 'Grok 4.3 (⚡ Silver • Balanserad)', tier: 'balanced', inPrice: 1.25, outPrice: 2.50, cachedPrice: 0.20, longCtxThreshold: 200000, longCtxMultiplier: 2, note: 'Short-context <200k (2× pris ≥200k)' },
{ id: 'grok-build-0.1', name: 'Grok Build 0.1 (⚡ Kod & Snabbhet)', tier: 'balanced', inPrice: 1.00, outPrice: 2.00, cachedPrice: 0.20, longCtxThreshold: 200000, longCtxMultiplier: 2, note: '2× pris ≥200k kontext' }
]
},
mistral: {
name: 'Mistral AI',
color: '#8b5cf6',
models: [
{ id: 'mistral-medium-3.5', name: 'Mistral Medium 3.5 (👑 Flaggskepp)', tier: 'flagship', inPrice: 1.50, outPrice: 7.50, cachedPrice: 0.15, note: '14,88 kr in / 74,40 kr ut' },
{ id: 'mistral-large-2411', name: 'Mistral Large 4 (⚡ Preview Sale)', tier: 'balanced', inPrice: 0.68, outPrice: 2.09, cachedPrice: 0.07, note: 'Preview-pris (6,75 kr / 20,73 kr)' },
{ id: 'mistral-large-latest', name: 'Mistral Large 3 (⚡ Silver)', tier: 'balanced', inPrice: 0.50, outPrice: 1.50, cachedPrice: 0.05, note: '4,96 kr in / 14,88 kr ut' },
{ id: 'codestral-latest', name: 'Codestral (⚡ Kodspecialist)', tier: 'balanced', inPrice: 0.30, outPrice: 0.90, cachedPrice: 0.03, note: '2,98 kr in / 8,93 kr ut' },
{ id: 'mistral-small-latest', name: 'Mistral Small 4 (🛡️ Volym)', tier: 'local', inPrice: 0.15, outPrice: 0.60, cachedPrice: 0.015, note: '1,49 kr in / 5,95 kr ut' }
]
},
ollama: {
name: 'Lokal Ollama',
color: '#94a3b8',
models: [
{ id: 'llama3.2', name: 'Llama 3.2 (🛡️ Brons • Gratis)', tier: 'local', inPrice: 0.0, outPrice: 0.0, cachedPrice: 0.0, note: 'Körs lokalt på egen hårdvara' },
{ id: 'deepseek-r1', name: 'DeepSeek R1 (🛡️ Brons • Gratis)', tier: 'local', inPrice: 0.0, outPrice: 0.0, cachedPrice: 0.0, note: 'Körs lokalt på egen hårdvara' }
]
}
};
const PM_RECIPES = {
summarize: {
title: "Sammanfatta så att en stressad kollega förstår det på 20 sekunder",
hint: "Ger en rak 20-sekunders sammanfattning utan jargong.",
format: "Format: Max 4 korta punkter med det absolut viktigaste.",
rules: [
"- Basera svaret enbart på texten nedan. Hitta inte på datum, beslut eller siffror.",
"- Börja direkt med svaret. Ingen inledning om att du är en AI."
]
},
reply: {
title: "Skriv ett svarsutkast som jag kan skicka vidare",
hint: "Tar fram ett färdigt, professionellt svarsutkast.",
format: "Format: Färdigt mejlutkast redo att skickas.",
rules: [
"- Håll tonen rak, vänlig och saklig utan onödiga ursäkter.",
"- Om någon uppgift måste fyllas i av mig, markera den med [fyll i]."
]
},
actions: {
title: "Plocka ut beslut, frågor och konkreta nästa steg",
hint: "Sorterar ut vad som är bestämt och vad som måste göras härnäst.",
format: "Format: Punktlista uppdelad i 1) Beslut, 2) Öppna frågor, 3) Nästa steg.",
rules: [
"- Basera svaret enbart på texten. Markera tydligt om ansvarig person eller deadline saknas."
]
},
plain: {
title: "Översätt till begriplig svenska utan jargong",
hint: "Skalar bort byråkrati och modeord.",
format: "Format: Kort, rak och glasklar text på vanlig svenska.",
rules: ["- Behåll alla sakuppgifter men stryk allt fluff."]
},
gaps: {
title: "Hitta det som är oklart, motsägelsefullt eller saknas",
hint: "Letar efter logiska luckor eller saknade uppgifter utan att uppfinna problem.",
format: "Format: Kort lista med citat/lucka, typ av oklarhet och säkerhet (hög/medel/låg).",
rules: [
"- Om texten redan är rak och tydlig: säg det kort utan att tvinga fram påhittade fel."
]
},
fluff: {
title: "Otydlighetsgranskning (fluffdetektor): medvetna dimridåer och undanflykter",
hint: "Avslöjar vaga löften, passiv form och ansvar som skjuts på framtiden.",
format: "Format: Kort lista. Varje punkt = citat, typ av undanflykt, vad som troligen döljs och säkerhet (hög/medel/låg).",
rules: [
"- Skilj på vad som står i texten och din tolkning.",
"- Om texten är rak och saklig: konstatera det direkt utan att uppfinna dimridåer."
]
},
power: {
title: "Granskning av härskartekniker och manipulation: synliggör dolda maktgrepp",
hint: "Identifierar subtila förminskningar, skuldpåförande och maktgrepp samt ger motdrag.",
format: "Format: Kort lista med citat, teknik och säkerhet. Avsluta med rekommenderad strategi (ignorera, bemöt sakligt eller eskalera).",
rules: [
"- Skilj tydligt på ren stress/klumpighet och beräknande manipulation.",
"- Ställ inga diagnoser. Bedöm bara formuleringarna i texten."
]
},
nej: {
title: "Artigt nej: skriv ett kristallklart nej utan ursäkter",
hint: "Skriver ett vänligt men stenhårt nej utan ursäktande bisatser.",
format: "Format: Max 4 meningar, färdigt att skicka.",
rules: ["- Ingen ursäkt, inga undanflykter, noll hittepå."]
},
brainstorm: {
title: "Ofiltrerad brainstorm: fem idéer från jordnära till haveri",
hint: "Två jordnära idéer, ett djärvt wildcard och två fullständiga galenskaper (haveriläge).",
format: "Format: Idé 1 till 5 med slagkraftig rubrik och två meningars motivering.",
rules: [
"- Idé 1-2: Direkt genomförbara. Idé 3: Djärvt wildcard. Idé 4-5: Märk tydligt som [HAVERI] – totalt skruvad science fiction eller överdimensionerad teknik."
]
},
flirt: {
title: "Flirtdetektor: antydningar, retsam värme och smicker utöver sammanhanget",
hint: "Lekhörnan: Letar efter extra värme, personliga komplimanger och retsamt tilltal.",
format: "Format: Kort lista med citat, typ av signal, trolig betydelse och säkerhet (hög/medel/låg).",
rules: ["- Skilj på vanlig artighet och signaler som sticker ut. Uppfinn inga träffar om texten är helt neutral."]
},
fluffscore: {
title: "Fluffmätaren: ge texten fluffpoäng 0-10",
hint: "Lekhörnan: Poängsätter fluffigheten från 0 (rak) till 10 (ren dimma) och skriver om värsta meningen.",
format: "Format: Fluffpoäng X/10 på första raden, korta citat, och sist en konkret omskrivning.",
rules: ["- Om texten är rak, ge 0/10 direkt."]
},
bingo: {
title: "Konsultsvenska-bingo: hitta jargongen och översätt den",
hint: "Lekhörnan: Ger bingopoäng för varje modeord och översätter till vanlig svenska.",
format: "Format: Bingopoäng först, lista med citat + översättning, sist texten utan jargong.",
rules: ["- Hitta bara ord som faktiskt står i texten."]
},
bureau: {
title: "Byråkratpastisch: skriv om texten så byråkratiskt som möjligt",
hint: "Lekhörnan: Parodi på extrem kanslisvenska med passiva former.",
format: "Format: Pastischen först, följt av en rad om vad som gjorde den så byråkratisk.",
rules: ["- Lägg inte till påhittade lagrum eller beslut."]
},
swenglish: {
title: "Trendkänslig IT-konsult: 100 % Swenglish och buzzwords",
hint: "Lekhörnan: Hyperventilerande Stureplans-konsult med agila sprintar och oat-latte.",
format: "Format: Konsultmonolog som avslutas exakt med: Låt oss ta en quick sync om detta over en oat-latte!",
rules: ["- Krydda med disrupta, aligna, low-hanging fruit, bandwidth och AI-first mindset."]
},
betner: {
title: "Magnus Betnér-haveriet: cynisk existentiell kris, utan filter",
hint: "Lekhörnan: Förvandlar en vardaglig detalj i texten till en rå diss av ekorrhjulet och vuxenlivet.",
format: "Format: Max 180 ord. Börja direkt utan inledning.",
rules: ["- Skämta rått om situationen, meningslösa möten och vuxenlivet, inte om namngivna personers privatliv."]
}
};
const currentMonthKey = new Date().toISOString().slice(0, 7);
let costLedger = JSON.parse(localStorage.getItem('ai_cockpit_ledger_v3')) || {
month: currentMonthKey,
providersUsd: { grok: 7.04, openai: 2.35, gemini: 1.41, anthropic: 0.95, mistral: 0.0, ollama: 0.0 }
};
const DEFAULT_TREE = {
id: 'root',
name: 'Alla Konversationer',
type: 'folder',
isOpen: true,
children: [
{
id: 'folder_ai',
name: 'AI & PromptMotor',
type: 'folder',
isOpen: true,
children: [
{
id: 'thread_prompting',
name: 'Prompting, Ekonomi & Brusfilter',
type: 'thread',
messages: [
{
id: 'm1',
role: 'user',
text: 'Hur fungerar den inbyggda PromptMotorn här i AI-Cockpit v3?',
inContext: true,
time: '16:30'
},
{
id: 'm2',
role: 'assistant',
provider: 'gemini',
model: 'gemini-3.8-flash',
inContext: true,
costUsd: 0.0002,
text: 'Du har nu två extremt smidiga sätt att använda **PromptMotorn** direkt i chatten:\n\n1. **Snabbknapparna precis ovanför textrutan:** Klistra bara in ett mejl eller en text direkt i chattrutan och tryck på t.ex. `⚡ 20s Sammanfattning`, `🕵️ Fluffdetektor`, `🛡️ Härskarteknik-radar` eller `🔥 Betnér-haveriet`. Då byggs hela den skottsäkra prompten automatiskt runt din text!\n2. **Knappen `⚡ PromptMotor-stöd`:** Öppnar hela verktyget i ett fönster med både *Snabbfliken (3 fält)* och *Full Prompt Builder* (med roll, ton, kvalitetskrav och prompt-granskning).',
time: '16:31'
},
{
id: 'm3',
role: 'user',
text: 'Dra ett kort skämt om en databas!',
inContext: false,
time: '16:32'
},
{
id: 'm4',
role: 'assistant',
provider: 'gemini',
model: 'gemini-3.8-flash',
inContext: false,
costUsd: 0.0001,
text: 'En SQL-fråga går in på en bar, går fram till två bord och frågar: "Får jag JOIN:a er?" 😄\n\n*(Brusfiltrerad: urklickad ur kontexten så AI:n inte spårar ur eller slösar tokens vid nästa seriösa fråga!)*',
time: '16:32'
}
]
}
]
}
]
};
let treeData = JSON.parse(localStorage.getItem('ai_cockpit_tree_v3')) || DEFAULT_TREE;
let activeThreadId = 'thread_prompting';
let currentProvider = 'gemini';
let currentModel = 'gemini-4.0-argon';
let currentPmTab = 'lite';
let features = { grounding: false, openaiWebSearch: false, codeInterpreter: false, creativeMode: 'none', temperature: 0.7 };
let apiKeys = JSON.parse(localStorage.getItem('ai_cockpit_keys_v3')) || {
gemini: '', openai: '', anthropic: '', grok: '', mistral: '', ollama: 'http://localhost:11434'
};
const EST_OUT_TOKENS = 600;
let warnSettings = JSON.parse(localStorage.getItem('ai_cockpit_warn_v4')) || { thresholdUsd: 0.05 };
let _costResolve = null;
let isSending = false;
function quickPreset(recipeKey) {
const input = document.getElementById('promptInput');
const rawText = input.value.trim();
if (!rawText) {
document.getElementById('pm_lite_action').value = recipeKey;
updatePmLiteHint();
openPromptMotorModal('lite');
return;
}
const r = PM_RECIPES[recipeKey] || PM_RECIPES.summarize;
const builtPrompt = [
`Uppdrag: ${r.title}.`,
r.format,
"",
"Regler:",
...r.rules,
"- Avsluta med rubriken 'FÖRSLAG PÅ NÄSTA STEG:' följt av tre konkreta följdfrågor eller åtgärder.",
"",
"TEXT:",
rawText
].join("\n");
input.value = builtPrompt;
onPromptInput();
input.focus();
}
function openPromptMotorModal(tab = 'lite') {
switchPmTab(tab);
const draft = document.getElementById('promptInput').value.trim();
if (draft && !draft.startsWith('Uppdrag:') && !draft.startsWith('UPPDRAG:')) {
if (tab === 'lite' && !document.getElementById('pm_lite_text').value) {
document.getElementById('pm_lite_text').value = draft;
} else if (tab === 'full' && !document.getElementById('pm_full_task').value) {
document.getElementById('pm_full_task').value = draft;
}
}
updatePmLiteHint();
openModal('promptMotorModal');
}
function switchPmTab(tab) {
currentPmTab = tab;
document.getElementById('pmTabLiteBtn').classList.toggle('active', tab === 'lite');
document.getElementById('pmTabFullBtn').classList.toggle('active', tab === 'full');
document.getElementById('pmPaneLite').style.display = (tab === 'lite') ? 'flex' : 'none';
document.getElementById('pmPaneFull').style.display = (tab === 'full') ? 'flex' : 'none';
document.getElementById('pmReviewBtn').style.display = (tab === 'full') ? 'inline-flex' : 'none';
}
function updatePmLiteHint() {
const key = document.getElementById('pm_lite_action').value;
const r = PM_RECIPES[key];
document.getElementById('pm_lite_hint').textContent = r ? r.hint : 'Välj vad modellen ska göra med texten.';
}
function buildPromptFromMotor() {
if (currentPmTab === 'lite') {
const key = document.getElementById('pm_lite_action').value;
const r = PM_RECIPES[key] || PM_RECIPES.summarize;
const text = document.getElementById('pm_lite_text').value.trim();
const aud = document.getElementById('pm_lite_audience').value.trim();
const follow = document.getElementById('pm_lite_followup').checked;
if (!text) {
alert('Klistra in texten eller mejlet först!');
return null;
}
const rules = [...r.rules];
if (follow) {
rules.push("- Avsluta alltid svaret med rubriken 'FÖRSLAG PÅ NÄSTA STEG:' följt av exakt tre situationsanpassade följdfrågor eller nästa steg.");
}
return [
`Uppdrag: ${r.title}.`,
aud ? `Mottagare och begränsning: ${aud}.` : "",
r.format,
"",
"Regler:",
...rules,
"",
"TEXT:",
text
].filter(Boolean).join("\n");
} else {
const task = document.getElementById('pm_full_task').value.trim();
if (!task) {
alert('Fyll i Huvuduppdrag (fält 1) först!');
return null;
}
const ctx = document.getElementById('pm_full_context').value.trim();
const data = document.getElementById('pm_full_data').value.trim();
const role = document.getElementById('pm_full_role').value;
const tone = document.getElementById('pm_full_tone').value;
const format = document.getElementById('pm_full_format').value;
const parts = [`UPPDRAG:\n${task}`];
if (ctx) parts.push(`KONTEXT:\n${ctx}`);
if (data) parts.push(`MATERIAL:\n${data}`);
parts.push(`ROLL: ${role}\nTON: ${tone}`);
const rules = [];
if (document.getElementById('pm_chk_facts').checked) rules.push("Separera tydligt fakta från egna antaganden och slutsatser.");
if (document.getElementById('pm_chk_questions').checked) rules.push("Om kritisk information saknas: fråga först innan du gissar.");
if (document.getElementById('pm_chk_steps').checked) rules.push("Tänk steg för steg och analysera förutsättningarna innan du ger slutsatsen.");
if (document.getElementById('pm_chk_sources').checked) rules.push("Basera svaret enbart på tillhandahållet material. Hitta inte på.");
if (rules.length) parts.push("ARBETSSÄTT:\n- " + rules.join("\n- "));
parts.push(`FORMAT:\n${format}`);
return parts.join("\n\n");
}
}
function reviewFullPrompt() {
const task = document.getElementById('pm_full_task').value.trim();
const ctx = document.getElementById('pm_full_context').value.trim();
const data = document.getElementById('pm_full_data').value.trim();
const notes = [];
const vague = /\b(något|någonting|bra|bättre|kolla|fixa|grej|lite|osv|etc)\b/i;
if (!task) notes.push("• Huvuduppdraget saknas.");
else if (task.length < 25) notes.push("• Uppdraget är ganska kort – specificera gärna vad som ska jämföras eller produceras.");
if (task && vague.test(task)) notes.push("• Uppdraget innehåller vaga ord (t.ex. kolla, bra, lite). Byt mot ett konkret verb.");
if (!ctx) notes.push("• Kontext saknas. En mening om varför uppdraget görs ger träffsäkrare svar.");
if (document.getElementById('pm_chk_sources').checked && !data) notes.push("• Du kräver 'noll hittepå' baserat på material, men fält 3 (Material) är tomt.");
if (!notes.length) notes.push("✅ Prompten ser skarp och välstrukturerad ut! Inga uppenbara luckor.");
const box = document.getElementById('pmReviewBox');
box.style.display = 'block';
box.innerHTML = `<strong>Granskning av din prompt:</strong><br>${notes.join('<br>')}`;
}
function insertPromptFromMotor(sendImmediately = false) {
const built = buildPromptFromMotor();
if (!built) return;
const input = document.getElementById('promptInput');
input.value = built;
closeModal('promptMotorModal');
onPromptInput();
if (sendImmediately) {
sendMessage();
} else {
input.focus();
}
}
function countWords(str = '') {
const s = str.trim();
if (!s) return 0;
return s.split(/\s+/).length;
}
function countTokens(str = '') {
const s = str.trim();
if (!s) return 0;
return Math.ceil(s.length / 3.8);
}
function formatCurrency(usdAmount, decimals = 2) {
const cur = currencySettings.selected || 'SEK';
const rate = currencySettings.rates[cur] || 9.92;
const sym = currencySettings.symbols[cur] || 'kr';
const val = (usdAmount || 0) * rate;
const formatted = val.toLocaleString('sv-SE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
return (cur === 'USD' || cur === 'EUR') ? `${sym}${formatted}` : `${formatted} ${sym}`;
}
function getModelObj(provKey, modId) {
const p = PROVIDERS[provKey];
if (!p) return { inPrice: 1.0, outPrice: 3.0, tier: 'balanced' };
return p.models.find(m => m.id === modId) || p.models[0];
}
function calculateCallCostUsd(provKey, modId, inTokens, outTokens) {
const m = getModelObj(provKey, modId);
let mult = 1;
if (m.longCtxThreshold && inTokens > m.longCtxThreshold) {
mult = m.longCtxMultiplier || 1;
}
return (((inTokens / 1_000_000) * m.inPrice) + ((outTokens / 1_000_000) * m.outPrice)) * mult;
}
function saveLedger() {
localStorage.setItem('ai_cockpit_ledger_v3', JSON.stringify(costLedger));
updateTopCostWidget();
}
function updateTopCostWidget() {
const totalUsd = Object.values(costLedger.providersUsd).reduce((a, b) => a + b, 0);
document.getElementById('topCostBtn').innerHTML = `💰 Månad: ${formatCurrency(totalUsd, 2)}`;
}
async function fetchLatestLivePrices() {
const statusEl = document.getElementById('syncStatusMsg');
statusEl.style.display = 'block';
statusEl.textContent = '🔄 Hämtar aktuella valutakurser och live-prislista...';
try {
const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
if (rateRes.ok) {
const rateData = await rateRes.json();
if (rateData && rateData.rates) {
currencySettings.rates.SEK = rateData.rates.SEK || currencySettings.rates.SEK;
currencySettings.rates.EUR = rateData.rates.EUR || currencySettings.rates.EUR;
currencySettings.rates.NOK = rateData.rates.NOK || currencySettings.rates.NOK;
currencySettings.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
localStorage.setItem('ai_cockpit_currency_v16', JSON.stringify(currencySettings));
}
}
statusEl.textContent = `✅ Kurser uppdaterade (1 USD = ${currencySettings.rates.SEK.toFixed(2)} SEK) kl ${currencySettings.lastUpdated}!`;
renderCostModalContent();
updateTopCostWidget();
onPromptInput();
} catch (err) {
statusEl.textContent = 'ℹ️ Kunde inte nå prisservern just nu – använder sparade kurser.';
}
}
function onCurrencyChange() {
currencySettings.selected = document.getElementById('countryCurrencySelect').value;
localStorage.setItem('ai_cockpit_currency_v16', JSON.stringify(currencySettings));
renderCostModalContent();
updateTopCostWidget();
renderChat();
onPromptInput();
}
function openCostModal() {
document.getElementById('countryCurrencySelect').value = currencySettings.selected;
renderCostModalContent();
openModal('costModal');
}
function renderCostModalContent() {
document.getElementById('costMonthLabel').textContent = costLedger.month;
const totalUsd = Object.values(costLedger.providersUsd).reduce((a, b) => a + b, 0);
document.getElementById('modalTotalCost').textContent = formatCurrency(totalUsd, 2);
const scaleEl = document.getElementById('priceComparisonScaleSelect');
const tokenScale = scaleEl ? Number(scaleEl.value || 1000000) : 1000000;
const scaleFactor = tokenScale / 1000000;
const scaleLabel = tokenScale === 1000000 ? '1M tkn' : (tokenScale === 100000 ? '100k tkn' : '10k tkn');
const decs = tokenScale === 10000 ? 3 : 2;
const listEl = document.getElementById('providerCostList');
listEl.innerHTML = '';
Object.keys(PROVIDERS).forEach(pk => {
const p = PROVIDERS[pk];
const usd = costLedger.providersUsd[pk] || 0;
const pct = totalUsd > 0 ? Math.min(100, Math.round((usd / totalUsd) * 100)) : 0;
const modelsHtml = (p.models || []).map(m => {
const inCostStr = m.inPrice === 0 ? '0 kr' : formatCurrency(m.inPrice * scaleFactor, decs);
const outCostStr = m.outPrice === 0 ? '0 kr' : formatCurrency(m.outPrice * scaleFactor, decs);
const cacheStr = (m.cachedPrice !== undefined && m.cachedPrice > 0)
? ` • Cache: <strong>${formatCurrency(m.cachedPrice * scaleFactor, decs)}</strong>`
: '';
const blendUsdPerM = (m.inPrice * 0.75) + (m.outPrice * 0.25);
const blendStr = blendUsdPerM === 0 ? 'Gratis' : `~${formatCurrency(blendUsdPerM * scaleFactor, decs)} snitt/${scaleLabel}`;
const noteHtml = m.note ? `<div style="width:100%; font-size:10px; color:#fde68a; margin-top:2px;">ℹ️ ${escapeHtml(m.note)}</div>` : '';
return `
<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:11px; padding:5px 8px; background:rgba(9,13,22,0.55); border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
<span style="color:#cbd5e1; font-weight:600;">${escapeHtml(m.name)}</span>
<span style="font-family:ui-monospace, SFMono-Regular, Consolas, monospace; color:#93c5fd;">
In: <strong>${inCostStr}</strong> • Ut: <strong>${outCostStr}</strong>${cacheStr}
<span style="color:#6ee7b7; margin-left:4px;">(${blendStr})</span>
</span>
${noteHtml}
</div>
`;
}).join('');
const row = document.createElement('div');
row.className = 'provider-cost-row';
row.innerHTML = `
<div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
<strong>${escapeHtml(p.name)}</strong>
<span style="font-family:monospace; font-weight:700; color:#fff;">Förbrukat: ${formatCurrency(usd, 2)} (${pct}%)</span>
</div>
<div class="cost-bar-track">
<div class="cost-bar-fill" style="width:${pct}%; background:${p.color};"></div>
</div>
<div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
<div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">Pris per ${scaleLabel} hos ${escapeHtml(p.name)}:</div>
${modelsHtml}
</div>
`;
listEl.appendChild(row);
});
renderCustomPriceEditor();
}
function addManualExpense() {
const prov = document.getElementById('manualProvSelect').value;
const val = parseFloat(document.getElementById('manualAmountInput').value);
if (isNaN(val) || val === 0) return;
const rate = currencySettings.rates[currencySettings.selected] || 9.92;
costLedger.providersUsd[prov] = Math.max(0, (costLedger.providersUsd[prov] || 0) + (val / rate));
document.getElementById('manualAmountInput').value = '';
saveLedger();
renderCostModalContent();
}
function resetMonthlyCosts() {
if (!confirm('Vill du nollställa månadens kostnadsmätare?')) return;
Object.keys(costLedger.providersUsd).forEach(k => costLedger.providersUsd[k] = 0);
saveLedger();
renderCostModalContent();
}
const SUMMARY_SYSTEM = [
'Du sammanfattar en AI-konversation så att den kan flyttas till en ny tråd och användas som startkontext.',
'Skriv på svenska, rakt och utan fluff. Använd exakt dessa rubriker:',
'1. MÅL OCH FRÅGOR',
'2. SLUTSATSER OCH BESLUT',
'3. ÖPPNA FRÅGOR OCH NÄSTA STEG',
'4. VIKTIGA FAKTA ATT KOMMA IHÅG',
'Hitta inte på något som inte står i konversationen. Om en rubrik saknar innehåll, skriv "Inget".',
'Håll dig till cirka 250 ord. Texten ska räcka för att en ny AI ska kunna fortsätta arbetet direkt.'
].join('\n');
const SUMMARY_OUT_TOKENS = 500;
function parseSummaryChoice() {
const v = document.getElementById('summaryBotSelect').value;
const i = v.indexOf(':');
return { prov: v.slice(0, i), mod: v.slice(i + 1) };
}
function buildTranscript(thread) {
return (thread.messages || []).filter(m => m.inContext !== false).map(m => {
const who = m.role === 'user' ? 'Du' : `AI (${m.model || 'okänd'})`;
return `[${who}]: ${m.text}`;
}).join('\n\n');
}
function updateSummaryEstimate() {
const label = document.getElementById('summaryEstLabel');
const thread = findNode(treeData, activeThreadId);
if (!thread || !thread.messages) { label.textContent = ''; return; }
const { prov, mod } = parseSummaryChoice();
const inTok = countTokens(SUMMARY_SYSTEM) + countTokens(buildTranscript(thread)) + 20;
const usd = calculateCallCostUsd(prov, mod, inTok, SUMMARY_OUT_TOKENS);
const note = hasLiveKey(prov) ? '' : ' • ingen nyckel inlagd: ger bara en enkel lokal sammanställning';
label.textContent = `Uppskattad kostnad: ~${formatCurrency(usd, 3)} (${inTok} tkn in)${note}`;
}
function openSummaryModal() {
const thread = findNode(treeData, activeThreadId);
if (!thread || thread.type !== 'thread') return;
document.getElementById('newSummaryThreadName').value = `Sammanfattning: ${thread.name}`;
document.getElementById('summaryResultText').value = '';
updateSummaryEstimate();
openModal('summaryModal');
}
function localSummary(thread, active, excludedCount) {
const userPoints = active.filter(m => m.role === 'user').map(m => `• ${m.text.replace(/\n+/g, ' ').slice(0, 110)}`).join('\n');
const botPoints = active.filter(m => m.role === 'assistant').map(m => `• (${m.model}) ${m.text.replace(/\n+/g, ' ').slice(0, 160)}...`).join('\n');
return `📌 LOKAL SAMMANSTÄLLNING (ingen AI, bara utdrag): "${thread.name}"\n` +
`(${active.length} aktiva meddelanden • ${excludedCount} bortfiltrerade)\n\n` +
`1. FRÅGOR OCH MÅL:\n${userPoints || '• Inga'}\n\n2. SVAR:\n${botPoints || '• Inga'}`;
}
async function generateThreadSummary() {
const thread = findNode(treeData, activeThreadId);
if (!thread || !thread.messages) return;
const active = thread.messages.filter(m => m.inContext !== false);
const excludedCount = thread.messages.length - active.length;
const outBox = document.getElementById('summaryResultText');
const btn = document.getElementById('summaryGenBtn');
if (active.length === 0) {
outBox.value = 'Inga meddelanden är markerade som aktiva i kontexten.';
return;
}
const { prov, mod: chosenMod } = parseSummaryChoice();
if (!hasLiveKey(prov)) {
outBox.value = localSummary(thread, active, excludedCount) +
`\n\n(Lägg in en API-nyckel för ${PROVIDERS[prov].name} under 🔑 API-nycklar för en riktig AI-sammanfattning.)`;
return;
}
const history = [{ role: 'user', text: `Sammanfatta konversationen "${thread.name}":\n\n${buildTranscript(thread)}` }];
const inTokEst = countTokens(SUMMARY_SYSTEM) + countTokens(history[0].text);
const check = await confirmCostIfHigh(prov, chosenMod, inTokEst, SUMMARY_OUT_TOKENS, 'Sammanfattningen');
if (!check.ok) return;
const mod = check.mod;
btn.disabled = true;
outBox.value = `⏳ ${PROVIDERS[prov].name} sammanfattar...`;
try {
const r = await callAI(prov, mod, history, SUMMARY_SYSTEM, { maxTokens: 1500, noTools: true });
chargeLedger(prov, mod, r.inTok ?? inTokEst, r.outTok ?? countTokens(r.text));
outBox.value =
`📌 SAMMANFATTNING: "${thread.name}"\n` +
`(${active.length} aktiva meddelanden • ${excludedCount} bortfiltrerade • ${mod})\n\n` +
`${r.text}\n\n` +
`INSTRUKTION: Utgå från denna sammanfattning som etablerad bakgrund och fortsätt arbetet direkt.`;
} catch (err) {
outBox.value = `⚠️ Kunde inte skapa sammanfattningen: ${err.message}`;
} finally {
btn.disabled = false;
}
}
function createThreadFromSummary() {
const summaryText = document.getElementById('summaryResultText').value.trim();
const newName = document.getElementById('newSummaryThreadName').value.trim() || 'Sammanfattad tråd';
if (!summaryText) return;
const newThread = {
id: 't_' + Date.now(),
name: newName,
type: 'thread',
messages: [
{
id: 'm_sum_' + Date.now(),
role: 'user',
text: summaryText,
inContext: true,
time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
]
};
const path = findPath(treeData, activeThreadId);
const parent = (path && path.length >= 2) ? path[path.length - 2] : treeData;
if (!parent.children) parent.children = [];
parent.children.push(newThread);
parent.isOpen = true;
activeThreadId = newThread.id;
saveTree();
renderAll();
closeModal('summaryModal');
}
function copySummaryText() {
const txt = document.getElementById('summaryResultText').value;
if (txt) navigator.clipboard.writeText(txt);
}
function getNodeMetrics(node) {
if (!node) return { words: 0, tokens: 0, activeTokens: 0 };
if (node.type === 'thread') {
let totalWords = 0, totalTokens = 0, activeTokens = 0;
const msgs = node.messages || [];
for (let i = 0; i < msgs.length; i++) {
const m = msgs[i];
const txt = m.text || '';
if (m._cachedLen !== txt.length) {
m._cachedLen = txt.length;
m._cachedWords = countWords(txt);
m._cachedTokens = countTokens(txt);
}
totalWords += m._cachedWords;
totalTokens += m._cachedTokens;
if (m.inContext !== false) activeTokens += m._cachedTokens;
}
return { words: totalWords, tokens: totalTokens, activeTokens };
} else {
let words = 0, tokens = 0, activeTokens = 0;
const kids = node.children || [];
for (let i = 0; i < kids.length; i++) {
const m = getNodeMetrics(kids[i]);
words += m.words;
tokens += m.tokens;
activeTokens += m.activeTokens;
}
return { words, tokens, activeTokens };
}
}
function findNode(node, id) {
if (node.id === id) return node;
if (node.children) {
for (const c of node.children) {
const found = findNode(c, id);
if (found) return found;
}
}
return null;
}
function findPath(node, id, path = []) {
if (node.id === id) return [...path, node];
if (node.children) {
for (const c of node.children) {
const res = findPath(c, id, [...path, node]);
if (res) return res;
}
}
return null;
}
let _saveTreeDebounceTimer = null;
function saveTree(dirtyThreadId = null) {
const nowTs = Date.now();
treeData.lastModified = nowTs;
const tid = dirtyThreadId || activeThreadId;
if (tid) {
const tNode = findNode(treeData, tid);
if (tNode && tNode.type === 'thread') tNode.lastModified = nowTs;
}
if (_saveTreeDebounceTimer) clearTimeout(_saveTreeDebounceTimer);
_saveTreeDebounceTimer = setTimeout(() => {
try {
const cleanTreeStr = JSON.stringify(treeData, (key, value) => (key === 'imageUrl' || key === 'dataUrl') ? undefined : value);
try {
localStorage.setItem('ai_cockpit_tree_v3', cleanTreeStr);
} catch (quotaErr) {
console.warn('[AI-Cockpit] localStorage 5MB-gräns nådd – lagrar hela arkivet i IndexedDB (obegränsat utrymme).');
try {
const skel = typeof buildSkeletonTree === 'function' ? buildSkeletonTree(treeData) : { id: 'root', name: 'Alla Konversationer', type: 'folder', children: [] };
skel.isLargeIndexedDbStore = true;
localStorage.setItem('ai_cockpit_tree_v3', JSON.stringify(skel));
} catch (e2) {}
}
} catch (e) {}
if (typeof syncTieredCache === 'function') syncTieredCache();
if (typeof maybeAutoSaveCloudFile === 'function') maybeAutoSaveCloudFile();
if (typeof scheduleGdriveAutoSync === 'function') scheduleGdriveAutoSync(tid);
}, 250);
}
function analyzePromptRisk(text, activeTier, activeContextTokens) {
const trimmed = text.trim();
const words = countWords(trimmed);
const warnings = [];
if (activeContextTokens > 20000) {
warnings.push(`🚨 <strong>Mycket lång konversation (~${activeContextTokens.toLocaleString('sv-SE')} aktiva tokens):</strong> AI:n läser hela historiken vid varje fråga, vilket blir dyrt, långsammare och ökar risken för hallucinationer. <button class="btn-sm btn-emerald-sm" style="margin-left:6px; padding:2px 8px;" onclick="branchRecentToSubthread()">🌿 Bryt ut senaste 4 till ny undertråd</button>`);
} else if (activeContextTokens > 8000) {
warnings.push(`💡 <strong>Tråden börjar bli lång (~${activeContextTokens.toLocaleString('sv-SE')} aktiva tokens):</strong> Klicka gärna ur gamla sidospår med 🧠-knappen eller <button class="btn-sm" style="margin-left:4px; padding:2px 7px;" onclick="branchRecentToSubthread()">🌿 Skapa undertråd härifrån</button>`);
}
if (!trimmed) return warnings;
const broadVerbs = /\b(berätta allt|förklara allt|skriv en lång|utförlig guide|komplett genomgång|analysera hela|allt om|historien bakom)\b/i;
const vagueWords = /\b(något|någonting|allmänt|generellt|osv|etc)\b/i;
const hasConstraint = /\b(max|högst|kort|punktlista|punkter|meningar|tabell|ord|Format:|FORMAT:)\b/i.test(trimmed);
const complexCodeOrAnalysis = /\b(koda|programmera|debugga|felsök|refaktorera|python|javascript|html|css|sql|arkitektur|algoritm|regex|komplex analys|djupanalys|avtalsgranskning)\b/i;
if (broadVerbs.test(trimmed) && !hasConstraint) {
warnings.push("⚠️ <strong>Öppen token-fälla:</strong> Du ber om en bred genomgång utan längdbegränsning. AI:n kommer sannolikt svara med en hel uppsats.");
} else if (words >= 5 && words <= 18 && !hasConstraint && vagueWords.test(trimmed)) {
warnings.push("💡 <strong>Ospecifik fråga:</strong> Generella frågor utan ramar ger ofta långa standardsvar. Tryck på 'Lägg till längdspärr' eller använd ⚡ PromptMotor-stöd.");
}
const mObj = getModelObj(currentProvider, currentModel);
const isLiteOrVolume = (activeTier === 'local' || (mObj?.id || '').includes('lite') || (mObj?.id || '').includes('luna') || (mObj?.id || '').includes('small'));
if (isLiteOrVolume && complexCodeOrAnalysis.test(trimmed)) {
warnings.push(`🛠️ <strong>Tung kod-/analysuppgift med volymmodell (${escapeHtml(mObj?.name || currentModel)}):</strong> Lättviktsmodeller ger lätt syntaxfel eller trasig logik vid programmering. <button class="btn-sm btn-primary-sm" style="margin-left:6px; padding:2px 8px;" onclick="quickUpgradeForCoding()">👑 Byt till Guld/Silver-modell för kod</button>`);
} else if (activeTier === 'flagship' && words > 0 && words < 12 && activeContextTokens < 150 && !complexCodeOrAnalysis.test(trimmed)) {
warnings.push("👑 <strong>Guld-modell på enkel fråga:</strong> Du kör en dyr flaggskeppsmodell för en kort fråga. Byt gärna till en Silver-modell (Flash/Mini/Haiku) om du vill spara pengar.");
}
const totalEstIn = activeContextTokens + countTokens(trimmed);
if (mObj?.longCtxThreshold && totalEstIn > mObj.longCtxThreshold) {
warnings.push(`🚨 <strong>Långkontext-straff aktiverat (${mObj.longCtxMultiplier}× dyrare!):</strong> Din aktiva kontext (~${totalEstIn} tkn) har passerat gränsen på ${mObj.longCtxThreshold.toLocaleString('sv-SE')} tokens för ${mObj.name}. Klicka ur gamla meddelanden med 🧠-knappen eller byt till en Flat Rate-modell!`);
} else if (mObj?.longCtxThreshold && totalEstIn > mObj.longCtxThreshold * 0.8) {
warnings.push(`⚠️ <strong>Närmar sig prisstup (${mObj.longCtxThreshold.toLocaleString('sv-SE')} tkn):</strong> Om tråden passerar ${mObj.longCtxThreshold.toLocaleString('sv-SE')} tokens blir ${mObj.name} plötsligt ${mObj.longCtxMultiplier}× dyrare för hela anropet.`);
}
return warnings;
}
function onPromptInput() {
const input = document.getElementById('promptInput');
const text = input.value;
const w = countWords(text);
const t = countTokens(text);
document.getElementById('draftStatsLabel').textContent = `Utkast: ${w} ord (~${t} tkn)`;
const activeNode = findNode(treeData, activeThreadId);
const metrics = activeNode ? getNodeMetrics(activeNode) : { activeTokens: 0 };
const totalInTokens = metrics.activeTokens + t;
const estUsd = calculateCallCostUsd(currentProvider, currentModel, totalInTokens, EST_OUT_TOKENS);
document.getElementById('estCallCostLabel').textContent = `Uppskattad kostnad: ~${formatCurrency(estUsd, 3)}`;
const tier = getCurrentTier();
const warnings = analyzePromptRisk(text, tier, metrics.activeTokens);
const warnBox = document.getElementById('pedagogicalWarn');
const warnText = document.getElementById('pedagogicalWarnText');
if (warnings.length > 0) {
warnText.innerHTML = warnings.join('<br>');
warnBox.classList.add('visible');
} else {
warnBox.classList.remove('visible');
}
}
function applyTightConstraint() {
const input = document.getElementById('promptInput');
if (!input.value.includes('Svara extremt koncist')) {
input.value = input.value.trim() + " Svara extremt koncist i max 5 korta punkter utan inledande artighetsfraser.";
onPromptInput();
input.focus();
}
}
function renderTree() {
const container = document.getElementById('treeContainer');
container.innerHTML = '';
function buildDom(node, depth) {
if (node.id === 'root') {
(node.children || []).forEach(c => container.appendChild(buildDom(c, 0)));
return;
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
const icon = isFolder ? (node.isOpen ? '📂' : '📁') : '💬';
const hasMem = node.memory && node.memory.trim() ? '<span class="mem-dot" title="Har eget långtidsminne">🧠</span>' : '';
left.innerHTML = `<span>${icon}</span><span class="tree-name">${escapeHtml(node.name)}</span>${hasMem}`;
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
if (isFolder && node.isOpen && node.children) {
node.children.forEach(c => wrapper.appendChild(buildDom(c, depth + 1)));
}
return wrapper;
}
buildDom(treeData, 0);
}
let selectedMessageIds = new Set();
function updateBatchActionBar() {
const bar = document.getElementById('batchActionBar');
const lbl = document.getElementById('batchCountLabel');
if (!bar || !lbl) return;
const count = selectedMessageIds.size;
if (count > 0) {
lbl.textContent = `${count} markerad${count === 1 ? '' : 'e'} (Ctrl+klick för fler)`;
bar.classList.add('visible');
} else {
bar.classList.remove('visible');
}
}
function toggleSelectMessage(msgId, forceState) {
if (!msgId) return;
const next = forceState !== undefined ? forceState : !selectedMessageIds.has(msgId);
if (next) selectedMessageIds.add(msgId);
else selectedMessageIds.delete(msgId);
updateBatchActionBar();
renderChat();
}
function clearSelectedMessages() {
selectedMessageIds.clear();
updateBatchActionBar();
renderChat();
}
function renderChat() {
const thread = findNode(treeData, activeThreadId);
const chatInner = document.getElementById('chatInner');
chatInner.innerHTML = '';
const path = findPath(treeData, activeThreadId) || [];
const bcHtml = path.slice(1).map((n, idx, arr) =>
idx === arr.length - 1 ? `<strong>${escapeHtml(n.name)}</strong>` : `<span>${escapeHtml(n.name)}</span>`
).join(' <span>›</span> ');
document.getElementById('breadcrumbs').innerHTML = bcHtml || '<strong>Välj tråd</strong>';
if (!thread || thread.type !== 'thread') {
chatInner.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Välj eller skapa en konversation i trädmenyn till vänster.</div>`;
updateBatchActionBar();
return;
}
let activeWords = 0, activeTokens = 0, savedTokens = 0, activeCount = 0;
const msgs = thread.messages || [];
msgs.forEach((m, idx) => {
if (!m.id) m.id = 'msg_' + idx + '_' + Date.now();
const w = countWords(m.text);
const t = countTokens(m.text);
const inCtx = m.inContext !== false;
const isSelected = selectedMessageIds.has(m.id);
if (inCtx) {
activeWords += w;
activeTokens += t;
activeCount++;
} else {
savedTokens += t;
}
const card = document.createElement('div');
const isUser = m.role === 'user';
const botClass = !isUser && m.provider ? `bot-${m.provider}` : '';
card.className = `msg-card ${isUser ? 'user' : 'assistant'} ${botClass} ${inCtx ? '' : 'excluded'} ${isSelected ? 'batch-selected' : ''}`;
card.onclick = (e) => {
if (e.ctrlKey || e.metaKey) {
e.preventDefault();
toggleSelectMessage(m.id);
}
};
const pin = document.createElement('button');
pin.className = `context-pin ${inCtx ? 'active' : 'inactive'}`;
pin.innerHTML = inCtx
? `🧠 Aktiv i kontext (${w}o · ~${t}t)`
: `🛡️ Brusfiltrerad (sparar ~${t}t)`;
pin.onclick = (e) => {
e.stopPropagation();
m.inContext = !inCtx;
saveTree(activeThreadId);
renderAll();
};
card.appendChild(pin);
const header = document.createElement('div');
header.className = 'msg-header';
const chk = document.createElement('input');
chk.type = 'checkbox';
chk.className = 'msg-select-chk';
chk.checked = isSelected;
chk.title = 'Markera för att flytta eller radera (eller håll inne Ctrl och klicka på kortet)';
chk.onclick = (e) => {
e.stopPropagation();
toggleSelectMessage(m.id, chk.checked);
};
const leftBadge = document.createElement('div');
leftBadge.className = 'sender-badge';
leftBadge.appendChild(chk);
if (isUser) {
const span = document.createElement('span');
span.textContent = '👤 Du';
leftBadge.appendChild(span);
} else {
const pName = PROVIDERS[m.provider]?.name || 'AI';
const costBadge = m.costUsd !== undefined ? `<span class="msg-cost-pill">${formatCurrency(m.costUsd, 3)}</span>` : '';
const span = document.createElement('span');
span.innerHTML = `🤖 ${escapeHtml(pName)} <span class="bot-tag ${m.provider || 'gemini'}">${escapeHtml(m.model || '')}</span> ${costBadge}`;
leftBadge.appendChild(span);
}
const timeRight = document.createElement('div');
timeRight.style.cssText = 'display:flex; align-items:center; gap:6px; color:var(--text-muted);';
timeRight.innerHTML = `<span>${m.time || ''}</span>`;
const quickMoveBtn = document.createElement('button');
quickMoveBtn.className = 'reroute-btn';
quickMoveBtn.textContent = '↪ Flytta';
quickMoveBtn.title = 'Flytta detta meddelande (och ev. par) till en annan tråd';
quickMoveBtn.onclick = (e) => {
e.stopPropagation();
quickMoveSingleOrPair(idx);
};
const quickDelBtn = document.createElement('button');
quickDelBtn.className = 'reroute-btn';
quickDelBtn.textContent = '🗑️';
quickDelBtn.title = 'Ta bort detta meddelande';
quickDelBtn.onclick = (e) => {
e.stopPropagation();
deleteSingleMessage(m.id);
};
timeRight.appendChild(quickMoveBtn);
timeRight.appendChild(quickDelBtn);
header.appendChild(leftBadge);
header.appendChild(timeRight);
card.appendChild(header);
const body = document.createElement('div');
body.className = 'msg-body';
body.textContent = m.text;
card.appendChild(body);
if (m.attachments && m.attachments.length) {
const attWrap = document.createElement('div');
attWrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;';
m.attachments.forEach(att => {
if (att.kind === 'image' && att.dataUrl) {
const img = document.createElement('img');
img.src = att.dataUrl;
img.alt = att.name;
img.style.cssText = 'max-height:180px; max-width:260px; border-radius:8px; border:1px solid var(--border); object-fit:cover;';
attWrap.appendChild(img);
} else {
const chip = document.createElement('span');
chip.className = 'att-chip';
chip.textContent = `📄 ${att.name} (${ countWords(att.textContent || '') } ord)`;
attWrap.appendChild(chip);
}
});
card.appendChild(attWrap);
}
if (m.imageUrl) {
const image = document.createElement('img');
image.src = m.imageUrl;
image.alt = 'AI-genererad bild';
image.style.cssText = 'display:block;max-width:100%;max-height:640px;object-fit:contain;border-radius:10px;margin-top:12px;border:1px solid var(--border);';
card.appendChild(image);
}
if (m.blueprint) {
const bp = document.createElement('div');
bp.className = 'media-blueprint';
bp.textContent = m.blueprint;
card.appendChild(bp);
}
if (!isUser) {
const footer = document.createElement('div');
footer.className = 'msg-footer';
const reroute = document.createElement('div');
reroute.className = 'reroute-btns';
reroute.innerHTML = `<span>Fråga annan bot:</span>`;
Object.keys(PROVIDERS).filter(pk => pk !== m.provider).forEach(pk => {
const btn = document.createElement('button');
btn.className = 'reroute-btn';
btn.textContent = '+ ' + PROVIDERS[pk].name.split(' ')[0];
btn.onclick = () => {
const prevUser = msgs.slice(0, idx).reverse().find(x => x.role === 'user');
if (prevUser) sendMessage(prevUser.text, pk, PROVIDERS[pk].models[0].id);
};
reroute.appendChild(btn);
});
const rightActions = document.createElement('div');
rightActions.style.cssText = 'display:flex; gap:6px; align-items:center;';
const dlBtn = document.createElement('button');
dlBtn.className = 'reroute-btn';
dlBtn.textContent = '💾 Ladda ner (.md)';
dlBtn.title = 'Ladda ner detta AI-svar som en fil';
dlBtn.onclick = () => downloadTextAsFile(m.text, `${(m.model || 'ai-svar').replace(/[^a-z0-9_-]/gi, '_')}_${m.id || Date.now()}.md`);
const copyBtn = document.createElement('button');
copyBtn.className = 'reroute-btn';
copyBtn.textContent = '📋 Kopiera';
copyBtn.onclick = () => navigator.clipboard.writeText(m.text);
rightActions.appendChild(dlBtn);
if (m.imageUrl) {
const dlImgBtn = document.createElement('button');
dlImgBtn.className = 'reroute-btn';
dlImgBtn.textContent = '🖼️ Spara bild';
dlImgBtn.onclick = () => {
const a = document.createElement('a');
a.href = m.imageUrl;
a.download = `ai_bild_${Date.now()}.png`;
a.click();
};
rightActions.appendChild(dlImgBtn);
}
rightActions.appendChild(copyBtn);
footer.appendChild(reroute);
footer.appendChild(rightActions);
card.appendChild(footer);
}
chatInner.appendChild(card);
});
const excludedCount = msgs.length - activeCount;
document.getElementById('activeTokenBadge').textContent = `${activeWords} ord • ~${activeTokens} tokens`;
document.getElementById('activeMsgCount').textContent = `${activeCount} av ${msgs.length} meddelanden`;
const savedBadge = document.getElementById('savedTokenBadge');
const shieldBadge = document.getElementById('hallucinationShieldBadge');
if (excludedCount > 0) {
savedBadge.style.display = 'inline-block';
savedBadge.textContent = `💰 Sparar ~${savedTokens} tkn (${excludedCount} bortvalda)`;
shieldBadge.style.display = 'inline-block';
} else {
savedBadge.style.display = 'none';
shieldBadge.style.display = 'none';
}
updateBatchActionBar();
}
function getCurrentTier() {
return getModelObj(currentProvider, currentModel)?.tier || 'flagship';
}
function updateTierTheme() {
const tier = getCurrentTier();
const main = document.getElementById('mainArea');
const pill = document.getElementById('tierPill');
const promptBox = document.getElementById('promptBox');
const sendBtn = document.getElementById('sendBtn');
const downgradeBtn = document.getElementById('downgradeBtn');
main.className = `main-area tier-${tier}`;
pill.className = `tier-pill ${tier}`;
if (tier === 'flagship') {
pill.textContent = '👑 Guld • Hög Kvalitet & Dyr';
promptBox.classList.add('flagship-border');
sendBtn.classList.add('flagship-btn');
downgradeBtn.style.display = 'inline-block';
} else if (tier === 'balanced') {
pill.textContent = '⚡ Silver • Snabb & Billig';
promptBox.classList.remove('flagship-border');
sendBtn.classList.remove('flagship-btn');
downgradeBtn.style.display = 'none';
} else {
pill.textContent = '🛡️ Brons • Lokal & Gratis';
promptBox.classList.remove('flagship-border');
sendBtn.classList.remove('flagship-btn');
downgradeBtn.style.display = 'none';
}
document.getElementById('activeEngineLabel').textContent =
`Motor: ${PROVIDERS[currentProvider].name} (${currentModel})`;
onPromptInput();
}
function populateModelSelectors() {
const pSel = document.getElementById('providerSelect');
pSel.innerHTML = '';
Object.keys(PROVIDERS).forEach(pk => {
const opt = document.createElement('option');
opt.value = pk;
opt.textContent = PROVIDERS[pk].name;
if (pk === currentProvider) opt.selected = true;
pSel.appendChild(opt);
});
populateModelsForProvider();
}
function populateModelsForProvider() {
if (!PROVIDERS[currentProvider]) currentProvider = 'gemini';
if (!PROVIDERS[currentProvider].models.some(m => m.id === currentModel)) {
currentModel = PROVIDERS[currentProvider].models[0].id;
}
const mSel = document.getElementById('modelSelect');
mSel.innerHTML = '';
PROVIDERS[currentProvider].models.forEach(m => {
const opt = document.createElement('option');
opt.value = m.id;
opt.textContent = m.name;
if (m.id === currentModel) opt.selected = true;
mSel.appendChild(opt);
});
updateTierTheme();
}
function onProviderChange() {
currentProvider = document.getElementById('providerSelect').value;
currentModel = PROVIDERS[currentProvider].models[0].id;
populateModelsForProvider();
}
function onModelChange() {
currentModel = document.getElementById('modelSelect').value;
updateTierTheme();
}
function quickDowngrade() {
currentProvider = 'gemini';
currentModel = 'gemini-3.8-flash';
populateModelSelectors();
}
function hasLiveKey(prov) {
if (prov === 'ollama') return !!(apiKeys.ollama && apiKeys.ollama.trim());
return ['gemini', 'openai', 'anthropic', 'grok', 'mistral'].includes(prov) && !!apiKeys[prov];
}
function chargeLedger(prov, mod, inTok, outTok) {
const usd = calculateCallCostUsd(prov, mod, inTok, outTok);
costLedger.providersUsd[prov] = (costLedger.providersUsd[prov] || 0) + usd;
saveLedger();
return usd;
}
function askCostConfirm(info) {
return new Promise(resolve => {
_costResolve = resolve;
const cheapBtn = document.getElementById('costWarnCheapBtn');
let cheapHtml = '';
if (info.cheap) {
const cheapName = info.cheap.name.replace(/\s*\(.*\)/, '');
cheapHtml = `<div style="color:#6ee7b7;">Med ${escapeHtml(cheapName)} beräknas det kosta ca ${formatCurrency(info.cheapUsd, 3)}.</div>`;
cheapBtn.textContent = `⚡ Använd ${cheapName} (~${formatCurrency(info.cheapUsd, 3)})`;
cheapBtn.style.display = 'inline-flex';
} else {
cheapBtn.style.display = 'none';
}
document.getElementById('costWarnBody').innerHTML = `
<div>${escapeHtml(info.label)} beräknas kosta cirka <strong style="font-size:20px; color:#fcd34d;">${formatCurrency(info.estUsd, 3)}</strong>.</div>
<div style="color:var(--text-muted); line-height:1.5;">
Modell: ${escapeHtml(info.modelName)}<br>
Skickas: ~${info.inTokens} tokens. Antaget svar: ~${info.outTokens} tokens.<br>
Din varningsgräns är ${formatCurrency(warnSettings.thresholdUsd, 3)} (ändras under 🔑 API-nycklar).
</div>
${cheapHtml}
<div class="pm-hint">Tips: klicka bort sidospår ur kontexten med 🧠-knappen på meddelandena. Det är ofta det som gör anropet dyrt.</div>`;
openModal('costWarnModal');
});
}
function resolveCostWarn(choice) {
closeModal('costWarnModal');
if (_costResolve) { _costResolve(choice); _costResolve = null; }
}
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && document.getElementById('costWarnModal').classList.contains('open')) resolveCostWarn('cancel');
});
async function confirmCostIfHigh(prov, mod, inTokens, outTokens, label) {
const thr = warnSettings.thresholdUsd;
const estUsd = calculateCallCostUsd(prov, mod, inTokens, outTokens);
if (!thr || estUsd <= thr) return { ok: true, mod };
const cur = getModelObj(prov, mod);
const cheap = cur.tier === 'flagship'
? PROVIDERS[prov].models.find(m => m.tier === 'balanced' && m.id !== mod)
: null;
const choice = await askCostConfirm({
label, estUsd, inTokens, outTokens,
modelName: cur.name, cheap,
cheapUsd: cheap ? calculateCallCostUsd(prov, cheap.id, inTokens, outTokens) : 0
});
if (choice === 'cancel') return { ok: false, mod };
if (choice === 'cheap' && cheap) return { ok: true, mod: cheap.id };
return { ok: true, mod };
}
function toAlternating(history) {
const out = [];
history.forEach(m => {
const content = (m.text || '').trim();
if (!content) return;
const role = m.role === 'assistant' ? 'assistant' : 'user';
const last = out[out.length - 1];
if (last && last.role === role) last.content += '\n\n' + content;
else out.push({ role, content });
});
while (out.length && out[0].role !== 'user') out.shift();
return out;
}
async function postJson(url, headers, body) {
let res;
try {
res = await fetch(url, {
method: 'POST',
headers: { 'Content-Type': 'application/json', ...headers },
body: JSON.stringify(body)
});
} catch (e) {
throw new Error('Kunde inte nå leverantören (nätverksfel eller blockerat av webbläsaren).');
}
const data = await res.json().catch(() => ({}));
if (!res.ok) {
const msg = data?.error?.message || data?.message || '';
let hint = '';
if (res.status === 401 || res.status === 403) hint = ' – kontrollera API-nyckeln.';
else if (res.status === 429) hint = ' – för många anrop eller slut på kredit.';
throw new Error(`HTTP ${res.status}${msg ? ': ' + msg : ''}${hint}`);
}
return data;
}
let _cachedGeminiApiModels = null;
async function resolveAvailableGeminiModel(cleanKey, requestedMod, mObj) {
try {
if (!_cachedGeminiApiModels) {
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
if (res.ok) {
const j = await res.json();
_cachedGeminiApiModels = (j.models || [])
.filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
.map(m => String(m.name || '').replace(/^models\
.filter(name => !name.includes('1.5') && !name.includes('1.0') && !name.includes('vision'));
}
}
const avail = _cachedGeminiApiModels || [];
if (!avail.length) return null;
const cands = mObj?.candidates || [requestedMod];
for (const c of cands) {
if (avail.includes(c)) return c;
const prefixHit = avail.find(a => a.startsWith(c));
if (prefixHit) return prefixHit;
}
const sorted = [...avail].sort().reverse();
if (requestedMod.includes('lite')) {
return sorted.find(a => a.includes('flash-lite') || a.includes('lite'))
|| sorted.find(a => a.includes('flash'))
|| sorted[0];
}
if (requestedMod.includes('flash')) {
return sorted.find(a => a.includes('flash') && !a.includes('lite') && !a.includes('image') && !a.includes('tts'))
|| sorted.find(a => a.includes('flash'))
|| sorted[0];
}
return sorted.find(a => a.includes('argon') || (a.includes('pro') && !a.includes('image')))
|| sorted.find(a => a.includes('flash') && !a.includes('lite'))
|| sorted[0];
} catch (e) {
return null;
}
}
async function callAI(prov, mod, history, sysPrompt, opts = {}) {
const msgs = toAlternating(history);
if (!msgs.length) throw new Error('Det finns ingen text att skicka.');
if (msgs[msgs.length - 1].role !== 'user') throw new Error('Sista aktiva meddelandet måste vara ett av dina egna.');
const maxTokens = opts.maxTokens || 4096;
const estInTok = msgs.reduce((sum, m) => sum + countTokens(m.content || ''), 0) + countTokens(sysPrompt || '');
if (typeof checkCircuitBreakerOrTrip === 'function') {
await checkCircuitBreakerOrTrip(estInTok, opts.callerName || `${prov}:${mod}`);
}
if (prov === 'anthropic') {
const body = { model: mod, max_tokens: maxTokens, messages: msgs };
if (sysPrompt && sysPrompt.trim()) body.system = sysPrompt;
const data = await postJson('https://api.anthropic.com/v1/messages', {
'x-api-key': apiKeys.anthropic,
'anthropic-version': '2023-06-01',
'anthropic-dangerous-direct-browser-access': 'true'
}, body);
const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
return { text: text || 'Tomt svar från Claude.', inTok: data.usage?.input_tokens, outTok: data.usage?.output_tokens };
}
if (prov === 'gemini') {
const mObj = getModelObj('gemini', mod);
const effectiveMod = mObj?.apiId || mod;
const body = {
contents: msgs.map((m, idx) => {
const parts = [{ text: m.content }];
if (idx === msgs.length - 1 && opts.attachments && opts.attachments.length) {
opts.attachments.forEach(att => {
if (att.kind === 'image' && att.base64Data) {
parts.push({ inline_data: { mime_type: att.mimeType || 'image/jpeg', data: att.base64Data } });
}
});
}
return { role: m.role === 'assistant' ? 'model' : 'user', parts };
}),
generationConfig: { temperature: features.temperature }
};
if (sysPrompt && sysPrompt.trim()) body.systemInstruction = { parts: [{ text: sysPrompt }] };
if (features.grounding && !opts.noTools) body.tools = [{ google_search: {} }];
const cleanKey = (apiKeys.gemini || '').replace(/\s+/g, '');
let data;
try {
data = await postJson(
`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveMod)}:generateContent?key=${encodeURIComponent(cleanKey)}`,
{}, body);
} catch (gemErr) {
if (String(gemErr.message).includes('404')) {
const resolvedSlug = await resolveAvailableGeminiModel(cleanKey, mod, mObj);
if (resolvedSlug && resolvedSlug !== effectiveMod) {
if (mObj) mObj.apiId = resolvedSlug;
data = await postJson(
`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedSlug)}:generateContent?key=${encodeURIComponent(cleanKey)}`,
{}, body);
} else {
throw gemErr;
}
} else {
throw gemErr;
}
}
const parts = data?.candidates?.[0]?.content?.parts || [];
const text = parts.map(p => p.text || '').join('').trim();
if (!text) {
const why = data?.promptFeedback?.blockReason;
throw new Error(why ? `Gemini blockerade svaret (${why}).` : 'Tomt svar från Gemini.');
}
return { text, inTok: data.usageMetadata?.promptTokenCount, outTok: data.usageMetadata?.candidatesTokenCount };
}
if (prov === 'openai') {
const tools = [];
if (features.openaiWebSearch && !opts.noTools) tools.push({ type: 'web_search' });
if (features.codeInterpreter && !opts.noTools) tools.push({ type: 'code_interpreter', container: { type: 'auto' } });
const body = {
model: mod,
input: msgs,
...(sysPrompt && sysPrompt.trim() ? { instructions: sysPrompt } : {}),
...(tools.length ? { tools } : {})
};
const data = await postJson('https://api.openai.com/v1/responses',
{ 'Authorization': `Bearer ${apiKeys.openai}` }, body);
const outputText = (data.output || []).filter(item => item.type === 'message')
.flatMap(item => item.content || []).filter(c => c.type === 'output_text')
.map(c => c.text || '').join('\n').trim();
if (!outputText) throw new Error('OpenAI returnerade inget textinnehåll. Kontrollera modellåtkomst och att verktygen stöds av vald modell.');
return { text: outputText, inTok: data.usage?.input_tokens, outTok: data.usage?.output_tokens };
}
if (prov === 'grok') {
const data = await postJson('https://api.x.ai/v1/chat/completions',
{ 'Authorization': `Bearer ${apiKeys.grok}` },
{
model: mod,
messages: [
...(sysPrompt && sysPrompt.trim() ? [{ role: 'system', content: sysPrompt }] : []),
...msgs
],
temperature: features.temperature
});
const text = data?.choices?.[0]?.message?.content?.trim();
if (!text) throw new Error('Tomt svar från Grok.');
return { text, inTok: data.usage?.prompt_tokens, outTok: data.usage?.completion_tokens };
}
if (prov === 'ollama') {
const baseUrl = (apiKeys.ollama || 'http://localhost:11434').replace(/\/+$/, '');
const data = await postJson(`${baseUrl}/api/chat`, {}, {
model: mod,
stream: false,
messages: [
...(sysPrompt && sysPrompt.trim() ? [{ role: 'system', content: sysPrompt }] : []),
...msgs
]
});
const text = data?.message?.content?.trim();
if (!text) throw new Error('Tomt svar från lokal Ollama.');
return { text, inTok: data.prompt_eval_count || 0, outTok: data.eval_count || 0 };
}
throw new Error(`${PROVIDERS[prov]?.name || prov} är inte kopplad till riktiga anrop i den här versionen.`);
}
function simulatedReply(prov, mod, history) {
const name = PROVIDERS[prov].name;
const reason = ['gemini', 'openai', 'anthropic'].includes(prov)
? `Ingen API-nyckel är inlagd för ${name}. Lägg in den under 🔑 API-nycklar.`
: `${name} är inte kopplad till riktiga anrop i den här versionen.`;
const tok = history.reduce((a, m) => a + countTokens(m.text), 0);
return `[Demosvar från ${name} • ${mod} – inget riktigt AI-anrop gjordes och inget har debiterats]\n\n${reason}\n\nAnropet hade innehållit ${history.length} aktiva meddelanden (~${tok} tokens).`;
}
function setSendingUi(on) {
const btn = document.getElementById('sendBtn');
btn.disabled = on;
btn.style.opacity = on ? '0.6' : '';
btn.textContent = on ? 'Väntar…' : 'Skicka ➤';
}
function ensureValidActiveThread() {
let t = findNode(treeData, activeThreadId);
if (t && t.type === 'thread') return t;
const all = collectAllThreadsWithPaths(treeData);
if (all.length > 0) {
activeThreadId = all[0].thread.id;
return all[0].thread;
}
const created = { id: 't_' + Date.now(), name: 'Ny Konversation', type: 'thread', messages: [] };
if (!treeData.children) treeData.children = [];
treeData.children.push(created);
activeThreadId = created.id;
return created;
}
async function sendMessage(overrideText = null, overrideProv = null, overrideMod = null) {
if (isSending) return;
const input = document.getElementById('promptInput');
const rawInput = overrideText !== null ? overrideText : input.value.trim();
const hasAtt = (overrideText === null && typeof pendingAttachments !== 'undefined' && pendingAttachments.length > 0);
if (!rawInput && !hasAtt) return;
const text = rawInput || '(Bifogad fil/bild)';
const thread = ensureValidActiveThread();
if (!thread.messages) thread.messages = [];
const prov = overrideProv || currentProvider;
let mod = overrideMod || currentModel;
const sysPrompt = buildEffectiveSystemPrompt(activeThreadId);
const currentAttachments = (overrideText === null && pendingAttachments.length) ? [...pendingAttachments] : [];
const textAttachmentsBlock = currentAttachments
.filter(a => a.kind === 'text' && a.textContent)
.map(a => `\n\n--- BIFOGAD FIL: ${a.name} ---\n${a.textContent}\n--- SLUT PÅ FIL: ${a.name} ---`)
.join('');
const fullUserText = text + textAttachmentsBlock;
const history = thread.messages.filter(m => m.inContext !== false).map(m => ({ role: m.role, text: m.text }));
const lastActive = history[history.length - 1];
if (overrideText === null || !lastActive || lastActive.role !== 'user') history.push({ role: 'user', text: fullUserText });
if (overrideText === null && uiPrefs.strayFilter && thread.messages.length >= 2) {
const strayDecision = await checkStrayAwayRisk(thread, text);
if (strayDecision === 'cancel') return;
if (strayDecision === 'branch') {
const branchTitle = `Sidospår: ${text.slice(0, 36).trim()}...`;
const newSubThread = {
id: 't_stray_' + Date.now(),
name: branchTitle,
type: 'thread',
lastModified: Date.now(),
messages: []
};
const path = findPath(treeData, activeThreadId);
const parent = (path && path.length >= 2) ? path[path.length - 2] : treeData;
if (!parent.children) parent.children = [];
parent.children.push(newSubThread);
parent.isOpen = true;
activeThreadId = newSubThread.id;
saveTree(newSubThread.id);
renderAll();
showAutosaveToast(`🌿 Fokusvakten bröt ut frågan till den nya tråden "${branchTitle}"!`);
return await sendMessage(null, prov, mod);
}
}
const inTokensEst = history.reduce((a, m) => a + countTokens(m.text), 0) + countTokens(sysPrompt);
const check = await confirmCostIfHigh(prov, mod, inTokensEst, EST_OUT_TOKENS, 'Det här anropet');
if (!check.ok) return;
mod = check.mod;
isSending = true;
setSendingUi(true);
if (overrideText === null) {
thread.messages.push({
id: 'u_' + Date.now(),
role: 'user',
text: fullUserText,
attachments: currentAttachments.map(a => ({ name: a.name, kind: a.kind, mimeType: a.mimeType, dataUrl: a.kind === 'image' ? a.dataUrl : undefined, textContent: a.kind === 'text' ? a.textContent : undefined })),
inContext: true,
time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});
pendingAttachments = [];
renderAttachmentPreviewBar();
input.value = '';
onPromptInput();
}
saveTree();
renderAll();
let replyText = '';
let costUsd = 0;
let keepInContext = true;
try {
if (hasLiveKey(prov)) {
const r = await callAI(prov, mod, history, sysPrompt, { attachments: currentAttachments });
replyText = r.text;
const inTok = r.inTok ?? inTokensEst;
const outTok = r.outTok ?? countTokens(r.text);
costUsd = chargeLedger(prov, mod, inTok, outTok);
} else {
replyText = simulatedReply(prov, mod, history);
keepInContext = false;
}
} catch (err) {
replyText = `⚠️ Fel från ${PROVIDERS[prov].name}: ${err.message}`;
keepInContext = false;
}
thread.messages.push({
id: 'b_' + Date.now(),
role: 'assistant',
provider: prov,
model: mod,
text: replyText,
costUsd: costUsd,
inContext: keepInContext,
time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});
isSending = false;
setSendingUi(false);
saveTree();
renderAll();
scrollPageTo('bottom');
}
function bulkContext(mode) {
const thread = findNode(treeData, activeThreadId);
if (!thread || !thread.messages) return;
const len = thread.messages.length;
thread.messages.forEach((m, i) => {
if (mode === 'all') m.inContext = true;
else if (mode === 'none') m.inContext = false;
else if (mode === 'last3') m.inContext = (i >= len - 3);
});
saveTree();
renderAll();
}
function createNode(parentId, type) {
const parent = findNode(treeData, parentId);
if (!parent) return;
const name = prompt(type === 'folder' ? 'Namn på ny mapp/kategori:' : 'Namn på ny konversation:', type === 'folder' ? 'Ny Kategori' : 'Ny Konversation');
if (!name) return;
const newNode = {
id: 'n_' + Date.now(),
name: name.trim(),
type: type,
isOpen: true,
...(type === 'folder' ? { children: [] } : { messages: [] })
};
if (!parent.children) parent.children = [];
parent.children.push(newNode);
parent.isOpen = true;
if (type === 'thread') activeThreadId = newNode.id;
saveTree();
renderAll();
}
function renameNodePrompt(id) {
const node = findNode(treeData, id);
if (!node) return;
const next = prompt('Byt namn:', node.name);
if (next && next.trim()) {
node.name = next.trim();
saveTree();
renderAll();
}
}
function deleteNode(id) {
if (!confirm('Vill du radera denna nod och eventuella undertrådar?')) return;
function removeRec(parent) {
if (!parent.children) return;
parent.children = parent.children.filter(c => c.id !== id);
parent.children.forEach(removeRec);
}
removeRec(treeData);
saveTree();
renderAll();
}
function toggleSidebar(force) {
const sb = document.getElementById('sidebar');
const bd = document.getElementById('sidebarBackdrop');
const isOpen = force !== undefined ? force : !sb.classList.contains('open');
sb.classList.toggle('open', isOpen);
bd.classList.toggle('open', isOpen);
}
function toggleStudioDrawer() {
document.getElementById('studioDrawer').classList.toggle('open');
}
function toggleFeature(key) {
features[key] = !features[key];
const ids = { grounding: 'featGrounding', openaiWebSearch: 'featOpenAISearch', codeInterpreter: 'featCode' };
if (ids[key]) document.getElementById(ids[key]).classList.toggle('active', features[key]);
if (key === 'openaiWebSearch' && features[key]) {
document.getElementById('systemPromptInput').value = document.getElementById('systemPromptInput').value;
}
}
function setCreativeMode(mode) {
features.creativeMode = (features.creativeMode === mode) ? 'none' : mode;
document.getElementById('featVeo').classList.toggle('active', features.creativeMode === 'video');
document.getElementById('featLyria').classList.toggle('active', features.creativeMode === 'audio');
const input = document.getElementById('promptInput');
const hint = mode === 'video'
? '\n\n[Skapa en detaljerad videoprompt: motiv, scenografi, kamerarörelse, ljus, stil, tempo och ljud. Skriv prompten för ett externt videogenereringsverktyg; detta läge genererar inte själva videon.]'
: '\n\n[Skapa en musik-/ljudprompt: genre, tempo, instrument, stämning, sång/icke-sång, struktur och mix. Skriv prompten för ett externt ljudgenereringsverktyg; detta läge genererar inte själva ljudet.]';
if (features.creativeMode === mode && !input.value.includes(hint.trim())) input.value = input.value.trim() + hint;
onPromptInput();
}
async function generateOpenAIImage() {
const promptEl = document.getElementById('promptInput');
const prompt = promptEl.value.trim();
if (!prompt) { alert('Skriv först en beskrivning i chattrutan.'); promptEl.focus(); return; }
if (!apiKeys.openai) { alert('Lägg först in din OpenAI API-nyckel under 🔑 API-nycklar.'); return; }
const thread = findNode(treeData, activeThreadId);
if (!thread || thread.type !== 'thread') return;
const btn = document.getElementById('featImage');
btn.disabled = true; btn.textContent = '⏳ Skapar bild…';
try {
const data = await postJson('https://api.openai.com/v1/images/generations',
{ 'Authorization': `Bearer ${apiKeys.openai}` },
{ model: 'gpt-image-2', prompt, size: '1024x1024', quality: 'medium' });
const item = data.data && data.data[0];
let imageUrl = item?.url || null;
if (!imageUrl && item?.b64_json) {
const raw = atob(item.b64_json); const bytes = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
imageUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}
if (!imageUrl) throw new Error('API:n returnerade ingen bild. Kontrollera bildmodellåtkomst och API-betalning.');
thread.messages.push({ id: 'img_' + Date.now(), role: 'assistant', provider: 'openai', model: 'gpt-image-2', text: 'Bild skapad från prompt: ' + prompt + (imageUrl.startsWith('blob:') ? ' (bilden finns bara kvar tills sidan laddas om)' : ''), imageUrl, inContext: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
promptEl.value = ''; onPromptInput(); saveTree(); renderAll();
} catch (err) {
alert('Bildgenerering misslyckades: ' + err.message);
} finally { btn.disabled = false; btn.textContent = '🖼️ Skapa bild'; }
}
function updateTemp(val) {
features.temperature = parseFloat(val);
document.getElementById('tempVal').textContent = val;
}
function openContextInspector() {
const thread = findNode(treeData, activeThreadId);
const body = document.getElementById('inspectorBody');
body.innerHTML = '';
if (!thread || !thread.messages) return;
const active = thread.messages.filter(m => m.inContext !== false);
const excluded = thread.messages.length - active.length;
const info = document.createElement('div');
info.style.cssText = 'padding:10px; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.4); border-radius:8px; font-size:12px; color:#ddd6fe;';
info.innerHTML = `🛡️ <strong>Brus- & Hallucinationsfilter:</strong> Endast de ${active.length} meddelandena nedan skickas till AI:n. (${excluded} urklickade skämt/sidospår är osynliga för modellen.)`;
body.appendChild(info);
active.forEach(m => {
const div = document.createElement('div');
div.style.cssText = 'padding:10px; background:#090d16; border:1px solid #334155; border-radius:8px; font-family:monospace; font-size:12px;';
div.innerHTML = `<div style="color:#93c5fd; margin-bottom:4px;">[${m.role.toUpperCase()}] (${countWords(m.text)} ord • ~${countTokens(m.text)} tkn)</div><div>${escapeHtml(m.text)}</div>`;
body.appendChild(div);
});
openModal('inspectorModal');
}
function openModal(id) {
if (id === 'settingsModal') {
document.getElementById('key_gemini').value = apiKeys.gemini || '';
document.getElementById('key_openai').value = apiKeys.openai || '';
document.getElementById('key_anthropic').value = apiKeys.anthropic || '';
document.getElementById('key_grok').value = apiKeys.grok || '';
document.getElementById('key_mistral').value = apiKeys.mistral || '';
document.getElementById('key_ollama').value = apiKeys.ollama || 'http://localhost:11434';
const wrate = currencySettings.rates[currencySettings.selected] || 9.92;
document.getElementById('warn_threshold').value = warnSettings.thresholdUsd ? +(warnSettings.thresholdUsd * wrate).toFixed(2) : '';
document.getElementById('warnCurLabel').textContent = currencySettings.symbols[currencySettings.selected] || 'kr';
}
document.getElementById(id).classList.add('open');
}
function closeModal(id) {
document.getElementById(id).classList.remove('open');
}
function saveApiKeys() {
apiKeys = {
gemini: document.getElementById('key_gemini').value.trim(),
openai: document.getElementById('key_openai').value.trim(),
anthropic: document.getElementById('key_anthropic').value.trim(),
grok: document.getElementById('key_grok').value.trim(),
mistral: document.getElementById('key_mistral').value.trim(),
ollama: document.getElementById('key_ollama').value.trim()
};
localStorage.setItem('ai_cockpit_keys_v3', JSON.stringify(apiKeys));
const wv = parseFloat(String(document.getElementById('warn_threshold').value).replace(',', '.'));
const wrate = currencySettings.rates[currencySettings.selected] || 9.92;
warnSettings.thresholdUsd = (isNaN(wv) || wv <= 0) ? 0 : wv / wrate;
localStorage.setItem('ai_cockpit_warn_v4', JSON.stringify(warnSettings));
closeModal('settingsModal');
}
function exportWorkspace() {
const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(treeData, null, 2));
const a = document.createElement('a');
a.href = dataStr;
a.download = `ai_cockpit_v3_${Date.now()}.json`;
a.click();
}
function importWorkspace(e) {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
try {
const parsed = JSON.parse(ev.target.result);
if (parsed && parsed.id === 'root') {
treeData = parsed;
saveTree();
renderAll();
}
} catch (err) {
alert('Kunde inte läsa JSON-filen.');
}
};
reader.readAsText(file);
}
function handleKeyDown(e) {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
sendMessage();
}
}
function escapeHtml(str = '') {
return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function renderAll() {
renderTree();
renderChat();
updateTopCostWidget();
onPromptInput();
}
// ============================================================================
// --- V9 UPGRADES: SIDSCROLL, ANPASSADE TOKENPRISER, KORT-TOGGLE,
//     SMART-KONTEXT, HIERARKISKT MINNE, FILER, ÄRLIG MOLNSYNK & SÖKAGENT ---
// ============================================================================
function scrollPageTo(where) {
const main = document.getElementById('mainArea');
const stream = document.getElementById('chatStream');
if (where === 'top') {
if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
if (stream) stream.scrollTo({ top: 0, behavior: 'smooth' });
} else {
if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
}
}
// 1. EGEN PRISSÄTTNING PER MODELL HOS RESPEKTIVE LEVERANTÖR
const DEFAULT_MODEL_PRICES = {};
Object.keys(PROVIDERS).forEach(pk => {
PROVIDERS[pk].models.forEach(m => {
DEFAULT_MODEL_PRICES[m.id] = { inPrice: m.inPrice, outPrice: m.outPrice };
});
});
function loadCustomModelPrices() {
try {
const saved = JSON.parse(localStorage.getItem('ai_cockpit_custom_prices_v16'));
if (!saved) return;
Object.keys(PROVIDERS).forEach(pk => {
PROVIDERS[pk].models.forEach(m => {
if (saved[m.id]) {
if (typeof saved[m.id].inPrice === 'number') m.inPrice = saved[m.id].inPrice;
if (typeof saved[m.id].outPrice === 'number') m.outPrice = saved[m.id].outPrice;
}
});
});
} catch (e) {}
}
loadCustomModelPrices();
function renderCustomPriceEditor() {
const container = document.getElementById('customPriceEditorList');
if (!container) return;
container.innerHTML = '';
Object.keys(PROVIDERS).forEach(pk => {
const p = PROVIDERS[pk];
p.models.forEach(m => {
const row = document.createElement('div');
row.className = 'price-edit-row';
row.innerHTML = `
<span title="${escapeHtml(p.name)}"><strong>${escapeHtml(p.name.split(' ')[0])}</strong> • ${escapeHtml(m.name)}</span>
<input type="number" step="0.001" min="0" data-model-in="${escapeHtml(m.id)}" value="${m.inPrice}">
<input type="number" step="0.001" min="0" data-model-out="${escapeHtml(m.id)}" value="${m.outPrice}">
`;
container.appendChild(row);
});
});
}
function saveCustomModelPrices() {
const customMap = {};
Object.keys(PROVIDERS).forEach(pk => {
PROVIDERS[pk].models.forEach(m => {
const inEl = document.querySelector(`input[data-model-in="${m.id}"]`);
const outEl = document.querySelector(`input[data-model-out="${m.id}"]`);
const inVal = inEl ? parseFloat(inEl.value) : m.inPrice;
const outVal = outEl ? parseFloat(outEl.value) : m.outPrice;
if (!isNaN(inVal) && inVal >= 0) m.inPrice = inVal;
if (!isNaN(outVal) && outVal >= 0) m.outPrice = outVal;
customMap[m.id] = { inPrice: m.inPrice, outPrice: m.outPrice };
});
});
localStorage.setItem('ai_cockpit_custom_prices_v16', JSON.stringify(customMap));
renderCostModalContent();
onPromptInput();
const statusEl = document.getElementById('syncStatusMsg');
if (statusEl) {
statusEl.style.display = 'block';
statusEl.textContent = '✅ Dina anpassade tokenpriser har sparats!';
}
}
function resetCustomModelPrices() {
localStorage.removeItem('ai_cockpit_custom_prices_v16');
Object.keys(PROVIDERS).forEach(pk => {
PROVIDERS[pk].models.forEach(m => {
if (DEFAULT_MODEL_PRICES[m.id]) {
m.inPrice = DEFAULT_MODEL_PRICES[m.id].inPrice;
m.outPrice = DEFAULT_MODEL_PRICES[m.id].outPrice;
}
});
});
renderCostModalContent();
onPromptInput();
}
// 2. KOLLAPSBAR VY, FRI SIDSCROLL & GLOBAL "KORT & KONCIS"-STRÖMBRYTARE
let uiPrefs = JSON.parse(localStorage.getItem('ai_cockpit_uiprefs_v8')) || {
conciseMode: false,
maximizedChat: false,
unpinDock: false,
smartTime: false,
smartDate: false,
smartLoc: false,
cachedLocationText: ''
};
function saveUiPrefs() {
localStorage.setItem('ai_cockpit_uiprefs_v8', JSON.stringify(uiPrefs));
}
function applyUiPrefsToDom() {
if (typeof applyUxLevelToDom === 'function') applyUxLevelToDom();
document.body.classList.toggle('maximized-chat', !!uiPrefs.maximizedChat);
document.body.classList.toggle('unpin-dock', !!uiPrefs.unpinDock);
const colBtn = document.getElementById('collapseUiBtn');
if (colBtn) colBtn.textContent = uiPrefs.maximizedChat ? '🔼 Visa paneler' : '🔽 Minimera fält';
const unpinBtn = document.getElementById('unpinDockBtn');
if (unpinBtn) unpinBtn.textContent = uiPrefs.unpinDock ? '📌 Fri scroll: PÅ' : '📌 Fri scroll: AV';
const cBtn = document.getElementById('conciseTopBtn');
if (cBtn) {
cBtn.classList.toggle('concise-on', !!uiPrefs.conciseMode);
cBtn.textContent = uiPrefs.conciseMode ? '⚡ Kort: PÅ' : '⚡ Kort: AV';
}
const sBtn = document.getElementById('strayTopBtn');
if (sBtn) {
sBtn.classList.toggle('stray-on', !!uiPrefs.strayFilter);
sBtn.textContent = uiPrefs.strayFilter ? '🎯 Fokusvakt: PÅ' : '🎯 Fokusvakt: AV';
}
const tBtn = document.getElementById('scTimeBtn');
if (tBtn) {
tBtn.classList.toggle('active', !!uiPrefs.smartTime);
tBtn.textContent = uiPrefs.smartTime ? '🕒 Tid: PÅ' : '🕒 Tid: AV';
}
const dBtn = document.getElementById('scDateBtn');
if (dBtn) {
dBtn.classList.toggle('active', !!uiPrefs.smartDate);
dBtn.textContent = uiPrefs.smartDate ? '📅 Datum: PÅ' : '📅 Datum: AV';
}
const lBtn = document.getElementById('scLocBtn');
if (lBtn) {
lBtn.classList.toggle('active', !!uiPrefs.smartLoc);
lBtn.textContent = uiPrefs.smartLoc ? '📍 Plats: PÅ' : '📍 Plats: AV';
}
const locTxt = document.getElementById('locStatusText');
if (locTxt) {
locTxt.textContent = (uiPrefs.smartLoc && uiPrefs.cachedLocationText) ? `(${uiPrefs.cachedLocationText})` : '';
}
}
function toggleMaximizeChat() {
uiPrefs.maximizedChat = !uiPrefs.maximizedChat;
saveUiPrefs();
applyUiPrefsToDom();
}
function toggleUnpinDock() {
uiPrefs.unpinDock = !uiPrefs.unpinDock;
saveUiPrefs();
applyUiPrefsToDom();
}
function toggleConciseMode() {
uiPrefs.conciseMode = !uiPrefs.conciseMode;
saveUiPrefs();
applyUiPrefsToDom();
onPromptInput();
}
// 3. DYNAMISK SMART-KONTEXT: TID, DATUM & GPS-POSITION
function toggleSmartContext(which) {
if (which === 'time') uiPrefs.smartTime = !uiPrefs.smartTime;
if (which === 'date') uiPrefs.smartDate = !uiPrefs.smartDate;
if (which === 'loc') {
uiPrefs.smartLoc = !uiPrefs.smartLoc;
if (uiPrefs.smartLoc && navigator.geolocation) {
const locTxt = document.getElementById('locStatusText');
if (locTxt) locTxt.textContent = '(Hämtar GPS...)';
navigator.geolocation.getCurrentPosition(async (pos) => {
const lat = pos.coords.latitude.toFixed(4);
const lon = pos.coords.longitude.toFixed(4);
let placeLabel = `${lat}, ${lon}`;
try {
const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
if (r.ok) {
const j = await r.json();
const city = j?.address?.city || j?.address?.town || j?.address?.municipality || j?.address?.village;
const country = j?.address?.country;
if (city) placeLabel = `${city}${country ? ', ' + country : ''} (${lat}, ${lon})`;
}
} catch (e) {}
uiPrefs.cachedLocationText = placeLabel;
saveUiPrefs();
applyUiPrefsToDom();
}, () => {
uiPrefs.cachedLocationText = 'GPS nekad/otillgänglig';
saveUiPrefs();
applyUiPrefsToDom();
}, { timeout: 6000 });
}
}
saveUiPrefs();
applyUiPrefsToDom();
onPromptInput();
}
// 4. HIERARKISKT LÅNGTIDSMINNE SOM ÄRVS I TRÄDET (ROT -> MAPP -> TRÅD)
function getInheritedMemoryChain(targetId) {
const path = findPath(treeData, targetId) || [];
return path
.filter(n => n.memory && n.memory.trim())
.map(n => ({ id: n.id, name: n.name, type: n.type, memory: n.memory.trim() }));
}
function buildEffectiveSystemPrompt(targetThreadId) {
const parts = [];
const baseSys = document.getElementById('systemPromptInput')?.value?.trim();
if (baseSys) parts.push(baseSys);
const memChain = getInheritedMemoryChain(targetThreadId);
if (memChain.length > 0) {
const memLines = memChain.map(m => `- [${m.type === 'folder' ? 'Kategori: ' + m.name : 'Tråd: ' + m.name}]: ${m.memory}`).join('\n');
parts.push(`LÅNGTIDSMINNE FÖR DENNA TRÄDGREN:\n${memLines}`);
}
const contextMeta = [];
const now = new Date();
if (uiPrefs.smartDate) {
contextMeta.push(`Aktuellt datum: ${now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
}
if (uiPrefs.smartTime) {
contextMeta.push(`Aktuellt klockslag: ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`);
}
if (uiPrefs.smartLoc && uiPrefs.cachedLocationText) {
contextMeta.push(`Användarens position: ${uiPrefs.cachedLocationText}`);
}
if (contextMeta.length > 0) {
parts.push(`KONTEXTDATA:\n${contextMeta.join(' | ')}`);
}
if (uiPrefs.conciseMode) {
parts.push('STRIKT LÄNGDREGLERING: Håll svaret kort, punkt. Var kort och koncis, inget annat.');
}
return parts.join('\n\n');
}
function updateMemoryIndicator() {
const btn = document.getElementById('activeMemIndicator');
if (!btn) return;
const chain = getInheritedMemoryChain(activeThreadId);
btn.classList.toggle('active', chain.length > 0);
btn.textContent = `🧠 Minne: ${chain.length} aktiv${chain.length === 1 ? '' : 'a'}`;
}
function flattenAllNodes(node, depth = 0, out = []) {
out.push({ node, depth });
if (node.children) {
node.children.forEach(c => flattenAllNodes(c, depth + 1, out));
}
return out;
}
function openMemoryModal(preselectId) {
const sel = document.getElementById('memoryNodeSelect');
sel.innerHTML = '';
const all = flattenAllNodes(treeData);
all.forEach(({ node, depth }) => {
const opt = document.createElement('option');
opt.value = node.id;
const prefix = '　'.repeat(depth) + (node.type === 'folder' ? '📁 ' : '💬 ');
const hasM = (node.memory && node.memory.trim()) ? ' (🧠 har minne)' : '';
opt.textContent = prefix + node.name + hasM;
if (node.id === (preselectId || activeThreadId)) opt.selected = true;
sel.appendChild(opt);
});
onMemoryNodeSelectChange();
openModal('memoryModal');
}
function onMemoryNodeSelectChange() {
const nodeId = document.getElementById('memoryNodeSelect').value;
const node = findNode(treeData, nodeId);
const label = document.getElementById('memoryNodeLabel');
const area = document.getElementById('memoryNodeText');
if (node) {
label.textContent = `Långtidsminne för ${node.type === 'folder' ? 'mappen' : 'tråden'} "${node.name}":`;
area.value = node.memory || '';
}
updateMemoryModalPreview();
}
function updateMemoryModalPreview() {
const preview = document.getElementById('memoryInheritedPreview');
if (!preview) return;
const chain = getInheritedMemoryChain(activeThreadId);
if (chain.length === 0) {
preview.textContent = '(Inget specifikt långtidsminne är inlagt i den aktiva trådens gren ännu.)';
} else {
preview.textContent = chain.map(m => `[${m.name}]: ${m.memory}`).join('\n\n');
}
}
function saveMemoryForSelectedNode() {
const nodeId = document.getElementById('memoryNodeSelect').value;
const node = findNode(treeData, nodeId);
if (!node) return;
node.memory = document.getElementById('memoryNodeText').value.trim();
saveTree();
renderAll();
openMemoryModal(nodeId);
}
// 5. FIL- OCH BILDUPPLADDNING SAMT NEDLADDNING AV SVAR
let pendingAttachments = [];
function handleChatFileSelect(event) {
const files = Array.from(event.target.files || []);
if (!files.length) return;
files.forEach(file => {
if (file.type.startsWith('image/')) {
const reader = new FileReader();
reader.onload = (ev) => {
const dataUrl = ev.target.result;
const base64Data = String(dataUrl).split(',')[1] || '';
pendingAttachments.push({
id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
name: file.name,
kind: 'image',
mimeType: file.type,
dataUrl,
base64Data
});
renderAttachmentPreviewBar();
onPromptInput();
};
reader.readAsDataURL(file);
} else {
const reader = new FileReader();
reader.onload = (ev) => {
pendingAttachments.push({
id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
name: file.name,
kind: 'text',
mimeType: file.type || 'text/plain',
textContent: String(ev.target.result || '')
});
renderAttachmentPreviewBar();
onPromptInput();
};
reader.readAsText(file);
}
});
event.target.value = '';
}
function renderAttachmentPreviewBar() {
const bar = document.getElementById('attachmentPreviewBar');
if (!bar) return;
bar.innerHTML = '';
if (!pendingAttachments.length) {
bar.classList.remove('visible');
return;
}
bar.classList.add('visible');
pendingAttachments.forEach(att => {
const chip = document.createElement('div');
chip.className = 'att-chip';
const icon = att.kind === 'image' ? '🖼️' : '📄';
const meta = att.kind === 'image' ? 'Bild' : `${countWords(att.textContent)} ord (~${countTokens(att.textContent)} tkn)`;
chip.innerHTML = `<span>${icon} ${escapeHtml(att.name)} (${meta})</span>`;
const rmBtn = document.createElement('button');
rmBtn.className = 'icon-btn';
rmBtn.textContent = '✕';
rmBtn.onclick = () => {
pendingAttachments = pendingAttachments.filter(x => x.id !== att.id);
renderAttachmentPreviewBar();
onPromptInput();
};
chip.appendChild(rmBtn);
bar.appendChild(chip);
});
}
function downloadTextAsFile(text, filename) {
if (!text || !text.trim()) {
alert('Det finns ingen text att ladda ner.');
return;
}
const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename || `ai_svar_${Date.now()}.md`;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// ============================================================================
// --- V578.5: AUTOMATSÄKRING (CIRCUIT BREAKER) MED PAUSA & ÅTERUPPTA ---
// ============================================================================
const CIRCUIT_MODES = {
normal: { maxCallsPerMinute: 10, maxTokensPerMinute: 60000, maxCallsPer5Min: 35, label: '🛡️ Normal (Standard - 60k tkn/min)' },
heavy:  { maxCallsPerMinute: 35, maxTokensPerMinute: 300000, maxCallsPer5Min: 100, label: '🕵️ Tung Sökning / Batch (300k tkn/min)' },
max:    { maxCallsPerMinute: 60, maxTokensPerMinute: 1000000, maxCallsPer5Min: 250, label: '🚀 Max / Storkörning (1M tkn/min)' }
};
let currentCircuitMode = 'normal';
let circuitBypassUntil = 0; // Timestamp fram till vilken bromsen är tillfälligt avstängd
let circuitState = {
isTripped: false,
tripReason: '',
callHistory: []
};
let _circuitModalResolve = null;
function setCircuitMode(modeKey) {
if (!CIRCUIT_MODES[modeKey]) return;
currentCircuitMode = modeKey;
const modeObj = CIRCUIT_MODES[modeKey];
showAutosaveToast(`⚡ Nödbroms inställd på: ${modeObj.label}`);
const sel = document.getElementById('circuitModeSelect');
if (sel) sel.value = modeKey;
const topSel = document.getElementById('topCircuitModeSelect');
if (topSel) topSel.value = modeKey;
}
function temporarilyRaiseCircuitBreaker(minutes = 15, mode = 'heavy') {
circuitBypassUntil = Date.now() + (minutes * 60000);
setCircuitMode(mode);
resetCircuitBreaker();
showAutosaveToast(`🚀 Nödbromsen höjd till ${CIRCUIT_MODES[mode].label} i ${minutes} minuter!`);
}
async function checkCircuitBreakerOrTrip(estimatedTokens = 1000, callerName = 'AI-anrop') {
const now = Date.now();
// Om tillfälligt lyft är aktivt
if (now < circuitBypassUntil) {
circuitState.callHistory.push({ ts: now, tokens: estimatedTokens, caller: callerName });
return;
}
const limits = CIRCUIT_MODES[currentCircuitMode] || CIRCUIT_MODES.normal;
const oneMinAgo = now - 60000;
const fiveMinAgo = now - 300000;
circuitState.callHistory = circuitState.callHistory.filter(item => item.ts > fiveMinAgo);
const callsLastMin = circuitState.callHistory.filter(item => item.ts > oneMinAgo);
const tokensLastMin = callsLastMin.reduce((sum, item) => sum + item.tokens, 0) + estimatedTokens;
let reason = '';
if (callsLastMin.length >= limits.maxCallsPerMinute) {
reason = `Frekvensspärr nådd: ${callsLastMin.length + 1} anrop på 60s (gräns: ${limits.maxCallsPerMinute}/min). Källa: ${callerName}`;
} else if (tokensLastMin > limits.maxTokensPerMinute) {
reason = `Token-lavin stoppad: ~${tokensLastMin.toLocaleString('sv-SE')} tokens på 60s (gräns: ${limits.maxTokensPerMinute.toLocaleString('sv-SE')} tkn/min). Källa: ${callerName}`;
} else if (circuitState.callHistory.length >= limits.maxCallsPer5Min) {
reason = `5-minutersspärr nådd: Översteg ${limits.maxCallsPer5Min} anrop under 5 minuter.`;
}
if (reason) {
const resume = await promptCircuitPauseAndResume(reason, estimatedTokens, callerName);
if (!resume) {
throw new Error(`🛑 Processen avbruten av användaren efter nödbroms.`);
}
}
circuitState.callHistory.push({ ts: now, tokens: estimatedTokens, caller: callerName });
}
function promptCircuitPauseAndResume(reason, tokens, caller) {
return new Promise((resolve) => {
_circuitModalResolve = resolve;
circuitState.isTripped = true;
circuitState.tripReason = reason;
const reasonEl = document.getElementById('circuitTripReasonText');
if (reasonEl) {
reasonEl.innerHTML = `<strong>${escapeHtml(reason)}</strong><br><span style="color:#fef08a;">Anropet har pausats i minnet utan att krascha! Välj ett alternativ nedan för att fortsätta eller avbryta:</span>`;
}
openModal('circuitModal');
});
}
function resolveCircuitModal(action) {
closeModal('circuitModal');
circuitState.isTripped = false;
circuitState.tripReason = '';
if (action === 'raise_heavy') {
temporarilyRaiseCircuitBreaker(15, 'heavy');
if (_circuitModalResolve) { _circuitModalResolve(true); _circuitModalResolve = null; }
} else if (action === 'raise_max') {
temporarilyRaiseCircuitBreaker(20, 'max');
if (_circuitModalResolve) { _circuitModalResolve(true); _circuitModalResolve = null; }
} else if (action === 'continue_once') {
// Släpp igenom detta enskilda anrop
circuitBypassUntil = Date.now() + 5000;
if (_circuitModalResolve) { _circuitModalResolve(true); _circuitModalResolve = null; }
} else {
// Avbryt
if (_circuitModalResolve) { _circuitModalResolve(false); _circuitModalResolve = null; }
}
}
function tripCircuitBreaker(reason) {
circuitState.isTripped = true;
circuitState.tripReason = reason;
const reasonEl = document.getElementById('circuitTripReasonText');
if (reasonEl) reasonEl.textContent = reason;
openModal('circuitModal');
}
function resetCircuitBreaker() {
circuitState.isTripped = false;
circuitState.tripReason = '';
circuitState.callHistory = [];
closeModal('circuitModal');
if (_circuitModalResolve) { _circuitModalResolve(true); _circuitModalResolve = null; }
showAutosaveToast('🟢 Automatsäkringen är återställd!');
}
// --- STRAY-AWAY FILTER (FOKUSVAKT / SIDOSPÅRS-RADAR) ---
let _strayModalResolve = null;
function toggleStrayFilter() {
uiPrefs.strayFilter = !uiPrefs.strayFilter;
saveUiPrefs();
applyUiPrefsToDom();
showAutosaveToast(uiPrefs.strayFilter
? '🎯 Fokusvakt PÅ: Jag varnar om du glider iväg i ett nytt ämne!'
: '🎯 Fokusvakt AV: Fritt spår i konversationen.');
}
function extractSignificantWords(text = '') {
const stop = new Set(['jag', 'att', 'det', 'som', 'एक', 'och', 'för', 'med', 'har', 'inte', 'om', 'var', 'vad', 'hur', 'kan', 'ska', 'vill', 'men', 'eller', 'från', 'till', 'när', 'här', 'där', 'den', 'detta', 'mina', 'dina', 'vara', 'blir', 'blev', 'skulle', 'kunna', 'också', 'bara', 'lite', 'mycket', 'finns', 'efter', 'över', 'under']);
return String(text).toLowerCase()
.replace(/[^a-zåäö0-9\s]/gi, ' ')
.split(/\s+/)
.filter(w => w.length >= 4 && !stop.has(w));
}
function askStrayConfirmation(threadSubj, promptSummary) {
return new Promise(resolve => {
_strayModalResolve = resolve;
const subjEl = document.getElementById('strayThreadSubject');
const prevEl = document.getElementById('strayPromptPreview');
if (subjEl) subjEl.textContent = threadSubj;
if (prevEl) prevEl.textContent = promptSummary;
openModal('strayModal');
});
}
function resolveStrayModal(choice) {
closeModal('strayModal');
if (_strayModalResolve) {
const fn = _strayModalResolve;
_strayModalResolve = null;
fn(choice);
}
}
async function checkStrayAwayRisk(thread, newPromptText) {
const wordsNew = extractSignificantWords(newPromptText);
if (wordsNew.length < 4) return 'send_anyway'; // Mycket korta svar ("ja", "kör på det") släpps alltid igenom
const firstMsgs = (thread.messages || []).slice(0, 4).map(m => m.text || '').join(' ');
const anchorCorpus = `${thread.name || ''} ${thread.memory || ''} ${firstMsgs}`;
const anchorSet = new Set(extractSignificantWords(anchorCorpus));
if (anchorSet.size < 3) return 'send_anyway';
// Steg 1: 0 ms lokal nyckelordsjämförelse (JavaScript-vakt)
const overlap = wordsNew.filter(w => anchorSet.has(w) || Array.from(anchorSet).some(aw => aw.slice(0, 5) === w.slice(0, 5)));
if (overlap.length > 0) return 'send_anyway';
// Steg 2: Om 0 gemensamma kärnord hittades OCH Gemini Flash-Lite finns tillgänglig, fråga Flash-Lite på ~150 ms
let topicShiftSummary = `"${newPromptText.slice(0, 110)}${newPromptText.length > 110 ? '...' : ''}"`;
const anchorPreview = `${thread.name}: "${firstMsgs.slice(0, 120).replace(/\s+/g, ' ')}..."`;
if (hasLiveKey('gemini') && !circuitState.isTripped) {
try {
const judgeSys = [
'Du är en strikt Fokusvakt (Stray-Away Filter).',
'Avgör om användarens NYA FRÅGA håller sig till TRÅDENS ÄMNE eller om personen har glidit in på ett helt orelaterat sidospår.',
'Svara ENBART med JSON: {"onTopic": true/false, "detectedTopic": "Kort beskrivning av det nya spåret på svenska"}'
].join('\n');
const judgePrompt = `TRÅDENS ÄMNE: ${anchorPreview}\n\nNYA FRÅGA: ${newPromptText}`;
const r = await callAI('gemini', 'gemini-3.5-flash-lite', [{ role: 'user', text: judgePrompt }], judgeSys, {
maxTokens: 150,
noTools: true,
callerName: 'Fokusvakt (Stray-Away)'
});
chargeLedger('gemini', 'gemini-3.5-flash-lite', r.inTok ?? 120, r.outTok ?? 40);
const m = r.text.match(/\{[\s\S]*\}/);
if (m) {
const parsed = JSON.parse(m[0]);
if (parsed.onTopic === true) return 'send_anyway';
if (parsed.detectedTopic) {
topicShiftSummary = `${parsed.detectedTopic} — ("${newPromptText.slice(0, 80)}...")`;
}
}
} catch (e) {
}
}
return await askStrayConfirmation(anchorPreview, topicShiftSummary);
}