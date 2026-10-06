import * as T from 'three';

// The atlas holds E/pi from Cycles' indirect-only, colour-excluded diffuse pass.
// Three's physical lightMap input is E, hence pi. Runtime is lossless sRGB WebP, verified against the source PNG16.
export function installWindow(scene,root,map){
 map.flipY=false;map.channel=1;map.colorSpace=T.SRGBColorSpace;
 map.wrapS=map.wrapT=T.ClampToEdgeWrapping;
 root.name='Authored_window_with_indirect_daylight';
 root.traverse(o=>{if(!o.isMesh)return;
  if(!o.geometry.attributes.uv1)throw new Error('Window lightmap UV channel missing');
  o.castShadow=o.receiveShadow=true;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   m.lightMap=map;m.lightMapIntensity=Math.PI;
   // Replace broad diffuse ambient on this static fragment, rather than adding
   // the bake to the existing ambient twice. Specular IBL and live lights remain.
   m.onBeforeCompile=shader=>{
    const begin=T.ShaderChunk.lights_fragment_begin
     .replace('getAmbientLightIrradiance( ambientLightColor )','vec3( 0.0 )')
     .replace(/irradiance \+= getHemisphereLightIrradiance\([^;]+;/g,'irradiance += vec3( 0.0 );');
    const maps=T.ShaderChunk.lights_fragment_maps
     .replace('iblIrradiance += getIBLIrradiance( geometryNormal );','iblIrradiance += vec3( 0.0 );');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',begin).replace('#include <lights_fragment_maps>',maps);
   };
   m.customProgramCacheKey=()=> 'window-indirect-v1';
   m.userData.indirectOnly=true;m.needsUpdate=true;
  }
 });
 scene.add(root);return root;
}
