/* Repair strong emphasis left literal by the Markdown parser in prose and tables.
 * Fenced examples are excluded by the enclosing-element match. */
(function(root){
'use strict';
function repair(html) {
  return String(html).replace(/<(p|li|td|th)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, segment =>
    segment.replace(/\*\*([\s\S]{1,350}?)\*\*/g, '<strong>$1</strong>'));
}
const api={repair};
root.BotApiMarkdownCleanup=api;
if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
