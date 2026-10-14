import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const banks=Object.fromEntries(['1','2','3'].map(g=>[g,JSON.parse(readFileSync(new URL(`../public/data/questions${g==='2'?'':'-'+g}.json`,import.meta.url)))]));
const state=(page,g)=>page.evaluate(async grade=>(await import('./db.js')).readState(grade),g);
async function confirmAnswer(page,g,correct=true){const st=await state(page,g),q=banks[g].questions.find(q=>q.id===st.session.ids[st.session.index]);await page.locator(`[data-action="select:${correct?q.correct:(q.correct+1)%4}"]`).click();await page.locator('[data-action="confirm"]').click();await expect(page.locator('[data-action="next"]')).toBeVisible();}
test('grade selector order, exact taglines, independent progress, and legacy second-class state',async({page})=>{
 await page.goto('/');await expect(page.locator('.grade-options button strong')).toHaveText(['三等','二等','一等']);await expect(page.locator('.grade-options button small')).toHaveText(['大家都可以考！','考過三等就可以！','設二等臺一年來進階！']);
 await page.goto('/#setup/all/');await page.locator('[data-action^="start:"]').click();await confirmAnswer(page,'2',false);const legacy=await state(page,'2');
 await page.goto('/');await page.locator('[data-action="grade:3"]').click();await expect(page.locator('h2')).toContainText('三等');expect((await state(page,'3')).stats).toEqual({});
 await page.locator('[data-action="setup:all"]').click();await page.locator('[data-action^="start:"]').click();await confirmAnswer(page,'3',false);const third=await state(page,'3');expect(third.session.ids).toHaveLength(570);
 await page.goto('/?grade=1');await expect(page.locator('main')).toContainText('874 道官方題目');expect((await state(page,'1')).stats).toEqual({});
 await page.locator('[data-action="grade:2"]').click();await expect(page.locator('[data-action="resume"]')).toBeVisible();expect(await state(page,'2')).toEqual(legacy);
 await page.locator('[data-action="grade:3"]').click();await page.reload();await expect(page.locator('[data-action="resume"]')).toBeVisible();expect(await state(page,'3')).toEqual(third);
 await page.screenshot({path:'tests/artifacts/grades-home.png',fullPage:true});
});
for(const g of ['3','1'])test(`grade ${g}: full exam uses correct length, pass mark, history and wrong questions`,async({page})=>{
 test.setTimeout(120000);await page.goto(`/?grade=${g}#setup/exam/`);await page.locator('[data-action^="start:"]').click();await expect(page.locator('[data-action="confirm"]')).toBeVisible();const before=await state(page,g),n=banks[g].exam.quotas.reduce((a,b)=>a+b,0),pass=banks[g].exam.passCount;expect(before.session.ids).toHaveLength(n);expect(before.session.deadline-before.session.startedAt).toBe(2400000);
 for(let i=0;i<n;i++){await confirmAnswer(page,g,i<pass);await page.locator('[data-action="next"]').click();}
 await expect(page.locator('.pill')).toHaveText('PASS');await expect(page.locator('.score')).toHaveText(`${pass} / ${n}`);await page.reload();await expect(page.locator('.score')).toHaveText(`${pass} / ${n}`);const st=await state(page,g);expect(st.exams).toHaveLength(1);expect(Object.values(st.stats).filter(s=>s.ever_wrong)).toHaveLength(n-pass);
 await page.goto(`/?grade=${g}#stats`);await expect(page.locator('main')).toContainText(`最近一次：${pass} / ${n}`);
});
test('GitHub Pages subpath loads all grades, figures, stylesheet and source notice',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [g,index] of [['1',43],['2',84],['3',74]]){
  await page.goto(`/radioquiz/?grade=${g}#setup/chapter/2`);await page.locator('[data-action^="start:"]').click();
  await page.evaluate(async({grade,index})=>{await(await import('./db.js')).mutate(st=>st.session.index=index,grade);},{grade:g,index});await page.reload();await expect(page.locator('figure img')).toBeVisible();expect(await page.locator('figure img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);expect(await page.locator('button.choice').first().evaluate(el=>parseFloat(getComputedStyle(el).minHeight))).toBeGreaterThanOrEqual(52);
  for(const width of [320,390,430]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 }
 await page.goto('/radioquiz/?grade=3');await page.getByRole('link',{name:'題庫來源與權利聲明'}).click();await expect(page.locator('h1')).toHaveText('題庫來源與權利聲明');expect(errors).toEqual([]);
});
