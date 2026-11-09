import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {categories, questionBank, makeExam, tracks, sources, epaScopes} from '../public/content.js';
import {emptyProgress,validProgress,validSession,score,missedQuestions, epaSectionScores, createAttemptId} from '../public/model.js';
import {server} from '../server.js';
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
test('Official outlines contain 4 trade and 7 law categories, each summing to 100%',()=>{
 for(const [track,count] of [['trade',4],['law',7]]){const pool=categories.filter(c=>c.track===track);assert.equal(pool.length,count);assert.equal(pool.reduce((sum,c)=>sum+c.weight,0),100);}
 assert.equal(new Set(questionBank.map(q=>q.id)).size,152);
 assert.equal(questionBank.filter(q=>!q.category.startsWith('epa-')).length,52);
 for(const c of categories){assert.ok(c.sections.length>=4);assert.ok(c.references.every(id=>sources.some(s=>s.id===id)));for(const q of c.questions){assert.equal(new Set(q.options).size,4);assert.ok(q.explanation.length>40);}}
});
test('Weighted exams have exact session counts, no repeated questions, and category quotas within one item of weight',()=>{
 for(const track of Object.keys(tracks))for(let i=0;i<100;i++){const exam=makeExam(track);assert.equal(exam.length,tracks[track].count);assert.equal(new Set(exam.map(q=>q.id)).size,exam.length);for(const c of categories.filter(c=>c.track===track)){const count=exam.filter(q=>q.category===c.id).length;assert.ok(Math.abs(count-c.weight*exam.length/100)<1);}}
});
test('Scoring counts wrong and unanswered items; a later correct answer removes a missed item',()=>{
 const q=questionBank[0],p=emptyProgress();const attempt=choice=>({id:crypto.randomUUID(),date:new Date().toISOString(),track:'trade',mode:'practice',results:[{id:q.id,choice}]});
 p.attempts.push(attempt(null));assert.deepEqual(score(p.attempts[0].results),{correct:0,total:1});assert.equal(missedQuestions(p)[0].id,q.id);
 p.attempts.push(attempt(q.answer));assert.equal(missedQuestions(p).length,0);assert.ok(validProgress(p));
 p.attempts[0].results[0].choice=99;assert.equal(validProgress(p),false);
});
test('Backup validation rejects unknown IDs, malformed data, and duplicate questions',()=>{
 const p=emptyProgress();assert.ok(validProgress(p));assert.equal(validProgress({...p,completed:['nonexistent']}),false);assert.equal(validProgress({...p,bookmarks:['<script>']}),false);assert.equal(validProgress(null),false);
 const q=questionBank[0];const a={id:'a',date:new Date().toISOString(),track:'trade',mode:'exam',results:[{id:q.id,choice:0},{id:q.id,choice:1}]};assert.equal(validProgress({...p,attempts:[a]}),false);
});
test('Session validation protects answer order, bounds, and timing',()=>{
 const s={track:'trade',mode:'exam',ids:[questionBank[0].id],orders:[[3,2,1,0]],answers:[null],checked:[false],index:0,startedAt:100,deadline:200};assert.ok(validSession(s));assert.equal(validSession({...s,orders:[[0,0,1,2]]}),false);assert.equal(validSession({...s,index:1}),false);assert.equal(validSession({...s,deadline:50}),false);
});
test('Server delivers the application, modules, SVGs, and health with correct types',async()=>{
 for(const [path,type] of [['/','text/html'],['/content.js','text/javascript'],['/model.js','text/javascript'],['/style.css','text/css'],['/hvac.svg','image/svg+xml'],['/health','application/json']]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith(type));assert.ok((await r.text()).length>0);assert.equal(r.headers.get('x-content-type-options'),'nosniff');}
});
test('Server rejects unsupported methods, nonexistent files, malformed paths, and traversal',async()=>{
 assert.equal((await fetch(base+'/absent')).status,404);assert.equal((await fetch(base+'/%E0%A4%A')).status,404);assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);assert.equal((await fetch(base+'/health',{method:'POST'})).status,405);const r=await fetch(base+'/',{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');
});

test('EPA paths contain Core and exactly the selected 25-question sections',()=>{
 for(const [scope,config] of Object.entries(epaScopes)){
  const exam=makeExam('epa',Math.random,scope);
  assert.equal(exam.length,config.count);
  assert.equal(new Set(exam.map(q=>q.id)).size,exam.length);
  assert.deepEqual([...new Set(exam.map(q=>q.category))].sort(),[...config.categories].sort());
  for(const id of config.categories)assert.equal(exam.filter(q=>q.category===id).length,25);
 }
 assert.throws(()=>makeExam('epa',Math.random,'unknown'));
});
test('EPA study targets are per-section; a strong overall average cannot mask weak Core',()=>{
 let core=0;
 const results=makeExam('epa').map(q=>({id:q.id,choice:q.category==='epa-core'&&core++>=10?1:q.answer}));
 assert.equal(score(results).correct,85);
 const parts=epaSectionScores(results);
 assert.equal(parts.length,4);assert.equal(parts.find(p=>p.id==='epa-core').correct,10);assert.equal(parts.find(p=>p.id==='epa-core').met,false);
 assert.equal(parts.filter(p=>p.met).length,3);
 const allCorrect=makeExam('epa',Math.random,'type2').map(q=>({id:q.id,choice:q.answer}));assert.ok(epaSectionScores(allCorrect).every(p=>p.met));
 assert.equal(epaSectionScores(allCorrect.slice(0,1))[0].met,false);
});
test('EPA progress and sessions remain compatible with existing C-20 v1 backups',()=>{
 const p=emptyProgress();p.completed=['planning'];p.bookmarks=['planning-1'];
 p.attempts=[{id:'old',date:new Date().toISOString(),track:'trade',mode:'practice',results:[{id:'planning-1',choice:0}]}];
 assert.ok(validProgress(p));
 p.completed.push('epa-core');p.bookmarks.push('epa-type2-1');p.attempts.push({id:'epa',date:new Date().toISOString(),track:'epa',scope:'type2',mode:'exam',results:makeExam('epa',Math.random,'type2').map(q=>({id:q.id,choice:0}))});assert.ok(validProgress(p));
 const s={track:'epa',scope:'universal',mode:'exam',ids:makeExam('epa').map(q=>q.id),orders:Array.from({length:100},()=>[0,1,2,3]),answers:Array(100).fill(null),checked:Array(100).fill(false),index:99,startedAt:100,deadline:200};assert.ok(validSession(s));assert.equal(validSession({...s,scope:'not-an-exam'}),false);
 p.attempts[1].scope='not-an-exam';assert.equal(validProgress(p),false);
});

test('Attempt IDs work on HTTPS, HTTP LAN origins without randomUUID, and without Web Crypto',()=>{
 assert.equal(createAttemptId({randomUUID:()=> 'secure-context-id'}),'secure-context-id');
 const ids=new Set(Array.from({length:1000},()=>createAttemptId({getRandomValues:array=>crypto.getRandomValues(array)})));assert.equal(ids.size,1000);
 const fallback=new Set(Array.from({length:1000},()=>createAttemptId({})));assert.equal(fallback.size,1000);
 assert.equal(typeof createAttemptId(null),'string');
});
