'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const C = window.SPEECH_CONTENT;
 const storageKey = 'speech-studio-public-spacex-v1';
 let saved = {};
 try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
 let script = typeof saved.script === 'string' ? saved.script : C.script;
 let cards = C.cards.map((c,i) => ({...c, body: typeof saved.cards?.[i] === 'string' ? saved.cards[i] : c.body}));
 let targetSeconds = Number.isFinite(saved.targetSeconds) ? Math.max(10,Math.min(7200,saved.targetSeconds)) : 600, takeTargetSeconds = targetSeconds, practiceTarget = null;
 let mode = 'script', cardIndex = 0, editing = false;
 let fontSize = Number.isFinite(saved.fontSize) ? Math.max(20,Math.min(44,saved.fontSize)) : 27;
 let speed = Number.isFinite(saved.speed) ? Math.max(8,Math.min(80,saved.speed)) : 24;
 let scrolling = false, scrollRAF = 0, previousFrame = 0, scrollPosition = 0, resumeScroll = false;
 let stream = null, recorder = null, chunks = [], captureState = 'idle', selectedMedia = 'av';
 let elapsed = 0, startedAt = 0, timerId = 0, countdownId = 0, countdownGeneration = 0;
 let takeBlob = null, takeURL = null, takeType = '', takeDuration = 0, takeDownloaded = false;
 let toastId = 0, announcedMinute = 0, pendingConfirm = null;
 let requestingGeneration = 0;
 const titles = new Set(C.sections.map(s => s.title));
 const setText = (id,t) => { $(id).textContent = t; };
 const displayTime = sec => `${String(Math.floor(Math.max(0,sec)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,sec)%60)).padStart(2,'0')}`;
 const liveElapsed = () => elapsed + (captureState === 'recording' ? (performance.now()-startedAt)/1000 : 0);
 const toast = message => { clearTimeout(toastId); setText('toast',message); $('toast').hidden=false; toastId=setTimeout(()=>$('toast').hidden=true,4500); };
 const announce = message => setText('announcement',message);
 function save() {
  try { localStorage.setItem(storageKey,JSON.stringify({script,cards:cards.map(c=>c.body),fontSize,speed,targetSeconds})); setText('saveStatus','Saved in this browser'); }
  catch { setText('saveStatus','Browser storage unavailable'); toast('Your changes work in this tab, but can’t be saved here. Download your text to keep it.'); }
 }
 function wordCount() {
  const text = script.split(/\n\s*\n/).filter(p=>!titles.has(p.trim())&&!/^\d+:\d+ to \d+:\d+$/.test(p.trim())&&!/^\[[\s\S]*\]$/.test(p.trim())).join(' ');
  return (text.trim().match(/\S+/g)||[]).length;
 }
 function renderScript() {
  const root=$('scriptText');root.replaceChildren();
  script.split(/\n\s*\n/).forEach(raw=>{
   const part=raw.trim();if(!part)return;
   const el=document.createElement(titles.has(part)?'h3':'p');
   el.textContent=part;el.style.whiteSpace='pre-line';
   if (/^\d+:\d+ to \d+:\d+$/.test(part)) el.className='timing';
   else if (/^\[[\s\S]*\]$/.test(part)) el.className='stage-direction';
   root.append(el);
  });
  const count=wordCount();setText('wordCount',`${count.toLocaleString()} script words · cues aren’t spoken`);
 }
 function renderCard() {
  const card=cards[cardIndex];setText('cueNumber',`CARD ${cardIndex+1} OF ${cards.length}`);setText('cueTitle',card.title);setText('cueTime',`${card.time} checkpoint`);
  $('cueBody').replaceChildren();card.body.split('\n').filter(Boolean).forEach(line=>{const p=document.createElement('p');p.textContent=line;$('cueBody').append(p);});
  $('prevCard').disabled=cardIndex===0;$('nextCard').disabled=cardIndex===cards.length-1;
  $('cueDots').replaceChildren();cards.forEach((c,i)=>{const b=document.createElement('button');b.className='cue-dot'+(i===cardIndex?' active':'');b.setAttribute('aria-label',`Card ${i+1}: ${c.title}`);b.setAttribute('aria-pressed',String(i===cardIndex));b.addEventListener('click',()=>changeCard(i));$('cueDots').append(b);});
  $('cueView').scrollTop=0;
 }
 function changeCard(index){if(editing)return;cardIndex=Math.max(0,Math.min(cards.length-1,index));renderCard();announce(`Cue card ${cardIndex+1}: ${cards[cardIndex].title}`);}
 function applyFont(){document.documentElement.style.setProperty('--font-size',`${fontSize}px`);$('fontDown').disabled=fontSize<=20;$('fontUp').disabled=fontSize>=44;}
 function setScroll(on) {
  scrolling=!!on && mode==='script' && !editing;
  cancelAnimationFrame(scrollRAF);previousFrame=0;
  $('scrollButton').setAttribute('aria-pressed',String(scrolling));setText('scrollButton',scrolling?'Pause scroll':'Start scroll');
  if(scrolling){scrollPosition=$('scriptView').scrollTop;scrollRAF=requestAnimationFrame(scrollFrame);}
 }
 function scrollFrame(t) {
  if(!scrolling)return;
  if(previousFrame){const view=$('scriptView');scrollPosition+=speed*Math.min((t-previousFrame)/1000,.1);view.scrollTop=scrollPosition;
   if(view.scrollTop+view.clientHeight>=view.scrollHeight-2){setScroll(false);toast('End of script. Let your closing line land.');return;}}
  previousFrame=t;scrollRAF=requestAnimationFrame(scrollFrame);
 }
 function showMode(next) {
  if(editing)finishEditing();setScroll(false);mode=next;
  ['script','cue','learn'].forEach(m=>$(m+'Tab').classList.toggle('active',mode===m));
  ['script','cue','learn'].forEach(m=>{$(m+'Tab').setAttribute('aria-selected',String(mode===m));$(m+'Tab').tabIndex=mode===m?0:-1;});
  $('scriptView').hidden=mode!=='script';$('cueView').hidden=mode!=='cue';$('learnView').hidden=mode!=='learn';$('readerControls').hidden=mode==='learn';$('editButton').hidden=mode==='learn';document.dispatchEvent?.(new CustomEvent('studio:mode',{detail:mode}));
  $('scrollButton').disabled=mode!=='script';$('rewindButton').disabled=mode!=='script';$('scrollSpeed').disabled=mode!=='script';
  setText('editButton',mode==='script'?'Edit script':'Edit this card');
  setText('documentMeta',mode==='script'?'SPACE EXPLORATION · PRACTICE DEMO':'SIX CARDS · ELAPSED CHECKPOINTS');
 }
 function editText(){setScroll(false);editing=true;$('scriptView').hidden=true;$('cueView').hidden=true;$('editorView').hidden=false;$('readerControls').hidden=true;$('editButton').hidden=true;setText('editorLabel',mode==='script'?'Edit your script':`Edit card ${cardIndex+1}: ${cards[cardIndex].title}`);$('textEditor').value=mode==='script'?script:cards[cardIndex].body;$('textEditor').focus();}
 function updateEdit(){if(!editing)return;if(mode==='script')script=$('textEditor').value;else cards[cardIndex].body=$('textEditor').value;save();}
 function finishEditing(){updateEdit();editing=false;$('editorView').hidden=true;$('readerControls').hidden=false;$('editButton').hidden=false;$('scriptView').hidden=mode!=='script';$('cueView').hidden=mode!=='cue';$('learnView').hidden=mode!=='learn';$('readerControls').hidden=mode==='learn';$('editButton').hidden=mode==='learn';document.dispatchEvent?.(new CustomEvent('studio:mode',{detail:mode}));renderScript();renderCard();document.dispatchEvent?.(new CustomEvent('studio:script'));}
 function confirmAction(title,message,label='Continue') {
  if(pendingConfirm)return Promise.resolve(false);
  setText('confirmTitle',title);setText('confirmText',message);setText('confirmYes',label);$('confirmDialog').showModal();$('confirmCancel').focus();
  return new Promise(resolve=>pendingConfirm=resolve);
 }
 function resolveConfirm(yes){$('confirmDialog').close();const resolve=pendingConfirm;pendingConfirm=null;resolve?.(yes);}
 function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 function showError(message){setText('mediaError',message);$('mediaError').hidden=false;announce(message);}
 function clearError(){$('mediaError').hidden=true;}
 function updateCaptureUI() {
  const active=['recording','paused'].includes(captureState), ready=captureState==='ready', busy=['requesting','countdown','stopping'].includes(captureState), play=captureState==='playback';
  $('enableButton').disabled=busy;$('mediaMode').disabled=busy;
  $('recordButton').disabled=!ready||!window.MediaRecorder;$('recordButton').hidden=play;
  $('pauseButton').disabled=!active;$('stopButton').disabled=!active;$('pauseButton').hidden=play;$('stopButton').hidden=play;
  setText('pauseButton',captureState==='paused'?'Resume':'Pause');
  $('newTakeButton').hidden=!play;$('takeResult').hidden=!takeBlob||!play;
  $('cameraEmpty').hidden=!['idle','requesting'].includes(captureState);
  $('countdownOverlay').hidden=captureState!=='countdown';
  $('recordingBadge').hidden=!active;$('recordingBadge').classList.toggle('paused',captureState==='paused');
  setText('recordingText',captureState==='paused'?'Paused':'Recording');
  $('liveDot').className='status-dot'+(active?' recording':ready?' active':'');
  setText('cameraHeading',play?'Review your take':captureState==='paused'?'Take paused':captureState==='recording'?'You’re on':'Your rehearsal');
  $('mirrorButton').disabled=selectedMedia==='audio'||play;
  $('cameraOffButton').hidden=!ready;$('eyeHint').hidden=!['ready','recording','paused'].includes(captureState)||selectedMedia==='audio';
  $('mediaBadge').hidden=!stream;setText('mediaBadge',selectedMedia==='audio'?'Audio only':selectedMedia==='video'?'No audio':'');
  $('liveVideo').hidden=!stream||selectedMedia==='audio'||play;
  $('audioStage').hidden=selectedMedia!=='audio'||!['ready','recording','paused','playback'].includes(captureState);
  $('playbackVideo').hidden=!play||!takeBlob;
  $('cameraStage').classList.toggle('audio-playback',play&&selectedMedia==='audio');
  $('targetMinutes').disabled=active||busy;document.dispatchEvent?.(new CustomEvent('studio:capture',{detail:{state:captureState,seconds:liveElapsed(),media:selectedMedia}}));
  if(selectedMedia==='audio'){$('audioStage').querySelector('h3').textContent=play?'Your audio take':active?'Find your voice':'Microphone ready';$('audioStage').querySelector('p').textContent=play?'Press play to listen back.':'Your script is right beside you.';}
 }
 function releaseStream(){if(stream){const old=stream;stream=null;old.getTracks().forEach(track=>{track.onended=null;track.stop();});}$('liveVideo').srcObject=null;}
 function permissionsBlocked(){const policy=document.permissionsPolicy||document.featurePolicy;return policy?.allowsFeature && ((selectedMedia!=='audio'&&!policy.allowsFeature('camera'))||(selectedMedia!=='video'&&!policy.allowsFeature('microphone')));}
 async function enableMedia() {
  if(['requesting','recording','paused','countdown','stopping'].includes(captureState))return;
  selectedMedia=$('mediaMode').value;clearError();
  if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext){showError('Camera access needs a supported browser in a secure tab. Open this site directly in a current Chrome, Edge, Safari or Firefox browser. You can still rehearse with your script.');return;}
  if(permissionsBlocked()){showError('This browser view blocks camera or microphone access. Open this site in a full browser tab, then enable the camera and microphone there.');return;}
  const generation=++requestingGeneration;captureState='requesting';setText('enableButton','Waiting for permission…');updateCaptureUI();
  try {
   const next=await navigator.mediaDevices.getUserMedia({video:selectedMedia==='audio'?false:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:selectedMedia==='video'?false:{echoCancellation:true,noiseSuppression:true}});
   if(generation!==requestingGeneration){next.getTracks().forEach(t=>t.stop());return;}
   releaseStream();stream=next;captureState='ready';
   if(selectedMedia!=='audio'){$('liveVideo').srcObject=stream;try{await $('liveVideo').play();}catch{showError('The camera connected, but its preview could not play. Turn it off and try again in a full browser tab.');}}
   stream.getTracks().forEach(track=>track.onended=()=>{if(['recording','paused'].includes(captureState)){stopRecording();showError('Your camera or microphone disconnected. The available recording is being saved in this tab.');}else if(captureState==='countdown'){cancelCountdown();releaseStream();captureState='idle';updateCaptureUI();showError('Your camera or microphone disconnected. Enable it again to continue.');}else{releaseStream();captureState='idle';updateCaptureUI();showError('Your camera or microphone disconnected. Enable it again to continue.');}});
   if(!window.MediaRecorder)showError('This browser can show the camera but cannot record here. Try a current Chrome, Edge, Firefox or Safari browser for recording.');
   setText('transportNote',selectedMedia==='video'?'Camera-only mode records no sound.':selectedMedia==='audio'?'Microphone-only mode records audio without video.':'3-second countdown · Camera view is mirrored; the saved video isn’t');
  } catch(error) {
   captureState='idle';
   const errors={NotAllowedError:'Permission wasn’t granted. Allow camera and microphone in your browser’s site settings, then try again. You can also choose camera only or microphone only.',NotFoundError:'No matching camera or microphone was found. Connect one, or choose camera only or microphone only and try again.',NotReadableError:'Your camera or microphone is busy or unavailable. Close any app using it, then try again.',OverconstrainedError:'This device couldn’t provide the requested camera or microphone. Try another recording mode.',SecurityError:'Your browser blocked media access. Open this site in a full, secure browser tab.'};
   showError(errors[error.name]||'The camera or microphone couldn’t start. Check device and browser permissions, then try again.');
  } finally {setText('enableButton',selectedMedia==='audio'?'Enable microphone':selectedMedia==='video'?'Enable camera':'Enable camera & mic');updateCaptureUI();}
 }
 function updateTimer(){const current=liveElapsed(),target=['recording','paused','stopping','playback'].includes(captureState)?takeTargetSeconds:targetSeconds;setText('elapsedTime',displayTime(current));setText('timerTarget',`/ ${displayTime(target)}`);$('timeFill').style.width=`${Math.min(current/target*100,100)}%`;$('timeTrack').setAttribute('aria-valuemax',String(target));$('timeTrack').setAttribute('aria-valuenow',String(Math.floor(Math.min(current,target))));$('timeTrack').setAttribute('aria-valuetext',`${displayTime(current)} elapsed of ${displayTime(target)} target`);const control=$('elapsedTime').closest('.recording-controls');control.classList.toggle('warning',current>=target*.8&&current<target);control.classList.toggle('overtime',current>=target);
  if(current>=target)setText('timerMessage',`${displayTime(current-target)} over target · finish your thought`);else if(current>=target*.9)setText('timerMessage',`${displayTime(target-current)} left · bring it home`);else if(current>=target*.8)setText('timerMessage',`${displayTime(target-current)} left · make room for your close`);else if(current>0)setText('timerMessage',`${displayTime(target-current)} remaining`);else $('timerMessage').replaceChildren(document.createTextNode('Room for pauses.'),document.createElement('br'),document.createTextNode('Room to be yourself.'));
  const warning=current>=target?3:current>=target*.9?2:current>=target*.8?1:0;if(warning>announcedMinute){announcedMinute=warning;announce(warning===3?'You are now over the target.':`${displayTime(target-current)} left.`);}
 }
 function setTarget(value){if(!Number.isFinite(value)||value<10||value>7200)return false;targetSeconds=Math.round(value);$('targetMinutes').value=Number((targetSeconds/60).toFixed(4));updateTimer();return true;}
 function resetTimer(){clearInterval(timerId);elapsed=0;startedAt=0;announcedMinute=0;updateTimer();}
 function cancelCountdown(){++countdownGeneration;clearTimeout(countdownId);if(captureState==='countdown')captureState=stream?'ready':'idle';updateCaptureUI();}
 async function startCountdown(){if(captureState!=='ready'||!stream)return;if(takeBlob&&!await confirmAction('Replace this take?','Your current recording will be removed from this tab. Download it first if you want to keep it.','Replace take'))return;
  if(captureState!=='ready'||!stream)return;clearTake();clearError();takeTargetSeconds=practiceTarget||targetSeconds;practiceTarget=null;captureState='countdown';resetTimer();updateCaptureUI();let number=3;setText('countdownNumber',number);announce('Recording starts in three seconds.');const generation=++countdownGeneration;
  const tick=()=>{if(generation!==countdownGeneration)return;number--;if(number===0){beginRecording();return;}setText('countdownNumber',number);countdownId=setTimeout(tick,1000);};countdownId=setTimeout(tick,1000);
 }
 function clearTake(){if(takeURL)URL.revokeObjectURL(takeURL);takeBlob=null;takeURL=null;takeType='';takeDownloaded=false;$('playbackVideo').pause();$('playbackVideo').removeAttribute('src');$('playbackVideo').load();document.dispatchEvent?.(new CustomEvent('studio:take-cleared'));}
 function recorderOptions(){const types=selectedMedia==='audio'?['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus']:['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/mp4','video/webm'];return types.filter(t=>MediaRecorder.isTypeSupported?.(t)).map(mimeType=>({mimeType})).concat([{}]);}
 function beginRecording(){if(!stream||!stream.getTracks().some(t=>t.readyState==='live')){cancelCountdown();showError('Your media device is no longer available. Please enable it again.');return;}
  try {
   let lastError;for(const options of recorderOptions()){try{recorder=new MediaRecorder(stream,options);break;}catch(error){lastError=error;}}if(!recorder)throw lastError||new Error('unsupported');
   chunks=[];recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
   recorder.onerror=()=>{showError('Recording encountered a problem. We’ll keep any captured portion below; check playback before relying on it.');if(['recording','paused'].includes(captureState))stopRecording();};
   recorder.onstop=finishRecording;recorder.start(1000);captureState='recording';startedAt=performance.now();timerId=setInterval(updateTimer,200);updateCaptureUI();announce('Recording.');
  } catch {recorder=null;captureState='ready';updateCaptureUI();showError('Recording isn’t supported for this device and browser combination. Try a current browser or a different recording mode.');}
 }
 function pauseRecording(){if(!recorder)return;try{
  if(captureState==='recording'){recorder.pause();elapsed=liveElapsed();captureState='paused';resumeScroll=scrolling;setScroll(false);announce('Recording paused.');}
  else if(captureState==='paused'){recorder.resume();startedAt=performance.now();captureState='recording';if(resumeScroll)setScroll(true);announce('Recording resumed.');}
  updateTimer();updateCaptureUI();
 }catch{showError('This browser couldn’t pause the recording. Press Stop to save the captured take.');}}
 function stopRecording(){if(!recorder||!['recording','paused'].includes(captureState))return;elapsed=liveElapsed();captureState='stopping';setScroll(false);resumeScroll=false;clearInterval(timerId);updateTimer();updateCaptureUI();try{if(recorder.state!=='inactive')recorder.stop();}catch{showError('The recording is finishing. Keep this tab open until your take appears.');}}
 function finishRecording(){if(!recorder)return;if(['recording','paused'].includes(captureState))elapsed=liveElapsed();clearInterval(timerId);setScroll(false);resumeScroll=false;takeDuration=elapsed;const mime=recorder.mimeType||chunks[0]?.type||(selectedMedia==='audio'?'audio/webm':'video/webm');takeType=mime;recorder.onstop=null;recorder=null;releaseStream();
  if(!chunks.length){captureState='idle';showError('No recording data was captured. Try a different recording mode or browser.');updateCaptureUI();return;}
  takeBlob=new Blob(chunks,{type:mime});chunks=[];takeURL=URL.createObjectURL(takeBlob);$('playbackVideo').src=takeURL;captureState='playback';
  setText('takeSummary',`${displayTime(takeDuration)} · ${selectedMedia==='audio'?'Audio':'Video'} take ready`);
  const difference=Math.abs(takeTargetSeconds-takeDuration);setText('takeDetail',`${displayTime(difference)} ${takeDuration>takeTargetSeconds?'over':'under'} target · ${(takeBlob.size/1024/1024).toFixed(1)} MB`);
  updateCaptureUI();announce('Your take is ready. Download it before leaving this tab.');
 }
 async function newTake(){if(takeBlob&&!await confirmAction('Start a new take?','This removes the current recording from this tab. Download it first if you want to keep it.','Start a new take'))return;clearTake();resetTimer();captureState='idle';$('scriptView').scrollTop=0;cardIndex=0;renderCard();updateCaptureUI();await enableMedia();}
 function downloadTake(){if(!takeBlob)return;const ext=takeType.includes('mp4')?'mp4':takeType.includes('ogg')?'ogg':'webm';const stamp=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');downloadBlob(takeBlob,`speech-studio-take-${stamp}.${ext}`);takeDownloaded=true;toast('Download started. Check that the file saved before closing this tab.');}
 $('enableButton').addEventListener('click',enableMedia);
 $('mediaMode').addEventListener('change',()=>{selectedMedia=$('mediaMode').value;setText('enableButton',selectedMedia==='audio'?'Enable microphone':selectedMedia==='video'?'Enable camera':'Enable camera & mic');});
 $('recordButton').addEventListener('click',startCountdown);$('cancelCountdown').addEventListener('click',cancelCountdown);$('pauseButton').addEventListener('click',pauseRecording);$('stopButton').addEventListener('click',stopRecording);$('newTakeButton').addEventListener('click',newTake);$('downloadButton').addEventListener('click',downloadTake);
 $('cameraOffButton').addEventListener('click',()=>{releaseStream();captureState='idle';updateCaptureUI();});
 $('mirrorButton').addEventListener('click',()=>{const on=$('mirrorButton').getAttribute('aria-pressed')!=='true';$('mirrorButton').setAttribute('aria-pressed',String(on));setText('mirrorButton',on?'Mirror on':'Mirror off');$('liveVideo').classList.toggle('mirrored',on);});
 $('scriptTab').addEventListener('click',()=>showMode('script'));$('cueTab').addEventListener('click',()=>showMode('cue'));$('learnTab').addEventListener('click',()=>showMode('learn'));
 [$('scriptTab'),$('cueTab'),$('learnTab')].forEach(tab=>tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const modes=['script','cue','learn'];const next=e.key==='Home'?'script':e.key==='End'?'learn':modes[(modes.indexOf(mode)+(e.key==='ArrowRight'?1:2))%3];showMode(next);$(next+'Tab').focus();}}));
 $('editButton').addEventListener('click',editText);$('doneEditButton').addEventListener('click',finishEditing);$('textEditor').addEventListener('input',updateEdit);
 $('restoreButton').addEventListener('click',async()=>{if(await confirmAction('Restore the original text?',`This replaces your edits to ${mode==='script'?'the full script':'this cue card'} with the SpaceX demo. Other text stays unchanged.`,'Restore demo')){$('textEditor').value=mode==='script'?C.script:C.cards[cardIndex].body;updateEdit();}});
 $('exportTextButton').addEventListener('click',()=>downloadBlob(new Blob([$('textEditor').value],{type:'text/plain;charset=utf-8'}),mode==='script'?'speech-studio-script.txt':`speech-studio-cue-${cardIndex+1}.txt`));
 $('prevCard').addEventListener('click',()=>changeCard(cardIndex-1));$('nextCard').addEventListener('click',()=>changeCard(cardIndex+1));
 $('scrollButton').addEventListener('click',()=>setScroll(!scrolling));$('rewindButton').addEventListener('click',()=>{setScroll(false);$('scriptView').scrollTop=0;});
 $('scriptView').addEventListener('wheel',()=>setScroll(false),{passive:true});$('scriptView').addEventListener('touchstart',()=>setScroll(false),{passive:true});
 $('scrollSpeed').addEventListener('input',()=>{speed=Number($('scrollSpeed').value);setText('speedValue',speed);save();});
 $('fontDown').addEventListener('click',()=>{fontSize=Math.max(20,fontSize-2);applyFont();save();});$('fontUp').addEventListener('click',()=>{fontSize=Math.min(44,fontSize+2);applyFont();save();});
 $('helpButton').addEventListener('click',()=>{$('helpDialog').showModal();});$('confirmCancel').addEventListener('click',()=>resolveConfirm(false));$('confirmYes').addEventListener('click',()=>resolveConfirm(true));$('confirmDialog').addEventListener('cancel',e=>{e.preventDefault();resolveConfirm(false);});
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.isComposing||editing||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;if(e.code==='Space'&&mode==='script'){e.preventDefault();setScroll(!scrolling);}else if(mode==='cue'&&(!document.body.classList.contains('has-slides')||e.shiftKey)&&['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();changeCard(cardIndex+(e.key==='ArrowRight'?1:-1));}});
 $('playbackVideo').addEventListener('loadedmetadata',()=>{const v=$('playbackVideo');if(!Number.isFinite(v.duration)){const repair=()=>{v.removeEventListener('timeupdate',repair);v.currentTime=0;};v.addEventListener('timeupdate',repair,{once:true});try{v.currentTime=1e10;}catch{v.removeEventListener('timeupdate',repair);}}});
 window.addEventListener('beforeunload',e=>{if(takeBlob||['recording','paused','countdown','stopping'].includes(captureState)){e.preventDefault();e.returnValue='';}});
 window.addEventListener('pagehide',()=>{++requestingGeneration;cancelCountdown();setScroll(false);if(['recording','paused'].includes(captureState))stopRecording();clearInterval(timerId);releaseStream();});
 document.addEventListener('visibilitychange',()=>{previousFrame=0;updateTimer();});
 $('targetMinutes').addEventListener('change',()=>{if(setTarget(Number($('targetMinutes').value)*60)){save();document.dispatchEvent?.(new CustomEvent('studio:target'));}else{$('targetMinutes').value=targetSeconds/60;toast('Choose a target from 10 seconds to 120 minutes.');}});
 window.SpeechStudio={getScript:()=>script,getTarget:()=>targetSeconds,setTarget,getMode:()=>mode,getCapture:()=>captureState,getTake:()=>takeBlob?{blob:takeBlob,duration:takeDuration,hasAudio:selectedMedia!=='video'}:null,recordPractice:seconds=>{practiceTarget=seconds;return startCountdown();},pauseRecording,stopRecording,confirmAction,downloadBlob};
 setTarget(targetSeconds);
 $('liveVideo').classList.add('mirrored');$('scrollSpeed').value=speed;setText('speedValue',speed);applyFont();renderScript();renderCard();updateCaptureUI();
 if(saved.script||saved.cards)setText('saveStatus','Saved in this browser');
})();
