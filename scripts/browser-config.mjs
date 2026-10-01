import { chromium } from 'playwright';
import { existsSync,readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export async function openBrowser(extra={}) {
  const root=join(homedir(),'AppData','Local','ms-playwright');
  const versions=existsSync(root)?readdirSync(root).filter(name=>/^chromium-\d+$/.test(name)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])):[];
  const installed=process.env.PLAYWRIGHT_BROWSER_EXECUTABLE_PATH??(versions.length?join(root,versions[0],'chrome-win64','chrome.exe'):'');
  return chromium.launch({headless:true,...(existsSync(installed)?{executablePath:installed}:{}),args:['--enable-unsafe-swiftshader'],ignoreDefaultArgs:['--disable-back-forward-cache'],...extra});
}
