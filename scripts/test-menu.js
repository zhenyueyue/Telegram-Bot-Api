'use strict';
// Dependency-free checks: GitHub Actions validates the menu during publication.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {translate}=require('../public/menu-translations.js');
const cases={
  sendGift:'发送礼物',
  getChatMemberCount:'获取聊天成员数量',
  getMyDefaultAdministratorRights:'获取我的默认管理员权限',
  setWebhook:'设置Webhook',
  sendPaidMedia:'发送付费媒体',
  InlineQueryResultPhoto:'内联查询结果图片',
  ChatBoostSourcePremium:'会员助力来源',
  InputPaidMediaPhoto:'待发送付费图片',
  StickerSet:'贴纸包',
  BusinessConnection:'商家账号连接'
};
for(const [en,zh] of Object.entries(cases)){
  assert.equal(translate(en,'method'),zh,'Incorrect bilingual label for '+en);
}
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/typography.css'),'utf8');
assert.match(html,/menu-translations\.js/);
assert.match(app,/nav-name-cn/);
assert.match(css,/\.nav-item-bilingual \.nav-name-cn/);
const dataFile=path.join(__dirname,'../dist/data/docs.json');
if(fs.existsSync(dataFile)){
  const docs=JSON.parse(fs.readFileSync(dataFile,'utf8'));
  assert.ok(docs.sections.length>400,'Expected full official Telegram Bot API index');
  const blank=docs.sections.filter(x=>!translate(x.title,x.kind));
  const hasCN=docs.sections.filter(x=>!!translate(x.title,x.kind));
  console.log('Bilingual generated glosses:',hasCN.length,'/',docs.sections.length,'unmapped:',blank.length);
  if(blank.length)console.log('Unmapped examples:',blank.slice(0,35).map(x=>x.title).join(', '));
  assert.ok(blank.length<25,'Too many official sections lack any Chinese gloss');
}

const curated=require('../public/menu-curated.js');
const vm=require('node:vm');
assert.match(html,/menu-curated\.js\?v=/);
assert.match(html,/markdown-cleanup\.js\?v=/);
assert.match(app,/BotApiCuratedCN\?\.translate/);
if(fs.existsSync(dataFile)){
  const docs=JSON.parse(fs.readFileSync(dataFile,'utf8'));
  const namesBlock=app.match(/const NAMES = (\{[\s\S]*?\n\});/);
  assert.ok(namesBlock,'Previous navigation overrides must be readable for comparison');
  const oldNames=vm.runInNewContext('('+namesBlock[1]+')');
  const keys=Object.keys(curated.labels);
  assert.equal(keys.length,644,'Every documented chapter must have an explicit curated title');
  assert.equal(docs.sections.length,644,'Expected Bot API 10.4 document coverage');
  const seen=new Set(docs.sections.map(s=>s.title));
  assert.equal(seen.size,644,'Expected unique official chapter titles');
  const missing=docs.sections.filter(s=>!curated.translate(s.title));
  const stale=keys.filter(k=>!seen.has(k));
  assert.deepEqual(missing.map(s=>s.title),[],'Missing manually curated labels');
  assert.deepEqual(stale,[],'Curated labels must match the official source index');
  const invalid=docs.sections.filter(s=>/[A-Za-z]{3,}/.test(
    curated.translate(s.title).replace(/Bot API|Webhook|Telegram/g,'')));
  assert.deepEqual(invalid.map(s=>s.title),[],'Untranslated English fragments in navigation');
  const diff=docs.sections.filter(s=>{
    const old=oldNames[s.title]||translate(s.title,s.kind)||'中文释义待补充';
    return old!==curated.translate(s.title);
  });
  const kinds=docs.sections.reduce((m,s)=>(m[s.kind]=(m[s.kind]||0)+1,m),{});
  assert.equal(kinds.guide,23);assert.equal(kinds.method,193);assert.equal(kinds.type,428);
  const required={
    'Do I need a Local Bot API Server':'是否需要本地 Bot API 服务端',
    logOut:'登出 / 退出登录',sendLivePhoto:'发送动态照片',
    editMessageLiveLocation:'编辑消息实时位置',
    RevenueWithdrawalStateSucceeded:'收益提现成功状态',
    TransactionPartnerUser:'用户交易对方',
    'Inline mode objects':'内联模式对象',
    'Making requests when getting updates':'获取更新时发送请求',
    'Determining list of commands':'确定机器人命令列表',
    'Sending files':'发送文件',unpinAllChatMessages:'取消置顶所有聊天消息'
  };
  for(const [key,label] of Object.entries(required))assert.equal(curated.translate(key),label);
  console.log('Audited chapter headings: 644; curated label changes:',diff.length);
  console.log('Sample changes:',diff.slice(0,20).map(s=>s.title+': '+(oldNames[s.title]||translate(s.title,s.kind))+' => '+curated.translate(s.title)).join(' | '));
}

console.log('Bilingual navigation: PASS');
