const stateKey=grade=>grade==='2'?'state':`state:${grade}`;
import {emptyState} from './core.js';
const opened=new Promise((resolve,reject)=> {
  const r=indexedDB.open('radioquiz',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('app');
  r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
});
export async function readState(grade='2') {
  const db=await opened;
  return new Promise((resolve,reject)=> {const r=db.transaction('app').objectStore('app').get(stateKey(grade));r.onsuccess=()=>resolve(r.result||emptyState());r.onerror=()=>reject(r.error);});
}
// Re-read and write within one transaction: serializes tabs and prevents duplicate answers.
export async function mutate(fn,grade='2') {
  const db=await opened;
  return new Promise((resolve,reject)=> {
    const tx=db.transaction('app','readwrite'); const store=tx.objectStore('app');const r=store.get(stateKey(grade));let state;
    r.onsuccess=()=> {try {state=r.result||emptyState();fn(state);store.put(state,stateKey(grade));}catch(e){reject(e);tx.abort();}};
    tx.oncomplete=()=>resolve(state);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存中止'));
  });
}

export async function clearAll() {
  const db=await opened;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('app','readwrite');
    tx.objectStore('app').clear();
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
