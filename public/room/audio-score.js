// Original 64-second ambient composition. No recordings, downloads or licensed samples.
// The same PCM renderer is used by the room and the review WAV generator.
export const SCORE={name:'Window Notes',seconds:64,sampleRate:22050,targetRMS:.18};
const tau=Math.PI*2,hz=n=>440*2**((n-69)/12);
function* render(rate){
 const length=rate*SCORE.seconds,L=new Float32Array(length),R=new Float32Array(length);
 function* voice(midi,start,seconds,gain,pan,pad=false){
  const f=hz(midi),a=Math.round(start*rate),n=Math.round(seconds*rate),left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
  for(let i=0;i<n;i++){const t=i/rate,u=i/n,fade=Math.min(1,(seconds-t)/.8),attack=1-Math.exp(-t/(pad?1.3:.035));
   const envelope=attack*Math.max(0,fade)*(pad?Math.sin(Math.PI*u)**.6:Math.exp(-t/2.5));
   const phase=tau*f*t;
   const value=pad?(Math.sin(phase)+.34*Math.sin(phase*1.0017)+.12*Math.sin(phase*2))*.68:Math.sin(phase)+.24*Math.sin(phase*2)*Math.exp(-t/1.4)+.075*Math.sin(phase*3)*Math.exp(-t/.7);
   const sample=value*envelope*gain,j=(a+i)%length;L[j]+=sample*left;R[j]+=sample*right;if((i&2047)===2047)yield;
  }
 }
 // Dmaj9, Aadd9, F#m7, Bm9, Gmaj9, D/F#, Em9, A7sus: restrained voice leading.
 const chords=[[50,57,61,64,69],[45,57,59,61,64],[42,56,57,61,64],[47,54,57,61,66],[43,54,57,59,62],[42,57,62,64,69],[40,55,59,62,66],[45,55,57,62,64]];
 const melody=[[73,76,69],[71,69],[68,73,76],[73,71,66],[74,71,69],[73,76,78],[74,71,66],[69,71,73,69]];
 for(let bar=0;bar<8;bar++){
  const at=bar*8,c=chords[bar];yield* voice(c[0]-12,at+.12,7.8,.10,0,true);yield;
  for(let i=0;i<4;i++){yield* voice(c[i+1],at+i*.14,9,.047,(i-1.5)*.28,true);yield;}
  for(let i=0;i<melody[bar].length;i++){yield* voice(melody[bar][i],at+1.25+i*1.8,5.3,.095*(i===0?1:.82),Math.sin(bar+i)*.28);yield;}
  if(bar%2===1)yield* voice(c[2]+12,at+6.4,4,.040,-.36);
  yield;
 }
 // Three subtle stereo reflections, using a dry snapshot rather than accumulating feedback.
 const dryL=L.slice(),dryR=R.slice();
 for(const [seconds,gain,cross]of [[.173,.16,true],[.317,.10,false],[.571,.055,true]]){
  const offset=Math.round(seconds*rate);for(let i=0;i<length;i++){const j=(i+offset)%length;L[j]+=(cross?dryR[i]:dryL[i])*gain;R[j]+=(cross?dryL[i]:dryR[i])*gain;if((i&8191)===8191)yield;}yield;
 }
 // DC removal and bounded RMS normalisation; no peak clipping.
 let sumL=0,sumR=0;for(let i=0;i<length;i++){sumL+=L[i];sumR+=R[i];if((i&8191)===8191)yield;}sumL/=length;sumR/=length;
 let energy=0,peak=0;for(let i=0;i<length;i++){L[i]-=sumL;R[i]-=sumR;energy+=L[i]*L[i]+R[i]*R[i];peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));if((i&8191)===8191)yield;}
 const scale=Math.min(SCORE.targetRMS/Math.sqrt(energy/(length*2)),.78/peak);for(let i=0;i<length;i++){L[i]*=scale;R[i]*=scale;if((i&8191)===8191)yield;}
 return{channels:[L,R],sampleRate:rate,duration:SCORE.seconds};
}
export function createMusic(rate=SCORE.sampleRate){const g=render(rate);let r;do{r=g.next();}while(!r.done);return r.value;}
export async function createMusicAsync(rate=SCORE.sampleRate){const g=render(rate);let r;do{const until=performance.now()+4;do{r=g.next();}while(!r.done&&performance.now()<until);if(!r.done)await new Promise(resolve=>setTimeout(resolve,0));}while(!r.done);return r.value;}
export function createRain(rate=22050,seconds=7){const out=new Float32Array(rate*seconds);let seed=773,slow=0,energy=0;for(let i=0;i<out.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;slow=slow*.91+(seed/4294967296*2-1)*.09;out[i]=slow;energy+=slow*slow;}const gain=.12/Math.sqrt(energy/out.length);for(let i=0;i<out.length;i++){out[i]*=gain;const edge=Math.min(i,out.length-1-i);if(edge<256)out[i]*=Math.sin(edge/256*Math.PI/2);}return out;}
