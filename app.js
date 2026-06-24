const APP_VERSION = "v3.0.1";
const APP_BUILD = "2026-06-24";
const POOL_META = {
  technician: "Technician 2026–2030",
  general: "General 2023–2027",
  extra: "Amateur Extra 2024–2028"
};

const pages = ["setupPage","homePage","studyPage","testPage","contactPage"];
const state = {
  currentClass: "technician",
  currentQuestion: null,
  exam: [],
  examIndex: 0,
  examCorrect: 0,
  reviewingMissed: false
};

function $(id){ return document.getElementById(id); }

function showPage(id){
  pages.forEach(p => $(p).classList.remove("active"));
  $(id).classList.add("active");
  if(id === "homePage") { renderHome(); renderProgressSummary(); }
  if(id === "studyPage") { syncClassSelects(); loadSections(); newQuestion(); renderMissedBySection(); }
  renderVersion();
  window.scrollTo(0,0);
}

function setTheme(theme){
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem("theme", theme);
}

function getLicense(){ return localStorage.getItem("currentLicense") || ""; }

function setLicense(level){
  localStorage.setItem("currentLicense", level);
  renderHome();
  showPage("homePage");
}

function nextClassFor(level){
  if(level === "none" || !level) return "technician";
  if(level === "technician") return "general";
  if(level === "general") return "extra";
  return "extra";
}

function labelFor(cls){
  return {none:"No License", technician:"Technician", general:"General", extra:"Amateur Extra"}[cls] || "No License";
}

function renderHome(){
  const license = getLicense() || "none";
  const next = nextClassFor(license);
  $("currentLicenseText").textContent = labelFor(license);
  $("nextCertText").textContent = license === "extra" ? "Review" : labelFor(next);
  $("recommendedText").textContent = license === "extra"
    ? "You already hold the highest U.S. Amateur Radio license class. Use the app to review any pool."
    : "Based on your current license level, this is your next recommended certification.";
  $("trackRibbon").textContent = license === "extra" ? "Current Track: Review" : "Current Track: " + labelFor(next) + " Class";
  $("techMark").textContent = (license === "technician" || license === "general" || license === "extra") ? "✓" : "";
  $("genMark").textContent = (license === "general" || license === "extra") ? "✓" : (next === "general" ? "►" : "");
  $("extraMark").textContent = license === "extra" ? "✓" : (next === "extra" ? "►" : "");
  state.currentClass = next;
}

function openStudyRecommended(){
  state.currentClass = nextClassFor(getLicense() || "none");
  showPage("studyPage");
}

function openTestRecommended(){
  state.currentClass = nextClassFor(getLicense() || "none");
  $("testClassSelect").value = state.currentClass;
  showPage("testPage");
}

function selectClass(cls){
  state.currentClass = cls;
  syncClassSelects();
  loadSections();
  renderStats();
  renderMissedBySection();
  renderVersion();
}

function syncClassSelects(){
  if($("classSelect")) $("classSelect").value = state.currentClass;
  if($("testClassSelect")) $("testClassSelect").value = state.currentClass;
  if($("studyTitle")) $("studyTitle").textContent = labelFor(state.currentClass) + " Study";
}

function pool(){
  return (window.QUESTION_BANK && window.QUESTION_BANK[state.currentClass]) || [];
}

function loadSections(){
  const sections = [...new Map(pool().map(q => [q.section, q.section + " - " + (q.sectionName || "Section")])).entries()];
  $("sectionSelect").innerHTML = `<option value="all">All Sections</option>` + sections.map(([id,label]) => `<option value="${id}">${label}</option>`).join("");
  $("questionCount").textContent = pool().length + " loaded";
}

function filteredPool(){
  let p = pool();
  const sec = $("sectionSelect") ? $("sectionSelect").value : "all";
  if(sec !== "all") p = p.filter(q => q.section === sec);
  if(state.reviewingMissed){
    const missed = new Set(getStats().missedIds || []);
    p = p.filter(q => missed.has(q.id));
  }
  return p;
}

function newQuestion(){
  state.reviewingMissed = false;
  const p = filteredPool();
  if(!p.length){
    $("questionId").textContent = "No question";
    $("questionText").textContent = "No questions available for this selection.";
    $("answerList").innerHTML = "";
    $("resultBox").classList.add("hidden");
    return;
  }
  state.currentQuestion = p[Math.floor(Math.random() * p.length)];
  renderQuestion(state.currentQuestion);
}

function reviewMissed(){
  state.reviewingMissed = true;
  const p = filteredPool();
  if(!p.length){
    $("questionId").textContent = "Review Missed";
    $("questionText").textContent = "No missed questions saved yet.";
    $("answerList").innerHTML = "";
    $("resultBox").classList.add("hidden");
    return;
  }
  state.currentQuestion = p[Math.floor(Math.random() * p.length)];
  renderQuestion(state.currentQuestion);
}


function getAnswerChoices(q){
  if(Array.isArray(q.answers)) return q.answers;
  if(Array.isArray(q.choices)) return q.choices;
  if(Array.isArray(q.options)) return q.options;

  const upper = ["A","B","C","D","E"].map(k => q[k]).filter(Boolean);
  if(upper.length) return upper;

  const lower = ["a","b","c","d","e"].map(k => q[k]).filter(Boolean);
  if(lower.length) return lower;

  const named = [q.answerA, q.answerB, q.answerC, q.answerD, q.answerE].filter(Boolean);
  if(named.length) return named;

  return [];
}

function getCorrectIndex(q){
  if(Number.isInteger(q.correct)) return q.correct;
  if(Number.isInteger(q.correctIndex)) return q.correctIndex;

  const raw = q.correct ?? q.answer ?? q.correctAnswer ?? q.key ?? q.correct_letter;
  if(typeof raw === "string"){
    const c = raw.trim().toUpperCase();
    if(["A","B","C","D","E"].includes(c)) return c.charCodeAt(0) - 65;
    const n = parseInt(c, 10);
    if(!Number.isNaN(n)) return n;
  }

  return 0;
}

function renderQuestion(q){
  const choices = getAnswerChoices(q);
  const questionText = q.question || q.prompt || q.text || "Question text unavailable.";

  $("questionId").textContent = (q.id || q.questionId || "Question") + " • " + (q.sectionName || q.section || "Question Pool");
  $("questionText").textContent = questionText;
  $("resultBox").classList.add("hidden");

  if(!choices.length){
    $("answerList").innerHTML = `<p class="pool-label">No answer choices found for this question. Check question data format.</p>`;
    return;
  }

  $("answerList").innerHTML = choices.map((a,i) =>
    `<button onclick="answerQuestion(${i}, this)"><strong>${String.fromCharCode(65+i)}.</strong> ${a}</button>`
  ).join("");
}

function getStats(){
  const raw = localStorage.getItem("stats-" + state.currentClass);
  return raw ? JSON.parse(raw) : {seen:0, correct:0, missed:0, missedIds:[]};
}

function saveStats(s){
  localStorage.setItem("stats-" + state.currentClass, JSON.stringify(s));
  renderStats();
  renderMissedBySection();
  renderProgressSummary();
}

function renderStats(){
  const s = getStats();
  if($("seenStat")) $("seenStat").textContent = s.seen || 0;
  if($("correctStat")) $("correctStat").textContent = s.correct || 0;
  if($("missedStat")) $("missedStat").textContent = s.missed || 0;
}

function answerQuestion(choice, btn){
  const q = state.currentQuestion;
  const correct = getCorrectIndex(q);
  const choices = getAnswerChoices(q);

  document.querySelectorAll("#answerList button").forEach((b,i) => {
    b.disabled = true;
    if(i === correct) b.classList.add("correct");
    if(i === choice && i !== correct) b.classList.add("wrong");
  });

  const s = getStats();
  s.seen++;

  if(choice === correct){
    s.correct++;
    s.missedIds = (s.missedIds || []).filter(id => id !== q.id);
    $("resultText").innerHTML = `<span class="result-badge good">Correct</span><span>Answer ${String.fromCharCode(65+correct)}</span>`;
  } else {
    s.missed++;
    s.missedIds = [...new Set([...(s.missedIds || []), q.id])];
    $("resultText").innerHTML = `<span class="result-badge bad">Incorrect</span><span>Correct Answer: ${String.fromCharCode(65+correct)}${choices[correct] ? ". " + choices[correct] : ""}</span>`;
  }

  $("resultBox").classList.remove("hidden");
  saveStats(s);
}

function startExam(){
  state.currentClass = $("testClassSelect").value;
  const p = [...pool()].sort(() => Math.random() - 0.5);
  const count = state.currentClass === "extra" ? 50 : 35;
  state.exam = p.slice(0, Math.min(count, p.length));
  state.examIndex = 0;
  state.examCorrect = 0;
  $("examResultCard").classList.add("hidden");
  $("examCard").classList.remove("hidden");
  renderExamQuestion();
}

function renderExamQuestion(){
  const q = state.exam[state.examIndex];
  if(!q){ finishExam(); return; }

  const choices = getAnswerChoices(q);
  $("examProgress").textContent = `Question ${state.examIndex + 1} of ${state.exam.length}`;
  $("examQuestionText").textContent = q.question || q.prompt || q.text || "Question text unavailable.";
  $("examAnswerList").innerHTML = choices.map((a,i) =>
    `<button onclick="answerExam(${i})"><strong>${String.fromCharCode(65+i)}.</strong> ${a}</button>`
  ).join("");
}

function answerExam(choice){
  const q = state.exam[state.examIndex];
  if(choice === getCorrectIndex(q)) state.examCorrect++;
  document.querySelectorAll("#examAnswerList button").forEach(b => b.disabled = true);
  setTimeout(nextExamQuestion, 250);
}

function nextExamQuestion(){
  state.examIndex++;
  if(state.examIndex >= state.exam.length) finishExam();
  else renderExamQuestion();
}

function finishExam(){
  $("examCard").classList.add("hidden");
  $("examResultCard").classList.remove("hidden");
  const passScore = state.currentClass === "extra" ? 37 : 26;
  $("examFinalScore").textContent = `Score: ${state.examCorrect} / ${state.exam.length}`;
  $("examPassFail").textContent = state.examCorrect >= passScore ? "PASS" : "Keep studying and try again.";
}

function clearStudyStats(){
  if(!confirm("Clear study stats and missed-question history for the selected license class?")) return;
  localStorage.removeItem("stats-" + state.currentClass);
  renderStats();
  renderMissedBySection();
  renderProgressSummary();
}

function getProgressForClass(cls){
  const oldClass = state.currentClass;
  state.currentClass = cls;
  const s = getStats();
  const count = ((window.QUESTION_BANK && window.QUESTION_BANK[cls]) || []).length;
  state.currentClass = oldClass;
  const seen = s.seen || 0;
  return {seen, count, pct: count ? Math.min(100, Math.round((seen / count) * 100)) : 0};
}

function renderProgressSummary(){
  const el = $("progressSummary");
  if(!el) return;
  el.innerHTML = ["technician","general","extra"].map(cls => {
    const p = getProgressForClass(cls);
    return `<div class="progress-row"><span>${labelFor(cls)}</span><strong>${p.pct}%</strong><small>${p.seen}/${p.count} seen</small></div>`;
  }).join("");
}

function renderMissedBySection(){
  const el = $("missedBySection");
  if(!el) return;
  const missed = new Set(getStats().missedIds || []);
  const groups = {};
  pool().forEach(q => {
    if(missed.has(q.id)){
      const key = q.section || "Other";
      groups[key] = (groups[key] || 0) + 1;
    }
  });
  const entries = Object.entries(groups);
  el.innerHTML = entries.length
    ? entries.map(([section,count]) => `<button class="secondary" onclick="reviewMissedSection('${section}')">${section}: ${count} missed</button>`).join("")
    : "<p>No missed questions saved for this license class.</p>";
}

function reviewMissedSection(section){
  state.reviewingMissed = true;
  const missed = new Set(getStats().missedIds || []);
  const p = pool().filter(q => missed.has(q.id) && q.section === section);
  if(!p.length) return;
  state.currentQuestion = p[Math.floor(Math.random() * p.length)];
  renderQuestion(state.currentQuestion);
}

function renderVersion(){
  document.querySelectorAll("[data-app-version]").forEach(el => el.textContent = APP_VERSION);
  document.querySelectorAll("[data-app-build]").forEach(el => el.textContent = APP_BUILD);
  document.querySelectorAll("[data-pool-version]").forEach(el => el.textContent = POOL_META[state.currentClass] || "Question pool");
}

function forceRefreshApp(){
  if(!confirm("Clear the offline app cache and reload the latest files?")) return;
  if("serviceWorker" in navigator){
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(reg => reg.unregister())))
      .then(() => caches.keys())
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => window.location.href = window.location.pathname + "?refresh=" + Date.now());
  } else {
    window.location.reload();
  }
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

setTheme(localStorage.getItem("theme") || "dark");
if(getLicense()) showPage("homePage");
renderStats();
renderVersion();
renderProgressSummary();
renderMissedBySection();
