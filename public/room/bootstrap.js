(()=>{const load=document.querySelector('#loading'),text=document.querySelector('#load-text'),retry=document.querySelector('#retry');let language='ru';try{language=localStorage.getItem('room-professional-language')||'ru';}catch{}const requested=new URLSearchParams(location.search).get('lang');if(['ru','kk','en'].includes(requested))language=requested;if(!['ru','kk','en'].includes(language))language='ru';document.documentElement.lang=language;const ordinary=document.querySelector('#ordinary');ordinary.href='https://moyisey.github.io/bakhtiyar-zikirin/projects/?lang='+language;ordinary.textContent={ru:'Обычный вид ↗',kk:'Қалыпты көрініс ↗',en:'Regular view ↗'}[language];const locale=['ru','kk','en'].indexOf(language),label=(...values)=>values[locale];
document.title=label('Студия Бахтияра','Бақтияр студиясы','Bakhtiyar’s studio');
const shell={
 '#brand':[document.title,document.title,document.title],
 '#menu-toggle':['Меню','Мәзір','Menu'],
 '.skip':['К управлению','Басқаруға өту','Skip to controls'],
 '#caption strong':['Разработка. Проекты. Опыт.','Әзірлеу. Жобалар. Тәжірибе.','Development. Projects. Experience.'],
 '#hint':['Потяните, чтобы осмотреться','Айналаны қарау үшін сүйреңіз','Drag to look around'],
 '#enter':['Войти','Кіру','Enter'],
 '#audio-unlock':['Включить звук','Дыбысты қосу','Enable sound'],
 '#exit':['К выходу','Шығуға бару','Return to entrance'],
 '#zones-title':['В комнате','Бөлмеде','In the room'],
 '#objects-title':['Содержание','Мазмұн','Content'],
 '#credits':['Источники и лицензии','Дереккөздер мен лицензиялар','Sources and licenses']
};
for(const [selector,values] of Object.entries(shell))document.querySelector(selector).textContent=label(...values);
for(const [selector,values] of Object.entries({
 '#canvas':['3D-студия Бахтияра','Бақтиярдың 3D студиясы','Bakhtiyar’s 3D studio'],
 '#walk-pad':['Ходьба','Жүру','Walk'],
 '#close':['Закрыть','Жабу','Close'],
 '.languages':['Язык','Тіл','Language']
}))document.querySelector(selector).setAttribute('aria-label',label(...values));
document.querySelectorAll('[data-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===language)));
const words={ru:['Открываю комнату…','Повторить','Загрузка задержалась. Попробуйте ещё раз.','Не удалось запустить 3D. Обычный вид доступен сверху.'],kk:['Бөлме ашылуда…','Қайталау','Жүктеу кешікті. Қайталап көріңіз.','3D іске қосылмады. Қалыпты көрініс жоғарыда.'],en:['Opening the room…','Retry','Loading is taking longer. Please retry.','3D could not start. The regular view is available above.']}[language]||['Открываю комнату…','Повторить','Загрузка задержалась.','Не удалось запустить 3D.'];text.textContent=words[0];retry.textContent=words[1];const timer=setTimeout(()=>fail(words[2]),25000);function fail(message){clearTimeout(timer);text.textContent=message;retry.hidden=false;load.hidden=false;window.__BOOT_ERROR__=message;}retry.onclick=()=>location.reload();window.cornerReady=()=>{clearTimeout(timer);load.hidden=true;};import('./studio.js').catch(error=>{console.error(error);window.__BOOT_DETAIL__=error.stack;fail(words[3]);});})();