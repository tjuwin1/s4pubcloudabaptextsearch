var requestor = "";
var msgfield, outputfield, searcher, csrftoken, objectnames = [],searchtype,objsearch,txtsearch,threadcount=0;

function activateSearch(){
	document.getElementById("opener").value = requestor;

	searcher = document.getElementById("searcher");
	outputfield = document.getElementById("output");
	msgfield = document.getElementById("msgs");

	searcher.disabled = false;
}

function checkField(field){
	if(field.value === ""){
		field.style = "background-color: LightPink";
		return false;
	}else{
		field.style = "background-color: White";
		return true;
	}
}

function startSearch(){
	searchtype = document.getElementById("types");
	let searchnames = document.getElementById("names");
	let searchtxts = document.getElementById("txts");
	
	if(checkField(searchnames) && checkField(searchtxts) && checkField(searchtype)){
		msgfield.innerText = "Starting Search";
		searcher.disabled  = true;
		objsearch = searchnames.value.split(/\r?\n/).filter(n => n);
		txtsearch = searchtxts.value.split(/\r?\n/).filter(n => n);
		outputfield.innerText = "";
		getCSRFToken();
	}else{
		msgfield.innerText = "Make an entry all fields";
	}
}

function getCSRFToken(){
	const defaultobj = "/sap/bc/adt/oo/classes/cl_adt_wb_res_app/source/main";
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				csrftoken = xhr.getResponseHeader("x-csrf-token");
				getObjectNames();
            } else {
                msgfield.innerText = "CSRF Token Fetch failed";
				searcher.disabled = false;
            }
        }
    };
	
    xhr.open("GET", "https://" + requestor + defaultobj, true);
	xhr.setRequestHeader("Content-Type","text/plain");
	xhr.setRequestHeader("x-csrf-token","fetch");
    try {
        xhr.send(null);
    } catch (err) {
		msgfield.innerText = "CSRF Token Fetch failed";
		searcher.disabled = false;
    }	
}

function getObjectSource(){
	msgfield.innerText = "Fetching object source codes";
	searcher.disabled = false;
	objectnames = objectnames.filter(function(item, pos) {
		return objectnames.indexOf(item) == pos;
	});
	
	getNextSource();
}

function getNextSource(){
	if(objectnames.length > 0){
		for(n=threadcount;n<6 && n<objectnames.length;n++){
			let nextname = objectnames.shift();
			msgfield.innerText = "Fetching object source code for " + nextname;
			if(searchtype.value === "CLAS"){
				getClass(nextname);
			}else if (searchtype.value === "DDLS"){
				getCDSEntity(nextname);
			}else if (searchtype.value === "DCLS"){
				getCDSAccess(nextname);
			}
		}
	}else if(threadcount === 0){
		msgfield.innerText = "Search Completed";
		searcher.disabled = false;
	}
}

function getObjectNames(){
	const objlist = "/sap/bc/adt/repository/informationsystem/virtualfolders/contents";
	const conttype = "application/vnd.sap.adt.repository.virtualfolders.request.v1+xml";
	
	let objsearchparam = objsearch.shift();
	msgfield.innerText = "Fetching object names with pattern " + objsearchparam;
	
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				var nameslist = xhr.responseXML.getElementsByTagName("vfs:object");
				for(n=0;n<nameslist.length;n++){
					objectnames.push(nameslist[n].getAttribute("name"));
				}
				if(objsearch.length > 0){
					getObjectNames();
				}else{
					getObjectSource();
				}
            } else {
                msgfield.innerText = "Fetching object names with pattern " + objsearchparam + " failed";
				searcher.disabled = false;
            }
        }
    };
	
	xhr.timeout = 60000;
	
	xhr.ontimeout = function(){
		msgfield.innerText = "Fetching object names with pattern " + objsearchparam + " failed due to timeout. Please make sure you have restricted your selection with appropriate filters and you are still connected to the SAP system";
		searcher.disabled = false;
	};
	
	let body = '<?xml version="1.0" encoding="UTF-8"?><vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" objectSearchPattern="' + objsearchparam + '"><vfs:preselection facet="type"><vfs:value>' + searchtype.value + '</vfs:value></vfs:preselection><vfs:facetorder/></vfs:virtualFoldersRequest>';

    xhr.open("POST", "https://" + requestor + objlist, true);
	xhr.setRequestHeader("Content-Type",conttype);
	xhr.setRequestHeader("x-csrf-token",csrftoken);
    try {
        xhr.send(body);
    } catch (err) {
		msgfield.innerText = "Fetching object names with pattern " + objsearchparam + " failed";
		searcher.disabled = false;
    }		
}

function getClass(objname){
	const classMain = "/sap/bc/adt/oo/classes/{{0}}/source/main";
	const classInc = "/sap/bc/adt/oo/classes/{{0}}/includes/implementations";
	fetchSourceCode(objname,classMain.replace("{{0}}",objname));
	fetchSourceCode(objname,classInc.replace("{{0}}",objname));
}

function getCDSEntity(objname){
	const cdsMain = "/sap/bc/adt/ddic/ddl/sources/{{0}}/source/main";
	fetchSourceCode(objname,cdsMain.replace("{{0}}",objname));
}

function getCDSAccess(objname){
	const cdsMain = "/sap/bc/adt/acm/dcl/sources/{{0}}/source/main";
	fetchSourceCode(objname,cdsMain.replace("{{0}}",objname));
}

function scramble(a){a=a.split("");for(var b=a.length-1;0<b;b--){var c=Math.floor(Math.random()*(b+1));d=a[b];a[b]=a[c];a[c]=d}return a.join("")}

function fetchSourceCode(object,url){
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
				threadcount--;
				for(t=0;t<txtsearch.length;t++){
					if(xhr.responseText.toUpperCase().includes(txtsearch[t].toUpperCase())){
						outputfield.innerText += "\n" + scramble(object) + " contains word "+ txtsearch[t];
					}
				}
				getNextSource();
            } else {
				threadcount--;
                outputfield.innerText += "\nSource code Fetch failed for " + object;
				getNextSource();
            }
        }
    };
	
    xhr.open("GET", "https://" + requestor + url, true);
	xhr.setRequestHeader("Content-Type","text/plain");
    try {
		threadcount++;
        xhr.send(null);
    } catch (err) {
		outputfield.innerText += "\nSource code Fetch failed for " + object;
		getNextSource();
    }	
}

try{
	chrome.runtime.onMessage.addListener(function (reqData, sender, sendResponse) {
		if(reqData.msgTyp === "OPENER"){
			let url = new URL(reqData.opener);
			requestor = url.hostname;
			activateSearch();
		}
	});
	
	document.addEventListener("DOMContentLoaded", function() {
		document.getElementById("searcher").addEventListener("click", startSearch);
	});
}catch(oErr){
	
}

