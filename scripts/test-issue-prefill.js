'use strict';
const fs=require('node:fs');
const docs=JSON.parse(fs.readFileSync('dist/data/docs.json','utf8'));
const LIMIT=2800;
const base='https://github.com/zhenyueyue/Telegram-Bot-Api/issues/new';
const site='https://zhenyueyue.github.io/Telegram-Bot-Api/';
const cp=(s,n)=>Array.from(String(s||'')).slice(0,n).join('');
function build(s,mode){
  const title='翻译修改建议：'+s.title;
  const body=[
    '## 章节信息',
    '- 英文名称：'+s.title,
    '- 中文标题：'+s.title,
    '- 文档站链接：'+site+'#'+encodeURIComponent(s.id),
    '- Telegram 官方英文源链接：'+(s.originalUrl||'https://core.telegram.org/bots/api#'+encodeURIComponent(s.id)),
    '',
    '## 英文原文',
    mode==='full'?(s.body||''):'（章节较长，以下为开头摘录；完整原文请查看官方源链接。）\n\n'+cp(s.body,120),
  ];
  if(mode==='full')body.push('','## 当前中文翻译',s.translation?.text||'（该章节目前没有已发布的中文译文。）');
  body.push('','## 问题与建议修改','');
  return base+'?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body.join('\n'));
}
for(const id of ['getMe','Message','sendMessage']){
 const s=docs.sections.find(x=>x.id.toLowerCase()===id.toLowerCase());
 if(!s)throw new Error('Missing section '+id);
 const full=build(s,'full');
 const compact=build(s,'compact');
 const selected=full.length<=LIMIT?full:compact;
 console.log(id+': full='+full.length+' chars; selected='+selected.length+' chars; mode='+(full.length<=LIMIT?'full':'compact'));
 if(selected.length>LIMIT)throw new Error(id+' exceeds '+LIMIT);
 if(id.toLowerCase()==='getme'&&full.length>LIMIT)throw new Error('getMe full prefill no longer fits; adjust target');
 if(id.toLowerCase()!=='getme'&&full.length>LIMIT&&s.translation?.text&&selected.includes(encodeURIComponent(s.translation.text).slice(0,80)))throw new Error(id+' unexpectedly includes long translation');
}
