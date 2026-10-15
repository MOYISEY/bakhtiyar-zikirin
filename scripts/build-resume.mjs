import {chromium} from 'playwright';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Offline export: local source, system fonts, existing Playwright dependency.
const source=resolve('resume/resume.html'),output=resolve(process.argv[2]??'public/files/Zikirin_Bakhtiyar_Developer_Resume_Public.pdf'),hash=b=>createHash('sha256').update(b).digest('hex');
mkdirSync(dirname(output),{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.RESUME_BROWSER?{executablePath:process.env.RESUME_BROWSER}:{channel:'msedge'})});
try{
 const page=await browser.newPage();await page.route(/^https?:/,r=>r.abort());await page.goto(pathToFileURL(source).href);await page.evaluate(()=>document.fonts.ready);
 const bytes=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
 const pages=(bytes.toString('latin1').match(/\/Type\s*\/Page(?:\s|\/|>)/g)||[]).length;
 if(pages!==1)throw Error('Expected one complete resume page; inspect layout before replacing the public PDF.');
 writeFileSync(output,bytes);if(!process.argv[2])writeFileSync('resume/build.json',JSON.stringify({source:'resume/resume.html',sourceSha256:hash(readFileSync(source)),pdf:'public/files/Zikirin_Bakhtiyar_Developer_Resume_Public.pdf',pdfSha256:hash(bytes),pages,browser:browser.version()},null,2)+'\n');
 console.log(JSON.stringify({pages,bytes:bytes.length,sha256:hash(bytes)}));
}finally{await browser.close()}
