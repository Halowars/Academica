function deliver(clip){if(clip)window.postMessage({type:'academica-clip',clip},location.origin);}
chrome.runtime.onMessage.addListener(message=>{if(message.type==='clip-ready')deliver(message.clip);});
window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin)return;if(event.data?.type==='academica-clip-ready')chrome.runtime.sendMessage({type:'pending-clip'}).then(deliver);if(event.data?.type==='academica-clip-accepted')chrome.runtime.sendMessage({type:'accept-clip',id:event.data.id});});
chrome.runtime.sendMessage({type:'pending-clip'}).then(deliver);
