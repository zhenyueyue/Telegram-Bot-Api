'use strict';
/**
 * Download the *split* machine-readable Telegram Bot API docs.
 * The index (/bots/api.md) links to individual /bots/api/methods/*.md files;
 * /bots/api/types.md links to /bots/api/types/*.md.
 * This is a static build. Nothing is translated or fetched by the visiting browser.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const baseUrl = 'https://core.telegram.org';
const rootPath = '/bots/api.md';
const typeIndexPath = '/bots/api/types.md';
const root = path.resolve(__dirname, '..');
const dist = path.join(root,'dist');
const digest = s => crypto.createHash('sha256').update(s).digest('hex').slice(0,20);
const clean = s => s.replace(/<[^>]+>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[`*_~]/g,'').trim();
const slug = s => s.toLowerCase().replace(/&[a-z]+;/g,'').replace(/[^a-z0-9\u4e00-\u9fff]+/g,'-').replace(/^-|-$/g,'')||'section';
const isMethod = s => /^(?:get|set|send|edit|delete|answer|forward|copy|ban|unban|restrict|promote|export|create|close|reopen|stop|logOut|approve|decline|pin|unpin|leave|kick|refund|verify|remove|replace|save|read|post|transfer|upgrade|convert|revoke|gift)[A-Z]/.test(s) || ['getMe','getUpdates','logOut','close'].includes(s);
const kindOf = s => isMethod(s)?'method':/^[A-Z][A-Za-z0-9]{2,}$/.test(s)?'type':'guide';
function markdownLinks(md){
  const links=[];
  const re=/\[([^\]]+)\]\((\/bots\/api\/(?:methods|types)\/[a-z0-9_./-]+\.md)(?:#[^)]*)?\)/gi;
  let m;
  while((m=re.exec(md))){links.push({title:clean(m[1]),path:m[2]});}
  return links;
}
function headings(md){
  const lines=md.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
  const out=[];let fence=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];const f=line.match(/^\s*(```+|~~~+)/);
    if(f){if(!fence)fence=f[1][0];else if(fence===f[1][0])fence=null;continue;}
    if(fence)continue;
    const h=line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if(h)out.push({line:i,level:h[1].length,title:clean(h[2])});
  }
  return {lines,headers:out};
}
function guideSections(md){
  const {lines,headers:raw}=headings(md);
  const hs=raw.filter(h=>h.level>=2 && h.level<=4);
  let sections=[];
  if(hs.length && hs[0].line>0){
    const intro=lines.slice(0,hs[0].line).join('\n').trim();
    if(intro.length>60)sections.push({title:'Introduction',kind:'guide',level:2,body:intro});
  }
  for(let i=0;i<hs.length;i++){
    const h=hs[i];const end=hs[i+1]?.line??lines.length;
    const body=lines.slice(h.line+1,end).join('\n').trim();
    if(body.length>45)sections.push({title:h.title,kind:kindOf(h.title),level:h.level,body});
  }
  return sections;
}
// Telegram's split Markdown currently uses a one-cell underline even for
// multi-column parameter tables, e.g. "|Parameter|Type|Required|Description|"
// followed by "|-----------|". Repair this upstream source variant so all
// official GFM tables render normally instead of leaking raw pipe syntax.
function repairTelegramTables(markdown){
 const lines=markdown.split('\n');
 for(let i=1;i<lines.length-1;i++){
   const separator=lines[i].trim();
   if(!/^\|\s*:?-{3,}:?\s*\|$/.test(separator))continue;
   const heading=lines[i-1].trim();
   const row=lines[i+1].trim();
   if(!heading.startsWith('|')||!heading.endsWith('|')||!row.startsWith('|')||!row.endsWith('|'))continue;
   const count=line=>line.slice(1,-1).split('|').length;
   const columns=count(heading);
   if(columns<2||count(row)!==columns)continue;
   lines[i]='| '+Array(columns).fill('---').join(' | ')+' |';
 }
 return lines.join('\n');
}
function normalizeBody(md,title){
  let result=md.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trim();
  const l=result.split('\n');
  if(l.length && /^#{1,6}\s+/.test(l[0]) && clean(l[0].replace(/^#{1,6}\s+/,''))===title){l.shift();result=l.join('\n').trim();}
  // The split Markdown includes a source-navigation preamble not present in
  // the official reader. Keep the body content without that extra banner.
  result=result.replace(/^>\s*Part of the \[Telegram Bot API\]\([^\n]+\n*/i,'');
  result=repairTelegramTables(result);
  // GitHub Pages uses a hash router. Redirect inter-reference Markdown links to it.
  return result.replace(/\]\(\/bots\/api\/(?:methods|types)\/([a-z0-9_-]+)\.md(?:#[^)]*)?\)/gi,(_,name)=>`](#${name.toLowerCase()})`);
}
async function fetchMarkdown(p){
 const headers={'user-agent':'Telegram-Bot-API-CN-Reader/2.0',accept:'text/markdown'};
 let err;
 for(let n=0;n<3;n++){
   try{
     const response=await fetch(baseUrl+p,{headers,signal:AbortSignal.timeout(40000)});
     if(!response.ok)throw new Error(`HTTP ${response.status}`);
     const data=await response.text();
     if(data.length<40)throw new Error('empty Markdown');
     return data;
   }catch(e){err=e;if(n<2)await new Promise(ok=>setTimeout(ok,500*(n+1)));}
 }
 throw new Error(`${p}: ${err.message}`);
}
async function main(){
 const index=await fetchMarkdown(rootPath);
 const typesIndex=await fetchMarkdown(typeIndexPath);
 console.log('Official index length:',index.length,'; types index length:',typesIndex.length);
 if(index.length<10000 || typesIndex.length<1000)throw new Error('Telegram documentation indexes incomplete');
 const guides=guideSections(index).filter(x=>x.kind==='guide');
 const typesFromIndex=guideSections(typesIndex).filter(x=>x.kind==='type');
 const links=[...markdownLinks(index),...markdownLinks(typesIndex)];
 const tasks=[];const seen=new Set();
 const enqueue = item => {if(seen.has(item.path))return;seen.add(item.path);tasks.push(item);};
 links.forEach(enqueue);
 console.log('Discovered linked Markdown pages:',tasks.length);
 if(tasks.length<140)throw new Error('Incomplete official Markdown index');
 const files=[];const failures=[];
 let cursor=0;
 async function worker(){
   while(cursor<tasks.length){
     const t=tasks[cursor++];
     try{
       const md=await fetchMarkdown(t.path);
       files.push({...t,md});
       // Some method and type descriptions link to additional previously unindexed pages.
       if(tasks.length<1200)for(const l of markdownLinks(md))enqueue(l);
     }catch(e){failures.push(e.message);}
   }
 }
 await Promise.all(Array.from({length:10},()=>worker()));
 console.log('Fetched',files.length,'pages; failed',failures.length);
 if(failures.length)console.warn('Missing pages:',failures.slice(0,20).join(' | '));
 const sections=[];const used=new Set();
 const insert=(x)=>{
   if(!x.title || !x.body?.trim())return;
   let id=slug(x.title);if(used.has(id)){let i=2;while(used.has(`${id}-${i}`))i++;id=`${id}-${i}`;}
   used.add(id);
   sections.push({...x,id,hash:digest(x.title+'\n'+x.body),originalUrl:`https://core.telegram.org/bots/api#${slug(x.title)}`});
 };
 guides.forEach(x=>insert({...x,body:normalizeBody(x.body,x.title)}));
 typesFromIndex.forEach(x=>insert({...x,body:normalizeBody(x.body,x.title)}));
 // Preserve ordering of official index listings even with parallel network requests.
 const fileByPath=new Map(files.map(f=>[f.path,f]));
 for(const t of tasks){
   const f=fileByPath.get(t.path);if(!f)continue;
   const title=(headings(f.md).headers.find(h=>h.level===1)?.title||t.title).trim();
   const pathKind=t.path.includes('/methods/')?'method':'type';
   insert({title,kind:pathKind,level:4,body:normalizeBody(f.md,title)});
 }
 const count={method:0,type:0,guide:0};sections.forEach(s=>count[s.kind]++);
 console.log('Section count:',count);
 if(count.method<130||count.type<100||sections.length<300)throw new Error(`Incomplete official API data (${sections.length} sections)`);
 const notes=JSON.parse(fs.readFileSync(path.join(root,'content','notes.json'),'utf8'));
 const usedNotes=new Set();
 for(const s of sections){
   const note=notes[s.title];if(note){s.translation={from:'curated',text:note,originalHash:s.hash};usedNotes.add(s.title)}
 }
 const fullTranslations=JSON.parse(fs.readFileSync(path.join(root,'content','full-translations.json'),'utf8'));
 let fullCount=0;
 for(const s of sections){
   const entry=fullTranslations[s.title];
   if(!entry)continue;
   const source=s.body.replace(/\s+/g,' ').toLowerCase();
   const missing=(entry.requiredSourceFragments||[]).filter(part=>!source.includes(part.toLowerCase()));
   if(missing.length){
     console.warn('Full translation not applied: official content changed:',s.title,missing);
     continue;
   }
   if(!entry.text?.trim() || !/\|[^\n]+\|/.test(entry.text)){
     throw new Error('Incomplete full translation structure: '+s.title);
   }
   s.translation={from:'full',text:entry.text.trim(),version:entry.version||null,originalHash:s.hash};
   fullCount++;
 }
 console.log('Full translations matched source:',fullCount);
 let version=index.match(/Bot\s*API\s*(\d+\.\d+)/i)?.[1]||'未知';
 if(version==='未知'){
   try {
     const response=await fetch('https://core.telegram.org/bots/api-changelog',{signal:AbortSignal.timeout(30000)});
     if(response.ok){const page=await response.text();version=page.match(/Bot\s*API\s*(\d+\.\d+)/i)?.[1]||'未知';}
   }catch(e){console.warn('Version lookup unavailable:',e.message)}
 }
 const doc={source:baseUrl+rootPath,demo:false,syncTime:new Date().toISOString(),version,sourceHash:digest(index+typesIndex+files.length),sections};
 fs.mkdirSync(path.join(dist,'data'),{recursive:true});
 fs.cpSync(path.join(root,'public'),dist,{recursive:true});
 fs.writeFileSync(path.join(dist,'data','docs.json'),JSON.stringify(doc));
 fs.writeFileSync(path.join(dist,'.nojekyll'),'');
 console.log(`SUCCESS Bot API ${version}; sections ${sections.length}; Chinese full ${fullCount}; summaries ${usedNotes.size}/${Object.keys(notes).length}; output ${fs.statSync(path.join(dist,'data','docs.json')).size} bytes`);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={markdownLinks,headings,guideSections,normalizeBody,repairTelegramTables,kindOf};