import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSession,emptyState,record,finishExam,score,aggregate,QUOTAS} from '../public/core.js';
const bank=JSON.parse(readFileSync(new URL('../public/data/questions.json',import.meta.url)));
test('complete official bank, contiguous chapter numbering and diagrams',()=>{
 assert.equal(bank.questions.length,606);assert.equal(new Set(bank.questions.map(q=>q.id)).size,606);
 for(const [i,c] of bank.chapters.entries()){const qs=bank.questions.filter(q=>q.chapter===c);assert.equal(qs.length,[214,133,184,26,28,21][i]);assert.deepEqual(qs.map(q=>q.original_number),Array.from({length:qs.length},(_,j)=>j+1));}
 assert.equal(bank.questions.filter(q=>q.image).length,5);
 for(const q of bank.questions){assert.equal(q.choices.length,4);assert.ok(q.correct>=0&&q.correct<4);assert.ok(q.choices.every(Boolean));assert.ok(q.source.page>=19&&q.source.page<=123);}
});
test('sequential and shuffle sessions are complete and fixed on serialization',()=>{
 const st=emptyState();const seq=createSession(bank,st,'all');assert.deepEqual(seq.ids,bank.questions.map(q=>q.id));
 const sh=createSession(bank,st,'all','','shuffle');assert.equal(new Set(sh.ids).size,606);assert.deepEqual(JSON.parse(JSON.stringify(sh)).ids,sh.ids);
 for(const c of bank.chapters){const s=createSession(bank,st,'chapter',c);assert.ok(s.ids.every(id=>bank.questions.find(q=>q.id===id).chapter===c));}
});
test('selection is uncounted; confirmed answers locked; wrong history persists',()=>{
 const st=emptyState(),q=bank.questions[0];st.session=createSession(bank,st,'all');st.session.selected=q.correct;assert.equal(Object.keys(st.stats).length,0);
 record(st,q,(q.correct+1)%4);record(st,q,q.correct);assert.equal(st.stats[q.id].answer_count,1);assert.equal(st.stats[q.id].wrong_count,1);
 st.session=createSession(bank,st,'wrong');assert.deepEqual(st.session.ids,[q.id]);record(st,q,q.correct);assert.equal(st.stats[q.id].ever_wrong,true);assert.equal(st.stats[q.id].answer_count,2);assert.equal(st.stats[q.id].correct_count,1);
 assert.equal(aggregate(bank.questions,st.stats).attempts,2);
});
test('exam quotas, fixed deadline, passing boundary and idempotent completion',()=>{
 for(const count of [31,32,40]){const st=emptyState();st.session=createSession(bank,st,'exam','','shuffle',1000);assert.equal(st.session.deadline,2401000);assert.equal(new Set(st.session.ids).size,40);
 bank.chapters.forEach((c,i)=>assert.equal(st.session.ids.filter(id=>bank.questions.find(q=>q.id===id).chapter===c).length,QUOTAS[i]));
 st.session.ids.slice(0,count).forEach(id=>{const q=bank.questions.find(q=>q.id===id);record(st,q,q.correct);});finishExam(st,bank);finishExam(st,bank);assert.equal(score(st.session).pass,count>=32);assert.equal(st.exams.length,1);assert.equal(score(st.session).wrong,40-count);assert.equal(aggregate(bank.questions,st.stats).everWrong,40-count);}
});
for(const [grade,total,counts,pass,quotas] of [
 ['1',874,[213,180,364,37,41,39],40,[13,15,15,3,2,2]],
 ['3',570,[229,132,145,36,10,18],25,[13,13,6,1,1,1]],
]) {
 const b=JSON.parse(readFileSync(new URL(`../public/data/questions-${grade}.json`,import.meta.url)));
 test(`grade ${grade}: full import, numbering, figure coverage and exam boundary`,()=>{
  assert.equal(b.questions.length,total);assert.equal(new Set(b.questions.map(q=>q.id)).size,total);
  b.chapters.forEach((c,i)=>{const qs=b.questions.filter(q=>q.chapter===c);assert.equal(qs.length,counts[i]);assert.deepEqual(qs.map(q=>q.original_number),Array.from({length:counts[i]},(_,j)=>j+1));});
  for(const q of b.questions){assert.equal(q.choices.length,4);assert.ok(q.choices.every(Boolean));assert.ok(q.correct>=0&&q.correct<4);if(/[ET]\d?-\d/.test(q.question)){assert.ok(q.image,q.id);assert.ok(readFileSync(new URL('../public/'+q.image.url,import.meta.url)).length>0);}}
  for(const n of [pass-1,pass]){const st=emptyState();st.session=createSession(b,st,'exam','','shuffle',100);assert.equal(st.session.deadline,2400100);assert.equal(new Set(st.session.ids).size,quotas.reduce((a,b)=>a+b,0));b.chapters.forEach((c,i)=>assert.equal(st.session.ids.filter(id=>b.questions.find(q=>q.id===id).chapter===c).length,quotas[i]));for(const id of st.session.ids.slice(0,n)){const q=b.questions.find(q=>q.id===id);record(st,q,q.correct);}finishExam(st,b);assert.equal(score(st.session).pass,n>=pass);assert.equal(st.exams.length,1);}
 });
}
test('unknown answer is distinct from unanswered, counted once, and retained after correct practice',()=>{
 const st=emptyState(),q=bank.questions[0];st.session=createSession(bank,st,'all');
 record(st,q,-1);record(st,q,-1);
 assert.equal(st.stats[q.id].answer_count,1);assert.equal(st.stats[q.id].wrong_count,1);assert.equal(st.stats[q.id].last_answer,-1);assert.equal(st.stats[q.id].ever_wrong,true);assert.equal(st.session.answers[q.id].selected,-1);
 st.session=createSession(bank,st,'wrong');assert.deepEqual(st.session.ids,[q.id]);record(st,q,q.correct);assert.equal(st.stats[q.id].ever_wrong,true);assert.equal(st.stats[q.id].correct_count,1);
 st.session=createSession(bank,st,'exam');const examQ=bank.questions.find(q=>q.id===st.session.ids[0]);record(st,examQ,-1);assert.deepEqual(st.session.answers,{});
});
