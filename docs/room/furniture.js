import * as T from 'three';

// Preserve the previous scene as an explicit comparison path.
export const authoredFurniture=new URLSearchParams(location.search).get('furniture')!=='legacy';
export const refinedJoinery=authoredFurniture&&new URLSearchParams(location.search).get('joinery')!=='legacy';
export const JOINERY_FILES=['cabinet','workbench','side-table'].map(id=>'assets/studio-furniture/'+id+'.glb');
export const FURNITURE_FILES=['chair','lamp','door','drawer'].map(id=>'assets/studio-furniture/'+id+'.glb');

export function installStudioFurniture({doorAsset,drawerAsset,scene,door,doorLabel,doorHandle,objects}){
 const find=(root,name)=>{let found;root.traverse(o=>{if(o.name===name||o.userData.studioNode===name)found=o});return found};
 const leaf=doorAsset.scene,root=drawerAsset.scene,tray=find(root,'DrawerTray'),pull=find(root,'DrawerPull');
 if(!tray||!pull)throw Error('Authored drawer nodes unavailable');
 const prepare=group=>group.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];o.castShadow=!materials.some(m=>m.transparent&&m.opacity<.45);o.receiveShadow=true;for(const m of materials)if(m.map)m.map.anisotropy=8});
 prepare(leaf);prepare(root);
 // Seat the leaf in front of the room-side jamb; the pin stays on the hinge axis.
 for(const child of door.children)child.position.z-=.052;doorLabel.position.z=-.0465;leaf.position.z=-.052;
 // Keep the existing physical collider meshes and hinge. Only their old visual
 // surfaces are hidden; the imported leaf inherits exactly the same door motion.
 for(const child of door.children)if(child!==doorLabel&&child!==doorHandle)child.visible=false;
 leaf.name='Authored door leaf';leaf.userData.action='door';door.add(leaf);
 root.name='Authored desk drawer';root.position.set(.38,.64,-1.85);scene.add(root);
 tray.userData.action='drawer';pull.userData.action='drawer';objects.push(pull);
 const closedZ=tray.position.z;
 return{tray,pull,leaf,setDrawer(value){tray.position.z=closedZ+.29*T.MathUtils.clamp(value,0,1)},inspect(){return{variant:'authored',drawerTravel:.29,drawerOffset:tray.position.z-closedZ,doorHinge:door.position.toArray()}}};
}
