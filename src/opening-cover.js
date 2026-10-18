'use strict';
(function(){
 const cover=document.getElementById('opening-cover');if(!cover)return;
 const app=document.getElementById('app'),prompt=cover.querySelector('.cover-enter');
 const lines=[...cover.querySelectorAll('[data-cover-line]')],texts=lines.map(el=>el.textContent);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let timer=null,line=0,char=0,requested=false,ready=false,leaving=false;
 app.inert=true;
 function finish(){
  if(leaving||!requested||!ready)return;leaving=true;clearTimeout(timer);
  cover.classList.add('leaving');
  setTimeout(()=>{cover.remove();app.inert=false;window.dispatchEvent(new Event('null-city-cover-entered'));document.getElementById('start')?.focus({preventScroll:true});},reduce?0:720);
 }
 function enter(e){e.preventDefault();e.stopPropagation();requested=true;
  if(!ready)prompt.textContent='[CONNECTING TO THE CITY…]';finish();
 }
 cover.addEventListener('click',enter);
 cover.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key))enter(e);else e.stopPropagation();});
 window.addEventListener('null-city-menu-ready',()=>{ready=true;finish();},{once:true});
 if(!reduce){
  lines.forEach(el=>el.textContent='');
  function type(){
   if(leaving)return;
   lines[line].classList.add('typing');lines[line].textContent=texts[line].slice(0,++char);
   if(char===texts[line].length){lines[line].classList.remove('typing');line++;char=0;if(line===lines.length)return;timer=setTimeout(type,260);}
   else timer=setTimeout(type,18);
  }
  timer=setTimeout(type,450);
 }
 cover.focus({preventScroll:true});
})();
