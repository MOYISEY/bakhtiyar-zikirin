const assert=require('assert/strict');
// Named scene actions use the same deliberate two-touch contract as the app.
// A failed first touch is never retried silently: it must reveal its context.
async function activateRoomAction(page,selector,touch=false){
 const target=page.locator(selector);
 await target[touch?'tap':'click']();
 if(touch&&/^#object-(cube|robot|orbit|wall-.+)$/.test(selector)){
  assert(!await page.locator('#panel').evaluate(e=>e.open),'first touch must not open a scene item');
  assert(await page.locator('#object-hint').isVisible(),'first touch must explain the scene item');
  assert.equal(await page.locator('#object-hint').getAttribute('data-hotspot'),selector.slice(8));
  await target.tap();
 }
}
module.exports={activateRoomAction};
