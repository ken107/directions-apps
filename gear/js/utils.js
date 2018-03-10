
exports.config = {
	googleApiKey: "my-api-key"
}

exports.ajaxGet = function(url, data, fulfill) {
	if (data) {
		var tokens = Object.keys(data).map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
		url += "?" + tokens.join("&");
	}
	console.log("Loading " + url);
	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) fulfill(xhr.responseText);
			else console.error("Server returns " + xhr.status + " for " + url);
		}
	};
	xhr.open('GET', url);
	xhr.send();
}

exports.toggle = function(elem, visible) {
	elem.style.display = visible ? "" : "none";
}
