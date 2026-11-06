(() => {
'use strict';

const $ = id => document.getElementById(id);
const S = {
  docs: null, meta: null, active: 'home', filter: 'all', query: '',
  lang: localStorage.getItem('botcn-language') || 'zh',
  favorites: readLocal('botcn-favorites', []),
  recent: readLocal('botcn-recent', []),
  translating: new Set(), errors: {}, sync: false, navLimit: 900,
  batchPoll: null, baseline: {},
};
const NAMES = {
  getMe:'获取机器人信息', getUpdates:'接收更新', setWebhook:'设置 Webhook', deleteWebhook:'删除 Webhook', getWebhookInfo:'获取 Webhook 信息',
  sendMessage:'发送文本消息', sendPhoto:'发送图片', sendVideo:'发送视频', sendAnimation:'发送动图', sendAudio:'发送音频', sendDocument:'发送文件', sendVoice:'发送语音',
  sendMediaGroup:'发送媒体组', sendPoll:'发送投票', sendDice:'发送骰子', sendLocation:'发送位置', sendContact:'发送联系人', sendChatAction:'发送聊天动作',
  sendSticker:'发送贴纸', sendRichMessage:'发送富消息', sendRichMessageDraft:'发送富消息草稿', sendMessageDraft:'发送消息草稿',
  editMessageText:'编辑消息文本', editMessageCaption:'编辑消息说明', editMessageMedia:'编辑消息媒体', editMessageReplyMarkup:'编辑消息键盘',
  deleteMessage:'删除消息', deleteMessages:'批量删除消息', forwardMessage:'转发消息', copyMessage:'复制消息',
  answerCallbackQuery:'响应按钮回调', answerInlineQuery:'响应内联查询',
  banChatMember:'封禁群成员', unbanChatMember:'解除封禁', getChat:'获取聊天信息', getChatMember:'获取群成员',
  restrictChatMember:'限制成员权限', promoteChatMember:'提升成员权限', setMyCommands:'设置机器人命令', getMyCommands:'查询机器人命令',
  setChatPermissions:'设置聊天权限', createChatInviteLink:'创建邀请链接', sendInvoice:'发送付款账单',
  refundStarPayment:'退还星币付款', getStarTransactions:'获取星币交易',
  Update:'更新对象', User:'用户对象', Chat:'聊天对象', Message:'消息对象',
  MessageEntity:'消息实体', InlineKeyboardMarkup:'内联键盘', InlineKeyboardButton:'内联按钮',
  ReplyKeyboardMarkup:'回复键盘', CallbackQuery:'按钮回调对象', ChatMember:'聊天成员对象',
  WebAppInfo:'小程序信息', WebApp:'小程序', InputFile:'上传文件',
  'Making requests':'发起 API 请求', 'Authorizing your bot':'机器人身份认证',
  'Getting updates':'接收更新', 'Available methods':'可用方法',
  'Available types':'可用对象', 'Formatting options':'文本格式选项',
  'Using a Local Bot API Server':'使用本地 Bot API 服务端',
  'Recent changes':'近期更新', 'Inline mode':'内联模式', 'Payments':'付款',
};

function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLocal(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function attr(s) { return esc(s).replace(/`/g,'&#96;'); }
function icon(id) { return `<svg class="ic"><use href="#i-${id}"/></svg>`; }
function kindText(k) { return { method:'API 方法', type:'数据类型', guide:'开发指南' }[k] || '文档章节'; }
function kindEN(k) { return { method:'METHOD', type:'OBJECT', guide:'GUIDE' }[k] || 'REFERENCE'; }
function current() { return S.docs?.sections.find(s => s.id === S.active); }
function asTime(iso) { if (!iso) return '尚未与官方同步'; try { return new Date(iso).toLocaleString('zh-CN', {hour12:false}); } catch { return iso; } }
function nameCN(s) { return NAMES[s.title] || (s.kind === 'method' ? 'API 方法参考' : s.kind === 'type' ? '数据结构定义' : '开发指南'); }
function getUrlId() { const hash = decodeURIComponent(location.hash.replace(/^#/,'')); return hash || 'home'; }
function setHash(id) { history.pushState(null, '', `#${encodeURIComponent(id)}`); }

async function loadStaticDocs(){
  // The published docs are generated server-side by GitHub Actions. No browser API tokens.
  const r = await fetch('./data/docs.json', {cache:'no-cache'});
  if (!r.ok) throw new Error(`读取文档失败：HTTP ${r.status}`);
  const doc = await r.json();
  if (!Array.isArray(doc.sections) || doc.sections.length < 100) throw new Error('在线文档数据不完整');
  const edits = readLocal('botcn-edits', {});
  for(const s of doc.sections){
    S.baseline[s.id] = s.translation || null;
    if(edits[s.id]?.hash===s.hash) s.translation={from:'edited',text:edits[s.id].text};
  }
  return doc;
}
async function api(route){
  if(route==='docs') return loadStaticDocs();
  throw new Error('GitHub Pages 版本不需要服务器或 API Key');
}

let toastTimer;
function toast(message, error = false) {
  const el = $('toast'); el.textContent = message; el.classList.remove('hidden');
  el.classList.toggle('error', !!error); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}
function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) { button.dataset.oldText = button.innerHTML; button.disabled = true; if (busyLabel) button.textContent = busyLabel; }
  else { button.disabled = false; if (button.dataset.oldText) button.innerHTML = button.dataset.oldText; delete button.dataset.oldText; }
}

async function reloadDocs({quiet=false}={}){
  const docs = await loadStaticDocs();
  S.docs = docs;
  S.meta = {demo:false, hasKey:false, endpoint:'', model:'', translated:docs.sections.filter(s=>!!s.translation).length, total:docs.sections.length, progress:{running:false,complete:0,total:0,failed:0}};
  const wanted = getUrlId();
  if (!docs.sections.some(s => s.id === wanted)) {
    S.active = 'home';
    if (wanted !== 'home') history.replaceState(null, '', '#home');
  } else S.active = wanted;
  renderAll();
  if (!quiet) toast(`已载入 ${docs.sections.length} 个官方章节 · 版本 ${docs.version}`);
}

function renderAll() { renderMeta(); renderNav(); renderMain(); updateTopbar(); }
function renderMeta() {
  if (!S.docs || !S.meta) return;
  $('versionTag').textContent = `BOT API ${S.docs.version || '—'}`;
  $('syncLabel').textContent = S.docs.demo ? '内置预览 · 未同步全量' : `官方文档 · ${asTime(S.docs.syncTime).split(' ')[0]}`;
  document.querySelector('.status-dot').classList.toggle('demo', !!S.docs.demo);
  $('lastSyncText').textContent = asTime(S.docs.syncTime);
  const completed = S.docs.sections.filter(s => !!s.translation).length;
  $('translationCount').textContent = `${completed} / ${S.docs.sections.length} 章节有中文要点（并非完整翻译）`;
  // GitHub Pages is read-only; no API keys are needed or stored.
}
function groupsForNav() {
  const ss = S.docs.sections;
  const q = S.query.trim().toLowerCase();
  const filtered = ss.map((s, i) => ({s, i})).filter(({s}) => {
    if (S.filter !== 'all' && s.kind !== S.filter) return false;
    if (!q) return true;
    return (`${s.title} ${nameCN(s)} ${s.body} ${s.translation?.text || ''}`).toLowerCase().includes(q);
  });
  if (q) {
    filtered.sort((a,b) => {
      const rank = x => x.s.title.toLowerCase() === q ? 0 : x.s.title.toLowerCase().startsWith(q) ? 1 : nameCN(x.s).toLowerCase().includes(q) ? 2 : x.s.title.toLowerCase().includes(q) ? 3 : 4;
      return rank(a)-rank(b) || a.i-b.i;
    });
    return [{name:'搜索结果',items:filtered.map(x=>x.s),count:filtered.length}];
  }
  const items = filtered.map(x => x.s);
  const groups = [];
  if (S.filter === 'all' && S.favorites.length) {
    const fav = items.filter(s => S.favorites.includes(s.id));
    if (fav.length) groups.push({name:'已收藏', items:fav, count:fav.length});
  }
  for (const [k,label] of [['guide','开发指南'],['method','接口方法'],['type','数据类型']]) {
    const group = items.filter(s => s.kind === k);
    if (group.length) groups.push({name:label,items:group,count:group.length});
  }
  return groups;
}
function renderNav() {
  const nav = $('navigation');
  if (!S.docs) return;
  const groups = groupsForNav();
  if (!groups.length || !groups.some(g => g.items.length)) {
    nav.innerHTML = `<div class="nav-zero">没有找到匹配的章节<br>换个关键词试试</div>`; return;
  }
  let visible = 0;
  let html = '';
  for (const group of groups) {
    const items = group.items.slice(0, Math.max(0, S.navLimit-visible));
    visible += items.length;
    if (!items.length) continue;
    html += `<div class="nav-group"><div class="nav-heading"><span>${esc(group.name)}</span><span class="nav-count">${group.count}</span></div>`;
    for (const s of items) {
      const active = s.id === S.active;
      const chinese = nameCN(s);
      html += `<button class="nav-item ${active ? 'active':''}" data-go="${attr(s.id)}" title="${attr(s.title + ' · ' + chinese)}"><span class="nav-index"></span><span class="nav-name">${esc(s.title)}</span>${S.favorites.includes(s.id) ? '<em>★</em>' : ''}</button>`;
    }
    html += '</div>';
  }
  if (groups.some(g => g.count > S.navLimit)) html += `<button class="nav-item" data-load-more="1">继续显示章节...</button>`;
  nav.innerHTML = html;
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active',b.dataset.filter === S.filter));
}
function go(id, scroll = true, push = true) {
  if (!S.docs) return;
  if (id !== 'home' && !S.docs.sections.some(s => s.id === id)) return toast('未找到该章节',true);
  S.active = id;
  if (push) setHash(id);
  if (id !== 'home') {
    S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0,12);
    saveLocal('botcn-recent', S.recent);
  }
  renderNav(); renderMain(); updateTopbar(); closeSidebar();
  if (scroll) $('readingArea').scrollTop = 0;
  const activeEl = $('navigation').querySelector('.nav-item.active');
  if (activeEl && !S.query) activeEl.scrollIntoView({block:'nearest'});
}
function updateTopbar() {
  const s = current();
  $('breadcrumb').textContent = s ? s.title : '概览';
  $('copyLink').disabled = !s;
  $('favoriteButton').disabled = !s;
  $('favoriteButton').classList.toggle('selected', !!s && S.favorites.includes(s.id));
  $('openOfficial').disabled = !s;
}
function heroStat(value, label, graphic) { return `<div class="stat"><div class="stat-icon">${icon(graphic)}</div><div><strong>${esc(value)}</strong><span>${esc(label)}</span></div></div>`; }
function featured(s, graphic, palette) {
  if (!s) return '';
  return `<article class="featured" role="button" tabindex="0" data-go="${attr(s.id)}"><div class="featured-icon ${palette || ''}">${icon(graphic)}</div><span class="featured-arrow">↗</span><h3>${esc(s.title)}</h3><p>${esc(nameCN(s))}</p></article>`;
}
function overview() {
  const sections = S.docs.sections;
  const get = name => sections.find(s => s.title.toLowerCase() === name.toLowerCase());
  const topIds = ['sendMessage','getUpdates','setWebhook','InlineKeyboardMarkup','sendRichMessage','Message'];
  const featuredNodes = topIds.map((name,i) => featured(get(name), ['code','refresh','globe','box','spark','book'][i],['','violet','orange','','violet','orange'][i])).filter(Boolean).join('');
  const suggested = ['getMe','deleteMessage','editMessageText','sendPhoto','Update','Making requests','getStarTransactions','sendInvoice'].map(get).filter(Boolean).slice(0,8);
  const stats = S.docs.sections.reduce((o,s) => { o[s.kind] = (o[s.kind] || 0)+1; return o; }, {});
  return `<div class="eyebrow">ONLINE · NO SERVER · NO API KEY</div>
    <section class="hero"><h1>为开发者准备的<br><span class="accent">Telegram Bot API</span> 中文文档.</h1>
      <p class="hero-copy">完整收录 Telegram Bot API 官方英文参考；常用章节提供人工整理的中文要点，支持中英对照、搜索、收藏和分享。不需要 API Key，也不需要启动本地服务器。</p>
      <div class="hero-actions"><button class="primary-btn" data-go="${attr((get('sendMessage') || sections.find(s=>s.kind==='method') || sections[0]).id)}">开始阅读 ${icon('chevron')}</button><button class="secondary-btn" data-open-settings="1">查看文档说明 ${icon('settings')}</button></div></section>
    ${S.docs.demo ? `<div class="demo-banner"><div class="demo-copy"><strong>当前是离线预览。</strong><span> 内置少量演示章节；点击同步后读取完整官方 Bot API 文档。示例译文不是完整官方内容。</span></div><button data-sync="1">同步完整版</button></div>` : ''}
    <div class="quick-stats">${heroStat(stats.method || 0, 'API 方法', 'code')}${heroStat(stats.type || 0,'数据类型','box')}${heroStat(stats.guide || 0,'参考章节','book')}${heroStat(S.docs.version || '—','官方版本','globe')}</div>
    <div class="section-title-row"><h2>常用接口，一步直达</h2><small>FREQUENTLY USED</small></div>
    <div class="featured-grid">${featuredNodes || '<p>同步后显示常用 API。</p>'}</div>
    <div class="section-title-row"><h2>继续探索</h2><small>MORE REFERENCES</small></div>
    <div class="explore-list">${suggested.map(s => `<button class="explore-item" data-go="${attr(s.id)}"><span class="mini-icon">${icon(s.kind==='method'?'code':s.kind==='type'?'box':'book')}</span><span><strong>${esc(s.title)}</strong><small>${esc(nameCN(s))}</small></span><span class="go-icon">${icon('chevron')}</span></button>`).join('') || '<p>还没有其他章节。</p>'}</div>
    <p class="footer-tip">小技巧：按 <code>/</code> 或 <code>Ctrl + K</code> 可快速搜索文档。已发布的中文要点和官方原文可随时打开；中文未覆盖的部分保留英文。</p>`;
}
function renderMd(md, section) {
  const renderer = new marked.Renderer();
  // Avoid executing HTML returned by a translation model or supplied in a Markdown source.
  renderer.html = code => esc(code);
  let markup = marked.parse(md || '', { gfm:true, breaks:false, headerIds:false, mangle:false, renderer });
  const temp = document.createElement('div'); temp.innerHTML = markup;
  for (const a of temp.querySelectorAll('a')) {
    const href = a.getAttribute('href') || '';
    if (/^(javascript|data|vbscript):/i.test(href)) { a.removeAttribute('href'); continue; }
    if (href.startsWith('#')) {
      const id = href.slice(1).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]+/g,'-');
      if (S.docs.sections.some(s => s.id === id)) a.setAttribute('data-go',id);
      else a.setAttribute('href',`https://core.telegram.org/bots/api${href}`);
    } else if (href.startsWith('/bots/api#') || href.startsWith('https://core.telegram.org/bots/api#')) {
      const id = href.split('#').pop().toLowerCase();
      if (S.docs.sections.some(s => s.id === id)) a.setAttribute('data-go',id);
    }
    a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer');
  }
  return temp.innerHTML;
}
function panel(s, language) {
  const cn = language === 'zh';
  const data = cn ? s.translation : { text: s.body, from:'official' };
  const title = cn ? '简体中文 · 重点解读' : 'English · Official';
  const status = cn ? ({curated:'人工摘要 · 非全文', edited:'你的本地修订', preview:'示例'})[data?.from] || '暂无中文解读' : '官方原文';
  let body;
  if (cn && !data) {
    body = `<div class="not-translated"><div class="placeholder-icon">${icon('book')}</div><h3>这个章节还没有中文解读</h3><p>官方英文原文已经完整收录。中文要点由人工编写，目前尚未覆盖此章节；不会显示未经校对的机器翻译。</p><button class="primary-btn" data-language="en">${icon('external')} 查看英文原文</button></div>`;

  } else body = `${cn && data?.from==='curated' ? '<p class="summary-notice">本节为人工整理的中文重点说明，并非官方原文逐句翻译。具体参数、约束及返回值请切换英文核对。</p>' : ''}<div class="markdown">${renderMd(data?.text || '',s) || `<p>${cn ? '暂无解读':'本章节只有标题。'}</p>`}</div>`;
  return `<section class="reader-panel"><header class="panel-header"><div class="panel-title"><span class="lang-dot ${cn?'':'en'}"></span>${title}</div><span class="panel-status">${esc(status)}</span></header><div class="panel-body">${body}</div></section>`;
}
function article(s) {
  const index = S.docs.sections.indexOf(s);
  const prev = S.docs.sections[index-1], next = S.docs.sections[index+1];
  const compare = S.lang === 'both';
  return `<div class="article-top"><div class="eyebrow">BOT API / ${kindEN(s.kind)}</div><span class="article-tag">${kindText(s.kind)}</span></div>
    <div class="article-head"><h1 class="${s.kind==='guide' ? 'guide-title' : ''}">${esc(s.title)}</h1><div class="article-subtitle">${esc(nameCN(s))} <span>· ${kindText(s.kind)}参考</span></div></div>
    <div class="reading-settings"><div class="mode-control" role="tablist"><button data-language="zh" class="${S.lang==='zh'?'active':''}">简体中文</button><button data-language="both" class="${compare?'active':''}">中英对照</button><button data-language="en" class="${S.lang==='en'?'active':''}">English</button></div>
      <div class="article-tools">${s.translation ? `<button class="small-action" data-edit="1">${icon('pen')} 修订译文</button>` : ''}<button class="small-action" data-language="en">${icon('globe')} 官方原文</button></div></div>
    <div class="reader-columns ${compare?'compare':''}">${S.lang==='en' ? panel(s,'en') : S.lang==='zh' ? panel(s,'zh') : panel(s,'zh') + panel(s,'en')}</div>
    <div class="article-bottom">${prev ? `<button class="prevnext" data-go="${attr(prev.id)}"><span>← 上一章节</span><strong>${esc(prev.title)}</strong></button>` : '<span></span>'}${next ? `<button class="prevnext" data-go="${attr(next.id)}"><span>下一章节 →</span><strong>${esc(next.title)}</strong></button>` : ''}</div>
    <div class="article-source">资料来源：<a href="${attr(s.originalUrl || 'https://core.telegram.org/bots/api')}" target="_blank" rel="noopener noreferrer">Telegram Bot API 官方文档 ↗</a>。中文译文供辅助理解，技术细节以英文原文为准。</div>`;
}
function renderMain() {
  const s = current();
  $('mainContent').innerHTML = s ? article(s) : overview();
}

async function translate(id){
  S.lang='en';localStorage.setItem('botcn-language',S.lang);renderMain();
  toast('暂未提供此章节的中文要点，已显示官方原文。');
}
async function sync(){
  toast('正在重新加载 GitHub Pages 已发布的文档…');
  try { await reloadDocs(); toast('已载入线上最新发布的文档。'); }
  catch(e){toast(e.message,true);}
}
function openSettings(){
  $('modalBackdrop').classList.remove('hidden');$('modalBackdrop').setAttribute('aria-hidden','false');
  renderMeta();
}
function closeSettings(){$('modalBackdrop').classList.add('hidden');$('modalBackdrop').setAttribute('aria-hidden','true');}
function openEdit() {
  const s = current(); if(!s || !s.translation) return toast('请先翻译此章节。');
  $('editBackdrop').classList.remove('hidden'); $('editBackdrop').setAttribute('aria-hidden','false');
  $('editTitle').textContent = `修订：${s.title}`;
  $('editTextarea').value = s.translation.text;
  $('editTextarea').focus();
}
function closeEdit() { $('editBackdrop').classList.add('hidden'); $('editBackdrop').setAttribute('aria-hidden','true'); }
async function saveEdit(reset=false){
  const s=current();if(!s)return;
  const edits=readLocal('botcn-edits',{});
  if(reset){delete edits[s.id];s.translation=S.baseline[s.id]||null;}
  else {
    const text=$('editTextarea').value.trim();
    if(!text) return toast('修订内容不能留空',true);
    edits[s.id]={hash:s.hash,text};s.translation={from:'edited',text};
  }
  saveLocal('botcn-edits',edits);closeEdit();renderMeta();renderMain();
  toast(reset?'已撤销本地修订。':'修订内容已保存到当前浏览器。');
}
function toggleFavorite() {
  const s=current(); if(!s)return;
  if(S.favorites.includes(s.id)) S.favorites=S.favorites.filter(x=>x!==s.id);
  else S.favorites=[s.id,...S.favorites];
  saveLocal('botcn-favorites',S.favorites);renderNav();updateTopbar();
  toast(S.favorites.includes(s.id) ? '已加入收藏' : '已取消收藏');
}
function openOfficial() { const s=current(); if(s) window.open(s.originalUrl || 'https://core.telegram.org/bots/api','_blank','noopener'); }
function copyLink() {
  const s=current(); if(!s)return;
  const link = location.origin + location.pathname + '#' + encodeURIComponent(s.id);
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(()=>toast('章节链接已复制。')).catch(()=>toast('复制失败，请手动复制地址栏链接。',true));
  else toast('浏览器不支持自动复制，请复制地址栏链接。',true);
}
function closeSidebar(){ $('sidebar').classList.remove('open');$('sidebarScrim').classList.remove('show'); }
function toggleSidebar(){ $('sidebar').classList.toggle('open');$('sidebarScrim').classList.toggle('show'); }
function isHidden(el) { return el.classList.contains('hidden'); }

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go],[data-sync],[data-open-settings],[data-language],[data-translate],[data-edit],[data-load-more]');
  if(!b)return;
  if(b.dataset.go){ e.preventDefault();go(b.dataset.go); }
  else if(b.dataset.sync){sync();}
  else if(b.dataset.openSettings){openSettings();}
  else if(b.dataset.language){S.lang=b.dataset.language;localStorage.setItem('botcn-language',S.lang);renderMain();}
  else if(b.dataset.translate){translate(b.dataset.translate);}
  else if(b.dataset.edit){openEdit();}
  else if(b.dataset.loadMore){S.navLimit += 700;renderNav();}
});
$('searchInput').addEventListener('input', e=>{S.query=e.target.value;renderNav();});
for(const b of document.querySelectorAll('[data-filter]')) b.addEventListener('click',()=>{S.filter=b.dataset.filter;renderNav();});
$('syncButton').addEventListener('click',sync);
$('modalSync').addEventListener('click',sync);
$('settingsButton').addEventListener('click',openSettings);
$('closeModal').addEventListener('click',closeSettings);
$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeSettings();});




$('closeEdit').addEventListener('click',closeEdit);
$('editBackdrop').addEventListener('click',e=>{if(e.target===$('editBackdrop'))closeEdit();});
$('saveEdit').addEventListener('click',()=>saveEdit(false));
$('resetEdit').addEventListener('click',()=>saveEdit(true));
$('menuButton').addEventListener('click',toggleSidebar);
$('sidebarScrim').addEventListener('click',closeSidebar);
$('favoriteButton').addEventListener('click',toggleFavorite);
$('copyLink').addEventListener('click',copyLink);
$('openOfficial').addEventListener('click',openOfficial);
document.addEventListener('keydown',e=>{
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if((e.key==='/' && !typing) || ((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){
    e.preventDefault();$('searchInput').focus();$('searchInput').select();$('sidebar').classList.add('open');$('sidebarScrim').classList.add('show');
  }
  if(e.key==='Escape') {if(!isHidden($('editBackdrop'))) closeEdit(); else if(!isHidden($('modalBackdrop'))) closeSettings();else {document.activeElement?.blur();closeSidebar();}}
  if(e.key==='Enter' && e.target.closest('.featured[data-go]')) go(e.target.closest('.featured').dataset.go);
});
window.addEventListener('popstate',()=>go(getUrlId(),true,false));
window.addEventListener('hashchange',()=>{if(S.docs && getUrlId()!==S.active)go(getUrlId(),true,false)});

async function init() {
  try {
    await reloadDocs({quiet:true});

    // Read-only static docs, regenerated by GitHub Actions.
  } catch (e) {
    $('mainContent').innerHTML = `<div class="not-translated"><h3>在线文档加载失败</h3><p>${esc(e.message)}。请刷新网页，或查看仓库 Actions 是否完成首次构建。</p></div>`;
    toast(e.message,true);
  }
}
init();
})();
