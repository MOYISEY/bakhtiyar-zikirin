import * as T from 'three';
import {installBifoldDoors} from './cabinet-doors.js';
import {createCube,createFigure,batchProp} from './collection-models.js';

function find(root,name){let result;root.traverse(o=>{if(o.name===name||o.userData.studioNode===name)result=o});return result}
export function installCabinet(cabinet,objects){
 const authored=!!find(cabinet,'CabinetLeftHinge');
 const left=find(cabinet,authored?'CabinetLeftHinge':'modern_wooden_cabinet_door_l');
 const right=find(cabinet,authored?'CabinetRightHinge':'modern_wooden_cabinet_door_r');
 if(!left||!right)throw Error('Cabinet hinge nodes unavailable');
 const bifold=authored?installBifoldDoors(cabinet,left,right):null;
 const closed=[left.rotation.y,right.rotation.y],limit=bifold?Math.PI/2:1.48;
 let anchor=bifold?.anchor||find(cabinet,'CabinetPull');
 if(!anchor){anchor=new T.Mesh(new T.BoxGeometry(.025,.12,.028),new T.MeshStandardMaterial({color:'#ae905c',metalness:.6,roughness:.35}));anchor.position.set(1.10,.23,.035);left.add(anchor)}
 anchor.userData.action='cabinet';objects.push(anchor);left.userData.action=right.userData.action='cabinet';
 const content=new T.Group();cabinet.add(content);const items={},shelfHeight=authored?.409:.400;
 for(const [id,x]of [['cube',-.70],['robot',0],['orbit',.90]]){
  const model=id==='cube'?batchProp(createCube().root):createFigure(id);model.scale.setScalar(id==='cube'?.20:.18);
  model.updateMatrixWorld(true);const floor=new T.Box3().setFromObject(model).min.y;
  model.position.set(x,shelfHeight-floor+.0015,.055);model.userData.action=id;content.add(model);objects.push(model);items[id]=model;
 }
 let opening=0;content.visible=true;
 function localBounds(root,inverse){const box=new T.Box3();root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,m=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),p=new T.Vector3();for(let i=0;i<a.count;i++)box.expandByPoint(p.fromBufferAttribute(a,i).applyMatrix4(m))});return box}
 return{
  anchor,items,
  set(value){opening=T.MathUtils.clamp(value,0,1);if(bifold)bifold.set(opening);else{left.rotation.y=closed[0]-opening*limit;right.rotation.y=closed[1]+opening*limit}content.visible=true},
  inspect(){return{variant:bifold?'authored-bifold-sliding':'legacy-curved-leaves',opening,itemsAccessible:opening>(bifold?.98:.82),leftAngle:left.rotation.y-closed[0],rightAngle:right.rotation.y-closed[1],limit}},
  geometry(){
   cabinet.updateMatrixWorld(true);const inverse=cabinet.matrixWorld.clone().invert(),l=localBounds(left,inverse),r=localBounds(right,inverse);
   return{variant:authored?'authored':'legacy',leafCaseGap:Math.min(l.min.z,r.min.z)-(authored?.260:.250),betweenLeaves:r.min.x-l.max.x,leafFloor:Math.min(l.min.y,r.min.y),guides:bifold?.guideReport(),shoes:bifold?.shoeReport(),leaves:[l,r].map(b=>({min:b.min.toArray(),max:b.max.toArray()})),worldLeaves:[left,right].map(o=>{const b=new T.Box3().setFromObject(o);return{min:b.min.toArray(),max:b.max.toArray()}}),items:Object.entries(items).map(([id,o])=>{const b=localBounds(o,inverse);return{id,min:b.min.toArray(),max:b.max.toArray(),shelfGap:b.min.y-shelfHeight}})};
  }
 };
}
