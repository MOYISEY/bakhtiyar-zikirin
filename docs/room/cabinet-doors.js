import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Four 568 mm panels fold on offset rear hinges. Equal 584 mm links keep
// the inner guide pins on the straight front rail through the whole motion.
// At 90 degrees the panels are 52 mm apart, entirely in front of the case;
// no leaf disappears into a wall or covers the opposite half of the shelf.
export function installBifoldDoors(cabinet,left,right){
 const materials=new Map();cabinet.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))materials.set(o.material.name,o.material)});
 const wood=materials.get('Oiled walnut'),oak=materials.get('Desk oak edge'),brass=materials.get('Brushed warm brass'),metal=materials.get('Warm graphite steel');
 if(!wood||!oak||!brass||!metal)throw Error('Cabinet finish unavailable');
 const rails=new T.Group();rails.name='Bifold guide channels';cabinet.add(rails);
 function box(root,name,w,h,d,m,x,y,z,r=.003){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i)),u=nx>ny&&nx>nz?p.getZ(i):p.getX(i),v=ny>nx&&ny>nz?p.getZ(i):p.getY(i);uv.setXY(i,m===oak?.35+v*.16:u,m===oak?.13+u*.035:v)}const o=new T.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o}
 function cylinder(root,name,r,h,m,x,y,z){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,16),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o}
 function batch(root){root.updateMatrixWorld(true);const groups=new Map();for(const o of [...root.children])if(o.isMesh&&!o.userData.action){o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);o.geometry.dispose();root.remove(o)}for(const [m,parts]of groups){const o=new T.Mesh(mergeGeometries(parts,false),m);o.name='Batched bifold '+m.name;o.castShadow=o.receiveShadow=true;root.add(o);parts.forEach(g=>g.dispose())}}
 for(const y of [.147,.649]){box(rails,'Guide channel bed',2.37,.004,.080,wood,0,y,.300,.001);for(const z of [.263,.337])box(rails,'Guide channel lip',2.37,y<.2?.008:.012,.004,metal,0,y+(y<.2?.002:-.006),z,.001)}for(const x of [-1.1,0,1.1])box(rails,'Guide mounting bracket',.06,.004,.12,metal,x,.653,.26,.001);for(const [y,h]of [[.651,.022],[.142,.020]])box(rails,'Oak guide valance',2.37,h,.020,wood,0,y,.345,.003);batch(rails);
 const folds=[],guides=[],panels=[],carriages=[];let anchor;
 for(const [side,root]of [[1,left],[-1,right]]){
  for(const child of [...root.children])root.remove(child);root.position.z=.300;
  const fold=new T.Group();fold.name=side===1?'CabinetLeftFold':'CabinetRightFold';fold.position.set(side*.584,0,-.026);root.add(fold);folds.push(fold);
  for(const [node,depth]of [[root,0],[fold,.026]]){const panel=new T.Group();panel.name='Bifold panel';node.add(panel);panels.push(panel);box(panel,'Walnut leaf',.568,.478,.024,wood,side*.292,0,depth,.004);for(let i=0;i<8;i++)box(panel,'Oak flute',.018,.455,.014,oak,side*(.044+i*.071),0,depth+.018,.004);for(const y of [-.228,.228])box(panel,'Leaf cap',.568,.025,.018,wood,side*.292,y,depth+.019,.003);batch(panel)}
  for(const y of [-.17,0,.17]){cylinder(root,'Outer hinge',.010,.035,brass,0,y,0);cylinder(fold,'Offset folding hinge',.0055,.035,brass,0,y,0)}
  for(const y of [-.240,.246]){const peg=cylinder(fold,'Captured guide pin',.003,.012,brass,side*.584,y,.026),marker=new T.Object3D();marker.position.copy(peg.position);fold.add(marker);guides.push(marker);const carriage=new T.Group();carriage.name='Captured sliding shoe';carriage.position.set(side*.584,y+(y<0?-.004:.004),.026);fold.add(carriage);box(carriage,'Guide shoe',.022,.004,.062,metal,0,0,0,.001);carriages.push({node:carriage,side})}
  for(const y of [-.028,.028])cylinder(fold,'Pull stand-off',.0035,.043,brass,side*.53,y,.0565).rotation.x=Math.PI/2;
  const pull=cylinder(fold,side===1?'CabinetPull':'CabinetRightPull',.006,.085,brass,side*.53,0,.078);pull.userData.action='cabinet';if(side===1)anchor=pull;
  batch(root);batch(fold);
 }
 return{anchor,folds,guides,panels,rails,set(value){const a=value*Math.PI/2;left.rotation.y=-a;right.rotation.y=a;folds[0].rotation.y=2*a;folds[1].rotation.y=-2*a;for(const {node,side}of carriages)node.rotation.y=-side*a},shoeReport(){cabinet.updateMatrixWorld(true);const inv=cabinet.matrixWorld.clone().invert();return carriages.map(({node})=>{const b=new T.Box3().setFromObject(node).applyMatrix4(inv);return{min:b.min.toArray(),max:b.max.toArray()}})},guideReport(){cabinet.updateMatrixWorld(true);const inv=cabinet.matrixWorld.clone().invert();return guides.map(o=>o.getWorldPosition(new T.Vector3()).applyMatrix4(inv).toArray())}};
}
