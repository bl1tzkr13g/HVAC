const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.env.APP_URL||'http://127.0.0.1:8080';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base);
 // An existing v1 C-20 backup must survive the new track without migration or reset.
 await page.evaluate(()=>localStorage.setItem('c20-fieldguide-v1',JSON.stringify({version:1,completed:['planning'],bookmarks:['planning-1'],attempts:[{id:'prior-session',date:new Date().toISOString(),track:'trade',mode:'practice',results:[{id:'planning-1',choice:0}]}]})));
 await page.reload();await page.goto(base+'/#epa');await page.getByRole('heading',{name:'EPA Section 608 learning.',exact:true}).waitFor();
 assert.equal(await page.locator('.category-card').count(),4);assert.ok((await page.locator('.notice').innerText()).includes('2001'));
 await page.screenshot({path:'/tmp/epa-learning-desktop.png',fullPage:true});
 await page.locator('.category-card').first().click();
 await page.getByRole('heading',{name:'Core · Refrigerant Fundamentals',exact:true}).waitFor();
 await page.getByRole('button',{name:'Mark lesson complete'}).click();
 await page.getByRole('button',{name:'Practice this category'}).click();
 await page.locator('.question-title').waitFor();assert.equal(await page.locator('.question-dots button').count(),25);
 await page.locator('.answers input[value="0"]').check();await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.locator('.explanation').waitFor();
 await page.getByRole('button',{name:/Save question/}).click();
 await page.reload();await page.locator('.explanation').waitFor();
 await page.getByRole('link',{name:'Save & leave'}).click();
 // Selecting EPA and a specific path must include Core and the correct Type.
 await page.getByRole('button',{name:'EPA Section 608',exact:true}).click();
 await page.locator('#epa-scope').selectOption('type2');
 await page.getByRole('checkbox',{name:'Use the study timer'}).check();
 await page.getByRole('button',{name:'Start EPA practice exam'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Start new session'}).click();
 await page.locator('.question-title').waitFor();assert.equal(await page.locator('.question-dots button').count(),50);
 const specific=await page.evaluate(()=>JSON.parse(localStorage.getItem('c20-fieldguide-session-v1')));
 assert.equal(specific.scope,'type2');assert.ok(specific.ids.every(id=>id.startsWith('epa-core-')||id.startsWith('epa-type2-')));assert.equal(specific.deadline-specific.startedAt,60*60000);
 await page.reload();await page.locator('.question-title').waitFor();assert.equal(await page.locator('.question-dots button').count(),50);
 // Submit through the real UI after completing saved answers; verify section scoring and persistence.
 await page.evaluate(()=>{const k='c20-fieldguide-session-v1',s=JSON.parse(localStorage.getItem(k));s.answers=s.ids.map(()=>0);localStorage.setItem(k,JSON.stringify(s));});
 await page.reload();await page.getByRole('button',{name:'Submit session',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Submit session'}).click();
 await page.getByRole('heading',{name:'EPA section study targets',exact:true}).waitFor();assert.equal(await page.locator('.epa-score-grid article').count(),2);
 assert.equal(await page.locator('.epa-score-grid').getByText('STUDY TARGET MET',{exact:true}).count(),2);
 await page.getByRole('link',{name:'Practice tests',exact:true}).click();
 await page.locator('#epa-scope').selectOption('universal');
 await page.getByRole('button',{name:'Start EPA practice exam'}).click();await page.locator('.question-title').waitFor();assert.equal(await page.locator('.question-dots button').count(),100);
 // Make Core weak and all Types perfect: overall 85% must not imply all section targets met.
 await page.evaluate(()=>{const k='c20-fieldguide-session-v1',s=JSON.parse(localStorage.getItem(k));let n=0;s.answers=s.ids.map(id=>id.startsWith('epa-core-')&&n++>=10?1:0);localStorage.setItem(k,JSON.stringify(s));});
 await page.reload();await page.getByRole('button',{name:'Submit session',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Submit session'}).click();
 await page.getByRole('heading',{name:'EPA section study targets',exact:true}).waitFor();
 assert.equal(await page.locator('.epa-score-grid article').count(),4);assert.equal(await page.locator('.epa-score-grid').getByText('REVIEW THIS SECTION',{exact:true}).count(),1);assert.ok((await page.locator('.score-circle').innerText()).includes('85'));
 await page.screenshot({path:'/tmp/epa-results-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'Your progress',exact:true}).click();await page.locator('.history-row').first().waitFor();assert.equal(await page.locator('.history-row').count(),3);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('c20-fieldguide-v1')));assert.ok(saved.completed.includes('planning'));assert.ok(saved.completed.includes('epa-core'));assert.ok(saved.bookmarks.includes('planning-1'));assert.ok(saved.bookmarks.some(id=>id.startsWith('epa-')));
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup'}).click();await (await download).saveAs('/tmp/epa-backup.json');
 await page.locator('#import').setInputFiles('/tmp/epa-backup.json');await page.getByRole('dialog').getByRole('button',{name:'Import backup'}).click();await page.getByText('Backup imported successfully.',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['epa','learn/epa-core','learn/epa-type1','learn/epa-type2','learn/epa-type3','practice','progress','results','resources']){
  await page.goto(base+'/#'+route);await page.locator('main h1').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mobile overflow at ${route}`);
  if(route==='epa')await page.screenshot({path:'/tmp/epa-learning-mobile.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);
 await browser.close();console.log('EPA browser smoke passed: 4 lessons, 25-question quiz, 50/100-question paths, section targets, resume, timer configuration, C-20 progress preservation, backup/import, 9 mobile routes.');
})().catch(e=>{console.error(e);process.exit(1);});
