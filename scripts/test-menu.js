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
const layoutCss=fs.readFileSync(path.join(__dirname,'../public/styles.css'),'utf8');
assert.match(html,/menu-translations\.js/);
assert.match(app,/nav-name-cn/);
assert.match(css,/\.nav-item-bilingual \.nav-name-cn/);
assert.ok(app.includes("官方文档 · Bot API ${S.docs.version || '—'}"),'Sidebar version must come from generated docs data');
assert.ok(!app.includes("$('versionTag')"),'Removed topbar version badge must not be referenced by app code');
assert.ok(!app.includes('versionTag'),'No stale topbar version badge references should remain');
assert.ok(!/getElementById\(['"](?:refreshButton|syncButton|refreshDocsButton)['"]\)/.test(app),'Removed refresh-online-docs controls must not be referenced');
const htmlIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const appDomRefs = [...app.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
for (const id of appDomRefs) assert.ok(htmlIds.has(id),'App references missing DOM element: '+id);
assert.ok(!html.includes('topbar-brand-mark'),'Freeform topbar branding should be reverted');
assert.ok(html.includes('<span class="crumb-root">Telegram Bot API</span>'),'Flat topbar breadcrumb should be restored');
assert.ok(html.includes('title="GitHub 仓库" aria-label="GitHub 仓库"'),'GitHub should be an icon link in the top action group');
assert.ok(html.includes('viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor"'),'GitHub icon should use currentColor');
assert.ok(!html.includes('id="versionTag"'),'Topbar version badge should be removed');
assert.ok(!html.includes('class="version-chip"'),'Topbar version badge styling hook should be absent');
assert.ok(layoutCss.includes('.topbar{height:72px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 43px;border-bottom:1px solid var(--border);gap:18px}'),'Original topbar dimensions and divider should be restored');
assert.ok(layoutCss.includes('.mode-control{display:flex;gap:3px;border:1px solid #e9eef4;background:#f5f8fb;border-radius:9px;padding:3px}'),'Original reading view switch should be restored');
assert.ok(layoutCss.includes('.mode-control button.active{color:#238ad6;background:#fff;box-shadow:0 1px 4px rgba(30,61,95,.09)}'),'Original selected-view treatment should be restored');
assert.ok(layoutCss.includes('.small-action{display:inline-flex;align-items:center;gap:7px;border:1px solid #e9eef4;background:#fff;'),'Original article action buttons should be restored');
assert.ok(layoutCss.includes('.topbar{height:60px;padding:0 18px}'),'Original mobile topbar dimensions should be restored');

assert.match(app,/reader-panel/,'All language panels should share the reader panel structure');
assert.ok(layoutCss.includes('.reader-panel{border:0;background:transparent;border-radius:0;overflow:visible;box-shadow:none}'),'Every reading panel outer border must be removed');
assert.ok(layoutCss.includes('.reader-panel .panel-header{height:auto;padding:0 0 12px;border:0;background:transparent}'),'Every reading panel header must be plain and unboxed');
assert.ok(layoutCss.includes('.reader-panel .panel-body,\\n.reader-columns:not(.compare) .reader-panel .panel-body{padding:0}') || layoutCss.includes('.reader-panel .panel-body,\n.reader-columns:not(.compare) .reader-panel .panel-body{padding:0}'),'Every reading panel body must be flush with the page');
assert.ok(app.includes('function scrollActiveNavIntoView()'),'Initial render must restore active navigation position');
assert.ok(app.includes('function renderAll() { renderMeta(); renderNav(); renderMain(); updateTopbar(); scrollActiveNavIntoView(); }'),'Document load must scroll the active chapter into view');
for (const obsolete of ['function sync(','syncButton','modalSync','data-sync','dataset.sync']) {
  assert.ok(!app.includes(obsolete),'Obsolete refresh logic remains: '+obsolete);
}
for (const obsolete of ['刷新在线文档','id="syncButton"','id="modalSync"','data-sync=']) {
  assert.ok(!html.includes(obsolete),'Obsolete refresh control remains: '+obsolete);
}
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
