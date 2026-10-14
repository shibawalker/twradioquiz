import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const bank=JSON.parse(readFileSync(new URL('../public/data/questions.json',import.meta.url)));
async function state(page){return page.evaluate(async()=> (await import('/db.js')).readState());}
async function start(page,mode='all',order='sequential',chapter=''){await page.goto(`/#setup/${mode}/${chapter}`);await expect(page.getByRole('button',{name:/開始(練習|模擬考)/})).toBeVisible();if(mode!=='exam')await page.locator('#order').selectOption(order);await page.getByRole('button',{name:/開始(練習|模擬考)/}).click();await expect(page.getByRole('button',{name:'確認答案',exact:true})).toBeVisible();}
async function answer(page,correct){const s=await state(page),q=bank.questions.find(q=>q.id===s.session.ids[s.session.index]);await page.locator(`[data-action="select:${correct?q.correct:(q.correct+1)%4}"]`).click();await page.getByRole('button',{name:'確認答案',exact:true}).click();await expect(page.getByRole('button',{name:/下一題|查看本次結果/})).toBeVisible();}
test('mobile selection, confirmation, sequential resume, wrong history and stats',async({page})=>{
 await start(page);await expect(page.getByRole('button',{name:'確認答案',exact:true})).toBeDisabled();
 await page.locator('[data-action="select:0"]').click();await page.locator('[data-action="select:2"]').click();expect(Object.keys((await state(page)).stats)).toHaveLength(0);
 await answer(page,false);const first=(await state(page)).session.ids[0];await page.reload();await expect(page.getByRole('button',{name:'下一題',exact:true})).toBeVisible();expect((await state(page)).stats[first].answer_count).toBe(1);
 await page.getByRole('button',{name:'下一題',exact:true}).click();await expect(page.locator('main')).toContainText('原題號 2');await page.goto('/');await page.getByRole('button',{name:/繼續上次/}).click();await expect(page.locator('main')).toContainText('原題號 2');
 page.on('dialog',d=>d.accept());await start(page,'wrong');expect((await state(page)).session.ids).toEqual([first]);await answer(page,true);await page.getByRole('button',{name:'查看本次結果'}).click();expect((await state(page)).stats[first].ever_wrong).toBe(true);
 await page.goto('/#stats');await expect(page.locator('main')).toContainText('答對 1 次 · 答錯 1 次');
});
test('shuffle fixed after reload and new page, chapter isolation, mobile overflow and diagram',async({page,context})=>{
 await start(page,'all','shuffle');const s=(await state(page)).session;expect(new Set(s.ids).size).toBe(606);await answer(page,true);await page.getByRole('button',{name:'下一題',exact:true}).click();await expect(page.locator('main')).toContainText('第 2 / 606 題');await page.reload();expect((await state(page)).session.ids).toEqual(s.ids);
 const other=await context.newPage();await other.goto('/');await other.getByRole('button',{name:/繼續上次/}).click();expect((await state(other)).session.index).toBe(1);expect((await state(other)).session.ids).toEqual(s.ids);await other.close();
 page.on('dialog',d=>d.accept());await start(page,'chapter','sequential','2');expect((await state(page)).session.ids).toHaveLength(184);
 await page.evaluate(async()=>{await (await import('/db.js')).mutate(st=>{st.session.index=84;});});await page.reload();await expect(page.locator('figure img')).toBeVisible();expect(await page.locator('figure img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tests/artifacts/mobile-question.png',fullPage:true});await page.goto('/');await page.screenshot({path:'tests/artifacts/mobile-home.png',fullPage:true});
});
test('40 question exam, 32 passes, correct chapter quotas and history',async({page})=>{
 test.setTimeout(120000);await start(page,'exam');const s=(await state(page)).session;expect(s.ids).toHaveLength(40);expect(s.deadline-s.startedAt).toBe(2400000);
 for(let i=0;i<40;i++){await answer(page,i<32);await page.getByRole('button',{name:i===39?'查看本次結果':'下一題',exact:true}).click();}
 await expect(page.locator('main')).toContainText('32 / 40');await expect(page.locator('.pill')).toHaveText('PASS');const st=await state(page);expect(st.exams).toHaveLength(1);expect(Object.values(st.stats).filter(s=>s.ever_wrong)).toHaveLength(8);await page.reload();expect((await state(page)).exams).toHaveLength(1);
});
test('deadline persists across reload and automatically fails unanswered exam',async({page})=>{
 await start(page,'exam');const ids=(await state(page)).session.ids;await page.evaluate(async()=>{await(await import('/db.js')).mutate(st=>st.session.deadline=Date.now()-1000);});await page.reload();await expect(page.locator('.pill')).toHaveText('FAIL');const st=await state(page);expect(st.exams).toHaveLength(1);expect(st.exams[0].ids).toEqual(ids);expect(Object.values(st.stats).filter(s=>s.ever_wrong)).toHaveLength(40);
});
test('empty wrong mode, restart preserves order, clear preserves stats, double confirmation reset',async({page})=>{
 await page.goto('/#setup/wrong/');await expect(page.locator('main')).toContainText('目前沒有錯題');await start(page,'all','shuffle');await answer(page,false);const ids=(await state(page)).session.ids;
 page.on('dialog',d=>d.accept());await page.goto('/#manage');await page.getByRole('button',{name:'重新開始目前 session',exact:true}).click();expect((await state(page)).session.ids).toEqual(ids);expect((await state(page)).session.answers).toEqual({});await page.goto('/#manage');await page.getByRole('button',{name:'清除目前 session',exact:true}).click();expect((await state(page)).session).toBeNull();expect(Object.keys((await state(page)).stats)).toHaveLength(1);
 page.removeAllListeners('dialog');let count=0;page.on('dialog',d=>{count++;return count===1?d.accept():d.dismiss();});await page.goto('/#manage');await page.getByRole('button',{name:'清除全部學習紀錄'}).click();expect(count).toBe(2);expect(Object.keys((await state(page)).stats)).toHaveLength(1);
 page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'清除全部學習紀錄'}).click();expect((await state(page)).stats).toEqual({});await start(page);expect((await state(page)).session.ids).toHaveLength(606);
});
test('IndexedDB survives full browser close and relaunch',async()=>{
 const {chromium}=await import('@playwright/test');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const profile=await mkdtemp(join(tmpdir(),'radioquiz-profile-'));const options={headless:true,executablePath:process.env.CHROME_PATH||(process.env.CI?undefined:'/usr/bin/google-chrome'),args:['--no-sandbox'],viewport:{width:390,height:844},baseURL:'http://127.0.0.1:5181'};let context;
 try{context=await chromium.launchPersistentContext(profile,options);let page=await context.newPage();await start(page,'all','shuffle');await answer(page,false);const before=await state(page);await context.close();context=await chromium.launchPersistentContext(profile,options);page=await context.newPage();await page.goto('/');await page.getByRole('button',{name:/繼續上次/}).click();const after=await state(page);expect(after).toEqual(before);await expect(page.getByRole('button',{name:'下一題',exact:true})).toBeVisible();}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});
