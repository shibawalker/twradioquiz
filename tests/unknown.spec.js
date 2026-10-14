import {test,expect} from '@playwright/test';
for(const grade of ['3','2','1'])test(`grade ${grade}: unknown requires confirmation and persists in wrong bank`,async({page})=>{
 const read=()=>page.evaluate(async g=>(await import('./db.js')).readState(g),grade);
 await page.goto(`/radioquiz/?grade=${grade}#setup/all/`);await page.locator('[data-action^="start:"]').click();
 const unknown=page.locator('[data-action="select:-1"]');
 await unknown.click();expect((await read()).stats).toEqual({});await page.locator('[data-action="select:0"]').click();await expect(unknown).toHaveAttribute('aria-pressed','false');expect((await read()).stats).toEqual({});
 await unknown.click();await page.reload();await expect(unknown).toHaveAttribute('aria-pressed','true');expect((await read()).stats).toEqual({});
 await page.locator('[data-action="confirm"]').click();await expect(page.locator('.feedback')).toContainText('已加入錯題庫');await expect(page.locator('.feedback')).toContainText('你的答案：我不會');await expect(page.locator('.feedback')).toContainText('正確答案：');await expect(unknown).toBeDisabled();
 const saved=await read(),id=saved.session.ids[0];expect(saved.stats[id].answer_count).toBe(1);expect(saved.stats[id].wrong_count).toBe(1);expect(saved.stats[id].ever_wrong).toBe(true);expect(saved.stats[id].last_answer).toBe(-1);
 await page.reload();expect((await read()).stats[id].answer_count).toBe(1);await expect(page.locator('.feedback')).toContainText('我不會');
 page.on('dialog',d=>d.accept());await page.goto(`/radioquiz/?grade=${grade}#setup/wrong/`);await page.locator('[data-action^="start:"]').click();expect((await read()).session.ids).toEqual([id]);
 await unknown.click();await page.locator('[data-action="confirm"]').click();await page.locator('[data-action="next"]').click();await expect(page.locator('.review')).toContainText('你的答案：我不會');await expect(page.locator('main')).not.toContainText('undefined');
 await page.goto(`/radioquiz/?grade=${grade}#setup/wrong/`);await page.locator('[data-action^="start:"]').click();const correct=await page.evaluate(async({g,id})=>{const file=g==='2'?'questions.json':`questions-${g}.json`;const bank=await(await fetch('./data/'+file)).json();return bank.questions.find(q=>q.id===id).correct;},{g:grade,id});
 await page.locator(`[data-action="select:${correct}"]`).click();await page.locator('[data-action="confirm"]').click();await expect(page.locator('.feedback')).toContainText('答對了');expect((await read()).stats[id].ever_wrong).toBe(true);
 await page.goto(`/radioquiz/?grade=${grade}#setup/exam/`);await page.locator('[data-action^="start:"]').click();await expect(page.locator('[data-action="confirm"]')).toBeVisible();await expect(unknown).toHaveCount(0);
});
