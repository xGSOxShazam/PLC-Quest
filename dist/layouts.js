(function(root){
const node=(id,x,y,type='belt')=>({id,x,y,type});
const make=(name,level,topic,nodes,routes)=>({name,level,topic,nodes:nodes.map(n=>node(...n)),routes});
const layouts=[
make('First transfer','Easy','Start, stop, photoeye occupancy, and downstream handoff.',[['A',80,200],['B',300,200,'sensor'],['C',540,200,'exit']],[['A','B','C']]),
make('Corner accumulation','Easy','Hold a part at a gate without backing up the entry.',[['A',70,90],['B',270,90,'sensor'],['C',470,90,'stop'],['D',470,290],['E',260,290,'exit']],[['A','B','C','D','E']]),
make('Return to operator','Moderate','A U shaped line with inspection and timed release.',[['A',70,80],['B',280,80,'sensor'],['C',530,80],['D',530,280,'stop'],['E',280,280,'sensor'],['F',70,280,'exit']],[['A','B','C','D','E','F']]),
make('Square recirculation','Moderate','Circulate each part once, then release it to the exit.',[['A',100,80],['B',340,80,'sensor'],['C',550,80,'stop'],['D',550,300],['E',340,300,'sensor'],['F',100,300],['G',340,185,'exit']],[['A','B','C','D','E','F','A','B','G']]),
make('Two lane merge','Intermediate','Two infeed lanes share one discharge. Watch the merge arbitration.',[['A',70,65],['B',270,65,'stop'],['C',70,305],['D',270,305,'stop'],['E',410,185,'merge'],['F',590,185,'exit']],[['A','B','E','F'],['C','D','E','F']]),
make('Inspection sorter','Intermediate','Route alternating part types to separate lanes and separate exits.',[['A',60,185],['B',220,185,'sensor'],['C',380,185,'sort'],['D',530,65,'stop'],['E',690,65,'exit'],['F',530,305,'stop'],['G',690,305,'exit']],[['A','B','C','D','E'],['A','B','C','F','G']]),
make('Elevated crossover','Hard','Lift to an upper conveyor, cross the floor, then lower before discharge.',[['A',65,310],['B',210,310,'lift'],['C',210,70,'sensor'],['D',450,70],['E',640,70,'lift'],['F',640,310,'stop'],['G',440,310,'exit']],[['A','B','C','D','E','F','G']]),
make('Parallel processing','Very hard','Split through two processing cells, then merge without trapping a part.',[['A',55,185],['B',190,185,'sort'],['C',320,65,'stop'],['D',490,65,'lift'],['E',320,305,'lift'],['F',490,305,'stop'],['G',620,185,'merge'],['H',760,185,'exit']],[['A','B','C','D','G','H'],['A','B','E','F','G','H']]),
make('Rework loop','Expert','Rework parts return through inspection. Accepted parts take the exit branch.',[['A',65,80],['B',245,80,'sensor'],['C',440,80,'sort'],['D',650,80,'exit'],['E',440,300,'stop'],['F',245,300,'lift'],['G',65,300]],[['A','B','C','D'],['A','B','C','E','F','G','A','B','C','D']]),
make('Integrated factory','Extremely difficult','Coordinate two feeds, a merge, parallel cells, a lift, and a recirculating inspection route.',[['A',55,60],['B',210,60,'stop'],['C',55,340],['D',210,340,'stop'],['E',355,200,'merge'],['F',490,200,'sort'],['G',490,60,'lift'],['H',660,60,'sensor'],['I',490,340,'stop'],['J',660,340,'sensor'],['K',800,200,'merge'],['L',955,200,'exit']],[['A','B','E','F','G','H','K','L'],['C','D','E','F','I','J','K','L'],['A','B','E','F','I','J','K','E','F','G','H','K','L']])
];
function fresh(layout){return {time:0,fed:0,delivered:0,run:false,ready:true,nextId:1,turn:0,feedTime:0,stations:Object.fromEntries(layout.nodes.map(n=>[n.id,{box:null,elapsed:0,fault:false,enabled:true,hold:1,condition:'RUN',output:false}]))};}
function feed(layout,s){if(s.fed-s.delivered>=Math.max(1,Math.floor(layout.nodes.length/3)))return false;const r=layout.routes[s.turn%layout.routes.length],first=s.stations[r[0]];if(first.box)return false;first.box={id:s.nextId++,route:r.slice(),pos:0};first.elapsed=0;s.fed++;s.turn++;return true;}
function tick(layout,s,dt=.1,auto=true){s.time+=dt;if(!s.run){for(const st of Object.values(s.stations))st.output=false;return;}
 const occupied=new Set(Object.entries(s.stations).filter(([id,st])=>st.box).map(([id])=>id));
 // Snapshot occupancy plus reservations prevents both overlapping handoffs and a box moving twice per scan.
 const reserved=new Set(occupied),moves=[];
 for(const n of layout.nodes){const st=s.stations[n.id];const condition=st.condition==='RUN'?s.run:st.condition==='READY'?s.ready:st.condition==='NOT_READY'?!s.ready:false;
 st.output=st.enabled&&!st.fault&&condition;
 if(!st.box||!st.output)continue;
 st.elapsed+=dt;const duration=n.type==='lift'?st.hold+1.6:n.type==='stop'?st.hold:.8;
 if(st.elapsed<duration)continue;
 const target=st.box.route[st.box.pos+1];if(!target){moves.push([n.id,null]);continue;}
 if(!reserved.has(target)){moves.push([n.id,target]);reserved.add(target);}
 }
 for(const [from,to]of moves){const st=s.stations[from],box=st.box;st.box=null;st.elapsed=0;if(to){box.pos++;s.stations[to].box=box;s.stations[to].elapsed=0;}else s.delivered++;}
 if(auto){s.feedTime+=dt;if(s.feedTime>=1.5){if(feed(layout,s))s.feedTime=0;}}
}
root.LayoutLab={layouts,fresh,feed,tick};if(typeof module!=='undefined')module.exports=root.LayoutLab;
})(typeof window==='undefined'?globalThis:window);
