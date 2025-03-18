chrome.action.onClicked.addListener((details) => {
  if(details.id > 0 && details.url.includes(".s4hana.cloud.sap/ui")){
	let newURL = chrome.runtime.getURL('popup.html');
	let reqHdrs = { msgTyp:'OPENER', opener : details.url };
	chrome.tabs.create({url: newURL},
	function(opened){
		setTimeout(function(){
			chrome.tabs.sendMessage(opened.id, reqHdrs ).catch((oErr) => { });
		},500);
	});
  }
});