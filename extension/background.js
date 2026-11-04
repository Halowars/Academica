const APP='https://halowars.github.io/Academica/';
chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.create({id:'save-evidence',title:'Save selected evidence to Academica',contexts:['selection']}));
async function queue(clip){if(!clip||typeof clip.url!=='string'||!/^https?:\/\//.test(clip.url)||JSON.stringify(clip).length>2000000)throw new Error('This article is too large. Use a PDF or text import.');clip={...clip,id:crypto.randomUUID(),capturedAt:new Date().toISOString()};await chrome.storage.local.set({pendingClip:clip});const tabs=await chrome.tabs.query({url:APP+'*'});if(tabs[0]){await chrome.tabs.update(tabs[0].id,{active:true});await chrome.tabs.sendMessage(tabs[0].id,{type:'clip-ready',clip}).catch(()=>{});}else await chrome.tabs.create({url:APP});return{ok:true};}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.type==='save-clip'){queue(message.clip).then(reply).catch(e=>reply({error:e.message}));return true;}
 if(!sender.url?.startsWith(APP))return;
 if(message.type==='pending-clip'){chrome.storage.local.get('pendingClip').then(value=>reply(value.pendingClip||null));return true;}
 if(message.type==='accept-clip'){chrome.storage.local.get('pendingClip').then(value=>{if(value.pendingClip?.id===message.id)return chrome.storage.local.remove('pendingClip');}).then(()=>reply({ok:true}));return true;}
});
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{if(info.menuItemId!=='save-evidence'||!tab?.url)return;await queue({url:tab.url,title:tab.title||'Selected evidence',selected:info.selectionText||''});});
