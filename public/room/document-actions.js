import * as T from 'three';
const project=(p,camera)=>{p.project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}};
function paperRect(o,camera){const b=new T.Box3().setFromObject(o),a=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])a.push(project(new T.Vector3(x,y,z),camera));return{top:Math.min(...a.map(p=>p.y)),bottom:Math.max(...a.map(p=>p.y))}}
export function hideDocumentLeaders(){document.querySelector('#document-leaders')?.setAttribute('hidden','')}
export function layoutDocumentActions(items,camera,drawerButton){
 const svg=document.querySelector('#document-leaders');if(!svg)return;for(const p of svg.querySelectorAll('path'))p.setAttribute('hidden','');const active=items.filter(i=>!i.el.hidden);svg.toggleAttribute('hidden',!active.length);if(!active.length)return;svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 const handle=drawerButton&&!drawerButton.hidden?drawerButton.getBoundingClientRect():null;let top=Math.max(90,...active.map(i=>paperRect(i.object,camera).bottom+8),handle?handle.bottom+8:0);
 const sorted=active.map(i=>{const a=i.object.getObjectByName(i.object.userData.labelAnchor),p=project(a.getWorldPosition(new T.Vector3()),camera);return{...i,anchor:p,w:i.el.offsetWidth,h:i.el.offsetHeight,x:p.x}}).sort((a,b)=>a.x-b.x);
 if(sorted.length===2){const[a,b]=sorted,gap=8,minimum=(a.w+b.w)/2+gap;if(b.x-a.x<minimum){const middle=(a.x+b.x)/2;a.x=middle-minimum/2;b.x=middle+minimum/2}const left=a.x-a.w/2,right=b.x+b.w/2,shift=left<12?12-left:right>innerWidth-12?innerWidth-12-right:0;a.x+=shift;b.x+=shift}
 const height=Math.max(...sorted.map(i=>i.h));if(top+height>innerHeight-38)top=Math.min(...active.map(i=>paperRect(i.object,camera).top))-height-12;
 if(top<80){for(const i of sorted)i.el.hidden=i.el.disabled=true;hideDocumentLeaders();return}
 for(const i of sorted){i.x=Math.max(12+i.w/2,Math.min(innerWidth-12-i.w/2,i.x));i.el.style.left=i.x+'px';i.el.style.top=top+'px';const path=svg.querySelector('#document-leader-'+i.id.slice(7));path?.removeAttribute('hidden');path?.setAttribute('d',`M${i.anchor.x.toFixed(2)},${i.anchor.y.toFixed(2)} L${i.x.toFixed(2)},${(top>i.anchor.y?top:top+i.h).toFixed(2)}`);i.el.dataset.anchorX=i.anchor.x.toFixed(3);i.el.dataset.anchorY=i.anchor.y.toFixed(3)}
}
