import {CubeState,FACES} from '../public/room/cube-state.js';
import assert from 'node:assert/strict';
const cube=new CubeState(),initial=JSON.stringify(cube.snapshot());let checks=0;const ok=(name,condition)=>{assert(condition,name);checks++};
for(const face of Object.keys(FACES)){for(let n=0;n<4;n++)cube.turn(face);ok(face+' four turns restore positions and orientation',JSON.stringify(cube.snapshot())===initial);ok(face+' is solved',cube.solved);cube.turn(face);cube.turn(face,-1);ok(face+' inverse restores state',JSON.stringify(cube.snapshot())===initial)}
let seed=4240;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const keys=Object.keys(FACES),moves=[];
for(let n=0;n<1000;n++){const f=keys[Math.floor(random()*6)],d=random()<.5?-1:1;moves.push([f,d]);const turn=cube.turn(f,d);ok('face selects nine pieces',turn.ids.length===9);ok('positions remain a unique integer lattice',new Set(cube.pieces.map(p=>p.p.join(','))).size===26&&cube.pieces.every(p=>p.p.every(x=>[-1,0,1].includes(x))));ok('orientation remains integral',cube.pieces.every(p=>p.m.every(x=>[-1,0,1].includes(x))))}
for(const [f,d]of moves.reverse())cube.turn(f,-d);ok('1000 turns and inverses restore exact state',JSON.stringify(cube.snapshot())===initial);ok('long inverse is solved',cube.solved);
cube.reset();const scramble=cube.scramble(random);ok('scramble is twenty legal turns',scramble.length===20&&!cube.solved&&cube.moves===20);for(const [f,d]of scramble.reverse())cube.turn(f,-d);ok('scramble has a valid inverse',cube.solved);cube.reset();ok('reset restores exact state',JSON.stringify(cube.snapshot())===initial&&cube.moves===0);assert.throws(()=>cube.turn('X'));assert.throws(()=>cube.turn('R',0));checks+=2;
console.log(JSON.stringify({passed:true,checks,turns:2076}));
