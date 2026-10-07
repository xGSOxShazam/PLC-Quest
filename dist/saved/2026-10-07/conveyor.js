(function(root){
const WIDTH=54,BEAM=232,LEFT=20,LENGTH=420,SPEED=80;
const fresh=()=>({positions:[20,160,300],positions2:[20,160,300],detected:false});
function advance(plant,moving,dt=100){
 if(moving)plant.positions=plant.positions.map(x=>LEFT+((x-LEFT+SPEED*dt/1000)%LENGTH));
 plant.detected=plant.positions.some(x=>x<=BEAM&&x+WIDTH>BEAM);
 return plant;
}
function hasFeed(level){return level.inputs.includes('SENSOR')&&!level.rungs.some(r=>r.out==='MOTOR');}
function step(level,program,state,inputs,plant,mode='boxes',dt=100){
 advance(plant,!!state.bits.MOTOR||hasFeed(level),dt);
 if(state.bits.BELT2)plant.positions2=plant.positions2.map(x=>LEFT+((x-LEFT+SPEED*dt/1000)%LENGTH));
 if(mode==='boxes'&&level.inputs.includes('SENSOR'))inputs.SENSOR=plant.detected;
 root.PLC.scan(level,program,state,inputs,dt);
 return plant;
}
root.Conveyor={fresh,advance,hasFeed,step};
if(typeof module!=='undefined')module.exports=root.Conveyor;
})(typeof window!=='undefined'?window:globalThis);
