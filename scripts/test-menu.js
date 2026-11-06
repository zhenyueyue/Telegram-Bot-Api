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
console.log('Bilingual navigation: PASS');
