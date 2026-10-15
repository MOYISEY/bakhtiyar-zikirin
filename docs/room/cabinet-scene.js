import * as T from 'three';
import {createCube,createFigure,batchProp} from './collection-models.js';
export function installCabinet(cabinet,objects){
 const left=cabinet.getObjectByName('modern_wooden_cabinet_door_l'),right=cabinet.getObjectByName('modern_wooden_cabinet_door_r');if(!left||!right)throw Error('Cabinet door nodes unavailable');
 const closed=[left.rotation.y,right.rotation.y],anchor=new T.Mesh(new T.BoxGeometry(.025,.12,.028),new T.MeshStandardMaterial({color:'#ae905c',metalness:.6,roughness:.35}));anchor.position.set(1.10,.23,.035);left.add(anchor);anchor.userData.action='cabinet';objects.push(anchor);left.userData.action=right.userData.action='cabinet';
 const content=new T.Group();cabinet.add(content);const items={};
 for(const [id,x]of [['cube',-.70],['robot',0],['orbit',.90]]){const model=id==='cube'?batchProp(createCube().root):createFigure(id);model.scale.setScalar(id==='cube'?.20:.18);model.position.set(x,.50,.055);model.userData.action=id;content.add(model);objects.push(model);items[id]=model}
 let opening=0;content.visible=false;
 return{anchor,items,set(value){opening=T.MathUtils.clamp(value,0,1);left.rotation.y=closed[0]-opening*1.48;right.rotation.y=closed[1]+opening*1.48;content.visible=opening>.82},inspect(){return{opening,itemsAccessible:content.visible,leftAngle:left.rotation.y-closed[0],rightAngle:right.rotation.y-closed[1]}}};
}
