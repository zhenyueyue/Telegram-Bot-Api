/* Repair strong emphasis that marked leaves literal in Chinese prose or table cells.
 * Operates on rendered HTML, never on source translations or fenced code samples. */
(function(root){
'use strict';
function repair(html){
  return String(html).replace(/<(p|li|td|th)(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\1>/g,segment=>
    segment.replace(/\\*\\*([\\s\\S]{1,350}?)\\*\\*/g,'<strong>$1</strong>'));
}
const api={repair};root.BotApiMarkdownCleanup=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
