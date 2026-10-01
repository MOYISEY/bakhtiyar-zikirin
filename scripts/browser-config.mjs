import { chromium, firefox, webkit } from 'playwright';
import { existsSync,readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export async function openBrowser(extra={},engine='chromium') {
  const local=join(process.cwd(),'qa-private','browsers');
  const root=existsSync(local)?local:join(homedir(),'AppData','Local','ms-playwright');
  const versions=existsSync(root)?readdirSync(root).filter(name=>new RegExp('^'+engine+'-\\d+$').test(name)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])):[];
  const executable=engine==='chromium'?['chrome-win64','chrome.exe']:engine==='firefox'?['firefox','firefox.exe']:['Playwright.exe'];
  const installed=process.env.PLAYWRIGHT_BROWSER_EXECUTABLE_PATH??(versions.length?join(root,versions[0],...executable):'');
  const type={chromium,firefox,webkit}[engine];
  if(!type)throw new Error('Unsupported browser engine');
  return type.launch({headless:true,...(existsSync(installed)?{executablePath:installed}:{}),...(engine==='chromium'?{args:['--enable-unsafe-swiftshader'],ignoreDefaultArgs:['--disable-back-forward-cache']}:{}),...extra});
}
