import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Four mitred rails share a stepped section. The aperture is a real opening;
// the printed board sits behind the inner lip instead of on a solid wood box.
function railGeometry(w,h,section,edge,openBottom=false){
 const positions=[],uv=[],indices=[],corners=s=>[[-w/2+s,h/2-s],[w/2-s,h/2-s],[w/2-s,openBottom?-h/2:-h/2+s],[-w/2+s,openBottom?-h/2:-h/2+s]];
 for(const [s,z]of section){const c=corners(s);for(const p of [c[edge],c[(edge+1)%4]]){positions.push(p[0],p[1],z);uv.push(.35+(edge%2?p[1]:p[0])*.16,.13+s*.035)}}
 for(let i=0;i<section.length;i++){const a=i*2,b=a+1,c=((i+1)%section.length)*2+1,d=c-1;indices.push(a,c,b,a,d,c)}
 if(openBottom&&(edge===1||edge===3)){const end=edge===1?1:0,triangles=T.ShapeUtils.triangulateShape(section.map(([s,z])=>new T.Vector2(s,z)),[]);for(const tri of triangles){const ids=tri.map(i=>i*2+end),a=new T.Vector3().fromArray(positions,ids[0]*3),b=new T.Vector3().fromArray(positions,ids[1]*3),c=new T.Vector3().fromArray(positions,ids[2]*3);if(new T.Vector3().crossVectors(b.sub(a),c.sub(a)).y>0)ids.reverse();indices.push(...ids)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
const pictureSection=[[0,-.009],[0,.006],[.0015,.008],[.0215,.008],[.024,.0055],[.024,-.0025],[.0205,-.0025],[.0205,-.009]];
const trimSection=[[0,-.006],[0,.003],[.001,.004],[.013,.004],[.015,.002],[.015,-.004],[.010,-.004],[.010,-.006]];
function mesh(root,name,geometry,material,x=0,y=0,z=0){const o=new T.Mesh(geometry,material);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o}
function box(root,name,w,h,d,material,x,y,z){return mesh(root,name,new T.BoxGeometry(w,h,d),material,x,y,z)}
function profile(root,name,w,h,section,material,y,z,openBottom=false){const parts=[];for(let edge=0;edge<4;edge++)if(!openBottom||edge!==2)parts.push(railGeometry(w,h,section,edge,openBottom));const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());return mesh(root,name,g,material,0,y,z)}
function turned(root,name,r,h,material,x,y,z,axisZ=false){const points=[[0,-h/2],[r*.88,-h/2],[r,-h/2+Math.min(.0015,h*.2)],[r,h/2-Math.min(.0015,h*.2)],[r*.88,h/2],[0,h/2]].map(p=>new T.Vector2(...p)),o=mesh(root,name,new T.LatheGeometry(points,24),material,x,y,z);if(axisZ)o.rotation.x=Math.PI/2;return o}

// Original collider meshes retain their parents and transforms. Their visual
// copies may batch, while fallback fragments scheduled for replacement do not.
export function batchStaticDetails(root,excluded=[]){const omit=new Set(excluded),groups=new Map();for(const o of [...root.children])if(o.isMesh&&o.visible&&!omit.has(o)&&!Array.isArray(o.material)&&!o.material.transparent){if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(o)}for(const [material,objects]of groups){if(objects.length<2)continue;const parts=objects.map(o=>{o.updateMatrix();return(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix)}),g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());objects.forEach(o=>o.visible=false);mesh(root,'Batched static '+material.name,g,material)}}

export function addGalleryFrame(root,{wood,board,mount}){
 profile(root,'Mitred gallery rails',.89,.64,pictureSection,wood,0,0);
 box(root,'Gallery backing',.85,.60,.003,wood,0,0,-.0075);
 box(root,'Recessed picture board',.844,.594,.002,board,0,0,-.0035);
 box(root,'Wall cleat',.25,.035,.011,wood,0,.22,-.0145);
 for(const x of [-.32,.32])turned(root,'Lower wall spacer',.008,.011,mount,x,-.22,-.0145,true);
 batchStaticDetails(root);
 root.userData.frameConstruction={railWidth:.024,railDepth:.017,imageZ:-.0023,wallContactZ:-.020};
}

export function addCorridorDetails(root,{trim,metal,dark}){
 profile(root,'Stepped glazing rebate',1.11,2.34,trimSection,metal,1.228,.101);
 profile(root,'Mitred outer casing cap',1.39,2.583,trimSection,trim,1.2935,.121,true);
 for(const y of [.908,1.132]){turned(root,'Pull mounting rose',.022,.006,metal,.43,y,.045,true);turned(root,'Pull stand-off',.007,.058,metal,.43,y,.077,true);for(const x of [.418,.442]){turned(root,'Pull fixing',.0027,.0014,metal,x,y,.0487,true);box(root,'Fixing slot',.0035,.0006,.0003,dark,x,y,.0495)}}
 turned(root,'Turned vertical pull',.0125,.31,metal,.43,1.02,.112);
 root.userData.joineryConstruction={floorGap:.002,casingWidth:1.39,casingTop:2.585,casingFace:.125,casingStep:.010,glazingRebate:.015,pullStandOff:.064};
}
