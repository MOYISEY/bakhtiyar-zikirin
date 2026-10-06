(()=>{
const valid=['ru','kk','en'];let lang='ru';try{lang=localStorage.getItem('studio-slice-language')||lang}catch{}const q=new URLSearchParams(location.search).get('lang');if(valid.includes(q))lang=q;if(!valid.includes(lang))lang='ru';document.documentElement.lang=lang;
const $=s=>document.querySelector(s),L=(...v)=>v[valid.indexOf(document.documentElement.lang)];let failed=false,contentReady=false,state=null,timer=null,lastProgress='',focusAfterRetry=false;
window.sliceUsable=false;window.sliceFatal=false;
function arm(){clearTimeout(timer);timer=setTimeout(()=>fail('timeout'),30000)}
function status(){
 const error=failed||state?.warmError||Object.values(state?.phases||{}).some(p=>p.status==='error'),stage=state?.warming?2:state?1:0;
 $('#loading').dataset.state=error?'error':state?.warming?'gpu':'loading';
 $('#load-title').textContent=L('Студия Бахтияра','Бақтияр студиясы','Bakhtiyar’s studio');
 $('#load-note').textContent=L('Небольшое пространство для идей.','Идеяларға арналған шағын кеңістік.','A small space for ideas.');
 $('#loading-text').textContent=error?(failed==='timeout'?L('Загрузка затянулась. Можно повторить или открыть проекты.','Жүктеу ұзаққа созылды. Қайталаңыз немесе жобаларды ашыңыз.','Loading is taking longer. Retry or explore the projects.'):L('Не удалось подготовить комнату. Проекты по-прежнему доступны.','Бөлмені дайындау мүмкін болмады. Жобалар қолжетімді.','The room could not be prepared. The projects are still available.')):stage===2?L('Готовим свет и первый проход…','Жарық пен алғашқы көріністі дайындаудамыз…','Preparing light and your first steps…'):stage===1?L('Собираем комнату…','Бөлмені жинаудамыз…','Bringing the room together…'):L('Подключаем пространство…','Кеңістікті қосудамыз…','Opening the space…');
 const labels=[L('Основа','Негіз','Foundation'),L('Комната','Бөлме','Room'),L('Свет','Жарық','Light')];for(const [i,e]of [...document.querySelectorAll('#load-stages li')].entries()){e.textContent=labels[i];e.dataset.state=i<stage?'done':i===stage?'active':'pending';if(i===stage)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current')}
 $('#load-stages').ariaLabel=L('Этапы подготовки','Дайындау кезеңдері','Preparation stages');
 $('#load-projects').textContent=L('Посмотреть проекты ↗','Жобаларды көру ↗','Explore projects ↗');$('#load-projects').hidden=!contentReady;
 $('#retry').textContent=L('Повторить загрузку','Қайта жүктеу','Try again');$('#retry').hidden=!error;
 $('#fallback-cv').textContent=L('Резюме · PDF','Түйіндеме · PDF','Resume · PDF');$('#fallback-links').hidden=!error||contentReady;
 if(error)clearTimeout(timer);
}
function locale(){
 document.documentElement.lang=lang;$('#language').value=lang;const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);
 document.title=L('Студия Бахтияра','Бақтияр студиясы','Bakhtiyar’s studio');$('#ordinary').textContent=L('Обычный вид ↗','Қалыпты көрініс ↗','Regular view ↗');$('#ordinary').href='https://moyisey.github.io/bakhtiyar-zikirin/projects/?lang='+lang;$('.signature').href='https://moyisey.github.io/bakhtiyar-zikirin/?lang='+lang;$('.signature').ariaLabel=L('Бахтияр Зикирин — портфолио','Бақтияр Зикирин — портфолио','Bakhtiyar Zikirin — portfolio');$('#language-label').textContent=L('Язык','Тіл','Language');$('#actions-toggle').ariaLabel=L('Действия в комнате','Бөлмедегі әрекеттер','Room actions');$('#sound').textContent=L('Включить звук','Дыбысты қосу','Enable sound');$('.skip').textContent=L('К проектам','Жобаларға өту','Skip to projects');status();
}
function disable(){window.sliceUsable=false;$('#scene').tabIndex=-1;$('#scene').setAttribute('aria-disabled','true');for(const e of document.querySelectorAll('[data-needs-scene],.object-action'))e.disabled=true;for(const e of document.querySelectorAll('#object-actions,#object-hint,.object-action'))e.hidden=true;$('#object-hint').dataset.hotspot='';$('#object-hint').setAttribute('aria-hidden','true');window.dispatchEvent(new Event('room-scene-disabled'))}
function fail(reason='fatal'){failed=reason;window.sliceFatal=reason==='fatal';clearTimeout(timer);disable();$('#loading').hidden=false;$('#intro').hidden=true;status()}
window.sliceReady=()=>{if(window.sliceFatal||window.sliceUsable)return;clearTimeout(timer);failed=false;window.sliceUsable=true;$('#scene').tabIndex=0;$('#scene').setAttribute('aria-disabled','false');for(const e of document.querySelectorAll('[data-needs-scene]'))e.disabled=false;const focusLoading=(focusAfterRetry&&document.activeElement===document.body)||$('#loading').contains(document.activeElement);focusAfterRetry=false;$('#loading').hidden=true;$('#intro').hidden=false;if(focusLoading)$('#scene').focus({preventScroll:true});$('#object-actions').hidden=false;window.dispatchEvent(new Event('room-scene-ready'));performance.mark('studio-interactive')};
window.sliceLoading=value=>{state=value;if(value.ready){window.sliceReady();return}const fingerprint=JSON.stringify([value.warming,Object.values(value.phases).map(p=>[p.status,p.completed])]);if(fingerprint!==lastProgress&&!failed){lastProgress=fingerprint;arm()}status()};
window.sliceFail=fail;
disable();$('#intro').hidden=true;$('#actions-toggle').disabled=true;$('.skip').onclick=e=>{e.preventDefault();$('#ordinary').focus()};$('#language').onchange=e=>{lang=e.target.value;try{localStorage.setItem('studio-slice-language',lang)}catch{}locale()};locale();
$('#retry').onclick=()=>{focusAfterRetry=true;if(!window.sliceFatal&&failed!=='timeout'&&window.sliceRetry){failed=false;lastProgress='';arm();window.sliceRetry();status()}else location.reload()};$('#load-projects').onclick=()=>$('#case-button').click();
new MutationObserver(status).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});arm();
import('./ui.js').then(({initUI})=>{initUI({hold:false,localize(){},folder(){},audio:{inspect:()=>({state:'not-created',preferences:{muted:true}})}});contentReady=true;$('#actions-toggle').disabled=false;status();return import('./main.js')}).catch(e=>{console.error(e);fail()});
})();
