'use strict';
/* Diagnose source/Chinese field coverage without trusting translation status. */
const fs=require('node:fs');
const docs=JSON.parse(fs.readFileSync('dist/data/docs.json','utf8'));
const audits=[];
function fields(md){
 const result=[];
 for(const line of md.split('\n')){
   const m=line.trim().match(/^\|\s*(?:\x60)?([a-z][a-z0-9_]*)(?:\x60)?\s*\|/);
   if(m && !['parameter','type','field','required','description'].includes(m[1]))result.push(m[1]);
 }
 return result;
}
for(const s of docs.sections){
 if(s.translation?.from!=='full')continue;
 const original=fields(s.body),translated=fields(s.translation.text);
 const missing=original.filter(k=>!translated.includes(k));
 const unexpected=translated.filter(k=>!original.includes(k));
 if(missing.length||unexpected.length)audits.push({section:s.title,required:original.length,missing,unexpected});
}
console.log('Full translations audited:',docs.sections.filter(s=>s.translation?.from==='full').length,
            'table field mismatches:',audits.length);
for(const a of audits)console.log(JSON.stringify(a));
