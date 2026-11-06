'use strict';
/** Generate a read-only static snapshot from the current official Bot API Markdown. */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const url = 'https://core.telegram.org/bots/api.md';
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 20);
const cleanTitle = value => value.replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_~]/g, '').trim();
const slug = value => value.toLowerCase().replace(/&[a-z]+;/g,'').replace(/[^a-z0-9\u4e00-\u9fff]+/g,'-').replace(/^-|-$/g,'') || 'section';
const methodPrefix = /^(get|set|send|edit|delete|answer|forward|copy|ban|unban|restrict|promote|export|create|close|reopen|stop|logOut|approve|decline|pin|unpin|leave|kick|refund|verify|remove|replace|save|read|post|transfer|upgrade|convert|revoke|gift)/;
function classify(title) {
  if (/^[a-z][A-Za-z0-9]{2,}$/.test(title) && methodPrefix.test(title)) return 'method';
  if (/^[A-Z][A-Za-z0-9]{2,}$/.test(title) && !/^(Telegram|BotAPI|HTTP|HTTPS|API)$/.test(title)) return 'type';
  return 'guide';
}
function splitMarkdown(markdown) {
 const lines = markdown.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
 const heads = []; let fence = null;
 for(let i=0;i<lines.length;i++){
   const t=lines[i]; const m=t.match(/^\s*(```+|~~~+)/);
   if(m){if(!fence)fence=m[1][0];else if(fence===m[1][0])fence=null;continue;}
   if(fence)continue;
   const h=t.match(/^(#{2,5})\s+(.+?)\s*#*\s*$/);
   if(h)heads.push({line:i,level:h[1].length,title:cleanTitle(h[2])});
 }
 if(heads.length<100)throw new Error(`Unexpected number of sections: ${heads.length}`);
 const ids=new Set();const sections=[];
 if(heads[0].line>0){const intro=lines.slice(0,heads[0].line).join('\n').trim();if(intro.length>60)sections.push({title:'Introduction',id:'introduction',kind:'guide',level:2,body:intro,hash:hash('Introduction\n'+intro),originalUrl:'https://core.telegram.org/bots/api'});}
 for(let i=0;i<heads.length;i++){
    const h=heads[i];const body=lines.slice(h.line+1,heads[i+1]?.line??lines.length).join('\n').trim();
    let id=slug(h.title);if(ids.has(id)){let n=2;while(ids.has(`${id}-${n}`))n++;id=`${id}-${n}`;}ids.add(id);
    sections.push({id,title:h.title,kind:classify(h.title),level:h.level,body,hash:hash(h.title+'\n'+body),originalUrl:`https://core.telegram.org/bots/api#${slug(h.title)}`});
 }
 return sections;
}
async function main(){
 const response=await fetch(url,{signal:AbortSignal.timeout(90000),headers:{'user-agent':'Telegram-Bot-API-CN-Docs/1.0 (GitHub Pages build)'}});
 if(!response.ok)throw new Error(`Official document HTTP ${response.status}`);
 const markdown=await response.text();if(markdown.length<50000)throw new Error(`Official Markdown unexpectedly short (${markdown.length} chars)`);
 const sections=splitMarkdown(markdown);
 const notes=JSON.parse(fs.readFileSync(path.join(root,'content','notes.json'),'utf8'));
 const matched = new Set();
 for(const s of sections){const note=notes[s.title];if(note){s.translation={from:'curated',text:note,originalHash:s.hash};matched.add(s.title)}}
 const v=markdown.match(/Bot\s*API\s*(\d+\.\d+)/i)?.[1] || '未知';
 const data={source:url,demo:false,syncTime:new Date().toISOString(),version:v,sourceHash:hash(markdown),sections};
 fs.mkdirSync(path.join(dist,'data'),{recursive:true});
 fs.cpSync(path.join(root,'public'),dist,{recursive:true});
 fs.writeFileSync(path.join(dist,'data','docs.json'), JSON.stringify(data));
 fs.writeFileSync(path.join(dist,'.nojekyll'),'');
 console.log(`Official Bot API ${v}; ${markdown.length} chars; ${sections.length} sections; ${matched.size} Chinese summaries. Unmatched notes: ${Object.keys(notes).filter(k=>!matched.has(k)).join(', ')}`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
