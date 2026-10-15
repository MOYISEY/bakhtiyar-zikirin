export const refinedAccents=new URLSearchParams(location.search).get('accents')!=='legacy';
export const ACCENT_FILES=['robot','orbit','ceiling-panel'].map(id=>'assets/room-accents/'+id+'.glb');
