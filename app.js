// Persondata laddas från data/people.js.

let round=0,score=0,streak=0,highScore=0,answered=false,lifelineUsed=false;
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
let deck=shuffle([...PEOPLE]);
const correctHistory=[];
const map=document.getElementById("map"), world=document.getElementById("mapWorld"), birthPin=document.getElementById("birthPin"), deathPin=document.getElementById("deathPin"), guessBox=document.querySelector(".guess-area");
function yearOnly(date){const m=date.match(/\d{1,4}/g);return m?m[m.length-1]:date}
function project([lat,lon]){const w=map.clientWidth,h=map.clientHeight;return{x:((lon+180)/360)*w,y:((85-lat)/145)*h}}
function setZoomAndCenter(a,d){
 const w=map.clientWidth,h=map.clientHeight;
 // Zoom only as much as needed to keep BOTH pins comfortably visible.
 // The world image is transformed, while pins stay outside that transformed
 // layer so their physical size never changes.
 const padX=190,padY=145;
 const dx=Math.abs(d.x-a.x),dy=Math.abs(d.y-a.y);
 const maxScale=2.65;
 let scale=Math.min(maxScale,Math.max(1.0,Math.min((w-padX*2)/Math.max(dx,1),(h-padY*2)/Math.max(dy,1))));
 if(dx<2&&dy<2) scale=4.0;
 const cx=(a.x+d.x)/2,cy=(a.y+d.y)/2;
 let tx=w/2-cx*scale,ty=h/2-cy*scale;
 const minTx=w-w*scale,maxTx=0,minTy=h-h*scale,maxTy=0;
 tx=Math.max(minTx,Math.min(maxTx,tx));
 ty=Math.max(minTy,Math.min(maxTy,ty));
 world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
 return {scale,tx,ty};
}
function screenPoint(base,view){
 return {x:base.x*view.scale+view.tx,y:base.y*view.scale+view.ty};
}
function placePins(p){
 const a=project(p.b),d=project(p.d);
 const view=setZoomAndCenter(a,d);
 const exactBirth=screenPoint(a,view), exactDeath=screenPoint(d,view);
 let sa={...exactBirth},sd={...exactDeath};
 const distance=Math.hypot(exactDeath.x-exactBirth.x,exactDeath.y-exactBirth.y);
 const anchor=document.getElementById("geoAnchor");
 const birthConnector=document.getElementById("birthConnector");
 const deathConnector=document.getElementById("deathConnector");

 // If the two real locations are too close to distinguish on screen,
 // separate the visual pins only a few pixels around their TRUE location.
 // Thin connectors make it explicit that both pins belong to that exact
 // geographic point; the pins are never moved to another region.
 if(distance < 70){
   const cx=(exactBirth.x+exactDeath.x)/2;
   const cy=(exactBirth.y+exactDeath.y)/2;
   let ux=1,uy=0;
   if(distance > 0.001){
     ux=(exactDeath.x-exactBirth.x)/distance;
     uy=(exactDeath.y-exactBirth.y)/distance;
   }
   const px=-uy,py=ux;
   const separation=Math.max(18,Math.min(28,35-distance*.15));
   sa={x:cx-px*separation,y:cy-py*separation};
   sd={x:cx+px*separation,y:cy+py*separation};
   anchor.style.left=cx+"px"; anchor.style.top=cy+"px"; anchor.style.display="block";
   drawConnector(birthConnector,exactBirth,sa);
   drawConnector(deathConnector,exactDeath,sd);
 }else{
   anchor.style.display="none";
   birthConnector.style.display="none";
   deathConnector.style.display="none";
 }

 birthPin.style.left=sa.x+"px";birthPin.style.top=sa.y+"px";
 deathPin.style.left=sd.x+"px";deathPin.style.top=sd.y+"px";
 document.getElementById("birthYear").textContent=yearOnly(p.birth);
 document.getElementById("deathYear").textContent=yearOnly(p.death);
 positionGuessBox(sd);
}
function drawConnector(el,from,to){
 const dx=to.x-from.x,dy=to.y-from.y;
 const len=Math.hypot(dx,dy);
 if(len<2){el.style.display="none";return;}
 el.style.left=from.x+"px";
 el.style.top=from.y+"px";
 el.style.width=len+"px";
 el.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
 el.style.display="block";
}
function positionGuessBox(d){
 const pad=12,w=guessBox.offsetWidth||270,h=guessBox.offsetHeight||64;
 // The guess UI belongs to the death pin: always diagonally down/right.
 let x=d.x+38,y=d.y+38;
 // Keep it inside the visible map without moving it away from the death pin.
 x=Math.min(x,map.clientWidth-w-pad);
 y=Math.min(y,map.clientHeight-h-pad);
 x=Math.max(pad,x);y=Math.max(48,y);
 guessBox.style.left=x+"px";guessBox.style.top=y+"px";
}
function loadRound(){
 answered=false;document.getElementById("guess").value="";document.getElementById("guess").disabled=false;
 document.getElementById("result").className="result hidden";document.getElementById("nextBtn").className="next hidden";
 document.getElementById("runStatus").textContent="Pågående";
 const p=deck[round%deck.length];
 document.getElementById("runLabel").textContent=`Runda ${round+1}`;document.getElementById("highScore").textContent=highScore;
 document.getElementById("lifelineText").textContent=lifelineUsed?"Livlinan är använd":"1 livlina kvar";document.getElementById("lifelineBtn").disabled=lifelineUsed;
 requestAnimationFrame(()=>placePins(p));
}
function normalize(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim().replace(/\s+/g," ")}
function levenshtein(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[b.length]}
function fuzzyMatch(answer,guess){
 if(!guess)return false;
 if(answer===guess)return true;
 // Never accept a partial name. Each alias is a complete acceptable form
 // (e.g. "curie", "da vinci", or "leonardo da vinci").
 const d=levenshtein(answer,guess),max=Math.max(answer.length,guess.length);
 const allowed=max<=5?1:max<=9?2:Math.max(2,Math.floor(max*.18));
 return d<=allowed;
}
document.getElementById("guessForm").addEventListener("submit",e=>{
 e.preventDefault();
 if(answered)return;
 answered=true;
 const p=deck[round%deck.length],guess=normalize(document.getElementById("guess").value),correct=p.aliases.some(a=>fuzzyMatch(normalize(a),guess)),r=document.getElementById("result");
 r.className="result "+(correct?"correct":"wrong");
 if(correct){
   score++;streak++;highScore=Math.max(highScore,score);
   document.getElementById("runStatus").textContent="Rätt!";
   r.innerHTML=`<h3>Rätt! ${p.name}</h3><p>Född ${p.birth}. Död ${p.death}.</p>`;
   correctHistory.push({round:round+1,name:p.name,birth:p.birth,death:p.death});
   renderHistory();
 }else{
   streak=0;
   // A wrong guess ends the current run. The next run must start at round 1.
   round=0;
   deck=shuffle([...PEOPLE]);
   document.getElementById("runLabel").textContent="Runda 1";
   document.getElementById("runStatus").textContent="Rundan är slut";
   r.innerHTML=`<h3>Fel gissning.</h3><p>Rätt svar var <strong>${p.name}</strong>. Född ${p.birth} i ${p.bp}; dog ${p.death} i ${p.dp}.</p><p><strong>Rundan är slut.</strong> Nästa gång börjar du om från noll.</p>`;
   document.getElementById("nextBtn").textContent="Ny runda →";
   document.getElementById("nextBtn").className="next";
 }
 document.getElementById("highScore").textContent=highScore;
 document.getElementById("guess").disabled=true;
 requestAnimationFrame(()=>placePins(p));
 if(correct){setTimeout(()=>{
   const previous=deck[round%deck.length];
   round++;
   if(round%deck.length===0){
     deck=shuffle([...PEOPLE]);
     if(deck.length>1 && deck[0]===previous){[deck[0],deck[1]]=[deck[1],deck[0]]}
   }
   loadRound();
 },850)}
});
function renderHistory(){
 const list=document.getElementById("historyList");
 if(!correctHistory.length){list.innerHTML='<div class="history-empty">Inga rätta gissningar ännu.</div>';return;}
 list.innerHTML=correctHistory.slice().reverse().map(x=>`<div class="history-item"><span class="history-round">${x.round}</span><span><strong>${x.name}</strong><small>${x.birth} → ${x.death}</small></span></div>`).join("");
}
document.getElementById("runLabel").addEventListener("click",()=>document.getElementById("historyPanel").classList.toggle("hidden"));
document.addEventListener("click",e=>{const panel=document.getElementById("historyPanel"),btn=document.getElementById("runLabel");if(!panel.contains(e.target)&&e.target!==btn)panel.classList.add("hidden")});
document.getElementById("lifelineBtn").addEventListener("click",()=>{if(lifelineUsed||answered)return;lifelineUsed=true;const p=deck[round%deck.length];document.getElementById("lifelineBtn").disabled=true;document.getElementById("lifelineText").textContent="Livlinan är använd";const r=document.getElementById("result");r.className="result";r.innerHTML=`<h3>Livlina</h3><p>En ledtråd: <strong>${p.hint}</strong>.</p>`;requestAnimationFrame(()=>placePins(p))});
document.getElementById("nextBtn").addEventListener("click",()=>{
 score=0;
 streak=0;
 lifelineUsed=false;
 deck=shuffle([...PEOPLE]);
 document.getElementById("nextBtn").textContent="Nästa →";
 loadRound();
});
window.addEventListener("resize",loadRound);loadRound();
