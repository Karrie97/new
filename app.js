// 核心游戏逻辑（简化版）
// 请在 data 数组中填入每组图片的 diffs（数组，包含 x,y,r 百分比）

const data = [
  {
    id: "set1",
    name: "组 1",
    orig: "images/set1/orig.jpg",
    mod:  "images/set1/mod.jpg",
    // 在注释工具中标注后把 diffs 填入这里
    diffs: [ /* { x:30, y:40, r:4 }, ... */ ]
  },
  {
    id: "set2",
    name: "组 2",
    orig: "images/set2/orig.jpg",
    mod:  "images/set2/mod.jpg",
    diffs: []
  },
  {
    id: "set3",
    name: "组 3",
    orig: "images/set3/orig.jpg",
    mod:  "images/set3/mod.jpg",
    diffs: []
  }
];

// ---------- UI 元素 ----------
const startBtn = document.getElementById("startBtn");
const gamePanel = document.getElementById("game");
const landing = document.getElementById("landing");
const resultPanel = document.getElementById("result");
const origImg = document.getElementById("origImg");
const modImg = document.getElementById("modImg");
const overlay = document.getElementById("overlay");
const modWrap = document.getElementById("modWrap");
const foundCountEl = document.getElementById("foundCount");
const currentIdxEl = document.getElementById("currentIdx");
const totalSetsEl = document.getElementById("totalSets");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const scoreEl = document.getElementById("score");
const totalTimeEl = document.getElementById("totalTime");
const playAgain = document.getElementById("playAgain");
const currentTimer = document.getElementById("timer");

// QR controls
const genQr = document.getElementById("genQr");
const qrUrl = document.getElementById("qrUrl");
const qrcodeDiv = document.getElementById("qrcode");

// state
let sessionId = null;
let assignedSets = []; // array of data entries (2)
let currentIndex = 0;   // 0..assignedSets.length-1
let foundThisSet = [];  // booleans per diff in current set
let totalFound = 0;
let totalScore = 0;
let startTime = null;
let timerInterval = null;

function createSessionIfNeeded(){
  sessionId = localStorage.getItem("spotdiff_session_id");
  if(!sessionId){
    sessionId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
    localStorage.setItem("spotdiff_session_id", sessionId);
  }
}

function loadAssigned(){
  const key = "spotdiff_assign_" + sessionId;
  const cached = localStorage.getItem(key);
  if(cached){
    try{
      const arr = JSON.parse(cached);
      if(Array.isArray(arr) && arr.length===2){
        assignedSets = arr;
        return;
      }
    }catch(e){}
  }
  const ids = data.map(d=>d.id);
  shuffleArray(ids);
  const pick = ids.slice(0,2);
  assignedSets = pick.map(id=> data.find(d=>d.id===id));
  localStorage.setItem(key, JSON.stringify(assignedSets));
}

function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } }

function startGame(){
  createSessionIfNeeded();
  loadAssigned();
  currentIndex = 0;
  totalFound = 0;
  totalScore = 0;
  startTime = Date.now();
  startTimer();
  landing.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  resultPanel.classList.add("hidden");
  totalSetsEl.textContent = assignedSets.length;
  showCurrentSet();
}

function showCurrentSet(){
  const set = assignedSets[currentIndex];
  currentIdxEl.textContent = (currentIndex+1);
  foundThisSet = set.diffs.map(()=>false);
  foundCountEl.textContent = foundThisSet.filter(Boolean).length;
  origImg.src = set.orig;
  modImg.src = set.mod;
  nextBtn.disabled = true;
  overlay.innerHTML = "";
}

function startTimer(){
  clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    const sec = Math.floor((Date.now()-startTime)/1000);
    currentTimer.textContent = formatTime(sec);
  }, 500);
}

function stopTimer(){
  clearInterval(timerInterval);
  timerInterval = null;
}

function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

modWrap.addEventListener("click", (e)=>{
  const img = modImg;
  if(!img.complete) return;
  const rect = img.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const pctX = (clickX / rect.width) * 100;
  const pctY = (clickY / rect.height) * 100;

  handleClickAt(pctX, pctY, clickX, clickY, rect);
});

function handleClickAt(pctX, pctY, clientX, clientY, imgRect){
  const set = assignedSets[currentIndex];
  const diffs = set.diffs;
  for(let i=0;i<diffs.length;i++){
    if(foundThisSet[i]) continue;
    const d = diffs[i];
    const dx = pctX - d.x;
    const dy = pctY - d.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist <= d.r){
      foundThisSet[i] = true;
      totalScore += 1;
      totalFound += 1;
      markHit(d.x, d.y, d.r, imgRect);
      foundCountEl.textContent = foundThisSet.filter(Boolean).length;
      if(foundThisSet.filter(Boolean).length >= 3){
        nextBtn.disabled = false;
      }
      return;
    }
  }
  flashMiss(clientX, clientY);
}

function markHit(pctX, pctY, rPct, imgRect){
  const w = imgRect.width;
  const left = (pctX/100) * w;
  const top = (pctY/100) * imgRect.height;
  const radiusPx = (rPct/100) * w;
  const el = document.createElement("div");
  el.className = "mark";
  el.style.width = (radiusPx*2) + "px";
  el.style.height = (radiusPx*2) + "px";
  el.style.left = left + "px";
  el.style.top = top + "px";
  overlay.appendChild(el);
}

function flashMiss(clientX, clientY){
  const rect = modImg.getBoundingClientRect();
  const x = clientX;
  const y = clientY;
  const el = document.createElement("div");
  el.className = "mark";
  el.style.borderColor = "rgba(200,200,200,0.9)";
  el.style.width = "24px";
  el.style.height = "24px";
  el.style.left = (x - rect.left) + "px";
  el.style.top = (y - rect.top) + "px";
  overlay.appendChild(el);
  setTimeout(()=> el.remove(), 600);
}

nextBtn.addEventListener("click", ()=>{
  currentIndex++;
  if(currentIndex >= assignedSets.length){
    finishGame();
  }else{
    showCurrentSet();
  }
});

restartBtn.addEventListener("click", ()=>{
  const key = "spotdiff_assign_" + sessionId;
  localStorage.removeItem(key);
  startGame();
});

function finishGame(){
  stopTimer();
  gamePanel.classList.add("hidden");
  resultPanel.classList.remove("hidden");
  scoreEl.textContent = totalScore;
  const sec = Math.floor((Date.now()-startTime)/1000);
  totalTimeEl.textContent = formatTime(sec);
}

playAgain.addEventListener("click", ()=>{
  localStorage.removeItem("spotdiff_assign_" + sessionId);
  startGame();
});

startBtn.addEventListener("click", startGame);

// QR generation (index.html 已引用 qrcode lib)
if(genQr){
  genQr.addEventListener("click", ()=>{
    const url = qrUrl.value.trim();
    if(!url) return alert("请填写要生成二维码的 URL");
    qrcodeDiv.innerHTML = "";
    const q = new QRCode(qrcodeDiv, {
      text: url,
      width: 220,
      height: 220
    });
  });
}

// init
createSessionIfNeeded();
