import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CubeState,FACES} from './cube-state.js';
const figureTemplates=new Map();
export function setFigureTemplates(models){for(const [kind,root]of Object.entries(models))figureTemplates.set(kind,root)}
const material=color=>new T.MeshStandardMaterial({color,roughness:.48,metalness:.15});
function mesh(g,m,parent,p=[0,0,0]){const o=new T.Mesh(g,m);o.position.fromArray(p);parent.add(o);return o}
export function createCube(state=new CubeState()){
 const root=new T.Group(),body=material('#1e2725'),box=new RoundedBoxGeometry(.304,.304,.304,1,.018),sticker=new T.PlaneGeometry(.256,.256),materials=Object.fromEntries(Object.entries(FACES).map(([k,f])=>[k,material(f.color)])),parts=new Map();
 for(const piece of state.pieces){const group=new T.Group();parts.set(piece.id,group);root.add(group);mesh(box,body,group);for(const [face,f]of Object.entries(FACES))if(piece.home[f.axis]===f.layer){const p=[0,0,0];p[f.axis]=f.layer*.154;const tile=mesh(sticker,materials[face],group,p);tile.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...p).normalize());tile.userData.sticker=true;tile.userData.normal=new T.Vector3(...p).normalize();tile.userData.piece=piece.id}}
 const sync=()=>{for(const piece of state.pieces){const o=parts.get(piece.id);if(o.parent!==root)root.attach(o);o.position.fromArray(piece.p).multiplyScalar(.32);const m=piece.m;o.quaternion.setFromRotationMatrix(new T.Matrix4().set(m[0],m[1],m[2],0,m[3],m[4],m[5],0,m[6],m[7],m[8],0,0,0,0,1))}};sync();return{root,parts,sync};
}
// Room props merge by material; the inspection cube retains movable pieces.
export function batchProp(root){root.updateMatrixWorld(true);const groups=new Map(),old=new Set();root.traverse(o=>{if(!o.isMesh)return;const copy=o.geometry.clone(),g=(copy.index?copy.toNonIndexed():copy).applyMatrix4(o.matrixWorld);if(g!==copy)copy.dispose();old.add(o.geometry);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g)});const result=new T.Group();for(const [m,geometries]of groups){result.add(new T.Mesh(mergeGeometries(geometries,false),m));geometries.forEach(g=>g.dispose())}old.forEach(g=>g.dispose());return result}
export function createFigure(kind){if(figureTemplates.has(kind)){const copy=figureTemplates.get(kind).clone(true);copy.userData.source='blender-room-accents';copy.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=o.receiveShadow=true}});return copy}const root=new T.Group(),green=material('#45675d'),cream=material('#d8cfb7'),brass=material('#a98750'),dark=material('#243d37');
 const box=(w,h,d,m,p)=>mesh(new RoundedBoxGeometry(w,h,d,2,.025),m,root,p),sphere=(r,m,p)=>mesh(new T.SphereGeometry(r,24,16),m,root,p);
 mesh(new T.CylinderGeometry(.39,.43,.10,32),dark,root,[0,-.50,0]);
 if(kind==='robot'){box(.54,.40,.32,green,[0,-.14,0]);box(.59,.34,.37,cream,[0,.28,0]);box(.42,.14,.015,dark,[0,.30,.193]);for(const x of [-.12,.12])sphere(.035,brass,[x,.3,.211]);for(const x of [-.19,.19]){box(.13,.19,.19,brass,[x,-.41,0]);box(.12,.30,.16,cream,[x*1.9,-.12,0])}mesh(new T.CylinderGeometry(.018,.018,.15,12),brass,root,[0,.52,0]);sphere(.055,green,[0,.61,0])}
 else{mesh(new T.CylinderGeometry(.05,.08,.27,20),brass,root,[0,-.33,0]);sphere(.35,green,[0,.06,0]);const ring=mesh(new T.TorusGeometry(.43,.018,8,64),brass,root,[0,.06,0]);ring.rotation.x=.95;ring.rotation.y=.38;mesh(new T.CylinderGeometry(.035,.035,.80,12),cream,root,[0,.06,0]);sphere(.065,brass,[0,.50,0])}
 return batchProp(root)}
