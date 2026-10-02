import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const content=readFileSync(new URL('../web/content.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');

class Element {
 constructor(id='',hidden=false){this.id=id;this.hidden=hidden;this.children=[];this.attrs={};this.listeners={};this.style={setProperty(){}};this.textContent='';this.value='';this.disabled=false;this.scrollTop=0;this.scrollHeight=3000;this.clientHeight=400;this.classes=new Set();this.classList={add:s=>this.classes.add(s),contains:s=>this.classes.has(s),toggle:(s,b)=>{b=b??!this.classes.has(s);b?this.classes.add(s):this.classes.delete(s);return b;}};}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 append(e){this.children.push(e);}replaceChildren(...es){this.children=es;}remove(){}focus(){}pause(){}load(){}play(){return Promise.resolve();}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}removeEventListener(){}
 querySelector(k){return this.children.find(e=>e.id===k)||(this.children.push(new Element(k)),this.children.at(-1));}
 closest(){return new Element();}showModal(){this.open=true;}close(){this.open=false;}
 async emit(type='click',props={}){for(const fn of this.listeners[type]||[])await fn({target:this,preventDefault(){},...props});}
}
function setup({mediaError,initialStorage={}}={}){
 const nodes=new Map();for(const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g)||[]){const id=tag.match(/id="([^"]+)"/)[1];nodes.set(id,new Element(id,/\bhidden\b/.test(tag)));}
 const get=id=>nodes.get(id)||new Element(id),storage=new Map(Object.entries(initialStorage)),timeouts=new Map();let clock=0,seq=0;const downloads=[];let recorder,stream;
 class Recorder{static isTypeSupported(){return true;}constructor(s,o){stream=s;recorder=this;this.mimeType=o.mimeType||'video/webm';this.state='inactive';}start(){this.state='recording';}pause(){this.state='paused';}resume(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['synthetic test recording'],{type:this.mimeType})});this.onstop();}}
 const tracks=[{readyState:'live',stop(){this.readyState='ended';}}];
 const document={getElementById:get,documentElement:new Element(),body:new Element(),querySelector(k){return k==='dialog[open]'?[...nodes.values()].find(x=>x.open)||null:new Element();},createElement(k){const e=new Element(k);if(k==='a')e.click=()=>downloads.push(e.download);return e;},createTextNode(t){const e=new Element();e.textContent=t;return e;},addEventListener(){}};
 const window={addEventListener(){},isSecureContext:true,MediaRecorder:Recorder};
 const context=vm.createContext({window,document,navigator:{mediaDevices:{async getUserMedia(){if(mediaError)throw {name:mediaError};return {getTracks:()=>tracks};}}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>clock},Blob,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},MediaRecorder:Recorder,setTimeout:(f)=>{timeouts.set(++seq,f);return seq;},clearTimeout:id=>timeouts.delete(id),setInterval:()=>++seq,clearInterval(){},requestAnimationFrame:()=>++seq,cancelAnimationFrame(){},console});
 get('mediaMode').value='av';get('mirrorButton').setAttribute('aria-pressed','true');
 vm.runInContext(content,context);vm.runInContext(app,context);
 return {get,storage,downloads,tracks,recorder:()=>recorder,advance(ms){clock+=ms;},async tick(){const callbacks=[...timeouts.values()];timeouts.clear();for(const f of callbacks)f();await Promise.resolve();},click:(id,props)=>get(id).emit('click',props)};
}
test('demo has six cards, neutral defaults and isolated storage',()=>{
 const oldKey='another-rehearsal-instance-v1';
 const s=setup({initialStorage:{[oldKey]:JSON.stringify({script:'PRIVATE SENTINEL'})}});
 assert.equal(s.get('scriptText').children[0].textContent,'A different way to think about flight');
 assert.equal(s.get('cueNumber').textContent,'CARD 1 OF 6');assert.equal(s.get('recordButton').disabled,true);
});
test('cue navigation clamps, editing persists and HTML stays literal text',async()=>{
 const s=setup();await s.click('cueTab');await s.click('nextCard');assert.equal(s.get('cueNumber').textContent,'CARD 2 OF 6');
 for(let i=0;i<10;i++)await s.click('nextCard');assert.equal(s.get('cueNumber').textContent,'CARD 6 OF 6');assert.equal(s.get('nextCard').disabled,true);
 await s.click('scriptTab');await s.click('editButton');s.get('textEditor').value='<img src=x onerror=alert(1)>';await s.get('textEditor').emit('input');await s.click('doneEditButton');
 assert.equal(s.get('scriptText').children[0].textContent,'<img src=x onerror=alert(1)>');assert.equal(s.get('scriptText').children[0].children.length,0);
 assert.equal(JSON.parse(s.storage.get('speech-studio-public-spacex-v1')).script,'<img src=x onerror=alert(1)>');
});
test('recording countdown, pause, resume, stop and download with synthetic media',async()=>{
 const s=setup();await s.click('enableButton');assert.equal(s.get('recordButton').disabled,false);
 await s.click('recordButton');assert.equal(s.get('countdownOverlay').hidden,false);for(let i=0;i<3;i++)await s.tick();
 assert.equal(s.recorder().state,'recording');s.advance(2000);await s.click('pauseButton');assert.equal(s.recorder().state,'paused');assert.equal(s.get('elapsedTime').textContent,'00:02');
 s.advance(5000);await s.click('pauseButton');s.advance(1000);await s.click('stopButton');assert.equal(s.get('elapsedTime').textContent,'00:03');
 assert.equal(s.get('takeResult').hidden,false);assert.match(s.get('takeSummary').textContent,/Video take ready/);assert.ok(s.tracks.every(t=>t.readyState==='ended'));
 await s.click('downloadButton');assert.match(s.downloads[0],/^speech-studio-take-.*\.webm$/);
});
test('cancelled countdown creates no recorder; permission denial is explained',async()=>{
 const s=setup();await s.click('enableButton');await s.click('recordButton');await s.click('cancelCountdown');for(let i=0;i<4;i++)await s.tick();assert.equal(s.recorder(),undefined);
 const denied=setup({mediaError:'NotAllowedError'});await denied.click('enableButton');assert.equal(denied.get('recordButton').disabled,true);assert.match(denied.get('mediaError').textContent,/Permission wasn’t granted/);
});
test('microphone-only recordings use audio types and timer shows overtime',async()=>{
 const s=setup();s.get('mediaMode').value='audio';await s.get('mediaMode').emit('change');await s.click('enableButton');await s.click('recordButton');for(let i=0;i<3;i++)await s.tick();s.advance(605000);await s.click('pauseButton');assert.match(s.get('timerMessage').textContent,/over target/);await s.click('stopButton');assert.match(s.get('takeSummary').textContent,/Audio take ready/);await s.click('downloadButton');assert.match(s.downloads[0],/\.webm$/);
});
test('PDF bundle, local renderer and deploy configuration are complete',()=>{
 const pdf=readFileSync(new URL('../web/demo/spacex-demo.pdf',import.meta.url));assert.ok(pdf.subarray(0,5).equals(Buffer.from('%PDF-')));assert.equal((pdf.toString().match(/\/Type \/Page\b/g)||[]).length,6);
 const slides=readFileSync(new URL('../web/slides.js',import.meta.url),'utf8');assert.match(slides,/isEvalSupported: false/);assert.match(slides,/100 \* 1024 \* 1024/);assert.match(slides,/new URL\('\.\/demo\/spacex-demo.pdf'/);
 assert.ok(html.includes('Content-Security-Policy'));assert.ok(html.includes('No SpaceX or NASA affiliation'));
});
