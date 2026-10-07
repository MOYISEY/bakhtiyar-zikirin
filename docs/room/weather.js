import * as T from 'three';

// One exterior-only system: aerial perspective, world-space rain and wet glazing.
// No screen overlay, new audio source, saved preference or network asset.
export function createWeather(scene,sky){
 const fogColor=new T.Color('#aabfc3');
 scene.fog=new T.Fog(fogColor,115,620);
 const root=new T.Group();root.name='Exterior_rain_and_haze';scene.add(root);
 const cloud=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sky:{value:sky},haze:{value:fogColor}},vertexShader:`
  varying vec2 vUv; varying vec3 vDirection;
  void main(){vUv=uv;vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
 `,fragmentShader:`
  uniform sampler2D sky; uniform vec3 haze; varying vec2 vUv; varying vec3 vDirection;
  void main(){
   vec3 source=texture2D(sky,vec2(fract(vUv.x+.11),vUv.y)).rgb;
   float gray=dot(source,vec3(.2126,.7152,.0722));
   vec3 overcast=mix(haze*.82,vec3(gray)*.66+haze*.24,.26);
   float high=smoothstep(-.015,.42,vDirection.y);
   gl_FragColor=vec4(mix(haze,overcast,high),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `});
 const dome=new T.Mesh(new T.SphereGeometry(4400,32,16),cloud);dome.name='Overcast_horizon';dome.renderOrder=-10;root.add(dome);
 let seed=4240;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const count=760,positions=[],ends=[],speeds=[];
 for(let i=0;i<count;i++){
  const x=-3.4-random()*53,y=random()*40,z=-36+random()*63,speed=7+random()*7;
  for(let j=0;j<2;j++){positions.push(x,y,z);ends.push(j);speeds.push(speed)}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('end',new T.Float32BufferAttribute(ends,1));geometry.setAttribute('speed',new T.Float32BufferAttribute(speeds,1));
 const rainMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`
  uniform float time; attribute float end; attribute float speed; varying float vAlpha;
  void main(){
   vec3 p=position;p.y=mod(p.y-time*speed,40.)-16.;
   p.x-=end*.075;p.y+=end*(.28+speed*.018);
   vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
   vAlpha=mix(.03,.25,end)*(1.-smoothstep(12.,72.,length(view.xyz)));
  }
 `,fragmentShader:`
  varying float vAlpha;
  void main(){gl_FragColor=vec4(.63,.76,.79,vAlpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `});
 const rain=new T.LineSegments(geometry,rainMaterial);rain.name='Exterior_rain_streaks';rain.frustumCulled=false;root.add(rain);
 // Fixed beads on the outside face of the existing glazing, occluded by its frame.
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
 for(let i=0;i<95;i++){
  const x=8+random()*1008,y=8+random()*496,r=1.1+random()*2.2;
  if(i%4===0){const g=ctx.createLinearGradient(x,y-20,x,y);g.addColorStop(0,'rgba(185,212,219,0)');g.addColorStop(1,'rgba(185,212,219,.3)');ctx.strokeStyle=g;ctx.lineWidth=r*.6;ctx.beginPath();ctx.moveTo(x+.8,y-13-r*3);ctx.quadraticCurveTo(x-1,y-7,x,y);ctx.stroke()}
  ctx.fillStyle='rgba(29,59,64,.3)';ctx.beginPath();ctx.ellipse(x,y,r*.68,r,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(223,242,245,.62)';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x-.35,y-.4,r*.66,r*.92,0,Math.PI*.8,Math.PI*1.9);ctx.stroke();
 }
 const dropsTexture=new T.CanvasTexture(c);dropsTexture.colorSpace=T.SRGBColorSpace;
 const drops=new T.Mesh(new T.PlaneGeometry(4.2,2.2),new T.MeshBasicMaterial({map:dropsTexture,transparent:true,opacity:.68,depthWrite:false,side:T.FrontSide,fog:false}));drops.name='Exterior_glass_beads';drops.rotation.y=Math.PI/2;drops.position.set(-3.045,1.77,-.5);root.add(drops);
 const frustum=new T.Frustum(),matrix=new T.Matrix4(),windowBounds=new T.Box3(new T.Vector3(-3.07,.67,-2.60),new T.Vector3(-3.01,2.87,1.60));
 let elapsed=0,accumulator=0,animatedFrames=0,visible=false;
 function animate(dt,camera,paused){
  frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));visible=frustum.intersectsBox(windowBounds);
  if(paused||!visible){accumulator=0;return false}
  accumulator+=dt;if(accumulator<1/30)return false;
  elapsed+=accumulator;accumulator=0;rainMaterial.uniforms.time.value=elapsed;animatedFrames++;return true;
 }
 return{animate,inspect:()=>({fogNear:115,fogFar:620,rainCount:count,glassBeads:95,animatedFrames,time:elapsed,windowVisible:visible,maxRainFPS:30,extraDrawCalls:3,audioChanged:false})};
}
