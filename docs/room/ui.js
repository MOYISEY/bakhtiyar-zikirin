import {itemMarkup,mountItem} from './collection-viewer.js';
import {PROFILE} from './profile-data.js';
import {DOCUMENTS} from './documents-data.js';
import {PROJECTS} from './projects-data.js';
export const $=s=>document.querySelector(s);
export let lang=document.documentElement.lang;
export const L=(ru,kk,en)=>({ru,kk,en}[lang]||ru);
let app,origin,panelType,disposeItem,lastObjectPress;let selectedDocument='diploma';
// A door can reveal a semantic item under the released finger. A fresh press
// must target that item; keyboard activation remains native.
document.addEventListener('pointerdown',e=>{lastObjectPress=e.target.closest?.('.object-action')||null},true);
const globalTools=document.querySelector('.top-tools'),toolsHome=globalTools.parentElement;
export function translate(){
 document.documentElement.lang=lang;document.title=L('Студия Бахтияра','Бақтияр студиясы','Bakhtiyar’s studio');
 const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);
 $('#language').value=lang;$('#ordinary').textContent=L('Обычный вид ↗','Қалыпты көрініс ↗','Regular view ↗');$('#ordinary').href='../index.html?lang='+lang;$('.signature').href='https://moyisey.github.io/bakhtiyar-zikirin/?lang='+lang;$('.signature').ariaLabel=L('Бахтияр Зикирин — портфолио','Бақтияр Зикирин — портфолио','Bakhtiyar Zikirin — portfolio');
 $('.skip').textContent=L('К содержанию','Мазмұнға өту','Skip to content');$('#language-label').textContent=L('Язык','Тіл','Language');
 $('#role').textContent=L('Frontend-разработчик · Астана','Frontend әзірлеуші · Астана','Frontend developer · Astana');
 $('#heading').textContent=L('Студия Бахтияра.','Бақтияр студиясы.','Bakhtiyar’s studio.');
 $('#gesture').textContent=L('Прокрутите к кабинету · Enter — сразу к столу','Кабинетке айналдырыңыз · Enter — үстелге өту','Scroll to the studio · Enter — go straight in');
 $('#object-lamp .cord-guide').textContent=L('Потяни вниз','Төмен тарт','Pull down');
 $('#entrance-button span').textContent=L('Вход','Кіреберіс','Entrance');$('#desk-button span').textContent=L('Рабочее место','Жұмыс орны','Workspace');$('#case-button').textContent=L('Проекты','Жобалар','Projects');$('#contacts-button').textContent=L('Контакты','Байланыс','Contact');$('#room-button').textContent=L('Обзор кабинета','Кабинетке шолу','Studio overview');$('#profile-button').textContent=L('Разработчик','Әзірлеуші','Developer');$('#lamp-button').textContent=L('Свет','Жарық','Light');$('#window-button').textContent=L('Окно · EXPO','Терезе · EXPO','Window · EXPO');
 $('#cabinet-close').textContent=L('Закрыть шкаф','Шкафты жабу','Close cabinet');
 $('#cabinet-button').textContent=L('Шкаф · коллекция','Шкаф · жинақ','Cabinet · collection');$('#education-button').textContent=L('Образование','Білім','Education');
 $('#drawer-button').textContent=L('Резюме · ящик','Түйіндеме · тартпа','Resume · drawer');for(const [id,label]of [['drawer-resume',L('Резюме PDF','Түйіндеме PDF','Resume PDF')],['drawer-education',L('Диплом','Диплом','Diploma')]]){const e=$('#object-'+id);e.ariaLabel=label;if(e.querySelector('.document-label'))e.querySelector('.document-label').textContent=label}
 for(const [id,label]of [['cube',L('Собрать кубик','Текшені құрау','Solve the cube')],['robot',L('Рассмотреть робота','Роботты қарау','Inspect robot')],['orbit',L('Рассмотреть орбиту','Орбитаны қарау','Inspect orbit')],...DOCUMENTS.map(d=>['wall-'+d.id,profile(d.titleKey)])]){const e=$('#object-'+id);e.ariaLabel=label;if(e.querySelector('.document-label'))e.querySelector('.document-label').textContent=label}
 $('#actions-toggle').ariaLabel=L('Действия в комнате','Бөлмедегі әрекеттер','Room actions');
 for(const [id,label] of [['cabinet',L('Шкаф: потяните ручку или нажмите','Шкаф: тұтқаны тартыңыз не басыңыз','Cabinet: pull the handle or press')],['cube',L('Собрать кубик','Текшені құрау','Solve the cube')],['robot',L('Рассмотреть робота','Роботты қарау','Inspect robot')],['orbit',L('Рассмотреть орбиту','Орбитаны қарау','Inspect orbit')],['drawer',L('Ящик: потяните или нажмите','Тартпа: тартыңыз не басыңыз','Drawer: pull or press')],['case',L('Проекты на мониторе','Монитордағы жобалар','Projects on the monitor')],['profile',L('О разработчике','Әзірлеуші туралы','About the developer')],...DOCUMENTS.map(d=>['wall-'+d.id,profile(d.titleKey)]),['lamp',L('Шнур: потяните или нажмите','Бау: тартыңыз не басыңыз','Cord: pull or press')]]){const e=$('#object-'+id);e.ariaLabel=label;}app?.localize();
 $('#controls').ariaLabel=L('Ракурсы и содержание','Көріністер мен мазмұн','Views and content');$('#help').textContent=L('Scroll — вперёд / назад · Потяните — осмотр','Айналдыру — алға / артқа · Сүйреу — шолу','Scroll — forward / back · Drag — look around');
 $('#scene').ariaLabel=L('Студия. Scroll — вперёд и назад. Enter — вход. WASD — перемещение, стрелки — осмотр. Действия доступны у предметов и в меню.','Студия. Айналдыру — алға және артқа. Enter — кіру. WASD — жүру, көрсеткілер — шолу. Әрекеттер заттардың жанында және мәзірде.','Studio. Scroll forward and back. Enter to enter. WASD to move, arrows to look. Actions are beside objects and in the menu.');
 $('#close').ariaLabel=L('Закрыть','Жабу','Close');$('#sound').textContent=L('Включить звук','Дыбысты қосу','Enable sound');audioText();weatherText();translateReader();
}
export function weatherText(){const el=$('#rain-motion-button'),blocked=!!app?.rainMotionBlocked;el.textContent=blocked?L('Дождь без движения','Қозғалыссыз жаңбыр','Still rain'):L('Анимация дождя','Жаңбыр анимациясы','Rain animation');el.disabled=!window.sliceUsable||blocked;el.setAttribute('aria-pressed',String(!blocked&&!app?.rainPaused));}
export function audioText(){if(!app)return;const a=app.audio.inspect(),on=a.state==='running'&&!a.preferences.muted;$('#sound').textContent=on?L('Звук вкл.','Дыбыс қосулы','Sound on'):L('Включить звук','Дыбысты қосу','Enable sound');$('#sound').setAttribute('aria-pressed',String(on));}
const profile=key=>PROFILE[lang]?.[key]||PROFILE.en[key]||'';
const tx=value=>value?.[lang]||value?.en||'';
const title=p=>p.id==='poslesvet'?L('Послесвет','Послесвет','Poslesvet'):p.title;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const previewPath=(p,width)=>`../projects/media/${p.id}-detail-1-${width}.webp`;
function refreshProjectPreview(){
 const project=PROJECTS.find(p=>p.id===panelType),image=$('#panel .project-hero');
 if(project&&image?.isConnected&&image.naturalWidth)app.previewProject?.(project,image);
}
// A document comes forward; the scene camera and object gates remain untouched.
let reader,readerDocument,readerOrigin,readerAnimation,readerClosing=false,readerSerial=0;
const readerMotion=matchMedia('(prefers-reduced-motion: reduce)');
function cancelReaderAnimation(){readerAnimation?.cancel();readerAnimation=null}
function translateReader(){
 if(!readerDocument||!reader)return;
 $('#reader-title').textContent=profile(readerDocument.titleKey);$('#reader-image').alt=profile(readerDocument.titleKey);
 $('#reader-language').value=lang;$('#reader-language').ariaLabel=L('Язык документа','Құжат тілі','Document language');
 $('#reader-close').ariaLabel=L('Вернуть документ на стену','Құжатты қабырғаға қайтару','Return document to the wall');
 $('#reader-fit').textContent=L('Целиком','Толығымен','Fit');$('#reader-read').textContent=L('Читать · 100%','Оқу · 100%','Read · 100%');
 $('#reader-original').textContent=L('Оригинал ↗','Түпнұсқа ↗','Original ↗');
 $('#reader-note').textContent=[readerDocument.periodKey&&profile(readerDocument.periodKey),profile(readerDocument.noteKey)].filter(Boolean).join(' · ');
 $('#reader-help').textContent=L('100%: исходный размер. Сдвигайте изображение или используйте прокрутку.','100%: бастапқы өлшем. Суретті жылжытыңыз немесе айналдырыңыз.','100% uses the original size. Pan the image or use the scrollbars.');
 $('#reader-viewport').ariaLabel=L('Чтение документа. Доступна прокрутка.','Құжатты оқу. Айналдыру қолжетімді.','Document reading area. Scrolling is available.');
 if(reader.dataset.loading==='true')$('#reader-status').textContent=L('Загружаем документ…','Құжат жүктелуде…','Loading document…');
 if(reader.dataset.failed==='true')$('#reader-status').textContent=L('Изображение недоступно. Откройте оригинал по ссылке.','Сурет қолжетімсіз. Түпнұсқаны сілтеме арқылы ашыңыз.','Image unavailable. Use the original file link.');
}
function readerZoom(zoom){
 cancelReaderAnimation();const area=$('#reader-viewport'),image=$('#reader-image');area.dataset.zoom=String(zoom);reader.dataset.zoom=String(zoom);
 image.style.width=zoom?readerDocument.fullWidth+'px':'';area.scrollTo({left:zoom?Math.max(0,readerDocument.fullWidth*(readerDocument.id==='diploma'?.25:.5)-area.clientWidth/2):0,top:zoom?Math.max(0,readerDocument.fullHeight*.4-area.clientHeight/2):0,behavior:'instant'});
 $('#reader-fit').setAttribute('aria-pressed',String(!zoom));$('#reader-read').setAttribute('aria-pressed',String(zoom));
}
function animateReader(from,to,duration){
 const image=$('#reader-image'),base=image.getBoundingClientRect();if(!base.width||!base.height)return null;
 const key=r=>({transform:`translate(${r.x-base.x+(r.width-base.width)/2}px,${r.y-base.y+(r.height-base.height)/2}px) scale(${r.width/base.width},${r.height/base.height})`});
 return image.animate([key(from),key(to)],{duration,easing:'cubic-bezier(.2,.7,.2,1)'});
}
async function closeReader(immediate=false){
 if(!reader?.open||readerClosing)return;readerClosing=true;const token=++readerSerial,image=$('#reader-image'),current=image.getBoundingClientRect();cancelReaderAnimation();
 const target=!immediate&&!readerMotion.matches&&reader.dataset.zoom!=='true'&&reader.dataset.ready==='true'?app?.documentBounds?.('wall-'+readerDocument.id):null;
 if(target){readerAnimation=animateReader(current,target,180);await readerAnimation?.finished.catch(()=>{})}
 if(token===readerSerial&&reader.open)reader.close();
}
function ensureReader(){
 if(reader)return;reader=document.createElement('dialog');reader.id='document-reader';reader.setAttribute('aria-labelledby','reader-title');
 reader.innerHTML='<div class="reader-toolbar"><h2 id="reader-title"></h2><select id="reader-language"><option value="ru">RU</option><option value="kk">KK</option><option value="en">EN</option></select><button id="reader-close" type="button">×</button></div><p id="reader-status" role="status"></p><div id="reader-viewport" tabindex="0" role="region"><img id="reader-image" draggable="false"></div><div class="reader-footer"><div class="reader-controls"><button id="reader-fit" type="button" aria-pressed="true"></button><button id="reader-read" type="button" aria-pressed="false"></button><a id="reader-original" target="_blank" rel="noopener noreferrer"></a></div><p id="reader-help"></p><p id="reader-note"></p></div>';
 document.body.append(reader);$('#reader-close').onclick=()=>closeReader();$('#reader-fit').onclick=()=>readerZoom(false);$('#reader-read').onclick=()=>readerZoom(true);
 $('#reader-language').onchange=e=>{$('#language').value=e.target.value;$('#language').dispatchEvent(new Event('change'))};
 reader.addEventListener('cancel',e=>{e.preventDefault();closeReader()});
 reader.addEventListener('close',()=>{++readerSerial;cancelReaderAnimation();readerClosing=false;app.hold=false;$('#reader-image').removeAttribute('src');readerDocument=null;const fallback=window.sliceFatal?$('#ordinary'):$('#actions-toggle');(!window.sliceFatal&&readerOrigin?.isConnected&&readerOrigin.getClientRects().length&&!readerOrigin.disabled?readerOrigin:fallback).focus({preventScroll:true})});
 readerMotion.addEventListener('change',e=>{if(e.matches)cancelReaderAnimation()});window.addEventListener('resize',cancelReaderAnimation);
 window.addEventListener('pagehide',()=>{if(reader?.open){cancelReaderAnimation();reader.close()}});
}
function openWallDocument(type,from,surface){
 if(app?.hold||!window.sliceUsable||window.sliceFatal)return;const d=DOCUMENTS.find(d=>'wall-'+d.id===type);if(!d||!app?.canReadDocument?.(type,surface))return;const source=app.documentBounds(type);
 ensureReader();readerDocument=d;readerOrigin=from||$('#scene');readerClosing=false;const token=++readerSerial;cancelReaderAnimation();
 reader.dataset.documentId=d.id;reader.dataset.loading='true';reader.dataset.failed='false';reader.dataset.ready='false';reader.dataset.motion=readerMotion.matches?'reduced':source?'normal':'unprojectable';readerZoom(false);translateReader();
 const image=$('#reader-image');image.width=d.fullWidth;image.height=d.fullHeight;image.hidden=false;image.src='../files/education/'+d.file+'-public.'+d.extension;$('#reader-original').href=image.src;
 $('#reader-fit').disabled=$('#reader-read').disabled=true;setActions(false);app.hold=true;reader.showModal();$('#reader-close').focus({preventScroll:true});window.dispatchEvent(new Event('room-panel-open'));
 image.decode().then(()=>{if(token!==readerSerial||!reader.open)return;reader.dataset.loading='false';reader.dataset.ready='true';$('#reader-status').textContent='';$('#reader-fit').disabled=$('#reader-read').disabled=false;
  if(source&&!readerMotion.matches){const target=image.getBoundingClientRect();readerAnimation=animateReader(source,target,240);readerAnimation?.finished.catch(()=>{})}
 },()=>{if(token!==readerSerial||!reader.open)return;reader.dataset.loading='false';reader.dataset.failed='true';image.hidden=true;translateReader()});
}

function projectBrief(id){if(!profile('brief.'+id+'.task'))return '';return `<dl class="project-brief" data-brief="${id}">${['task','work','result'].map(k=>`<div><dt>${esc(profile('brief.'+k+'Label'))}</dt><dd>${esc(profile('brief.'+id+'.'+k))}</dd></div>`).join('')}</dl>`}
function contributionNotes(){return `<details class="contribution-notes"><summary><span>${esc(profile('contribution.title'))}</span></summary><div class="contribution-points"><p class="geometry-note">${esc(profile('contribution.geometry'))}</p><p class="solar-note">${esc(profile('contribution.solar'))}</p></div></details>`}
export function openPanel(type,from,preserve=false,surface=null){
 if(reader?.open)return;
 if(type.startsWith('wall-'))return openWallDocument(type,from,surface);
 if(type==='education'&&!preserve)selectedDocument='diploma';
 if(type==='certificates'){selectedDocument=DOCUMENTS.find(d=>d.kind==='certificate')?.id||'diploma';type='education'}
 const isItem=['cube','robot','orbit'].includes(type);if(isItem&&!app?.canInspect(type))return;disposeItem?.();disposeItem=null;
 const panel=$('#panel'),savedScroll=$('#panel-body').scrollTop,focused=document.activeElement,details=[...panel.querySelectorAll('details')].map(e=>e.open);
 const restore=preserve&&panel.open,focusId=focused?.id,focusProject=focused?.dataset?.project,focusBack=focused?.dataset?.back;
 panelType=type;const toolsHost=$('#panel-global-tools');if(globalTools.parentElement!==toolsHost)toolsHost.append(globalTools);
 if(!panel.open){origin=from||$('#scene');if($('#controls').contains(origin)){origin=$('#actions-toggle');setActions(false)}}app.hold=true;window.dispatchEvent(new Event('room-panel-open'));
 const project=PROJECTS.find(p=>p.id===type);
 panel.classList.toggle('showcase-panel',!!project);panel.classList.toggle('collectible-panel',isItem);
 let body='';
 if(type==='case')body=`<p class="eyebrow">${L('Работы / 06','Жұмыстар / 06','Work / 06')}</p><h1 id="panel-title" tabindex="-1">${L('Проекты','Жобалар','Projects')}</h1><div class="project-grid">${PROJECTS.map(p=>`<button class="project-card" data-project="${p.id}">${p.image?`<img src="${p.image}" alt="" loading="lazy">`:''}<strong>${title(p)}</strong><span>${esc(tx(p.description))}</span></button>`).join('')}</div>`;
 else if(project)body=`<div class="project-heading"><button class="panel-back" data-back="${project.id}">← ${L('Все проекты','Барлық жобалар','All projects')}</button><h1 id="panel-title" tabindex="-1">${title(project)}</h1><p class="lead">${esc(tx(project.description))}</p></div><div class="project-showcase"><div class="project-visual"><div class="annotated-preview"><a class="project-live-preview" id="project-live-${project.id}" href="${project.demo}" target="_blank" rel="noopener noreferrer" aria-label="${esc(L('Открыть проект','Жобаны ашу','Open project')+': '+title(project))}"><img class="project-hero" src="${previewPath(project,960)}" srcset="${[960,1600,2400].map(w=>previewPath(project,w)+' '+w+'w').join(', ')}" sizes="(max-width:720px) calc(100vw - 66px), (max-width:1200px) calc(60vw - 52px), 680px" width="960" height="${project.id==='helio'?652:600}" alt="${title(project)}" decoding="async"><p class="preview-error" role="status" hidden>${L('Превью недоступно. Проект можно открыть по ссылке.','Алдын ала көрініс қолжетімсіз. Жобаны сілтеме арқылы ашуға болады.','Preview unavailable. You can still open the project.')}</p><span class="preview-caption"><span>${title(project)}</span><span>${L('Открыть проект','Жобаны ашу','Open project')} ↗</span></span></a>${project.id==='helio'?contributionNotes():''}</div>${profile('brief.'+project.id+'.task')?`<p class="project-frame">${esc(profile('brief.'+project.id+'.frame'))}</p>`:''}</div><div class="project-story"><p class="case-meta">${project.stack.join(' · ')}</p>${projectBrief(project.id)}${profile('brief.'+project.id+'.task')?`<details class="project-detail-notes"><summary>${esc(profile('brief.details'))}</summary><p>${esc(tx(project.context))}</p><p>${esc(tx(project.result))}</p><p>${esc(tx(project.limit))}</p></details>`:`<p>${esc(tx(project.context))}</p><p>${esc(tx(project.result))}</p><details><summary>${L('Границы проекта','Жоба шектеулері','Project limits')}</summary><p>${esc(tx(project.limit))}</p></details>`}<div class="case-links"><a id="case-detail-${project.id}" href="../projects/${project.id}.html?lang=${lang}">${L('Подробный кейс','Толық кейс','Full case study')} →</a><a href="${project.code}" target="_blank" rel="noopener noreferrer">${L('Исходный код','Бастапқы код','Source code')} ↗</a></div></div></div>`;
 else if(isItem)body=itemMarkup(type,L);
 else if(type==='education'){const d=DOCUMENTS.find(d=>d.id===selectedDocument)||DOCUMENTS[0],certificate=d.kind==='certificate';body=`<p class="eyebrow">${L('Разработчик / документы','Әзірлеуші / құжаттар','Developer / documents')}</p><h1 id="panel-title" tabindex="-1">${esc(profile(certificate?'certificates.heading':'s170'))}</h1>${certificate?'':`<section class="profile-education">${['college','aiu'].map(k=>`<article><p class="date">${esc(profile('education.'+k+'Period'))}</p><h2>${esc(profile('education.'+k+'Name'))}</h2><p>${esc(profile('education.'+k+'Body'))}</p></article>`).join('')}</section>`}<div class="document-tabs" role="group" aria-label="${esc(profile('documents.title'))}">${DOCUMENTS.map(o=>`<button id="document-${o.id}" data-document="${o.id}" aria-pressed="${o.id===d.id}">${o.tabLabel||(o.id==='certificate'?'iQADAM · 2025':esc(profile(o.titleKey)))}</button>`).join('')}</div><h2 class="document-heading">${esc(profile(d.titleKey))}</h2>${d.periodKey?`<p class="document-period">${esc(profile(d.periodKey))}</p>`:''}${d.bodyKey?`<p>${esc(profile(d.bodyKey))}</p>`:''}<a class="diploma-room" data-active-document="${d.id}" href="../files/education/${d.file}-public.${d.extension}" target="_blank" rel="noopener noreferrer"><img src="../files/education/${d.file}-public.${d.extension}" width="${d.fullWidth}" height="${d.fullHeight}" alt="${esc(profile(d.titleKey))}"><span>${esc(profile(d.openKey))} ↗</span></a><p class="diploma-note">${esc(profile(d.noteKey))}</p><a class="education-regular" href="../index.html?lang=${lang}#education">${L('Документы в обычном портфолио','Қалыпты портфолиодағы құжаттар','Documents in the regular portfolio')} →</a>`;}
 else if(type==='contacts')body=`<p class="eyebrow">${L('На связи','Байланыста','Get in touch')}</p><h1 id="panel-title" tabindex="-1">${L('Контакты','Байланыс','Contact')}</h1><p class="lead">${L('Бахтияр Зикирин','Бақтияр Зикирин','Bakhtiyar Zikirin')}</p><p>Frontend · ${L('Астана','Астана','Astana')}</p><div class="case-links"><a href="../files/Zikirin_Bakhtiyar_Developer_Resume_Public.pdf" target="_blank" rel="noopener noreferrer">${L('Резюме · PDF','Түйіндеме · PDF','Resume · PDF')} ↗</a><a href="mailto:b.zikirin@gmail.com">b.zikirin@gmail.com ↗</a><a class="linkedin-link" href="https://www.linkedin.com/in/%D0%B1%D0%B0%D1%85%D1%82%D0%B8%D1%8F%D1%80-%D0%B7%D0%B8%D0%BA%D0%B8%D1%80%D0%B8%D0%BD-41a997314/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div>`;
 else body=`
 <p class="eyebrow">${L('Разработчик / опыт','Әзірлеуші / тәжірибе','Developer / experience')}</p><h1 id="panel-title" tabindex="-1">${L('Бахтияр Зикирин','Бақтияр Зикирин','Bakhtiyar Zikirin')}</h1>
 <p class="lead">${esc(profile('about.intro'))}</p>
 <p class="case-meta">React · Next.js · TypeScript · Python · Django · SQL</p>
 <article class="timeline"><p class="date">${esc(profile('about.iqadamPeriod'))}</p><h2>iQADAM Systems</h2><p>${L('Frontend-разработчик с функциями тестирования: frontend-модули, интеграция API и проверка приложения.','Frontend әзірлеу және тестілеу: frontend модульдері, API интеграциясы және қолданбаны тексеру.','Frontend development with testing responsibilities: frontend modules, API integration and application testing.')}</p></article>
 <article class="timeline"><p class="date">${esc(profile('about.iqadam2025Period'))}</p><h2>iQADAM Systems</h2><p class="case-meta">${esc(profile('about.iqadam2025Role'))}</p><p>${esc(profile('about.iqadam2025Body'))}</p></article>
 <article class="timeline"><p class="date">${esc(profile('about.adoPeriod'))}</p><h2>Astana Digital Outsource</h2><p class="case-meta">${esc(profile('s166'))}</p><p>${esc(profile('about.adoBody'))}</p></article>
 <div class="case-links"><button class="panel-back" data-panel="education">${esc(profile('s170'))} →</button><button class="panel-back" data-panel="contacts">${L('Резюме и контакты','Түйіндеме және байланыс','Resume and contact')} →</button></div>
 `;
 $('#panel-body').innerHTML=body;$('#panel-body').scrollTop=0;
 const preview=panel.querySelector('.project-hero');if(preview){
  const unavailable=()=>{if(!preview.isConnected)return;preview.hidden=true;panel.querySelector('.preview-error').hidden=false};
  preview.addEventListener('load',refreshProjectPreview,{once:true});preview.addEventListener('error',unavailable,{once:true});
  if(preview.complete){if(preview.naturalWidth)refreshProjectPreview();else unavailable()}
 }
 for(const el of panel.querySelectorAll('[data-document]'))el.onclick=()=>{selectedDocument=el.dataset.document;openPanel('education',null,true)};
 for(const el of panel.querySelectorAll('[data-panel]'))el.onclick=()=>openPanel(el.dataset.panel);
 for(const el of panel.querySelectorAll('[data-project]'))el.onclick=()=>openPanel(el.dataset.project);
 for(const d of panel.querySelectorAll('.contribution-notes'))d.addEventListener('keydown',e=>{if(e.key==='Escape'&&d.open){e.preventDefault();e.stopPropagation();d.open=false;d.querySelector('summary').focus()}});
 const back=panel.querySelector('[data-back]');if(back)back.onclick=()=>{const id=back.dataset.back;openPanel('case');panel.querySelector(`[data-project="${id}"]`).focus()};
 if(!panel.open)panel.showModal();if(isItem)disposeItem=mountItem(type,L);
 if(restore){panel.querySelectorAll('details').forEach((e,i)=>e.open=details[i]||false);if(!focused?.isConnected){const next=(focusId&&document.getElementById(focusId))||(focusProject&&panel.querySelector(`[data-project="${focusProject}"]`))||(focusBack&&panel.querySelector('[data-back]'));next?.focus({preventScroll:true})}$('#panel-body').scrollTop=savedScroll;}else $('#panel-title').focus();
 if(type==='education'&&!restore){panel.querySelector('[data-document][aria-pressed=true]')?.focus({preventScroll:true});panel.querySelector('.document-heading')?.scrollIntoView({block:'start'})}
}
export function setActions(open,focus=false){weatherText();$('#controls').hidden=!open;$('#actions-toggle').setAttribute('aria-expanded',String(open));if(focus)(open?$('#controls button:not(:disabled)'):$('#actions-toggle')).focus();window.dispatchEvent(new Event('room-actions'));}
export function attachApp(api){app=api;app.hold=$('#panel').open||!!reader?.open;for(const el of document.querySelectorAll('[data-needs-scene]'))el.disabled=!window.sliceUsable;translate()}
window.addEventListener('room-scene-ready',refreshProjectPreview);
export function initUI(api){app=api;translate();$('#load-projects').onclick=e=>openPanel('case',e.currentTarget);$('#actions-toggle').onclick=()=>setActions($('#controls').hidden,true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#controls').hidden){e.preventDefault();setActions(false,true)}});document.addEventListener('pointerdown',e=>{if(!$('#controls').contains(e.target)&&!$('#actions-toggle').contains(e.target))setActions(false)});$('#controls').addEventListener('focusout',e=>{if(e.relatedTarget&&!$('#controls').contains(e.relatedTarget)&&e.relatedTarget!==$('#actions-toggle'))setActions(false)});$('.skip').onclick=e=>{e.preventDefault();setActions(true,true)};for(const type of ['case','profile','wall-diploma','wall-hackalem','wall-certificate'])$('#object-'+type).onclick=e=>{if(type!=='case'&&e.detail!==0)return;if(type==='profile')app.folder();openPanel(type,e.currentTarget)};for(const type of ['cube','robot','orbit'])$('#object-'+type).onclick=e=>{if(e.detail===0)openPanel(type,e.currentTarget)};$('#object-cabinet').onclick=e=>{if(e.detail===0)app.cabinet()};$('#cabinet-close').onclick=()=>app.closeCabinet?.();$('#cabinet-button').onclick=()=>{setActions(false,true);app.view('cabinet');app.cabinet()};$('#education-button').onclick=e=>{selectedDocument='diploma';openPanel('education',e.currentTarget)};$('#object-drawer-education').onclick=e=>{if(e.detail===0||lastObjectPress===e.currentTarget)openPanel('education',e.currentTarget)};$('#object-lamp').onclick=e=>{if(e.detail===0)app.pull()};$('#object-drawer').onclick=e=>{if(e.detail===0)app.drawer()};$('#drawer-button').onclick=()=>{setActions(false,true);app.drawer()};$('#language').onchange=e=>{lang=e.target.value;try{localStorage.setItem('studio-slice-language',lang)}catch{}translate();if($('#panel').open)openPanel(panelType,null,true)};$('#entrance-button').onclick=()=>{setActions(false,true);app.go(0,true)};$('#desk-button').onclick=()=>{setActions(false,true);app.go(1,true)};$('#window-button').onclick=()=>{setActions(false,true);app.view('window')};$('#room-button').onclick=()=>{setActions(false,true);app.view('room')};$('#contacts-button').onclick=e=>openPanel('contacts',e.currentTarget);$('#case-button').onclick=e=>openPanel('case',e.currentTarget);$('#profile-button').onclick=e=>{app.folder();openPanel('profile',e.currentTarget)};$('#lamp-button').onclick=()=>app.pull();$('#rain-motion-button').onclick=()=>app.toggleRainMotion();$('#sound').onclick=()=>{const a=app.audio.inspect();if(a.state==='running'&&!a.preferences.muted)app.audio.set('master','muted',true);else{app.audio.setInside(true);app.audio.enable()}audioText()};$('#close').onclick=()=>$('#panel').close();$('#panel').addEventListener('close',()=>{disposeItem?.();disposeItem=null;toolsHome.append(globalTools);panelType=null;app.hold=false;(origin?.getClientRects().length?origin:$('#actions-toggle')).focus({preventScroll:true})});window.addEventListener('room-audio',audioText);}

window.addEventListener('room-scene-disabled',()=>{if(disposeItem&&$('#panel').open)$('#panel').close()});
window.addEventListener('pagehide',()=>{disposeItem?.();disposeItem=null;if($('#panel').open)$('#panel').close()});
