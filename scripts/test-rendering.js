'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const marked=require('../public/vendor/marked.js');
const docs=JSON.parse(fs.readFileSync('dist/data/docs.json','utf8'));
const s=docs.sections.find(s=>s.title==='getFile');
assert.ok(s,'getFile missing from official docs');
assert.equal(s.translation?.from,'full','getFile should be a verified full translation');
for(const field of ['20 MB','1 小时','file_id','file_path','MIME','String','getFile']){
  assert.ok(s.translation.text.includes(field),'Missing translated detail: '+field);
}
const en=marked.parse(s.body,{gfm:true});
const cn=marked.parse(s.translation.text,{gfm:true});
for(const markup of [en,cn]){
  assert.match(markup,/<table>/,'API parameter table must be rendered');
  assert.match(markup,/<th/,'table headers must render');
  assert.match(markup,/<td/,'table rows must render');
  assert.match(markup,/<code>/,'inline API parameter/code must render');
}
assert.match(cn,/<h2/,'Chinese section headings must render');
assert.match(cn,/file_id/);
const app=fs.readFileSync('public/app.js','utf8');
assert.match(app,/markdown-table-scroll/);
assert.match(app,/中文重点摘要，并非逐段翻译/);
const css=fs.readFileSync('public/markdown-fidelity.css','utf8');
assert.match(css,/display:table/);
assert.match(css,/\.original-reference/);
new Function(app);

const cleanup=require('../public/markdown-cleanup.js');
assert.equal(docs.sections.length,611,'No chapters may be removed');
const full=docs.sections.filter(s=>s.translation?.from==='full');
assert.equal(full.length,611,'Every Bot API 10.3 chapter must retain its full translation');
const leakedNames=[],repairedNames=[];
const visibleMarkup=html=>String(html)
  .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/g,'')
  .replace(/<code\b[^>]*>[\s\S]*?<\/code>/g,'');
const residue=/\*\*[^*\n]{1,350}\*\*|__[^_\n]{1,350}__|~~[^~\n]{1,350}~~/;
for(const section of full){
  const before=marked.parse(section.translation.text,{gfm:true});
  const after=cleanup.repair(before);
  if(residue.test(visibleMarkup(before)))repairedNames.push(section.title);
  if(residue.test(visibleMarkup(after)))leakedNames.push(section.title);
}
assert.deepEqual(leakedNames,[],'Visible unrendered emphasis exists outside code examples');
for(const name of ['banChatMember','Sticker','sendLocation','restrictChatMember']){
  assert.ok(repairedNames.includes(name),'Expected regression sample '+name);
}
const ban=full.find(s=>s.title==='banChatMember');
const sticker=full.find(s=>s.title==='Sticker');
assert.match(cleanup.repair(marked.parse(ban.translation.text)),/<strong>始终为 <code>True<\/code><\/strong>/);
assert.match(cleanup.repair(marked.parse(sticker.translation.text)),/<strong>\.WEBP 或 \.JPG<\/strong>/);
console.log('Markdown emphasis scanned: 611 full chapters; repaired:',repairedNames.length,
            'chapters:',repairedNames.join(', '),'; visible leftovers:',leakedNames.length);

console.log('PASS: Full getFile Chinese translation matches key English requirements.');
console.log('PASS: Markdown tables, code, and headings parse for both languages.');
console.log('PASS: summary-only chapters retain the complete English original in Chinese mode.');
