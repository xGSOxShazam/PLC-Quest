(function(root){
function route(layout){
 const points=layout==='square'?[[320,90],[490,90],[490,430],[150,430],[150,90],[320,90]]:Array.from({length:129},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/128;return [320+245*Math.cos(a),260+175*Math.sin(a)];});
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));const total=lengths.at(-1);
 function at(t){const distance=((t%1)+1)%1*total;let i=1;while(i<lengths.length-1&&lengths[i]<distance)i++;const f=(distance-lengths[i-1])/(lengths[i]-lengths[i-1]),a=points[i-1],b=points[i];return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI};}
 function path(start,end){const count=Math.max(4,Math.ceil((end-start)*180));return Array.from({length:count+1},(_,i)=>{const p=at(start+(end-start)*i/count);return `${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;}).join(' ');}
 return {at,path,total};
}
function progress(c,st){if(!st.box)return 0;const cycle=root.LineSim.cycleTime(c);let p=st.elapsed/cycle;if(c.type==='stop'||c.type==='lift')p=st.elapsed<.3?st.elapsed/.6:st.elapsed<=cycle-.3?.5:.5+(st.elapsed-(cycle-.3))/.6;return Math.max(0,Math.min(1,p));}
function draw(layout,config,s,selected){const g=route(layout),n=config.length;if(!n)return '<text x="320" y="250" text-anchor="middle" fill="#f2e8d8" font-size="22">Add stations to make a loop.</text>';
 let result=`<path d="${g.path(0,1)}" fill="none" stroke="#bfa998" stroke-width="54" stroke-linejoin="round"/><path d="${g.path(0,1)}" fill="none" stroke="#725462" stroke-width="46" stroke-linejoin="round"/>`;
 for(let i=0;i<n;i++){const c=config[i],st=s.stations[c.id],mid=g.at((i+.5)/n),edge=g.at(i/n),dx=mid.x-320,dy=mid.y-260,d=Math.hypot(dx,dy)||1,label={x:mid.x+dx/d*48,y:mid.y+dy/d*48};
 result+=`<g data-station="${c.id}" role="button" tabindex="0" aria-label="Edit ${c.id} ${root.LineSim.titles[c.type]}"><title>${c.id}: ${root.LineSim.titles[c.type]}, ${st.phase}</title><path d="${g.path(i/n,(i+1)/n)}" fill="none" stroke="${st.fault?'#b32632':st.output?'#326f68':'#725462'}" stroke-width="44" stroke-linejoin="round"/>${selected===c.id?`<path d="${g.path((i+.02)/n,(i+.98)/n)}" fill="none" stroke="#e8b754" stroke-width="3" stroke-dasharray="8 6"/>`:''}<path d="M-8,-8 L3,0 L-8,8" transform="translate(${mid.x},${mid.y}) rotate(${mid.angle})" fill="none" stroke="#ead7b8" stroke-width="3"/><path d="M0,-24v48" transform="translate(${edge.x},${edge.y}) rotate(${edge.angle})" stroke="#bfa998" stroke-width="2"/><text x="${label.x}" y="${label.y+7}" text-anchor="middle" fill="${st.fault?'#ff9280':'#f2e8d8'}" font-family="monospace" font-size="21">${c.id}</text><circle cx="${label.x}" cy="${label.y+22}" r="5" fill="${st.box?'#e8b754':'#856e76'}"/>`;
 if(c.type==='stop')result+=`<path d="M0,-21v42" transform="translate(${mid.x},${mid.y}) rotate(${mid.angle})" stroke="#e8b754" stroke-width="${st.phase==='released'?2:7}"/>`;
 if(c.type==='lift')result+=`<rect x="-18" y="-19" width="36" height="38" rx="4" transform="translate(${mid.x},${mid.y}) rotate(${mid.angle})" fill="none" stroke="#b9decc" stroke-width="3"/>`;
 if(c.type==='reject')result+=`<path d="M0,0v-32h18" transform="translate(${mid.x},${mid.y}) rotate(${mid.angle})" stroke="#d491a7" fill="none" stroke-width="4"/>`;
 result+='</g>';
 }
 // Boxes use the same station progress and transfer boundaries as the transport model.
 for(let i=0;i<n;i++){const c=config[i],st=s.stations[c.id];if(!st.box)continue;const p=g.at((i+progress(c,st))/n),up=c.type==='lift'&&st.phase==='at upper limit';result+=`<g transform="translate(${p.x},${p.y})" pointer-events="none"><title>Box ${st.box}: ${s.boxLaps[st.box]||0} laps; ${st.phase}</title><rect x="-17" y="-17" width="34" height="34" rx="4" transform="rotate(${p.angle})" fill="${up?'#b9decc':'#e8b754'}" stroke="#38232e" stroke-width="2"/><text text-anchor="middle" y="6" fill="#38232e" font-size="18" font-weight="bold">${st.box}</text></g>`;}
 result+=`<text x="320" y="241" text-anchor="middle" fill="#f2e8d8" font-size="24">${layout==='square'?'Square loop':'Oval loop'}</text><text x="320" y="278" text-anchor="middle" fill="#e8b754" font-size="28">${s.laps} ${s.laps===1?'lap':'laps'}</text><text x="320" y="308" text-anchor="middle" fill="#dbc5bc" font-size="16">Clockwise · tap a station</text>`;return result;
}
root.LineLayout={route,progress,draw};if(typeof module!=='undefined')module.exports=root.LineLayout;
})(typeof window!=='undefined'?window:globalThis);
