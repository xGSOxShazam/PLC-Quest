const $=id=>document.getElementById(id);
const labels={START:'Start',STOP:'Stop',READY:'Ready',JOG:'Jog',BLOCKED:'Blocked',SENSOR:'Sensor',RESET:'Reset',MOTOR:'Motor',DONE:'Done',LAMP:'Lamp',BELT2:'Belt 2',FAULT:'Fault',OVERLOAD:'Overload',AUTO:'Auto mode',UPPER:'Upper limit',LOWER:'Lower limit',FEEDBACK:'Run feedback',TIMING:'Timing',LIFT:'Lift Up',LEVEL:'Level',TIMER:'Timer'};
let saved={done:[],drafts:{},current:0};let storageOK=true;
try{const v=JSON.parse(localStorage.getItem('plcquest.v1'));if(v&&Array.isArray(v.done)&&v.drafts&&typeof v.drafts==='object')saved={done:v.done.filter(n=>Number.isInteger(n)&&n>=0&&n<LESSONS.length),drafts:v.drafts,current:Number.isInteger(v.current)?Math.max(0,Math.min(LESSONS.length-1,v.current)):0};}catch{storageOK=false;}
let failedAttempts=0;
let randomLesson=null;
const currentLesson=()=>randomLesson||LESSONS[index];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let plant=Conveyor.fresh(),sensorMode="boxes";
let index=saved.current,program={},state=PLC.fresh(),inputs={},running=false,pickerSlot=null,timer=null;
function persist(){if(randomLesson)return;saved.current=index;saved.drafts[index]={...program};try{localStorage.setItem('plcquest.v1',JSON.stringify(saved));}catch{storageOK=false;}$('storageNote').textContent=storageOK?'Progress saves in this browser.':'Browser storage is unavailable. Progress lasts for this visit.';}
function nav(){let last='';$('lessonList').innerHTML=LESSONS.map(l=>{let group=l.section!==last?`<div class="groupname">${l.section}</div>`:'';last=l.section;return group+`<button data-level="${l.id}" class="${l.id===index&&!randomLesson?'active ':''}${saved.done.includes(l.id)?'complete':''}" ${l.id===index&&!randomLesson?'aria-current="step"':''}><span class="num">${saved.done.includes(l.id)?'✓':String(l.id+1).padStart(2,'0')}</span><span>${l.title}</span></button>`;}).join('');$('progressTop').textContent=`${saved.done.length} / ${LESSONS.length}`;$('progressText').textContent=`${saved.done.length} of ${LESSONS.length} challenges complete`;$('progressFill').style.width=(saved.done.length/LESSONS.length*100)+'%';}
function pause(){running=false;clearInterval(timer);timer=null;update();}
function setCheckState(status="idle"){const button=$("check");button.dataset.result=status;button.textContent=status==="wrong"?"Try again":status==="correct"?"Correct":"Test my logic";}
function allowedTokens(l){return [...new Set(['EMPTY',...l.inputs,...l.rungs.map(r=>r.out).filter(Boolean),'MOTOR','DONE','TIMING',...(l.extraTokens||[])].flatMap(t=>t==='EMPTY'||/[<>=]/.test(t)?[t]:[t,'!'+t]))];}
function load(n,practice=null){
 if(!Number.isInteger(n)||n<0||n>=LESSONS.length)throw Error('Choose an available lesson.');
 if(timer)clearInterval(timer);running=false;failedAttempts=0;setCheckState();index=n;randomLesson=practice;sensorMode='boxes';$('sensorMode').value='boxes';
 const l=currentLesson();program={...l.initial};const draft=practice?null:saved.drafts[n];
 if(draft&&typeof draft==='object')for(const k of Object.keys(program)){if(k==='preset'&&['1','2','3','5'].includes(draft[k]))program[k]=draft[k];else if(k!=='preset'&&allowedTokens(l).includes(draft[k]))program[k]=draft[k];}
 state=PLC.fresh();plant=Conveyor.fresh();inputs=Object.fromEntries(l.inputs.map(k=>[k,l.numeric?.includes(k)?0:false]));
 $('chapter').textContent=practice?'RANDOM PRACTICE':l.section+' / LESSON '+String(n+1).padStart(2,'0');$('title').textContent=l.title;$('levelNumber').textContent=practice?'PRACTICE':String(n+1).padStart(2,'0')+' / '+LESSONS.length;
 $('goal').textContent=l.goal;$('learnText').textContent=l.learn;$('learn').open=!practice&&n===0;$('feedback').hidden=true;$('next').hidden=true;
 $('outBelt2').hidden=!l.rungs.some(r=>r.out==='BELT2');$('outLift').hidden=!l.rungs.some(r=>r.out==='LIFT');$('secondConveyor').hidden=$('outBelt2').hidden;$('secondConveyor').closest('.machine').classList.toggle('two-conveyors',!$('secondConveyor').hidden);
 renderLadder();$('inputs').innerHTML=l.inputs.map(k=>l.numeric?.includes(k)?`<label class="numericinput">${labels[k]} <output id="value-${k}">0</output><input type="range" min="0" max="100" step="1" value="0" data-number="${k}" aria-label="${labels[k]}"></label>`:`<button class="input" data-input="${k}" aria-pressed="false"><span>${labels[k]}</span><b>0</b></button>`).join('');
 nav();update();persist();
}
function renderLadder(){const l=currentLesson();$('ladder').innerHTML=l.rungs.map((r,ri)=>`<div class="rung"><span class="rungno">${String(ri).padStart(3,'0')}</span><span class="wire on"></span>${r.groups.map((g,gi)=>`<div class="contactgroup ${g.length>1?'branch':''}">${g.map(id=>{const token=program[id],inv=token[0]==='!';return `<button class="contact ${token==='EMPTY'?'empty':''}" data-slot="${id}" aria-label="Edit contact ${id}: ${token==='EMPTY'?'empty':(inv?'XIO ':'XIC ')+esc(labels[token.replace('!','')]||token)}"><span class="symbol">${token==='EMPTY'?'+':/[<>=]/.test(token)?'CMP':inv?'|/|':'| |'}</span><span class="tag">${token==='EMPTY'?'CHOOSE':esc(token.replace('!',''))}</span></button>`;}).join('')}</div><span class="wire" data-wire="${ri}-${gi}"></span>`).join('')}${['OTE','OTL','OTU','RES'].includes(r.type)?`<div class="coil" data-coil="${r.out}"><span>${r.type==='OTL'?'(L)':r.type==='OTU'?'(U)':r.type==='RES'?'RES':'( )'}</span><small>${r.out}</small></div>`:`<div class="functionblock"><b>${r.type}</b><label>Preset ${r.type==='CTU'?'parts':'seconds'}<select id="preset" aria-label="${r.type} preset">${['1','2','3','5'].map(x=>`<option ${program.preset===x?'selected':''}>${x}</option>`).join('')}</select></label></div>`}<span class="wire" data-end="${ri}"></span></div>`).join('');}
function update(){const l=currentLesson();for(const k of l.numeric||[]){const range=document.querySelector(`[data-number="${k}"]`);if(range)range.value=Number(inputs[k]||0);const label=$("value-"+k);if(label)label.textContent=Number(inputs[k]||0);}for(const el of document.querySelectorAll('[data-input]')){const on=!!inputs[el.dataset.input];el.setAttribute('aria-pressed',String(on));el.querySelector('b').textContent=on?'1':'0';}for(const el of document.querySelectorAll('[data-slot]'))el.classList.toggle('powered',!!state.values[el.dataset.slot]);for(const el of document.querySelectorAll('[data-wire]')){const [r,g]=el.dataset.wire.split('-').map(Number);el.classList.toggle('on',!!state.flow[r]?.[g]);}for(const el of document.querySelectorAll('[data-end]'))el.classList.toggle('on',!!state.flow[Number(el.dataset.end)]?.at(-1));for(const el of document.querySelectorAll('[data-coil]'))el.classList.toggle('on',!!state.bits[el.dataset.coil]);for(const [id,bit] of [['outMotor','MOTOR'],['outLamp','LAMP'],['outBelt2','BELT2'],['outLift','LIFT']]){$(id).classList.toggle('on',!!state.bits[bit]);$(id).querySelector('b').textContent=state.bits[bit]?'ON':'OFF';}document.querySelectorAll('#boxes rect').forEach((box,i)=>box.setAttribute('x',plant.positions[i]));
 document.querySelectorAll('#boxes2 rect').forEach((box,i)=>box.setAttribute('x',plant.positions2[i]));$('belt2Label').textContent=state.bits.BELT2?'MOTOR ON':'MOTOR OFF';
 const feed=Conveyor.hasFeed(l),automatic=sensorMode==='boxes',hasSensor=l.inputs.includes('SENSOR');
 $('motorLabel').textContent=feed?(running?'AUTO FEED RUNNING':'AUTO FEED PAUSED'):(state.bits.MOTOR?'MOTOR ON':'MOTOR OFF');
 $('sensorLight').setAttribute('fill',plant.detected?'#e8b754':'#856e76');
 $('sensorBeam').setAttribute('stroke',plant.detected?'#e8b754':'#856e76');
 $('sensorReadout').textContent=`BOX SENSOR ${plant.detected?'ON':'OFF'}${hasSensor&&!automatic?' · MANUAL INPUT '+(inputs.SENSOR?'1':'0'):''}`;
 $('sensorControls').hidden=!hasSensor;
 $('sensorNote').textContent=automatic?(feed?'The training feed moves boxes automatically. Each passing box triggers Sensor.':'Motor runs the boxes. Each passing box triggers Sensor.'):'Tap Sensor to practice manually. Box detection is disconnected from the input.';
 const sensorButton=document.querySelector('[data-input="SENSOR"]');
 if(sensorButton){sensorButton.disabled=automatic;sensorButton.querySelector('span').textContent=automatic?'Sensor · automatic':'Sensor';}
 const type=l.rungs.find(r=>['TON','RTO','CTU'].includes(r.type))?.type;$('meter').hidden=!type;$('meter').textContent=type!=='CTU'?`${type}  ${(state.timer/1000).toFixed(1)} / ${program.preset} s  ·  DONE ${state.bits.DONE?1:0}`:`CTU  ${state.count} / ${program.preset} parts  ·  DONE ${state.bits.DONE?1:0}`;$('run').textContent=running?'Pause simulator':'Run simulator';$('runState').textContent=running?'SCANNING':'PAUSED';$('scanInfo').textContent=`Scan ${state.scans} · Each step advances 0.1 second`;}
function step(){Conveyor.step(currentLesson(),program,state,inputs,plant,sensorMode,100);update();}
function invalidate(){setCheckState();clearFaultHighlights();state=PLC.fresh();plant=Conveyor.fresh();if(sensorMode==="boxes"&&"SENSOR" in inputs)inputs.SENSOR=false;$('feedback').hidden=true;$('next').hidden=true;persist();update();}
function feedback(message,success=false){$('feedback').hidden=false;$('feedback').className=success?'success':'';$('feedback').textContent=message;}
function cases(l){let sequences=[];if(l.numeric?.length){return [0,1,19,20,21,49,50,51,79,80,81,99,100].map(v=>[{input:Object.fromEntries(l.inputs.map(k=>[k,v])),scans:2}]);}const keys=l.inputs,all=2**keys.length;const bits=n=>Object.fromEntries(keys.map((k,i)=>[k,!!(n&(1<<i))]));for(let a=0;a<all;a++)for(let b=0;b<all;b++)sequences.push([{input:bits(a),scans:1},{input:bits(b),scans:1}]);sequences.push(Array.from({length:8},()=>[{input:{SENSOR:true},scans:5},{input:{SENSOR:false},scans:2}]).flat().concat([{input:{RESET:true},scans:1},{input:{RESET:false},scans:1}]));for(let n=0;n<all;n++)sequences.push([{input:bits(n),scans:60},{input:bits(0),scans:3},{input:bits(n),scans:35}]);let seed=12345;for(let s=0;s<10;s++){let seq=[];for(let j=0;j<25;j++){seed=(seed*16807)%2147483647;seq.push({input:bits(seed%all),scans:j%4===0?35:1});}sequences.push(seq);}return sequences;}
function testProgram(l,p){let checks=0;const outputs=[...new Set(l.rungs.filter(r=>['OTE','OTL','OTU'].includes(r.type)).map(r=>r.out))];for(const seq of cases(l)){const actual=PLC.fresh(),expected=PLC.fresh();for(const phase of seq){const inp=Object.fromEntries(l.inputs.map(k=>[k,l.numeric?.includes(k)?Number(phase.input[k]||0):!!phase.input[k]]));for(let j=0;j<phase.scans;j++){PLC.scan(l,p,actual,inp);PLC.scan(l,l.answer,expected,inp);checks++;for(const out of outputs){if(!!actual.bits[out]!==!!expected.bits[out])return {ok:false,checks,message:`${labels[out]} should be ${expected.bits[out]?'ON':'OFF'}, but your logic makes it ${actual.bits[out]?'ON':'OFF'}. At scan ${actual.scans}: ${l.inputs.map(k=>`${labels[k]} = ${l.numeric?.includes(k)?inp[k]:(inp[k]?1:0)}`).join(', ')}. ${l.rungs.some(r=>r.type==='TON')?'Check the timer input, preset, and Done contact.':l.rungs.some(r=>r.type==='CTU')?'Check the sensor contact, target count, and Done contact.':'Follow the series and parallel paths, including any holding contact.'}`};}}}}return {ok:true,checks};}
// Equivalent series orders and parallel branches are equally valid.
function permutations(items){if(items.length<2)return [items];return items.flatMap((item,i)=>permutations(items.filter((_,j)=>j!==i)).map(rest=>[item,...rest]));}
function findFaults(level,p){
 let candidates=[{...level.answer}];
 for(const rung of level.rungs){
  const arrangements=[];
  for(const order of permutations(rung.groups)){
   if(order.some((group,i)=>group.length!==rung.groups[i].length))continue;
   let variants=[{}];
   for(let i=0;i<order.length;i++){
    const choices=permutations(order[i].map(id=>level.answer[id]));
    variants=variants.flatMap(v=>choices.map(tokens=>({...v,...Object.fromEntries(rung.groups[i].map((id,j)=>[id,tokens[j]]))})));
   }
   arrangements.push(...variants);
  }
  candidates=candidates.flatMap(c=>arrangements.map(v=>({...c,...v})));
 }
 let best=Object.keys(level.answer);
 for(const candidate of candidates){const faults=Object.keys(candidate).filter(id=>candidate[id]!==p[id]);if(faults.length<best.length)best=faults;}
 return best;
}
function clearFaultHighlights(){
 for(const el of document.querySelectorAll('.needs-fix'))el.classList.remove('needs-fix');
 for(const el of document.querySelectorAll('[aria-invalid]'))el.removeAttribute('aria-invalid');
}
function highlightFaults(ids){
 clearFaultHighlights();
 for(const id of ids){const el=id==='preset'?$('preset'):document.querySelector(`[data-slot="${id}"]`);if(!el)continue;el.setAttribute('aria-invalid','true');(id==='preset'?el.closest('.functionblock'):el).classList.add('needs-fix');}
}
function check(){
 pause();clearFaultHighlights();
 const incomplete=Object.values(program).includes('EMPTY');
 const result=incomplete?{ok:false,message:'Fill each empty contact first. Tap a + to choose an input and instruction.'}:testProgram(currentLesson(),program);
 if(result.ok){
  setCheckState("correct");
  failedAttempts=0;
  if(!randomLesson&&!saved.done.includes(index))saved.done.push(index);persist();nav();
  feedback(!randomLesson&&saved.done.length===LESSONS.length?'Floor complete. You have passed all tests for this challenge. Revisit any lesson to practice without hints.':`Logic verified. Your program passed ${result.checks.toLocaleString()} scan checks, including input changes and held inputs.`,true);
  $('next').hidden=false;$('next').textContent=randomLesson?'Another random challenge':index===LESSONS.length-1?'Practice from the beginning':'Next challenge';
 }else{
  setCheckState("wrong");
  failedAttempts++;
  const faults=failedAttempts>=3?findFaults(currentLesson(),program):[];
  if(faults.length)highlightFaults(faults);
  feedback(`Attempt ${failedAttempts}. ${faults.length?'Look for the highlighted CHECK labels in your ladder. These are the contacts or preset to revisit. ':''}${result.message}`);
  $('next').hidden=true;
 }
 return {...result,attempts:failedAttempts};
}
function picker(slot){pickerSlot=slot;const l=currentLesson();const tags=[...new Set([...l.inputs,...l.rungs.map(r=>r.out).filter(x=>x&&x!=='TIMER'),'MOTOR',...(l.rungs.some(r=>['TON','RTO','CTU'].includes(r.type))?['DONE','TIMING']:[])])];$('choices').innerHTML=tags.filter(t=>!l.numeric?.includes(t)).map(t=>`<div class="choiceRow"><button data-token="${t}">| | &nbsp; ${labels[t]||t}<small>XIC · true when ${labels[t]||t} = 1</small></button><button data-token="!${t}">|/| &nbsp; ${labels[t]||t}<small>XIO · true when ${labels[t]||t} = 0</small></button></div>`).join('')+(l.extraTokens||[]).map(t=>`<div class="choiceRow"><button data-token="${esc(t)}">${esc(t)}<small>Compare the numeric value</small></button></div>`).join('');$('picker').showModal();}
function randomPractice(){
 const pick=a=>a[Math.floor(Math.random()*a.length)],tags=['START','READY','JOG','BLOCKED','FAULT','AUTO'],shuffled=tags.sort(()=>Math.random()-.5).slice(0,3);const kind=pick(['series','parallel','timer','memory']);
 let answer={},rungs=[],goal='',hint='',preset=pick(['1','2','3','5']);const token=t=>Math.random()<.5?t:'!'+t,describe=t=>`${labels[t.replace('!','')]} is ${t[0]==='!'?'off':'on'}`;
 if(kind==='series'||kind==='parallel'){answer={a:token(shuffled[0]),b:token(shuffled[1]),c:token(shuffled[2])};rungs=[{groups:kind==='series'?[['a'],['b'],['c']]:[['a','b'],['c']],out:'MOTOR',type:'OTE'}];goal=kind==='series'?`Run Motor only when ${describe(answer.a)}, ${describe(answer.b)}, and ${describe(answer.c)}.`:`Run Motor when (${describe(answer.a)} OR ${describe(answer.b)}) AND ${describe(answer.c)}.`;hint='Match each named input and its on/off condition to the series or parallel path.';}
 if(kind==='timer'){answer={a:token(shuffled[0]),b:'DONE',preset};rungs=[{groups:[['a']],out:null,type:'TON'},{groups:[['b']],out:'MOTOR',type:'OTE'}];goal=`Run Motor after ${describe(answer.a)} continuously for ${preset} seconds. Reset the delay when that condition is false.`;hint=`Use ${answer.a[0]==='!'?'XIO':'XIC'} ${labels[answer.a.replace('!','')]} for TON, set ${preset} seconds, and use XIC Done for Motor.`;}
 if(kind==='memory'){answer={a:shuffled[0],b:shuffled[1]};rungs=[{groups:[['a']],out:'LAMP',type:'OTL'},{groups:[['b']],out:'LAMP',type:'OTU'}];goal=`Remember ${labels[answer.a]} on Lamp. ${labels[answer.b]} clears it and wins if both are on.`;hint='The first input sets the latched lamp; the second clears it on the lower rung.';}
 const l={id:-1,title:pick(['Fresh circuit','Bench challenge','Unseen circuit']),section:'PRACTICE',inputs:shuffled,answer,rungs,goal,hint,learn:'Read the conditions, build the circuit, and test it. These generated circuits do not add lesson completion. After three failed checks, the game highlights contacts to revisit.',initial:{...Object.fromEntries(Object.keys(answer).filter(k=>k!=='preset').map(k=>[k,'EMPTY'])),...(answer.preset?{preset:'1'}:{})}};
 showMode('random');load(index,l);
}
function showMode(mode){pause();if(window.Sandbox)Sandbox.pause();$('lessonView').hidden=mode==='sandbox';$('sandboxView').hidden=mode!=='sandbox';for(const [id,m] of [['modeLessons','lessons'],['modeRandom','random'],['modeSandbox','sandbox']]){$(id).classList.toggle('selected',mode===m);$(id).setAttribute('aria-pressed',String(mode===m));}if(mode==='sandbox'&&window.Sandbox)Sandbox.render();}
$('lessonList').onclick=e=>{const b=e.target.closest('[data-level]');if(b){showMode('lessons');load(Number(b.dataset.level));$('sidebar').classList.remove('open');}};
$('lessonsToggle').onclick=()=>{$('sidebar').classList.toggle('open');$('lessonsToggle').setAttribute('aria-expanded',$('sidebar').classList.contains('open'));};
$('ladder').onclick=e=>{const b=e.target.closest('[data-slot]');if(b)picker(b.dataset.slot);};
$('ladder').onchange=e=>{if(e.target.id==='preset'){program.preset=e.target.value;invalidate();}};
$('choices').onclick=e=>{const b=e.target.closest('[data-token]');if(b){program[pickerSlot]=b.dataset.token;$('picker').close();renderLadder();invalidate();}};
$('closePicker').onclick=()=>$('picker').close();$('empty').onclick=()=>{program[pickerSlot]='EMPTY';$('picker').close();renderLadder();invalidate();};
$('inputs').onclick=e=>{const b=e.target.closest('[data-input]');if(b&&!b.disabled){inputs[b.dataset.input]=!inputs[b.dataset.input];update();}};
$('sensorMode').onchange=()=>{pause();sensorMode=$('sensorMode').value;state=PLC.fresh();plant=Conveyor.fresh();inputs=Object.fromEntries(currentLesson().inputs.map(k=>[k,false]));update();};
$('run').onclick=()=>{if(running)pause();else{running=true;step();timer=setInterval(step,100);update();}};
$('step').onclick=()=>{pause();step();};$('reset').onclick=()=>{pause();state=PLC.fresh();plant=Conveyor.fresh();inputs=Object.fromEntries(currentLesson().inputs.map(k=>[k,false]));update();};
$('clear').onclick=()=>{pause();failedAttempts=0;program={...currentLesson().initial};inputs=Object.fromEntries(currentLesson().inputs.map(k=>[k,false]));renderLadder();invalidate();};$('check').onclick=check;$('hint').onclick=()=>feedback(currentLesson().hint);$('next').onclick=()=>randomLesson?randomPractice():load((index+1)%LESSONS.length);
$('inputs').oninput=e=>{if(e.target.dataset.number){inputs[e.target.dataset.number]=Number(e.target.value);$('value-'+e.target.dataset.number).textContent=e.target.value;}};
$('modeLessons').onclick=()=>{showMode('lessons');load(index);};$('modeRandom').onclick=randomPractice;$('modeSandbox').onclick=()=>showMode('sandbox');
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});load(index);
if(document.modelContext?.registerTool){for(const tool of [{name:'read_plc_lesson',description:'Read the current lesson, circuit and simulation state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({lesson:index+1,goal:currentLesson().goal,program,inputs,outputs:state.bits,completed:saved.done.map(i=>i+1)})},{name:'open_plc_lesson',description:'Open one of the 30 PLC practice lessons.',inputSchema:{type:'object',properties:{lesson:{type:'integer',minimum:1,maximum:30}},required:['lesson'],additionalProperties:false},execute:arg=>{if(!arg||!Number.isInteger(arg.lesson)||arg.lesson<1||arg.lesson>LESSONS.length)throw Error('Lesson must be an integer from 1 to 30.');showMode('lessons');load(arg.lesson-1);return {lesson:arg.lesson,title:currentLesson().title};}}])try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}
