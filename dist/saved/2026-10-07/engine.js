(function(root){
const fresh=()=>({bits:{},timer:0,count:0,prev:false,scans:0,flow:[],values:{}});
function evaluate(token,b){
 const match=token.match(/^([A-Z0-9_]+)(>=|<=|==|>|<)([0-9]+)$/);
 if(match){const a=Number(b[match[1]]||0),v=Number(match[3]);return match[2]==='>='?a>=v:match[2]==='<='?a<=v:match[2]==='>'?a>v:match[2]==='<'?a<v:a===v;}
 return token==='TRUE'||(token!=='EMPTY'&&(token[0]==='!'?!b[token.slice(1)]:!!b[token]));
}
function scan(level,program,s,inputs,dt=100){
 const b={...s.bits,...inputs};s.flow=[];s.values={};
 for(const r of level.rungs){let power=true;const path=[];
 for(const group of r.groups){let value=false;for(const id of group){const token=program[id]||'EMPTY';const v=evaluate(token,b);s.values[id]=v;value=value||v;}power=power&&value;path.push(power);}
 if(r.type==='TON'){s.timer=power?s.timer+dt:0;b.DONE=power&&s.timer>=Number(program.preset)*1000;b.TIMING=power&&!b.DONE;}
 else if(r.type==='RTO'){if(power)s.timer+=dt;b.DONE=s.timer>=Number(program.preset)*1000;b.TIMING=power&&!b.DONE;}
 else if(r.type==='RES'){if(power){s.timer=0;b.DONE=false;b.TIMING=false;}}
 else if(r.type==='OTL'){if(power)b[r.out]=true;}
 else if(r.type==='OTU'){if(power)b[r.out]=false;}
 else if(r.type==='CTU'){if(power&&!s.prev)s.count++;s.prev=power;b.DONE=s.count>=Number(program.preset);if(inputs.RESET){s.count=0;b.DONE=false;}}
 else b[r.out]=power;
 s.flow.push(path.concat(power));
 }s.bits=b;s.scans++;return s;
}
root.PLC={fresh,scan,evaluate};if(typeof module!=='undefined')module.exports=root.PLC;
})(typeof window!=='undefined'?window:globalThis);
