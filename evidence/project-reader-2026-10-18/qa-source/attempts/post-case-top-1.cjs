const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('module').createRequire(process.cwd()+'/package.json')('playwright');const out='qa-private/project-reader/case-top',r={cases:[],passed:false};fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const version of ['before','after'])for(const mobile of [false,true]){
   const lang=mobile?'en':'ru',theme=mobile?'dark':'light';
   const c=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'}),p=await c.newPage();
   try{for(const id of ['helio','keyform','rowline']){
    await p.goto('http://127.0.0.1:4331/'+version+'/projects/'+id+'.html?lang='+lang);await p.waitForFunction(()=>document.body.dataset.siteReady==='true');await p.locator('#theme-select').selectOption(theme);await p.locator('.case-media img').first().evaluate(i=>i.decode());await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);
    const brief=await p.locator('.project-page>.project-brief dd').count();assert.equal(brief,version==='after'?3:0);const name=version+'-'+(mobile?'touch':'desktop')+'-'+id;await p.screenshot({path:out+'/'+name+'.png'});r.cases.push({name,lang,theme,brief,...await p.evaluate(()=>({viewport:[innerWidth,innerHeight],imageTop:document.querySelector('.case-media').getBoundingClientRect().top,briefBottom:document.querySelector('.project-page>.project-brief')?.getBoundingClientRect().bottom??null}))});
   }}finally{await c.close()}
  }
  r.passed=true;
 }finally{await b.close();fs.writeFileSync(out+'/checks.json',JSON.stringify(r,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
