import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const fragments=JSON.parse(readFileSync('src/content/fragments.json','utf8'));
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8'));
const responsiveMedia=JSON.parse(readFileSync('src/content/media.json','utf8'));
const ru=JSON.parse(readFileSync('src/locales/ru.json','utf8'));
const profileKeys=['about.intro','about.adoPeriod','about.adoBody','s166','s170',...['college','aiu'].flatMap(k=>['Period','Name','Body'].map(s=>'education.'+k+s))];
const profileData=Object.fromEntries(['ru','kk','en'].map(lang=>{const d=JSON.parse(readFileSync('src/locales/'+lang+'.json','utf8'));return[lang,Object.fromEntries(profileKeys.map(key=>[key,d[key]]))]}));
writeFileSync('public/room/profile-data.js','export const PROFILE = '+JSON.stringify(profileData)+';\n');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(key,tag='span',attrs='')=>`<${tag} data-i18n="${key}" ${attrs}>${esc(ru[key]??key)}</${tag}>`;
const ext=(url,key,cls='source-link')=>`<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${text(key)}<span aria-hidden="true">↗</span></a>`;
const internal=(url,key,cls='text-link')=>`<a class="${cls} site-internal" href="${url}">${text(key)}<span aria-hidden="true">↗</span></a>`;
const imageSizes={card:'(max-width: 760px) calc(90vw - 2px), (max-width: 1100px) calc(45.5vw - 14px), (max-width: 1500px) calc(30.333vw - 18px), 430px',hero:'(max-width: 760px) 90vw, (max-width: 1500px) 45vw, 660px',detail:'(max-width: 760px) calc(90vw - 2px), (max-width: 1240px) 89vw, 1100px'};
function imageData(project,prefix,kind='card',index=1){
 if(project.diagram)return {src:prefix+'projects/media/'+project.id+'-diagram.svg',width:1280,height:800,attrs:''};
 const variants=kind==='detail'?responsiveMedia[project.id].shots[index-1]:kind==='hero'?responsiveMedia[project.id].hero:responsiveMedia[project.id].card;
 const fallback=variants.find(v=>v.width===(kind==='detail'?1600:800)),max=variants.at(-1);
 const srcset=variants.map(v=>prefix+v.file+' '+v.width+'w').join(', ');
 return {...fallback,src:prefix+fallback.file,max:prefix+max.file,maxWidth:max.width,maxHeight:max.height,srcset,attrs:`srcset="${srcset}" sizes="${imageSizes[kind]}"`};
}
const title=project=>text('v12.title.'+project.id);
const mediaError=text('v12.imageUnavailable','span','class="media-error" hidden role="status"');
function card(project,prefix,index=0){
 const path=prefix+'projects/'+project.id+'.html',image=imageData(project,prefix);
 return `<article class="visual-card" id="${project.id}" data-category="${project.category}" tabindex="-1">
 <a class="project-preview site-internal" href="${path}" aria-labelledby="title-${project.id}"><img src="${image.src}" ${image.attrs} width="${image.width}" height="${image.height}" loading="${index<3?'eager':'lazy'}" decoding="async" alt="${esc(ru['v12.'+project.id+'.shot1'])}" data-i18n-attrs='[{"attr":"alt","key":"v12.${project.id}.shot1"}]'>${mediaError}<span class="media-kind">${text(project.diagram?'v12.diagram':'v12.screenshot')}</span></a>
 <div class="visual-card-copy"><a class="project-title site-internal" href="${path}"><h3 id="title-${project.id}">${title(project)}</h3></a>${text(project.description,'p')}
 <div class="card-actions">${internal(path,'v12.case')}${project.demo?ext(project.demo,'v12.demo','demo-link'):project.code?ext(project.code,'v12.code','demo-link'):''}</div></div></article>`;
}
function header(prefix,page){
 const nav=`<nav aria-label="Основная навигация" data-i18n-attrs='[{"attr":"aria-label","key":"s196"}]'>
 ${[['index.html','v12.home','home'],['projects/','v12.projects','catalog'],['index.html#experience','v12.about','about'],['index.html#contact','v12.contact','contact']].map(([url,key,id])=>`<a class="site-internal" href="${prefix+url}" ${page===id?'aria-current="page"':''}>${text(key)}</a>`).join('')}</nav>`;
 return fragments.header.replace(/<nav[\s\S]*?<\/nav>/,nav).replace('href="#top"',`href="${prefix}index.html" class="identity site-internal"`).replace('class="identity" href=', 'href=');
}
function footer(prefix){return `<footer class="page-footer"><a class="site-internal" href="${prefix}index.html">${text('s002')}</a><div>${ext('https://github.com/MOYISEY','s192')}${internal(prefix+'index.html#contact','v12.contact')}</div><span>2026</span></footer>`;}
function shell(body,{prefix='',page='home',projectId='',titleKey='s207'}={}){
 let head=fragments.head.replace(/<title[\s\S]*?<\/title>/,`<title data-i18n="${titleKey}">${esc(ru[titleKey])}</title>`).replace('href="./favicon.svg"',`href="${prefix}favicon.svg"`).replace('root.dataset.theme=prefs.theme',"const qp=new URLSearchParams(location.search).get('lang');if(qp&&['ru','kk','en'].includes(qp))prefs.language=qp;root.dataset.theme=prefs.theme");
 return `<!doctype html><html lang="ru"><head>${head}</head><body data-page="${page}" data-project="${projectId}"><a class="skip-link" href="#main">${text('s001')}</a>${header(prefix,page)}<main id="main" tabindex="-1">${body}</main>${page==='home'?'':footer(prefix)}<script type="module" src="/src/main.ts"></script></body></html>\n`.replace(/[ \t]+$/gm,'');
}
function diagram(project){
 const fields=project.diagram==='brief'?['client','interview','brief.json']:['User','Project','ProjectImage'];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"><rect width="1280" height="800" fill="#e0e5d6"/><g fill="none" stroke="#23615b" stroke-width="3"><path d="M140 280H1140M140 520H1140" opacity=".2"/><path d="M390 405H460M790 405H860"/><path d="m450 396 10 9-10 9m400-9 10 9-10 9"/></g><text x="90" y="155" fill="#172223" font-family="Arial,sans-serif" font-size="54">${esc(project.title)}</text><g font-family="Consolas,monospace" font-size="28" fill="#172223">${fields.map((field,i)=>`<rect x="${100+i*380}" y="320" width="300" height="170" rx="8" fill="#f3f0e8" stroke="#9ba994"/><text x="${125+i*380}" y="415">${esc(field)}</text>`).join('')}</g><g stroke="#23615b" stroke-width="2" fill="none"><path d="M145 610h170m-170 25h100m160-25h280m-280 25h170m160-25h200"/></g></svg>`;
}
const lightbox=`<dialog id="gallery-dialog" aria-labelledby="viewer-title"><div class="lightbox-frame"><div class="lightbox-top">${text('v12.gallery','h2','id="viewer-title"')}<button type="button" id="gallery-close">${text('v12.close')} <span aria-hidden="true">×</span></button></div><div class="gallery-viewport" tabindex="0" role="region" aria-label="${esc(ru['v13.imageRegion'])}" data-i18n-attrs='[{"attr":"aria-label","key":"v13.imageRegion"}]'><img id="gallery-image" alt=""></div>${text('v12.imageUnavailable','p','id="gallery-error" hidden role="status"')}<div class="lightbox-caption"><p id="gallery-caption"></p><span id="gallery-counter" role="status"></span></div><div class="lightbox-tools"><button type="button" id="gallery-zoom" aria-pressed="false">${text('v13.details')}</button><a id="gallery-file" target="_blank" rel="noopener noreferrer">${text('v13.openFile')} ↗</a></div><div class="lightbox-controls"><button type="button" id="gallery-prev">← ${text('v12.prevShot')}</button><button type="button" id="gallery-next">${text('v12.nextShot')} →</button></div></div></dialog>`;
function figure(project,prefix,index){
 const image=imageData(project,prefix,'detail',index),key=`v12.${project.id}.shot${index}`;
 return `<figure class="case-media" id="shot-${index}"><a class="gallery-open" href="${image.max??image.src}" data-caption-key="${key}" data-kind="${project.diagram?'diagram':'screenshot'}" data-srcset="${image.srcset??''}" data-width="${image.maxWidth??1280}" data-height="${image.maxHeight??800}"><img src="${image.src}" ${image.attrs} width="${image.width}" height="${image.height}" loading="${index===1?'eager':'lazy'}" decoding="async" alt="${esc(ru[key])}" data-i18n-attrs='[{"attr":"alt","key":"${key}"}]'>${mediaError}<span class="enlarge-label">${text('v12.enlarge')} <span aria-hidden="true">＋</span></span></a><figcaption>${text(key)}</figcaption></figure>`;
}
mkdirSync('projects',{recursive:true});mkdirSync('public/projects/media',{recursive:true});
for(const project of projects.filter(p=>p.diagram))writeFileSync('public/projects/media/'+project.id+'-diagram.svg',diagram(project));
// Keep the familiar v11 identity, short experience and genuine public contact/CV.
let hero=fragments.hero.replace('href="#work"','href="#work"').replace('href="./files/','href="./files/');
const heroImage={src:'./projects/media/studio/room-hero-800.webp',width:2400,height:1500,attrs:'srcset="'+[480,800,1200,1600,2400].map(w=>'./projects/media/studio/room-hero-'+w+'.webp '+w+'w').join(', ')+'" sizes="(max-width: 900px) 90vw, (max-width: 1500px) 45vw, 660px"'};
const education=`<section class="education-section" id="education" aria-labelledby="education-title" tabindex="-1"><h2 id="education-title">${text('s170')}</h2><div class="education-timeline">${['college','aiu'].map(k=>`<article>${text('education.'+k+'Period','p','class="education-period"')}${text('education.'+k+'Name','h3')}${text('education.'+k+'Body','p')}</article>`).join('')}</div></section>`;
const home=`<section class="hero home-hero" aria-labelledby="hero-title">${hero}<figure class="hero-preview"><a class="site-internal" href="./room/"><img src="${heroImage.src}" ${heroImage.attrs} width="${heroImage.width}" height="${heroImage.height}" fetchpriority="high" decoding="async" alt="${esc(ru['room.heroAlt'])}" data-i18n-attrs='[{"attr":"alt","key":"room.heroAlt"}]'>${mediaError}</a><figcaption>${text('room.heroCaption')}<div class="hero-preview-actions">${internal('./room/','room.heroOpen')}</div></figcaption></figure></section>
 <section class="work visual-work" id="work" tabindex="-1" aria-labelledby="work-title"><div class="visual-heading"><span class="eyebrow">01 / ${text('v12.projects')}</span>${text('v12.featured','h2','id="work-title"')}</div><div class="project-rail-toolbar"><p id="project-rail-hint">${text('rail.hint')}</p><div class="project-rail-controls" hidden><span id="project-rail-position" aria-live="polite" aria-atomic="true"></span><button id="project-rail-prev" type="button" aria-controls="project-rail" aria-label="${esc(ru['rail.previous'])}" data-i18n-attrs='[{"attr":"aria-label","key":"rail.previous"}]'>←</button><button id="project-rail-next" type="button" aria-controls="project-rail" aria-label="${esc(ru['rail.next'])}" data-i18n-attrs='[{"attr":"aria-label","key":"rail.next"}]'>→</button></div></div><div id="project-rail" class="project-rail" tabindex="0" role="region" aria-label="${esc(ru['rail.label'])}" data-i18n-attrs='[{"attr":"aria-label","key":"rail.label"}]' aria-describedby="project-rail-hint">${projects.map((p,i)=>card(p,'./',i)).join('')}</div><div class="project-rail-footer">${internal('./projects/','v12.catalog')}</div></section>
 ${fragments.experience}${education}${fragments.approach}${fragments.contact}`;
writeFileSync('index.html',shell(home));
const filters=['all','spatial','tools','games','cases'];
const catalog=`<section class="catalog page-section" aria-labelledby="catalog-title"><div class="page-intro"><span class="eyebrow">01 / ${text('v12.projects')}</span>${text('v12.catalog','h1','id="catalog-title"')}${text('v12.catalogIntro','p')}</div><div class="catalog-tools"><div class="project-filters" role="group" aria-label="Фильтр проектов" data-i18n-attrs='[{"attr":"aria-label","key":"v12.filterLabel"}]'>${filters.map(filter=>`<button type="button" data-filter="${filter}" aria-pressed="${filter==='all'}" disabled data-js-only>${text('v12.'+filter)}</button>`).join('')}</div><p class="filter-status" role="status"><span data-i18n="v12.visibleCount">${ru['v12.visibleCount']}</span> <strong id="filter-count">9</strong></p></div><div class="project-grid catalog-grid">${projects.map((p,i)=>card(p,'../',i)).join('')}</div></section>`;
writeFileSync('projects/index.html',shell(catalog,{prefix:'../',page:'catalog',titleKey:'v12.page.catalog'}));
projects.forEach((project,i)=>{
 const prefix='../',next=projects[(i+1)%projects.length];
 const links=[project.demo&&ext(project.demo,'v12.demo','primary-link'),project.code&&ext(project.code,'v12.code'),project.windows&&ext(project.windows,'v12.windows'),project.qa&&ext(project.qa,'v12.qa')].filter(Boolean).join('');
 const info=`<div class="case-context"><div>${text('v12.context','h2')}${text(project.context,'p')}</div><div>${text('v12.stack','h2')}<ul class="project-stack">${project.stack.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div><div class="case-outcome"><div>${text('v12.result','h2')}${text(project.result,'p')}</div><div>${text('v12.limits','h2')}${text(project.limit,'p')}</div></div>`;
 const body=`<article class="project-page page-section" aria-labelledby="project-title"><div class="case-back">${internal('../projects/','v12.back')}</div><header class="case-intro"><div><p class="eyebrow">${text('v12.'+project.category)}</p><h1 id="project-title">${title(project)}</h1>${text(project.description,'p')}</div><div class="case-actions">${links}</div></header>
 ${project.diagram?text('v12.diagramNote','p','class="diagram-note"'):text('v12.captured','p','class="capture-note"')}${figure(project,prefix,1)}${info}${project.diagram?'':figure(project,prefix,2)}
 ${project.id==='rowline'?`<section class="case-sample">${text('v12.sampleTitle','h2')}${fragments.sample}</section>`:''}
 <nav class="case-pagination" aria-label="Проекты" data-i18n-attrs='[{"attr":"aria-label","key":"v12.projects"}]'>${internal('../projects/','v12.back')}<a class="site-internal next-case" href="${next.id}.html">${text('v12.nextProject')}<strong>${title(next)}</strong><span aria-hidden="true">→</span></a></nav></article>${lightbox}`;
 writeFileSync('projects/'+project.id+'.html',shell(body,{prefix,page:'project',projectId:project.id,titleKey:'v12.page.'+project.id}));
});
console.log('Generated 11 real static HTML entries: home, catalog and nine case pages.');
