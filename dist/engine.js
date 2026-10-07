(function(root){
const fresh=()=>({bits:{},timer:0,count:0,prev:false,scans:0,flow:[],values:{},timers:{},counters:{},trace:[]});
function evaluate(token,b){const match=token.match(/^([A-Z0-9_]+)(>=|<=|==|>|<)([0-9]+)$/);if(match){const a=Number(b[match[1]]||0),v=Number(match[3]);return match[2]==='>='?a>=v:match[2]==='<='?a<=v:match[2]==='>'?a>v:match[2]==='<'?a<v:a===v;}return token==='TRUE'||(token!=='EMPTY'&&(token[0]==='!'?!b[token.slice(1)]:!!b[token]));}
function beginScan(s,inputs){s.bits={...s.bits,...inputs};s.flow=[];s.values={};s.trace=[];}
function runRung(r,program,s,inputs,dt=100){const b=s.bits;let power=true;const path=[];for(const group of r.groups){let value=false;for(const id of group){const v=evaluate(program[id]||'EMPTY',b);s.values[id]=v;value=value||v;}power=power&&value;path.push(power);}
 if(r.unit&&['TON','RTO','CTU','RES'].includes(r.type)){
  const key=r.unit,done=key+'_DONE',timing=key+'_TIMING',preset=Number(r.preset||1);
  if(r.type==='TON'||r.type==='RTO'){const t=s.timers[key]??={elapsed:0};if(power)t.elapsed+=dt;else if(r.type==='TON')t.elapsed=0;b[done]=t.elapsed>=preset*1000;b[timing]=power&&!b[done];}
  if(r.type==='CTU'){const c=s.counters[key]??={count:0,prev:false};if(power&&!c.prev)c.count++;c.prev=power;b[done]=c.count>=preset;}
  if(r.type==='RES'&&power){if(s.timers[key])s.timers[key].elapsed=0;if(s.counters[key]){s.counters[key].count=0;s.counters[key].prev=false;}b[done]=false;b[timing]=false;}
 }else if(r.type==='TON'){s.timer=power?s.timer+dt:0;b.DONE=power&&s.timer>=Number(program.preset)*1000;b.TIMING=power&&!b.DONE;}
 else if(r.type==='RTO'){if(power)s.timer+=dt;b.DONE=s.timer>=Number(program.preset)*1000;b.TIMING=power&&!b.DONE;}
 else if(r.type==='RES'){if(power){s.timer=0;b.DONE=false;b.TIMING=false;}}
 else if(r.type==='OTL'){if(power)b[r.out]=true;}
 else if(r.type==='OTU'){if(power)b[r.out]=false;}
 else if(r.type==='CTU'){if(power&&!s.prev)s.count++;s.prev=power;b.DONE=s.count>=Number(program.preset);if(inputs.RESET){s.count=0;b.DONE=false;}}
 else b[r.out]=power;
 s.flow.push(path.concat(power));s.trace.push({type:r.type,out:r.out||r.unit||'Timer',power,value:!!b[r.out],bits:{...b}});return power;
}
function finishScan(s){s.scans++;return s;}
function scan(level,program,s,inputs,dt=100){beginScan(s,inputs);for(const r of level.rungs)runRung(r,program,s,inputs,dt);return finishScan(s);}
root.PLC={fresh,scan,evaluate,beginScan,runRung,finishScan};if(typeof module!=='undefined')module.exports=root.PLC;
})(typeof window!=='undefined'?window:globalThis);
