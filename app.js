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
  if(id === "homePage") renderHome();
  if(id === "studyPage") { syncClassSelects(); loadSections(); newQuestion(); }
  window.scrollTo(0,0);
}

function setTheme(theme){
  document.body.classList.toggle("dark", theme === "dark");
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
  $("statusTitle").textContent = "Current Status: " + labelFor(license);
  $("statusText").textContent = license === "extra"
    ? "You already hold the highest U.S. Amateur Radio license class. You can still use the app to review any pool."
    : "Your dashboard is set up to help you study for the next license level.";

  const levels = ["technician","general","extra"];
  $("licensePath").innerHTML = levels.map(l => {
    let cls = "";
    if((license === "technician" && l === "technician") || (license === "general" && ["technician","general"].includes(l)) || license === "extra") cls = "done";
    if(l === next && license !== "extra") cls = "next";
    return `<span class="${cls}">${labelFor(l)}</span>`;
  }).join("");

  $("recommendedTitle").textContent = license === "extra" ? "Review Any License Class" : "Study " + labelFor(next);
  $("recommendedText").textContent = license === "extra"
    ? "Use Technician, General, or Extra mode for refreshers and practice."
    : "Based on your current license level, this is your next recommended certification.";
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
}

function syncClassSelects(){
  $("classSelect").value = state.currentClass;
  $("testClassSelect").value = state.currentClass;
  $("studyTitle").textContent = labelFor(state.currentClass) + " Study";
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
  const sec = $("sectionSelect").value;
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

function renderQuestion(q){
  $("questionId").textContent = q.id + " • " + (q.sectionName || q.section);
  $("questionText").textContent = q.question;
  $("resultBox").classList.add("hidden");
  $("explanationDetails").open = false;
  $("answerList").innerHTML = q.answers.map((a,i) => `<button onclick="answerQuestion(${i}, this)"><strong>${String.fromCharCode(65+i)}.</strong> ${a}</button>`).join("");
}

function getStats(){
  const raw = localStorage.getItem("stats-" + state.currentClass);
  return raw ? JSON.parse(raw) : {seen:0, correct:0, missed:0, missedIds:[]};
}

function saveStats(s){
  localStorage.setItem("stats-" + state.currentClass, JSON.stringify(s));
  renderStats();
}

function renderStats(){
  const s = getStats();
  $("seenStat").textContent = s.seen || 0;
  $("correctStat").textContent = s.correct || 0;
  $("missedStat").textContent = s.missed || 0;
}

function answerQuestion(choice, btn){
  const q = state.currentQuestion;
  const correct = q.correct;
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
    $("resultText").innerHTML = `<strong>Correct.</strong> Answer ${String.fromCharCode(65+correct)}.`;
  } else {
    s.missed++;
    s.missedIds = [...new Set([...(s.missedIds || []), q.id])];
    $("resultText").innerHTML = `<strong>Incorrect.</strong> Correct answer: ${String.fromCharCode(65+correct)}.`;
  }
  $("explanationText").textContent = q.explanation || "Explanation coming soon.";
  $("linkList").innerHTML = (q.links || []).map(l => `<a target="_blank" rel="noopener" href="${l.url}">${l.label}</a>`).join("");
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
  $("examProgress").textContent = `Question ${state.examIndex + 1} of ${state.exam.length}`;
  $("examQuestionText").textContent = q.question;
  $("examAnswerList").innerHTML = q.answers.map((a,i) => `<button onclick="answerExam(${i})"><strong>${String.fromCharCode(65+i)}.</strong> ${a}</button>`).join("");
}

function answerExam(choice){
  const q = state.exam[state.examIndex];
  if(choice === q.correct) state.examCorrect++;
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

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

const savedTheme = localStorage.getItem("theme") || "dark";
setTheme(savedTheme);
if(getLicense()) showPage("homePage");
renderStats();
