// A deliberate "I do not know" answer; null remains unanswered.
export const UNKNOWN = -1;
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
export const QUOTAS = [12,12,10,2,2,2];
export const emptyState = () => ({schema:1, stats:{}, session:null, exams:[]});
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for(let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function createSession(bank, state, mode, chapter='', order='sequential', now=Date.now()) {
  const exam=bank.exam || {quotas:QUOTAS,passCount:32,minutes:40};
  let pool=bank.questions.filter(q=>q.enabled);
  if(mode==='chapter') pool=pool.filter(q=>q.chapter===chapter);
  if(mode==='wrong') pool=pool.filter(q=>state.stats[q.id]?.ever_wrong);
  if(mode==='exam') pool=bank.chapters.flatMap((c,i)=> {
    const candidates=pool.filter(q=>q.chapter===c);
    if(candidates.length<exam.quotas[i]) throw Error(`章節題數不足：${c}`);
    return shuffle(candidates).slice(0,exam.quotas[i]);
  });
  if(!pool.length) throw Error('目前沒有錯題');
  pool.sort((a,b)=>bank.chapters.indexOf(a.chapter)-bank.chapters.indexOf(b.chapter)||a.original_number-b.original_number);
  if(order==='shuffle'||mode==='exam') pool=shuffle(pool);
  return {id:newId(),bankVersion:bank.version,grade:bank.grade||'2',exam:{...exam},mode,chapter,order,ids:pool.map(q=>q.id),index:0,selected:null,answers:{},startedAt:now,deadline:mode==='exam'?now+exam.minutes*60*1000:null,completedAt:null};
}
export function record(state,q,selected,now=Date.now()) {
  const session=state.session;
  if(!session||session.completedAt||Object.hasOwn(session.answers,q.id)) return;
  if(selected===UNKNOWN && session.mode==='exam') return;
  const correct=selected===q.correct;
  session.answers[q.id]={selected,correct,at:now};
  const s=state.stats[q.id] ||= {answer_count:0,correct_count:0,wrong_count:0,last_answer:null,last_result:null,ever_wrong:false};
  s.answer_count++; s[correct?'correct_count':'wrong_count']++; s.last_answer=selected; s.last_result=correct; s.ever_wrong ||= !correct;
}
export function finishExam(state,bank,now=Date.now()) {
  const s=state.session;
  if(!s||s.mode!=='exam'||s.completedAt) return;
  const byId=new Map(bank.questions.map(q=>[q.id,q]));
  for(const id of s.ids) if(!Object.hasOwn(s.answers,id)) record(state,byId.get(id),null,now);
  s.completedAt=now;
  state.exams.push(structuredClone(s));
}
export function score(session) {
  const answers=Object.values(session.answers); const correct=answers.filter(a=>a.correct).length;
  return {correct,wrong:answers.length-correct,answered:answers.length,pass:correct>=(session.exam?.passCount??32)};
}
export function aggregate(questions,stats) {
  return questions.reduce((a,q)=> {const s=stats[q.id]; a.total++; if(s){a.answered+=Number(s.answer_count>0); a.attempts+=s.answer_count;a.correct+=s.correct_count;a.wrong+=s.wrong_count;a.everWrong+=Number(s.ever_wrong);} return a;}, {total:0,answered:0,attempts:0,correct:0,wrong:0,everWrong:0});
}
