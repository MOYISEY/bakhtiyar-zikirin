import * as T from 'three';
import {CSM} from 'three/addons/csm/CSM.js';

// One sun with three spatial resolutions, rather than an unshadowed second sun.
// The near cascade keeps joinery detail; the farther maps reach the EXPO plaza.
export function createDaylight(scene,camera){
 const csm=new CSM({camera,parent:scene,cascades:3,maxFar:720,mode:'custom',
  customSplitsCallback:(count,near,far,out)=>out.push(16/far,135/far,1),
  shadowMapSize:2048,lightDirection:new T.Vector3(7,-6,.4).normalize(),
  lightIntensity:2.25,lightNear:.1,lightFar:1400,lightMargin:160,shadowBias:.000004});
 csm.fade=true;csm.updateFrustums();
 for(const light of csm.lights){light.color.set('#f5f1e8');light.shadow.normalBias=.016;light.shadow.radius=3;}
 const installed=new WeakSet(),projection=new T.Matrix4();
 function material(m){
  if(!m||installed.has(m)||!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial))return;
  const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey();
  csm.setupMaterial(m);const shadows=m.onBeforeCompile;
  m.onBeforeCompile=(shader,renderer)=>{shadows(shader,renderer);previous.call(m,shader,renderer)};
  m.customProgramCacheKey=()=>previousKey+'|daylight-csm-3';m.needsUpdate=true;installed.add(m);
  m.addEventListener('dispose',()=>csm.shaders.delete(m));
 }
 function prepare(root=scene){root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])material(m)})}
 function update(){if(!projection.equals(camera.projectionMatrix)){projection.copy(camera.projectionMatrix);csm.updateFrustums()}csm.update()}
 return{prepare,material,update,inspect:()=>({cascades:3,splitsM:[16,135,720],mapSize:2048,oneSun:true})};
}
