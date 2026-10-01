import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const luminance=hex=>hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const report={checkedAt:new Date().toISOString(),method:'WCAG relative luminance from actual design tokens; complements axe rendered text checks and directed hover/focus/disabled-state inspection.',themes:[]};
for(const [theme,regex]of[['light',/:root\{([^}]+)\}/],['dark',/html\[data-theme=dark\]\{([^}]+)\}/]]){
 const tokens=Object.fromEntries([...html.match(regex)[1].matchAll(/--([\w-]+):(#[a-f0-9]+);/g)].map(m=>[m[1],m[2]]));const e={theme,checks:[]};report.themes.push(e);
 for(const [foreground,background,min]of[['ink','paper',4.5],['muted','paper',4.5],['teal','paper',4.5],['red','paper',4.5],['panel-muted','panel',4.5],['contact-muted','contact',4.5],['entity-muted','entity-bg',4.5],['entity-card-ink','entity-card',4.5],['muted','surface',4.5],['ink','hover',4.5],['paper','teal',4.5],['red','surface',3],['red','paper',3]]){const ratio=contrast(tokens[foreground],tokens[background]);e.checks.push({foreground,background,min,ratio:Number(ratio.toFixed(2)),passed:ratio>=min});assert(ratio>=min,`${theme} ${foreground}/${background}: ${ratio}`);}
}report.passed=true;writeFileSync('evidence/v5/contrast-tokens.json',JSON.stringify(report,null,2));console.log(report.themes.map(e=>({theme:e.theme,minTextRatio:Math.min(...e.checks.filter(c=>c.min===4.5).map(c=>c.ratio)),passed:e.checks.every(c=>c.passed)})));
