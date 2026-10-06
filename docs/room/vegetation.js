import * as T from 'three';

// Rendered from the CC0 native tree_small_02. Eight actual shape rotations replace
// the old random-dot canopy. Mipmapped impostors are the distance LOD; the closest
// row also retains the native, simplified three-dimensional trunk and branches.
export function createVegetation(parent,atlas,trunkAsset){
 const root=new T.Group();root.name='CC0_tree_LODs';parent.add(root);
 atlas.colorSpace=T.SRGBColorSpace;atlas.wrapS=atlas.wrapT=T.ClampToEdgeWrapping;atlas.anisotropy=8;
 const points=[];for(let i=0;i<22;i++)for(const z of [-211,75])points.push([-360+i*14,z]);for(let i=0;i<18;i++)points.push([-58,-184+i*14]);
 const nativeHeight=4.5640373137,frame=5.2030025376,ground=-16;
 const trees=points.map(([x,z],i)=>({x,z,variant:i%8,scale:[1.27,1.51,1.36,1.18,1.44,1.32,1.56,1.23][i%8],yaw:Math.atan2(-x,-z)}));
 const material=new T.MeshBasicMaterial({map:atlas,alphaTest:.012,alphaToCoverage:true,side:T.DoubleSide,toneMapped:false});
 const batches=[];
 for(let view=0;view<8;view++){
  const list=trees.filter(t=>t.variant===view),geometry=new T.PlaneGeometry(frame,frame),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+view%4)/4,(uv.getY(i)+1-Math.floor(view/4))/2);
  const mesh=new T.InstancedMesh(geometry,material,list.length);mesh.castShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);batches.push({mesh,list});
 }
 const near=trees.filter(t=>Math.hypot(t.x,t.z)<145),matrix=new T.Matrix4(),rotation=new T.Quaternion();
 trunkAsset.updateMatrixWorld(true);trunkAsset.traverse(o=>{if(o.isMesh){const mesh=new T.InstancedMesh(o.geometry,o.material,near.length);for(let i=0;i<near.length;i++){const t=near[i];rotation.setFromAxisAngle(new T.Vector3(0,1,0),t.variant*Math.PI/4+t.yaw-Math.PI/2);matrix.compose(new T.Vector3(t.x,ground,t.z),rotation,new T.Vector3(t.scale,t.scale,t.scale)).multiply(o.matrixWorld);mesh.setMatrixAt(i,matrix)}mesh.castShadow=mesh.receiveShadow=true;root.add(mesh)}});
 let lastX=Infinity,lastZ=Infinity;
 function update(camera){if(Math.abs(lastX-camera.position.x)+Math.abs(lastZ-camera.position.z)<.015)return;lastX=camera.position.x;lastZ=camera.position.z;
  for(const {mesh,list}of batches){list.forEach((t,i)=>{rotation.setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(camera.position.x-t.x,camera.position.z-t.z));matrix.compose(new T.Vector3(t.x,ground+nativeHeight*.5*t.scale,t.z),rotation,new T.Vector3(t.scale,t.scale,t.scale));mesh.setMatrixAt(i,matrix)});mesh.instanceMatrix.needsUpdate=true}
 }
 update({position:new T.Vector3(0,1.6,0)});
 return{update,count:trees.length,nearTrunks:near.length,source:'Poly Haven tree_small_02 / CC0',representation:'8 rendered shape rotations, mipmapped distance LOD, 3D near trunks'};
}
