const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=process.env.APP_URL||'http://127.0.0.1:8085';
 try{
  for(const withoutUUID of [false,true])for(const action of ['finish','submit']){
   const context=await browser.newContext(),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   if(withoutUUID)await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));
   await page.goto(base+'/#practice');
   await page.getByRole('button',{name:'Start mixed practice exam'}).click();
   await page.locator('.question-title').waitFor();
   assert.equal(await page.locator('.question-dots button').count(),15);
   await page.locator('.question-dots button').last().click();
   await page.locator('.answers input').first().check();
   await page.locator(action==='finish'?'#submit':'#finish').click();
   await page.getByRole('dialog').getByRole('button',{name:'Submit session'}).click();
   await page.getByRole('heading',{name:'Every session is a step forward.'}).waitFor();
   const state=await page.evaluate(()=>({progress:JSON.parse(localStorage.getItem('c20-fieldguide-v1')),session:localStorage.getItem('c20-fieldguide-session-v1')}));
   assert.equal(state.session,null);assert.equal(state.progress.attempts.length,1);assert.equal(state.progress.attempts[0].results.length,15);assert.ok(state.progress.attempts[0].id);
   await page.reload();await page.getByRole('heading',{name:'Every session is a step forward.'}).waitFor();
   await page.getByRole('link',{name:'Practice tests',exact:true}).click();await page.getByRole('heading',{name:'Practice with a plan.'}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Resume session'}).count(),0);
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('Submission regression passed: Finish and Submit on question 15, with and without randomUUID; results survive reload and unfinished sessions clear.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
