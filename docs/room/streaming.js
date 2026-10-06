import * as T from 'three';
import {STREAM_FILES} from './stream-manifest.js';
import {COMPRESSED_MODELS} from './compressed-models.js';

// Each zone is requested once. A retry retains successful parsed models/textures.
export function createStreaming(){
 T.Cache.enabled=true;
 const cache=new Map(),phases={},managers={};let listener=()=>{};
 const key=url=>new URL(url,location.href).pathname;
 for(const name of ['room','decor','expo']){
  const state=phases[name]={status:'idle',done:new Set(),failed:new Set(),total:STREAM_FILES[name].length,promise:null,error:null};
  const expected=new Set(STREAM_FILES[name].map(key)),manager=managers[name]=new T.LoadingManager();
  manager.onProgress=url=>{const path=key(url);if(expected.has(path)&&!state.failed.has(path))state.done.add(path);listener()};
  manager.onError=url=>{state.failed.add(key(url));state.done.delete(key(url));listener()};
 }
 function once(id,run){if(!cache.has(id)){const promise=run().catch(error=>{cache.delete(id);for(const url of [id,new URL(id,location.href).href])for(const prefix of ['', 'file:', 'image:'])T.Cache.remove(prefix+url);throw error});cache.set(id,promise)}return cache.get(id)}
 function texture(phase,url,color=false){return once(url,async()=>{const t=await new T.TextureLoader(managers[phase]).loadAsync(url);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t})}
 async function loadModel(loader,phase,url){
  const packed=COMPRESSED_MODELS[url];let decoder;
  if(packed)try{decoder=new DecompressionStream('gzip')}catch{}
  if(!decoder)return loader.loadAsync(url);
  // Count the logical model once in the phase manifest; raw GLB remains a fallback.
  const manager=managers[phase];manager.itemStart(url);
  try{
   try{
    const response=await fetch(packed.gzip);if(!response.ok)throw new Error('Compressed model unavailable');
    const bytes=await new Response(response.body.pipeThrough(decoder)).arrayBuffer();
    if(bytes.byteLength!==packed.rawBytes)throw new Error('Compressed model size mismatch');
    return await loader.parseAsync(bytes,new URL('.',new URL(url,location.href)).href);
   }catch{return await loader.loadAsync(url)}
  }catch(error){manager.itemError(url);throw error}finally{manager.itemEnd(url)}
 }
 function model(phase,url){return once(url,async()=>{const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const asset=await loadModel(new GLTFLoader(managers[phase]),phase,url);asset.scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){const index=asset.parser.associations.get(m)?.materials,source=asset.parser.json.materials?.[index];if(!source)continue;const pbr=source.pbrMetallicRoughness||{};if((pbr.baseColorTexture&&!m.map)||(source.normalTexture&&!m.normalMap)||(pbr.metallicRoughnessTexture&&!m.roughnessMap))throw new Error('Model texture unavailable: '+url)}});return asset})}
 function run(name,fn){const s=phases[name];if(s.promise)return s.promise;s.status='loading';s.error=null;s.failed.clear();listener();s.promise=fn().then(()=>{s.status='ready';listener();return true}).catch(error=>{s.status='error';s.error=error.message||'Asset unavailable';listener();return false});return s.promise}
 function retry(){for(const s of Object.values(phases))if(s.status==='error'){s.promise=null;s.status='idle';s.error=null}listener()}
 const inspect=()=>Object.fromEntries(Object.entries(phases).map(([name,s])=>[name,{status:s.status,completed:s.done.size,total:s.total,failed:[...s.failed],error:s.error}]));
 return{texture,model,run,retry,inspect,onChange(fn){listener=fn},notify(){listener()},phases};
}
