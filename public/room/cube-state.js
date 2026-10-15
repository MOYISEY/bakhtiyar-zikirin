export const FACES={R:{axis:0,layer:1,color:'#ba473a'},L:{axis:0,layer:-1,color:'#d98b3c'},U:{axis:1,layer:1,color:'#e9e5d5'},D:{axis:1,layer:-1,color:'#d4b747'},F:{axis:2,layer:1,color:'#478c70'},B:{axis:2,layer:-1,color:'#4b78a1'}};
const identity=()=>[1,0,0,0,1,0,0,0,1];
const rotate=(p,axis,sign)=>{const a=p.slice(),i=(axis+1)%3,j=(axis+2)%3;a[i]=-sign*p[j];a[j]=sign*p[i];return a};
export class CubeState{
 constructor(){this.reset()}
 reset(){this.pieces=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)this.pieces.push({id:[x,y,z].join(','),home:[x,y,z],p:[x,y,z],m:identity()});this.moves=0;return this}
 turn(face,direction=1){const f=FACES[face];if(!f||![-1,1].includes(direction))throw Error('Invalid cube turn');const sign=-direction*f.layer,selected=this.pieces.filter(p=>p.p[f.axis]===f.layer).map(p=>p.id);for(const p of this.pieces)if(selected.includes(p.id)){p.p=rotate(p.p,f.axis,sign);const columns=[0,1,2].map(i=>rotate([p.m[i],p.m[3+i],p.m[6+i]],f.axis,sign));p.m=[0,1,2].flatMap(row=>columns.map(c=>c[row]))}this.moves++;return{axis:f.axis,angle:sign*Math.PI/2,ids:selected}}
 scramble(random=Math.random){let last;const turns=[];for(let i=0;i<20;i++){const keys=Object.keys(FACES).filter(k=>FACES[k].axis!==last),face=keys[Math.floor(random()*keys.length)],direction=random()<.5?-1:1;this.turn(face,direction);turns.push([face,direction]);last=FACES[face].axis}return turns}
 snapshot(){return this.pieces.map(p=>({id:p.id,p:[...p.p],m:[...p.m]}))}
 get solved(){return this.pieces.every(p=>Object.entries(FACES).every(([,f])=>{if(p.home[f.axis]!==f.layer)return true;const normal=[0,0,0];normal[f.axis]=f.layer;const n=[0,1,2].map(row=>p.m[row*3]*normal[0]+p.m[row*3+1]*normal[1]+p.m[row*3+2]*normal[2]);return n.every((v,i)=>v===normal[i])}))}
}
