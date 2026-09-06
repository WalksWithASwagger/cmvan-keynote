import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { admission, normalizedSize, stripPngMetadata } from '../tests/fixtures/studio-image/policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const valid = { type: 'image/png', size: 1024, width: 2400, height: 1600 };
assert.equal(admission(valid), null);
for (const change of [{ type:'image/svg+xml' },{size:0},{size:8*1024*1024+1},{width:40000,height:40000},{width:0},{width:6001},{width:5000,height:3000}]) assert.ok(admission({...valid,...change}));
assert.equal(admission({...valid,size:8*1024*1024,width:4000,height:3000}),null);
assert.deepEqual(normalizedSize(2400,1600),[1600,1067]);
assert.deepEqual(normalizedSize(1600,2400),[1067,1600]);
assert.deepEqual(normalizedSize(100,50),[100,50]);
const chunk=new Uint8Array([0,0,0,0,101,88,73,102,0,0,0,0]);
assert.equal(stripPngMetadata(new Uint8Array([...new Uint8Array(8),...chunk])).length,8);
assert.throws(()=>stripPngMetadata(new Uint8Array(9)),/Truncated/);
console.log('PASS image admission boundaries and aspect-preserving normalization (experimental policy, not a production decoder).');
const args=process.argv.slice(2);
if(args.includes('--check')) process.exit(0);
const option=name=>args[args.indexOf(name)+1];
if(!args.includes('--playwright')||!args.includes('--renderer')||!args.includes('--output')) throw Error('Browser run requires --playwright <installed module path> --renderer <html-to-image 1.11.13 JS path> --output <outside-repo directory>; or use --check.');
const {chromium,webkit}=createRequire(import.meta.url)(path.resolve(option('--playwright')));
const output=path.resolve(option('--output'));assert.ok(!output.startsWith(root),'Keep browser artifacts outside the repository.');await mkdir(output,{recursive:true});
const renderer=await readFile(option('--renderer'),'utf8');
const server=createServer(async(req,res)=>{try{const filename=req.url==='/'?'experiment.html':req.url.slice(1);if(!['experiment.html','policy.mjs'].includes(filename)){res.writeHead(404).end();return;}res.setHeader('Content-Type',filename.endsWith('.mjs')?'text/javascript':'text/html');res.end(await readFile(path.join(root,'tests/fixtures/studio-image',filename)));}catch{res.writeHead(500).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={realMobile:'unavailable',printDialog:'unavailable (headless); print-media screenshots and Chromium PDF only',browsers:[]};
try{
 for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
  let browser;
  try{
   browser=await type.launch({headless:true});
   for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.runExperiment);await page.addScriptTag({content:renderer});
    const fixtures=await page.evaluate(()=>window.runExperiment());
    assert.deepEqual(fixtures[0].source,[2400,1600]);assert.deepEqual(fixtures[1].source,[1600,2400]);assert.equal(fixtures[2].pixel[3],0);
    assert.ok(fixtures[3].rejected);assert.ok(fixtures[4].rejected&&!fixtures[4].decoded);
    for(const fixture of fixtures.filter(f=>f.chunks)) assert.ok(!fixture.chunks.some(c=>['eXIf','tEXt','iTXt','zTXt'].includes(c)));
    const png=await page.evaluate(()=>window.renderEdition());assert.ok(!png.failed,`Normal renderer failed: ${png.error}`);
    await writeFile(path.join(output,`${name}-${width}.png`),Buffer.from(png.png.split(',')[1],'base64'));
    delete png.png;
    if(name==='chromium')assert.equal(png.imagePresent,true,'Chromium exported a blank image');
    for(const mode of ['missing','throwing']){const failure=await page.evaluate(mode=>window.renderEdition(mode),mode);assert.ok(failure.failed&&failure.text.length>1000);}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.emulateMedia({media:'print'});await page.screenshot({path:path.join(output,`${name}-${width}-print.png`),fullPage:true});
    if(name==='chromium')await page.pdf({path:path.join(output,`${name}-${width}.pdf`),format:'A4',printBackground:true});
    assert.deepEqual(errors,[]);report.browsers.push({name,version:browser.version(),viewport:width,fixtures,png,fallback:'missing and throwing renderer passed',print:'media screenshot',errors});await page.close();
   }
  }finally{await browser?.close();}
 }
}finally{server.close();report.recommendation=report.browsers.length===4&&report.browsers.every(b=>b.png.imagePresent)?'Browser PNG probes passed; mobile release remains unverified':'NO-GO: image PNG export is not reliable across tested browsers';await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
