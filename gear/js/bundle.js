(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require("./utils.js"),
    ajaxGet = _require.ajaxGet,
    config = _require.config;

var geolib = require("geolib");

var App = function () {
	function App() {
		_classCallCheck(this, App);

		document.addEventListener("tizenhwkey", this.onKey.bind(this));
		document.addEventListener("rotarydetent", this.onRotate.bind(this));

		this.state = "LOCATE";
		this.location = null;
		this.searchResult = null;
		this.directionsResult = null;
		this.locate();
	}

	_createClass(App, [{
		key: "onKey",
		value: function onKey(event) {
			if (event.keyName == "back") this.goBack();
		}
	}, {
		key: "onRotate",
		value: function onRotate(event) {
			this.scroll(event.detail.direction == 'CCW' ? 'UP' : 'DOWN');
		}
	}, {
		key: "goBack",
		value: function goBack() {
			switch (this.state) {
				case "DIRECTIONS":
				case "GETTING_DIRECTIONS":
					this.state = "SEARCH_RESULT";
					break;
				case "SEARCH_RESULT":
				case "SEARCHING":
					this.state = "SEARCH";
					break;
				case "SEARCH":
					this.state = "LOCATE";
					break;
				default:
					tizen.application.getCurrentApplication().exit();
			}
		}
	}, {
		key: "scroll",
		value: function scroll(direction) {
			var data = void 0;
			if (this.state == "SEARCH_RESULT") data = this.searchResult;else if (this.state == "DIRECTIONS") data = this.directionsResult;

			if (data) {
				if (direction == 'UP' && data.index > 0) data.index--;
				if (direction == 'DOWN' && data.index + 1 < data.items.length) data.index++;
			}
		}
	}, {
		key: "locate",
		value: function locate() {
			navigator.geolocation.getCurrentPosition(this.onLocation.bind(this));
			this.state = "LOCATING";
		}
	}, {
		key: "onLocation",
		value: function onLocation(result) {
			this.location = result;
			this.state = "SEARCH";
		}
	}, {
		key: "search",
		value: function search(query) {
			var opts = {
				key: config.googleApiKey,
				location: this.location.coords.latitude + "," + this.location.coords.longitude,
				rankby: "distance",
				keyword: query
			};
			ajaxGet("https://maps.googleapis.com/maps/api/place/nearbysearch/json", opts, this.onSearchResult.bind(this));
			this.state = "SEARCHING";
		}
	}, {
		key: "onSearchResult",
		value: function onSearchResult(text) {
			var _this = this;

			this.searchResult = {
				items: JSON.parse(text).results.map(function (item) {
					return {
						name: item.name,
						location: { latitude: item.geometry.location.lat, longitude: item.geometry.location.lng },
						vicinity: item.vicinity,
						distance: _this.printDistance(geolib.getDistance(_this.location.coords, item.geometry.location)),
						direction: _this.printDirection(geolib.getCompassDirection(_this.location.coords, item.geometry.location))
					};
				}),
				index: 0
			};
			this.state = "SEARCH_RESULT";
		}
	}, {
		key: "select",
		value: function select() {
			var dest = this.searchResult.items[this.searchResult.index].location;
			var opts = {
				key: config.googleApiKey,
				origin: this.location.coords.latitude + "," + this.location.coords.longitude,
				destination: dest.latitude + "," + dest.longitude
			};
			ajaxGet("https://maps.googleapis.com/maps/api/directions/json", opts, this.onDirectionsResult.bind(this));
			this.state = "GETTING_DIRECTIONS";
		}
	}, {
		key: "onDirectionsResult",
		value: function onDirectionsResult(text) {
			this.directionsResult = {
				items: JSON.parse(text).routes[0].legs[0].steps.map(function (step) {
					return {
						instruction: step.html_instructions,
						distance: step.distance.text
					};
				}),
				index: 0
			};
			this.state = "DIRECTIONS";
		}
	}, {
		key: "printDistance",
		value: function printDistance(d) {
			return (d / 1000 * 5 / 8).toFixed(2) + ' mi';
		}
	}, {
		key: "printDirection",
		value: function printDirection(d) {
			return d.exact;
		}
	}]);

	return App;
}();

module.exports = { App: App };

},{"./utils.js":3,"geolib":5}],2:[function(require,module,exports){
"use strict";

require("databind");
var controllers = require("./components.js");
var util = require("./utils.js");

var children = document.querySelector("template").children;
for (var i = 0; i < children.length; i++) {
	var className = children[i].getAttribute("data-class");
	if (!className || !controllers[className]) throw new Error("Missing controller class " + className);
	dataBinder.views[className] = { template: children[i], controller: controllers[className] };
}

window.toggle = util.toggle;

},{"./components.js":1,"./utils.js":3,"databind":4}],3:[function(require,module,exports){
"use strict";

exports.config = {
	googleApiKey: "AIzaSyDPOLhnq0RIx9mA-XKXo6T6DDqO3hwuHE4"
};

exports.ajaxGet = function (url, data, fulfill) {
	if (data) {
		var tokens = Object.keys(data).map(function (key) {
			return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
		});
		url += "?" + tokens.join("&");
	}
	console.log("Loading " + url);
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) fulfill(xhr.responseText);else console.error("Server returns " + xhr.status + " for " + url);
		}
	};
	xhr.open('GET', url);
	xhr.send();
};

exports.toggle = function (elem, visible) {
	elem.style.display = visible ? "" : "none";
};

},{}],4:[function(require,module,exports){
/**
 * DataBinder <https://github.com/ken107/databind-js>
 * Copyright 2015, Hai Phan <hai.phan@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function() {
	var regex = [
		/{{[\s\S]*?}}/g,
		/^\s*parts\[0\].get\(\)\s*$/,
		/'.*?'|".*?"|#\w+(?:\.\w+|\[(?:.*?\[.*?\])*?[^\[]*?\])*(\s*(?:\+\+|--|\+=|-=|\*=|\/=|%=|=(?!=)|\())?/g,
		/\.\w+|\[(?:.*?\[.*?\])*?[^\[]*?\]/g,
		/\bthis\.(\w+)\s*\(/g,
		/-([a-z])/g,
		/;\s*\S/,
		/^\d+$/
	];
	var propPrefix = "__prop__";
	var exprCache = {};

	/**
	 * Helpers
	 */
	var callLater = (function() {
		var queue = null;
		function call() {
			while (queue.length) {
				var funcs = queue;
				queue = [];
				for (var i=0; i<funcs.length; i++) funcs[i].cl_called = false;
				for (var priority=1; priority<=3; priority++)
				for (var i=0; i<funcs.length; i++) if (funcs[i].cl_priority == priority && !funcs[i].cl_called) {
					funcs[i]();
					funcs[i].cl_called = true;
				}
			}
			queue = null;
		}
		return function(func, priority) {
			if (!queue) {
				queue = [];
				setTimeout(call, 0);
			}
			func.cl_priority = priority;
			queue.push(func);
		};
	})();

	var timer = new function() {
		var queue = null;
		var counter = 0;
		var intervalId = 0;
		function onTimer() {
			var now = new Date().getTime();
			for (var id in queue) {
				if (queue[id].expires <= now) {
					queue[id].callback();
					delete queue[id];
				}
			}
			for (var id in queue) return;
			queue = null;
			clearInterval(intervalId);
		}
		this.callAfter = function(timeout, func) {
			if (!queue) {
				queue = {};
				intervalId = setInterval(onTimer, api.timerInterval);
			}
			var id = ++counter;
			queue[id] = {expires: new Date().getTime()+timeout, callback: func};
			return id;
		};
		this.cancel = function(id) {
			if (queue) delete queue[id];
		};
	};

	function getDirectives(node) {
		var dirs = {params: [], vars: [], statements: [], events: [], toRemove: []};
		for (var i=0; i<node.attributes.length; i++) {
			var attr = node.attributes[i];
			if (attr.specified) {
				if (attr.name == api.directives.bindView) {
					dirs.view = attr.value;
					dirs.toRemove.push(attr.name);
				}
				else if (attr.name.lastIndexOf(api.directives.bindParameter,0) == 0) {
					dirs.params.push({name: toCamelCase(attr.name.substr(api.directives.bindParameter.length)), value: attr.value});
					dirs.toRemove.push(attr.name);
				}
				else if (attr.name.lastIndexOf(api.directives.bindVariable,0) == 0) {
					dirs.vars.push({name: toCamelCase(attr.name.substr(api.directives.bindVariable.length)), value: attr.value});
					dirs.toRemove.push(attr.name);
				}
				else if (attr.name.lastIndexOf(api.directives.bindStatement,0) == 0) {
					dirs.statements.push({value: "; " + attr.value});
					dirs.toRemove.push(attr.name);
				}
				else if (attr.name.lastIndexOf(api.directives.bindEvent,0) == 0) {
					dirs.events.push({name: attr.name.substr(api.directives.bindEvent.length), value: "; " + attr.value});
					dirs.toRemove.push(attr.name);
				}
				else if (attr.name.lastIndexOf(api.directives.bindRepeater,0) == 0) {
					dirs.repeater = {name: toCamelCase(attr.name.substr(api.directives.bindRepeater.length)), value: attr.value};
					dirs.toRemove = [attr.name];
					break;
				}
			}
		}
		return dirs;
	}

	function removeDirectives(node, dirs) {
		for (var i=0; i<dirs.toRemove.length; i++) node.removeAttribute(dirs.toRemove[i]);
	}

	function toCamelCase(str) {
		return str.replace(regex[5], function(g) {
			return g[1].toUpperCase();
		});
	}

	function noOp() {
	}

	function illegalOp() {
		throw new Error("Illegal operation");
	}

	function printDebug(debugInfo) {
		if (debugInfo.length) api.console.log(debugInfo);
	}

	function proxy(func, ctx) {
		var args = Array.prototype.slice.call(arguments, 2);
		return function() {
			return func.apply(ctx, args.concat(Array.prototype.slice.call(arguments)));
		};
	}

	function makeEventHandler(node, type, scope, prop) {
		function handler(event) {
			scope.event = event;
			var val = prop.get();
			if (val == false && event) {
				if (event.preventDefault instanceof Function) event.preventDefault();
				if (event.stopPropagation instanceof Function) event.stopPropagation();
			}
			return val;
		}
		function jQueryHandler(event) {
			event.data = arguments.length > 2 ? Array.prototype.slice.call(arguments, 1) : arguments[1];
			scope.event = event;
			return prop.get();
		}
		var camel = toCamelCase(type);
		if (window.jQuery) {
			jQuery(node).on(type, jQueryHandler);
			if (camel != type) jQuery(node).on(camel, jQueryHandler);
		}
		else {
			node.addEventListener(type, handler, false);
			if (camel != type) node.addEventListener(camel, handler, false);
		}
	}

	/**
	 * Property
	 */
	function Property(value, onSubscribed) {
		var subscribers = {};
		var count = 0;
		var keygen = 0;
		this.get = function() {
			return value;
		};
		this.set = function(newValue) {
			if (newValue !== value) {
				value = newValue;
				publish();
			}
		};
		this.subscribe = function(subscriber) {
			if (!count && onSubscribed) onSubscribed(true);
			subscribers[++keygen] = subscriber;
			count++;
			return keygen;
		};
		this.unsubscribe = function(key) {
			if (!subscribers[key]) throw new Error("Not subscribed");
			delete subscribers[key];
			count--;
			if (!count && onSubscribed) onSubscribed(false);
		};
		this.publish = publish;
		function publish() {
			for (var i in subscribers) subscribers[i]();
		};
	}

	function extend(data) {
		return {__extends__: data};
	}

	function getPropExt(obj, name) {
		if (obj[propPrefix+name]) return obj[propPrefix+name];
		else if (name in obj) return convertToProperty(obj, name);
		else if (obj.__extends__) return getPropExt(obj.__extends__, name);
		else return null;
	}

	function getProp(obj, name) {
		return obj[propPrefix+name] || convertToProperty(obj, name);
	}

	function setProp(obj, name, prop) {
		if (prop instanceof Property) {
			Object.defineProperty(obj, propPrefix+name, {value: prop, writable: false, enumerable: false, configurable: false});
			Object.defineProperty(obj, name, {get: prop.get, set: prop.set, enumerable: true, configurable: false});
		}
		else throw new Error("Not a Property object");
	}

	function convertToProperty(obj, name) {
		var prop = new Property(obj[name]);
		Object.defineProperty(obj, propPrefix+name, {value: prop, writable: false, enumerable: false, configurable: false});
		if (obj instanceof Array) {
			observeArray(obj);
			var isArrayIndex = regex[7].test(name);
			if (!isArrayIndex || name < obj.length) {
				var desc = Object.getOwnPropertyDescriptor(obj, name);
				if (!desc || desc.configurable) Object.defineProperty(obj, name, {get: prop.get, set: prop.set, enumerable: true, configurable: isArrayIndex});
				else {
					if (name !== "length") api.console.warn("Object", obj, "property '" + name + "' is not configurable, change may not be detected");
					prop.get = fallbackGet;
					prop.set = fallbackSet;
				}
			}
		}
		else {
			var desc = Object.getOwnPropertyDescriptor(obj, name);
			if (!desc || desc.configurable) Object.defineProperty(obj, name, {get: prop.get, set: prop.set, enumerable: true, configurable: false});
			else {
				api.console.warn("Object", obj, "property '" + name + "' is not configurable, change may not be detected");
				prop.get = fallbackGet;
				prop.set = fallbackSet;
			}
		}
		function fallbackGet() {
			return obj[name];
		}
		function fallbackSet(newValue) {
			if (newValue !== obj[name]) {
				obj[name] = newValue;
				prop.publish();
			}
		}
		return prop;
	}

	function observeArray(arr) {
		if (arr.alter) return;
		arr.alter = alterArray;
		arr.push = proxy(arr.alter, arr, arr.push);
		arr.pop = proxy(arr.alter, arr, arr.pop);
		arr.shift = proxy(arr.alter, arr, arr.shift);
		arr.unshift = proxy(arr.alter, arr, arr.unshift);
		arr.splice = proxy(arr.alter, arr, arr.splice);
		arr.reverse = proxy(arr.alter, arr, arr.reverse);
		arr.sort = proxy(arr.alter, arr, arr.sort);
		if (arr.fill) arr.fill = proxy(arr.alter, arr, arr.fill);
	}

	function alterArray(func) {
		var len = this.length;
		var val = func.apply(this, Array.prototype.slice.call(arguments, 1));
		if (len != this.length) {
			var prop = this[propPrefix+"length"];
			if (prop) prop.publish();
		}
		for (var i=len; i<this.length; i++) {
			var prop = this[propPrefix+i];
			if (prop) {
				prop.set(this[i]);
				Object.defineProperty(this, i, {get: prop.get, set: prop.set, enumerable: true, configurable: true});
			}
		}
		return val;
	}

	/**
	 * Expression
	 */
	function parseExpr(str, debugInfo) {
		var funcs = [];
		var match;
		while (match = regex[4].exec(str)) funcs.push(match[1]);
		var strings = [];
		var parts = [];
		var pmap = {};
		var expr = str.replace(regex[2], function(bindingSrc, operator) {
			if (bindingSrc.charAt(0) == "'" || bindingSrc.charAt(0) == '"') {
				strings.push(bindingSrc.substr(1, bindingSrc.length-2));
				return "strings[" + (strings.length-1) + "]";
			}
			else if (operator) {
				if (operator.slice(-1) == "(") {
					parts.push({bindingSrc: bindingSrc.substring(1, bindingSrc.length-operator.length)});
					return "(parts[" + (parts.length-1) + "].get() || noOp)" + operator;
				}
				else {
				parts.push({bindingSrc: bindingSrc.substring(1, bindingSrc.length-operator.length), operator: operator});
				return "parts[" + (parts.length-1) + "].value" + operator;
				}
			}
			else if (pmap[bindingSrc]) return pmap[bindingSrc];
			else {
				parts.push({bindingSrc: bindingSrc.substr(1)});
				return pmap[bindingSrc] = "parts[" + (parts.length-1) + "].get()";
			}
		});
		var isSinglePart = regex[1].test(expr);
		if (!regex[6].test(expr)) expr = "return " + expr;
		expr = "var thisElem = scope.thisElem, event = scope.event;\n" + expr;
		var func;
		try {
			func = new Function("noOp", "scope", "strings", "parts", expr);
		}
		catch (err) {
			printDebug(debugInfo);
			throw err;
		}
		return {
			funcs: funcs,
			strings: strings,
			parts: parts,
			isSinglePart: isSinglePart,
			func: func
		};
	}

	function evalExpr(str, data, context, scope, debugInfo) {
		debugInfo = debugInfo.concat("{{" + str + "}}");
		var c = exprCache[str] || (exprCache[str] = parseExpr(str, debugInfo));
		for (var i=0; i<c.funcs.length; i++) {
			if (context[c.funcs[i]] === undefined) {
				printDebug(debugInfo);
				throw new Error("Method '" + c.funcs[i] + "' not found");
			}
		}
		var parts = [];
		for (var i=0; i<c.parts.length; i++) {
			var prop = evalBindingSrc(c.parts[i].bindingSrc, data, context, scope, debugInfo);
			if (c.parts[i].operator) {
				var part = {subscribe: noOp, unsubscribe: noOp};
				Object.defineProperty(part, "value", {get: prop.get, set: prop.set, enumerable: true, configurable: false});
				parts.push(part);
			}
			else parts.push(prop);
		}
		if (c.isSinglePart) return parts[0];

		var keys = new Array(parts.length);
		var prop = new Property(null, function(subscribed) {
			if (subscribed) for (var i=0; i<parts.length; i++) subscribePart(parts[i], i);
			else for (var i=0; i<parts.length; i++) unsubscribePart(parts[i], i);
		});
		prop.isExpr = true;
		prop.set = illegalOp;
		prop.get = function() {
			try {
				return c.func.call(context, noOp, scope, c.strings, parts);
			}
			catch (err) {
				printDebug(debugInfo);
				throw err;
			}
		};

		function subscribePart(part, i) {
			keys[i] = part.subscribe(prop.publish);
		}
		function unsubscribePart(part, i) {
			part.unsubscribe(keys[i]);
		}
		return prop;
	}

	function evalText(str, data, context, scope, debugInfo) {
		var exprs = str.match(regex[0]);
		if (!exprs) return null;
		var parts = new Array(exprs.length);
		for (var i=0; i<exprs.length; i++) parts[i] = evalExpr(exprs[i].substr(2, exprs[i].length-4), data, context, scope, debugInfo);

		var keys = new Array(parts.length);
		var prop = new Property(null, function(subscribed) {
			if (subscribed) for (var i=0; i<parts.length; i++) subscribePart(parts[i], i);
			else for (var i=0; i<parts.length; i++) unsubscribePart(parts[i], i);
		});
		prop.set = illegalOp;
		prop.get = function() {
			var i = 0;
			return str.replace(regex[0], function() {
				var val = parts[i++].get();
				return val != null ? String(val) : "";
			});
		};

		function subscribePart(part, i) {
			keys[i] = part.subscribe(prop.publish);
		}
		function unsubscribePart(part, i) {
			part.unsubscribe(keys[i]);
		}
		return prop;
	}

	function evalBindingSrc(str, data, context, scope, debugInfo) {
		var path = ("." + str).match(regex[3]);
		var derefs = new Array(path.length);
		for (var i=0; i<path.length; i++) {
			if (path[i].charAt(0) === '.') derefs[i] = path[i].substr(1);
			else derefs[i] = evalExpr(path[i].substr(1, path[i].length-2), data, context, scope, debugInfo);
		}
		var parts = new Array(path.length);
		parts[0] = getPropExt(data, derefs[0]);
		if (!parts[0]) {
			printDebug(debugInfo);
			throw new Error("Missing binding source for #" + str);
		}
		if (parts.length == 1) return parts[0];

		var curVal;
		var derefKeys = new Array(path.length);
		var keys = new Array(path.length);
		var isSubscribed = false;
		var prop = new Property(null, function(subscribed) {
			isSubscribed = subscribed;
			if (subscribed) {
				buildParts();
				for (var i=0; i<parts.length; i++) subscribePart(parts[i], i);
				for (var i=0; i<derefs.length; i++) subscribeDeref(derefs[i], i);
			}
			else {
				for (var i=0; i<parts.length; i++) unsubscribePart(parts[i], i);
				for (var i=0; i<derefs.length; i++) unsubscribeDeref(derefs[i], i);
			}
		});
		prop.set = function(newValue) {
			if (!isSubscribed) buildParts();
			var val = parts[parts.length-1];
			if (val instanceof Property) val.set(newValue);
			else {
				printDebug(debugInfo);
				throw new Error("Can't assign to #" + str + ", object is undefined");
			}
		};
		prop.get = function() {
			if (!isSubscribed) buildParts();
			if (curVal instanceof Function) {
				var ctx = context;
				if (parts.length > 1) {
					ctx = parts[parts.length-2];
					if (ctx instanceof Property) ctx = ctx.get();
				}
				return function() {
					return curVal.apply(ctx, arguments);
				};
			}
			else return curVal;
		};

		function evalPart(i) {
			var val = parts[i-1] instanceof Property ? parts[i-1].get() : parts[i-1];
			if (val instanceof Object) {
				var deref = derefs[i] instanceof Property ? derefs[i].get() : derefs[i];
				return getProp(val, deref);
			}
			else if (typeof val === "string") {
				var deref = derefs[i] instanceof Property ? derefs[i].get() : derefs[i];
				return val[deref];
			}
			else return undefined;
		}
		function buildParts() {
			for (var i=1; i<parts.length; i++)
				parts[i] = evalPart(i);
			curVal = parts[parts.length-1] instanceof Property ? parts[parts.length-1].get() : parts[parts.length-1];
		}
		function rebuildPartsFrom(index) {
			for (var i=index; i<parts.length; i++) {
				var val = evalPart(i);
				if (val !== parts[i]) {
					unsubscribePart(parts[i], i);
					parts[i] = val;
					subscribePart(val, i);
				}
				else {
					//if new part is same as old part, then consider the binding's value UNCHANGED, unless
					//this part is the last part and is a function, then consider it CHANGED (because
					//even though it is the same function, it will be executed in a different context)
					if (val instanceof Function && i == parts.length-1) return true;
					else return false;
				}
			}
			//if we get here, it means the last part itself has been rebuilt, so we just re-eval the
			//last part to determine if the binding's value has changed. If the last part evals to a
			//function, we always consider it CHANGED (for the reason explained previously)
			var oldVal = curVal;
			curVal = parts[parts.length-1] instanceof Property ? parts[parts.length-1].get() : parts[parts.length-1];
			return curVal !== oldVal || curVal instanceof Function;
		}
		function subscribePart(part, i) {
			if (part instanceof Property) {
				keys[i] = part.subscribe(function() {
					if (rebuildPartsFrom(i+1)) prop.publish();
				});
			}
		}
		function subscribeDeref(deref, i) {
			if (deref instanceof Property) {
				derefKeys[i] = deref.subscribe(function() {
					if (rebuildPartsFrom(i)) prop.publish();
				});
			}
		}
		function unsubscribePart(part, i) {
			if (part instanceof Property)
				part.unsubscribe(keys[i]);
		}
		function unsubscribeDeref(deref, i) {
			if (deref instanceof Property)
				deref.unsubscribe(derefKeys[i]);
		}
		return prop;
	}

	/**
	 * Binding
	 */
	function Binding(prop, priority) {	//priority 0=synchronous 1,2,3=asynchronous
		var self = this;
		var subkey = null;
		function notifyChange() {
			if (subkey) self.onChange();
		}
		this.bind = function() {
			if (subkey) throw new Error("Already bound");
			subkey = prop.subscribe(priority == 0 ? notifyChange : function() {
				callLater(notifyChange, priority);
			});
			self.onChange();
		};
		this.unbind = function() {
			if (subkey) {
				prop.unsubscribe(subkey);
				subkey = null;
				if (self.onUnbind) self.onUnbind();
			}
		};
		this.isBound = function() {
			return Boolean(subkey);
		};
	}

	function BindingStore() {
		this.bindings = [];
		this.unbind = function() {
			for (var i=0; i<this.bindings.length; i++) this.bindings[i].unbind();
		};
		this.rebind = function() {
			for (var i=0; i<this.bindings.length; i++) this.bindings[i].bind();
		};
	}

	function Repeater(name, node, data, context, debugInfo) {
		var parent = node.parentNode;
		var tail = node.nextSibling;
		parent.removeChild(node);
		var count = 0;
		var bindingStores = [];
		var cache = document.createDocumentFragment();
		var cacheTimeout = null;
		this.update = function(newCount) {
			newCount = Number(newCount);
			if (isNaN(newCount) || newCount < 0) newCount = 0;
			if (newCount > count) {
				var newElems = document.createDocumentFragment();
				var toBind = [];
				for (var i=count; i<newCount; i++) {
					if (cache.firstChild) {
						newElems.appendChild(cache.firstChild);
						bindingStores[i].rebind();
					}
					else {
						var newElem = node.cloneNode(true);
						newElems.appendChild(newElem);
						var newData = data;
						if (name) {
							newData = extend(data);
							setProp(newData, name, new Property(i));
						}
						var bindingStore = new BindingStore();
						bindingStores.push(bindingStore);
						dataBind(newElem, newData, context, bindingStore, debugInfo);
					}
				}
				parent.insertBefore(newElems, tail);
			}
			else if (newCount < count) {
				var elem = tail ? tail.previousSibling : parent.lastChild;
				for (var i=count-1; i>=newCount; i--) {
					var prevElem = elem.previousSibling;
					bindingStores[i].unbind();
					cache.insertBefore(elem, cache.firstChild);
					elem = prevElem;
				}
			}
			count = newCount;
			if (cacheTimeout) {
				timer.cancel(cacheTimeout);
				cacheTimeout = null;
			}
			if (cache.firstChild && api.repeaterCacheTTL) {
				cacheTimeout = timer.callAfter(api.repeaterCacheTTL, clearCache);
			}
		};
		function clearCache() {
			while (cache.lastChild) {
				bindingStores.pop();
				if (window.jQuery) jQuery(cache.lastChild).remove();
				else cache.removeChild(cache.lastChild);
			}
		}
	}

	function dataBind(node, data, context, bindingStore, debugInfo) {
		if (node.nodeType == 1 && node.tagName != "TEMPLATE") {
			if (api.onDataBinding) api.onDataBinding(node);
			var dirs = getDirectives(node);
			if (dirs.repeater) {
				removeDirectives(node, dirs);
					var repeater = new Repeater(dirs.repeater.name, node, data, context, debugInfo);
					var prop = evalExpr(dirs.repeater.value, data, context, {}, debugInfo);
					var binding = new Binding(prop, 1);
					binding.onChange = function() {repeater.update(prop.get())};
					binding.onUnbind = function() {repeater.update(0)};
					binding.bind();
					bindingStore.bindings.push(binding);
			}
			else {
				while (dirs.view) {
					var viewName = dirs.view;
					if (!api.views[viewName]) {
						api.console.warn("View '" + viewName + "' is not ready");
						var repeater = new Repeater(null, node, data, context, debugInfo);
						var prop = evalExpr("#views['" + viewName + "']", api, null, {}, debugInfo);
						var binding = new Binding(prop, 1);
						binding.onChange = function() {repeater.update(prop.get() ? 1 : 0)};
						binding.onUnbind = function() {repeater.update(0)};
						binding.bind();
						bindingStore.bindings.push(binding);
						return;
					}
					var newNode = api.views[viewName].template.cloneNode(true);
					node.parentNode.replaceChild(newNode, node);
					node = newNode;
					var extendedData = null;
					for (var i=0; i<dirs.vars.length; i++) {
							if (!extendedData) extendedData = extend(data);
							var prop = evalExpr(dirs.vars[i].value, data, context, {thisElem: node}, debugInfo);
							bindParam(extendedData, dirs.vars[i].name, prop, bindingStore);
						}
					if (extendedData) data = extendedData;
					for (var i=0; i<dirs.statements.length; i++) {
							var prop = evalExpr(dirs.statements[i].value, data, context, {thisElem: node}, debugInfo);
							var binding = new Binding(prop, 2);
							binding.onChange = prop.get;
							binding.bind();
							bindingStore.bindings.push(binding);
						}
					for (var i=0; i<dirs.events.length; i++) {
							var scope = {thisElem: node, event: null};
							var prop = evalExpr(dirs.events[i].value, data, context, scope, debugInfo);
							makeEventHandler(node, dirs.events[i].name, scope, prop);
						}
					var newContext = new api.views[viewName].controller(node);
					for (var i=0; i<dirs.params.length; i++) {
							var prop = evalExpr(dirs.params[i].value, data, context, {thisElem: node}, debugInfo);
							bindParam(newContext, dirs.params[i].name, prop, bindingStore);
						}
					data = context = newContext;
					debugInfo = debugInfo.concat(viewName);
					if (api.onDataBinding) api.onDataBinding(node);
					dirs = getDirectives(node);
				}
				removeDirectives(node, dirs);
				var extendedData = null;
				for (var i=0; i<dirs.vars.length; i++) {
						if (!extendedData) extendedData = extend(data);
						var prop = evalExpr(dirs.vars[i].value, data, context, {thisElem: node}, debugInfo);
						bindParam(extendedData, dirs.vars[i].name, prop, bindingStore);
					}
				if (extendedData) data = extendedData;
				for (var i=0; i<dirs.statements.length; i++) {
						var prop = evalExpr(dirs.statements[i].value, data, context, {thisElem: node}, debugInfo);
						var binding = new Binding(prop, 2);
						binding.onChange = prop.get;
						binding.bind();
						bindingStore.bindings.push(binding);
					}
				for (var i=0; i<dirs.events.length; i++) {
						var scope = {thisElem: node, event: null};
						var prop = evalExpr(dirs.events[i].value, data, context, scope, debugInfo);
						makeEventHandler(node, dirs.events[i].name, scope, prop);
					}
				var child = node.firstChild;
				while (child) {
					var nextSibling = child.nextSibling;
					if (child.nodeType == 1 || child.nodeType == 3 && child.nodeValue.indexOf('{{') != -1) dataBind(child, data, context, bindingStore, debugInfo);
					child = nextSibling;
				}
			}
		}
		else if (node.nodeType == 3) {
			var prop = evalText(node.nodeValue, data, context, {thisElem: node}, debugInfo);
			if (prop) {
				var binding = new Binding(prop, 3);
				binding.onChange = function() {
					var textarea = document.createElement("textarea");
					textarea.innerHTML = prop.get();
					node.nodeValue = textarea.value;
				};
				binding.bind();
				bindingStore.bindings.push(binding);
			}
		}
	}

	function bindParam(data, paramName, prop, bindingStore) {
		if (prop.isExpr) {
			var binding = new Binding(prop, 0);
			binding.onChange = function() {data[paramName] = prop.get()};
			binding.bind();
			bindingStore.bindings.push(binding);
		}
		else setProp(data, paramName, prop);
	}

	/**
	 * API
	 */
	var api = {
		directives: {				//you can change the names of the binding directives by modifying this object
			bindView: "bind-view",
			bindParameter: "bind-param-",
			bindVariable: "bind-var-",
			bindStatement: "bind-statement-",
			bindEvent: "bind-event-",
			bindRepeater: "bind-repeater-"
		},
		views: {},					//declare your views, name->value where value={template: anHtmlTemplate, controller: function(rootElementOfView)}
		onDataBinding: null,		//set this to a function that will be called before each node is bound, you can use this to process custom directives
		autoBind: true,				//if true, automatically dataBind the entire document as soon as it is ready
		repeaterCacheTTL: 300000,	//removed repeater items are kept in a cache for reuse, the cache is cleared if it is not accessed within the TTL
		timerInterval: 30000,		//granularity of the internal timer
		evalExpr: evalExpr,			//process a binding expression and return a Property object
		evalText: evalText,			//process a string containing {{binding expression}}'s, return a Property object or null if there is none
		getProp: getProp,			//convert the specified object property to a getter-setter, return the underlying Property object
		setProp: setProp,			//set the given Property object as the underlying getter-setter for the specified object property
		Binding: Binding,
		BindingStore: BindingStore,
		dataBind: function(elem, context, bindingStore, debugInfo) {
			dataBind(elem, context, context, bindingStore||new BindingStore(), debugInfo||[]);
		},
		console: window.console || {log: noOp, warn: noOp}
	};

	function onReady() {
			if (api.autoBind) {
				api.console.log("Auto binding document, to disable auto binding set dataBinder.autoBind to false");
				var startTime = new Date().getTime();
				api.dataBind(document.body, window, null, ["document"]);
				api.console.log("Finished binding document", new Date().getTime()-startTime, "ms");
			}
	}

	if (!window.dataBinder) {
		window.dataBinder = api;
		if (window.jQuery) jQuery(onReady);
		else document.addEventListener("DOMContentLoaded", onReady, false);
	}
})();

},{}],5:[function(require,module,exports){
/*! geolib 2.0.23 by Manuel Bieh
* Library to provide geo functions like distance calculation,
* conversion of decimal coordinates to sexagesimal and vice versa, etc.
* WGS 84 (World Geodetic System 1984)
* 
* @author Manuel Bieh
* @url http://www.manuelbieh.com/
* @version 2.0.23
* @license MIT 
**/;(function(global, undefined) {

    "use strict";

    function Geolib() {}

    // Constants
    Geolib.TO_RAD = Math.PI / 180;
    Geolib.TO_DEG = 180 / Math.PI;
    Geolib.PI_X2 = Math.PI * 2;
    Geolib.PI_DIV4 = Math.PI / 4;

    // Setting readonly defaults
    var geolib = Object.create(Geolib.prototype, {
        version: {
            value: "2.0.23"
        },
        radius: {
            value: 6378137
        },
        minLat: {
            value: -90
        },
        maxLat: {
            value: 90
        },
        minLon: {
            value: -180
        },
        maxLon: {
            value: 180
        },
        sexagesimalPattern: {
            value: /^([0-9]{1,3})°\s*([0-9]{1,3}(?:\.(?:[0-9]{1,2}))?)'\s*(([0-9]{1,3}(\.([0-9]{1,4}))?)"\s*)?([NEOSW]?)$/
        },
        measures: {
            value: Object.create(Object.prototype, {
                "m" : {value: 1},
                "km": {value: 0.001},
                "cm": {value: 100},
                "mm": {value: 1000},
                "mi": {value: (1 / 1609.344)},
                "sm": {value: (1 / 1852.216)},
                "ft": {value: (100 / 30.48)},
                "in": {value: (100 / 2.54)},
                "yd": {value: (1 / 0.9144)}
            })
        },
        prototype: {
            value: Geolib.prototype
        },
        extend: {
            value: function(methods, overwrite) {
                for(var prop in methods) {
                    if(typeof geolib.prototype[prop] === 'undefined' || overwrite === true) {
                        if(typeof methods[prop] === 'function' && typeof methods[prop].bind === 'function') {
                            geolib.prototype[prop] = methods[prop].bind(geolib);
                        } else {
                            geolib.prototype[prop] = methods[prop];
                        }
                    }
                }
            }
        }
    });

    if (typeof(Number.prototype.toRad) === 'undefined') {
        Number.prototype.toRad = function() {
            return this * Geolib.TO_RAD;
        };
    }

    if (typeof(Number.prototype.toDeg) === 'undefined') {
        Number.prototype.toDeg = function() {
            return this * Geolib.TO_DEG;
        };
    }

    // Here comes the magic
    geolib.extend({

        decimal: {},

        sexagesimal: {},

        distance: null,

        getKeys: function(point) {

            // GeoJSON Array [longitude, latitude(, elevation)]
            if(Object.prototype.toString.call(point) == '[object Array]') {

                return {
                    longitude: point.length >= 1 ? 0 : undefined,
                    latitude: point.length >= 2 ? 1 : undefined,
                    elevation: point.length >= 3 ? 2 : undefined
                };

            }

            var getKey = function(possibleValues) {

                var key;

                possibleValues.every(function(val) {
                    // TODO: check if point is an object
                    if(typeof point != 'object') {
                        return true;
                    }
                    return point.hasOwnProperty(val) ? (function() { key = val; return false; }()) : true;
                });

                return key;

            };

            var longitude = getKey(['lng', 'lon', 'longitude']);
            var latitude = getKey(['lat', 'latitude']);
            var elevation = getKey(['alt', 'altitude', 'elevation', 'elev']);

            // return undefined if not at least one valid property was found
            if(typeof latitude == 'undefined' &&
                typeof longitude == 'undefined' &&
                typeof elevation == 'undefined') {
                return undefined;
            }

            return {
                latitude: latitude,
                longitude: longitude,
                elevation: elevation
            };

        },

        // returns latitude of a given point, converted to decimal
        // set raw to true to avoid conversion
        getLat: function(point, raw) {
            return raw === true ? point[this.getKeys(point).latitude] : this.useDecimal(point[this.getKeys(point).latitude]);
        },

        // Alias for getLat
        latitude: function(point) {
            return this.getLat.call(this, point);
        },

        // returns longitude of a given point, converted to decimal
        // set raw to true to avoid conversion
        getLon: function(point, raw) {
            return raw === true ? point[this.getKeys(point).longitude] : this.useDecimal(point[this.getKeys(point).longitude]);
        },

        // Alias for getLon
        longitude: function(point) {
            return this.getLon.call(this, point);
        },

        getElev: function(point) {
            return point[this.getKeys(point).elevation];
        },

        // Alias for getElev
        elevation: function(point) {
            return this.getElev.call(this, point);
        },

        coords: function(point, raw) {

            var retval = {
                latitude: raw === true ? point[this.getKeys(point).latitude] : this.useDecimal(point[this.getKeys(point).latitude]),
                longitude: raw === true ? point[this.getKeys(point).longitude] : this.useDecimal(point[this.getKeys(point).longitude])
            };

            var elev = point[this.getKeys(point).elevation];

            if(typeof elev !== 'undefined') {
                retval['elevation'] = elev;
            }

            return retval;

        },

        // Alias for coords
        ll: function(point, raw) {
            return this.coords.call(this, point, raw);
        },


        // checks if a variable contains a valid latlong object
        validate: function(point) {

            var keys = this.getKeys(point);

            if(typeof keys === 'undefined' || typeof keys.latitude === 'undefined' || keys.longitude === 'undefined') {
                return false;
            }

            var lat = point[keys.latitude];
            var lng = point[keys.longitude];

            if(typeof lat === 'undefined' || !this.isDecimal(lat) && !this.isSexagesimal(lat)) {
                return false;
            }

            if(typeof lng === 'undefined' || !this.isDecimal(lng) && !this.isSexagesimal(lng)) {
                return false;
            }

            lat = this.useDecimal(lat);
            lng = this.useDecimal(lng);

            if(lat < this.minLat || lat > this.maxLat || lng < this.minLon || lng > this.maxLon) {
                return false;
            }

            return true;

        },

        /**
        * Calculates geodetic distance between two points specified by latitude/longitude using
        * Vincenty inverse formula for ellipsoids
        * Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010
        * (Licensed under CC BY 3.0)
        *
        * @param    object    Start position {latitude: 123, longitude: 123}
        * @param    object    End position {latitude: 123, longitude: 123}
        * @param    integer   Accuracy (in meters)
        * @param    integer   Precision (in decimal cases)
        * @return   integer   Distance (in meters)
        */
        getDistance: function(start, end, accuracy, precision) {

            accuracy = Math.floor(accuracy) || 1;
            precision = Math.floor(precision) || 0;

            var s = this.coords(start);
            var e = this.coords(end);

            var a = 6378137, b = 6356752.314245,  f = 1/298.257223563;  // WGS-84 ellipsoid params
            var L = (e['longitude']-s['longitude']).toRad();

            var cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM, sinSigma;

            var U1 = Math.atan((1-f) * Math.tan(parseFloat(s['latitude']).toRad()));
            var U2 = Math.atan((1-f) * Math.tan(parseFloat(e['latitude']).toRad()));
            var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
            var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

            var lambda = L, lambdaP, iterLimit = 100;
            do {
                var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
                sinSigma = (
                    Math.sqrt(
                        (
                            cosU2 * sinLambda
                        ) * (
                            cosU2 * sinLambda
                        ) + (
                            cosU1 * sinU2 - sinU1 * cosU2 * cosLambda
                        ) * (
                            cosU1 * sinU2 - sinU1 * cosU2 * cosLambda
                        )
                    )
                );
                if (sinSigma === 0) {
                    return geolib.distance = 0;  // co-incident points
                }

                cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
                sigma = Math.atan2(sinSigma, cosSigma);
                sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
                cosSqAlpha = 1 - sinAlpha * sinAlpha;
                cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;

                if (isNaN(cos2SigmaM)) {
                    cos2SigmaM = 0;  // equatorial line: cosSqAlpha=0 (§6)
                }
                var C = (
                    f / 16 * cosSqAlpha * (
                        4 + f * (
                            4 - 3 * cosSqAlpha
                        )
                    )
                );
                lambdaP = lambda;
                lambda = (
                    L + (
                        1 - C
                    ) * f * sinAlpha * (
                        sigma + C * sinSigma * (
                            cos2SigmaM + C * cosSigma * (
                                -1 + 2 * cos2SigmaM * cos2SigmaM
                            )
                        )
                    )
                );

            } while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0);

            if (iterLimit === 0) {
                return NaN;  // formula failed to converge
            }

            var uSq = (
                cosSqAlpha * (
                    a * a - b * b
                ) / (
                    b*b
                )
            );

            var A = (
                1 + uSq / 16384 * (
                    4096 + uSq * (
                        -768 + uSq * (
                            320 - 175 * uSq
                        )
                    )
                )
            );

            var B = (
                uSq / 1024 * (
                    256 + uSq * (
                        -128 + uSq * (
                            74-47 * uSq
                        )
                    )
                )
            );

            var deltaSigma = (
                B * sinSigma * (
                    cos2SigmaM + B / 4 * (
                        cosSigma * (
                            -1 + 2 * cos2SigmaM * cos2SigmaM
                        ) -B / 6 * cos2SigmaM * (
                            -3 + 4 * sinSigma * sinSigma
                        ) * (
                            -3 + 4 * cos2SigmaM * cos2SigmaM
                        )
                    )
                )
            );

            var distance = b * A * (sigma - deltaSigma);

            distance = distance.toFixed(precision); // round to 1mm precision

            //if (start.hasOwnProperty(elevation) && end.hasOwnProperty(elevation)) {
            if (typeof this.elevation(start) !== 'undefined' && typeof this.elevation(end) !== 'undefined') {
                var climb = Math.abs(this.elevation(start) - this.elevation(end));
                distance = Math.sqrt(distance * distance + climb * climb);
            }

            return this.distance = Math.round(distance * Math.pow(10, precision) / accuracy) * accuracy / Math.pow(10, precision);

            /*
            // note: to return initial/final bearings in addition to distance, use something like:
            var fwdAz = Math.atan2(cosU2*sinLambda,  cosU1*sinU2-sinU1*cosU2*cosLambda);
            var revAz = Math.atan2(cosU1*sinLambda, -sinU1*cosU2+cosU1*sinU2*cosLambda);

            return { distance: s, initialBearing: fwdAz.toDeg(), finalBearing: revAz.toDeg() };
            */

        },


        /**
        * Calculates the distance between two spots.
        * This method is more simple but also far more inaccurate
        *
        * @param    object    Start position {latitude: 123, longitude: 123}
        * @param    object    End position {latitude: 123, longitude: 123}
        * @param    integer   Accuracy (in meters)
        * @return   integer   Distance (in meters)
        */
        getDistanceSimple: function(start, end, accuracy) {

            accuracy = Math.floor(accuracy) || 1;

            var distance =
                Math.round(
                    Math.acos(
                        Math.sin(
                            this.latitude(end).toRad()
                        ) *
                        Math.sin(
                            this.latitude(start).toRad()
                        ) +
                        Math.cos(
                            this.latitude(end).toRad()
                        ) *
                        Math.cos(
                            this.latitude(start).toRad()
                        ) *
                        Math.cos(
                            this.longitude(start).toRad() - this.longitude(end).toRad()
                        )
                    ) * this.radius
                );

            return geolib.distance = Math.floor(Math.round(distance/accuracy)*accuracy);

        },


    /**
        * Calculates the center of a collection of geo coordinates
        *
        * @param        array       Collection of coords [{latitude: 51.510, longitude: 7.1321}, {latitude: 49.1238, longitude: "8° 30' W"}, ...]
        * @return       object      {latitude: centerLat, longitude: centerLng}
        */
        getCenter: function(coords) {

            var coordsArray = coords;
            if(typeof coords === 'object' && !(coords instanceof Array)) {

                coordsArray = [];

                for(var key in coords) {
                    coordsArray.push(
                        this.coords(coords[key])
                    );
                }

            }

            if(!coordsArray.length) {
                return false;
            }

            var X = 0.0;
            var Y = 0.0;
            var Z = 0.0;
            var lat, lon, hyp;

            coordsArray.forEach(function(coord) {

                lat = this.latitude(coord).toRad();
                lon = this.longitude(coord).toRad();

                X += Math.cos(lat) * Math.cos(lon);
                Y += Math.cos(lat) * Math.sin(lon);
                Z += Math.sin(lat);

            }, this);

            var nb_coords = coordsArray.length;
            X = X / nb_coords;
            Y = Y / nb_coords;
            Z = Z / nb_coords;

            lon = Math.atan2(Y, X);
            hyp = Math.sqrt(X * X + Y * Y);
            lat = Math.atan2(Z, hyp);

            return {
                latitude: (lat * Geolib.TO_DEG).toFixed(6),
                longitude: (lon * Geolib.TO_DEG).toFixed(6)
            };

        },


        /**
        * Gets the max and min, latitude, longitude, and elevation (if provided).
        * @param        array       array with coords e.g. [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        * @return   object      {maxLat: maxLat,
        *                     minLat: minLat
        *                     maxLng: maxLng,
        *                     minLng: minLng,
        *                     maxElev: maxElev,
        *                     minElev: minElev}
        */
        getBounds: function(coords) {

            if (!coords.length) {
                return false;
            }

            var useElevation = this.elevation(coords[0]);

            var stats = {
                maxLat: -Infinity,
                minLat: Infinity,
                maxLng: -Infinity,
                minLng: Infinity
            };

            if (typeof useElevation != 'undefined') {
                stats.maxElev = 0;
                stats.minElev = Infinity;
            }

            for (var i = 0, l = coords.length; i < l; ++i) {

                stats.maxLat = Math.max(this.latitude(coords[i]), stats.maxLat);
                stats.minLat = Math.min(this.latitude(coords[i]), stats.minLat);
                stats.maxLng = Math.max(this.longitude(coords[i]), stats.maxLng);
                stats.minLng = Math.min(this.longitude(coords[i]), stats.minLng);

                if (useElevation) {
                    stats.maxElev = Math.max(this.elevation(coords[i]), stats.maxElev);
                    stats.minElev = Math.min(this.elevation(coords[i]), stats.minElev);
                }

            }

            return stats;

        },

        /**
        * Calculates the center of the bounds of geo coordinates.
        *
        * On polygons like political borders (eg. states)
        * this may gives a closer result to human expectation, than `getCenter`,
        * because that function can be disturbed by uneven distribution of
        * point in different sides.
        * Imagine the US state Oklahoma: `getCenter` on that gives a southern
        * point, because the southern border contains a lot more nodes,
        * than the others.
        *
        * @param        array       Collection of coords [{latitude: 51.510, longitude: 7.1321}, {latitude: 49.1238, longitude: "8° 30' W"}, ...]
        * @return       object      {latitude: centerLat, longitude: centerLng}
        */
        getCenterOfBounds: function(coords) {
            var b = this.getBounds(coords);
            var latitude = b.minLat + ((b.maxLat - b.minLat) / 2);
            var longitude = b.minLng + ((b.maxLng - b.minLng) / 2);
            return {
                latitude: parseFloat(latitude.toFixed(6)),
                longitude: parseFloat(longitude.toFixed(6))
            };
        },


        /**
        * Computes the bounding coordinates of all points on the surface
        * of the earth less than or equal to the specified great circle
        * distance.
        *
        * @param object Point position {latitude: 123, longitude: 123}
        * @param number Distance (in meters).
        * @return array Collection of two points defining the SW and NE corners.
        */
        getBoundsOfDistance: function(point, distance) {

            var latitude = this.latitude(point);
            var longitude = this.longitude(point);

            var radLat = latitude.toRad();
            var radLon = longitude.toRad();

            var radDist = distance / this.radius;
            var minLat = radLat - radDist;
            var maxLat = radLat + radDist;

            var MAX_LAT_RAD = this.maxLat.toRad();
            var MIN_LAT_RAD = this.minLat.toRad();
            var MAX_LON_RAD = this.maxLon.toRad();
            var MIN_LON_RAD = this.minLon.toRad();

            var minLon;
            var maxLon;

            if (minLat > MIN_LAT_RAD && maxLat < MAX_LAT_RAD) {

                var deltaLon = Math.asin(Math.sin(radDist) / Math.cos(radLat));
                minLon = radLon - deltaLon;

                if (minLon < MIN_LON_RAD) {
                    minLon += Geolib.PI_X2;
                }

                maxLon = radLon + deltaLon;

                if (maxLon > MAX_LON_RAD) {
                    maxLon -= Geolib.PI_X2;
                }

            } else {
                // A pole is within the distance.
                minLat = Math.max(minLat, MIN_LAT_RAD);
                maxLat = Math.min(maxLat, MAX_LAT_RAD);
                minLon = MIN_LON_RAD;
                maxLon = MAX_LON_RAD;
            }

            return [
                // Southwest
                {
                    latitude: minLat.toDeg(),
                    longitude: minLon.toDeg()
                },
                // Northeast
                {
                    latitude: maxLat.toDeg(),
                    longitude: maxLon.toDeg()
                }
            ];

        },


        /**
        * Checks whether a point is inside of a polygon or not.
        * Note that the polygon coords must be in correct order!
        *
        * @param        object      coordinate to check e.g. {latitude: 51.5023, longitude: 7.3815}
        * @param        array       array with coords e.g. [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        * @return       bool        true if the coordinate is inside the given polygon
        */
        isPointInside: function(latlng, coords) {

            for(var c = false, i = -1, l = coords.length, j = l - 1; ++i < l; j = i) {

                if(
                    (
                        (this.longitude(coords[i]) <= this.longitude(latlng) && this.longitude(latlng) < this.longitude(coords[j])) ||
                        (this.longitude(coords[j]) <= this.longitude(latlng) && this.longitude(latlng) < this.longitude(coords[i]))
                    ) &&
                    (
                        this.latitude(latlng) < (this.latitude(coords[j]) - this.latitude(coords[i])) *
                        (this.longitude(latlng) - this.longitude(coords[i])) /
                        (this.longitude(coords[j]) - this.longitude(coords[i])) +
                        this.latitude(coords[i])
                    )
                ) {
                    c = !c;
                }

            }

            return c;

        },


       /**
        * Pre calculate the polygon coords, to speed up the point inside check.
        * Use this function before calling isPointInsideWithPreparedPolygon()
        * @see          Algorythm from http://alienryderflex.com/polygon/
        * @param        array       array with coords e.g. [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        */
        preparePolygonForIsPointInsideOptimized: function(coords) {

            for(var i = 0, j = coords.length-1; i < coords.length; i++) {

            if(this.longitude(coords[j]) === this.longitude(coords[i])) {

                    coords[i].constant = this.latitude(coords[i]);
                    coords[i].multiple = 0;

                } else {

                    coords[i].constant = this.latitude(coords[i]) - (
                        this.longitude(coords[i]) * this.latitude(coords[j])
                    ) / (
                        this.longitude(coords[j]) - this.longitude(coords[i])
                    ) + (
                        this.longitude(coords[i])*this.latitude(coords[i])
                    ) / (
                        this.longitude(coords[j])-this.longitude(coords[i])
                    );

                    coords[i].multiple = (
                        this.latitude(coords[j])-this.latitude(coords[i])
                    ) / (
                        this.longitude(coords[j])-this.longitude(coords[i])
                    );

                }

                j=i;

            }

        },

      /**
       * Checks whether a point is inside of a polygon or not.
       * "This is useful if you have many points that need to be tested against the same (static) polygon."
       * Please call the function preparePolygonForIsPointInsideOptimized() with the same coords object before using this function.
       * Note that the polygon coords must be in correct order!
       *
       * @see          Algorythm from http://alienryderflex.com/polygon/
       *
       * @param     object      coordinate to check e.g. {latitude: 51.5023, longitude: 7.3815}
       * @param     array       array with coords e.g. [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
       * @return        bool        true if the coordinate is inside the given polygon
       */
        isPointInsideWithPreparedPolygon: function(point, coords) {

            var flgPointInside = false,
            y = this.longitude(point),
            x = this.latitude(point);

            for(var i = 0, j = coords.length-1; i < coords.length; i++) {

                if ((this.longitude(coords[i]) < y && this.longitude(coords[j]) >=y ||
                    this.longitude(coords[j]) < y && this.longitude(coords[i]) >= y)) {

                    flgPointInside^=(y*coords[i].multiple+coords[i].constant < x);

                }

                j=i;

            }

            return flgPointInside;

        },


        /**
        * Shortcut for geolib.isPointInside()
        */
        isInside: function() {
            return this.isPointInside.apply(this, arguments);
        },


        /**
        * Checks whether a point is inside of a circle or not.
        *
        * @param        object      coordinate to check (e.g. {latitude: 51.5023, longitude: 7.3815})
        * @param        object      coordinate of the circle's center (e.g. {latitude: 51.4812, longitude: 7.4025})
        * @param        integer     maximum radius in meters
        * @return       bool        true if the coordinate is within the given radius
        */
        isPointInCircle: function(latlng, center, radius) {
            return this.getDistance(latlng, center) < radius;
        },


        /**
        * Shortcut for geolib.isPointInCircle()
        */
        withinRadius: function() {
            return this.isPointInCircle.apply(this, arguments);
        },


        /**
        * Gets rhumb line bearing of two points. Find out about the difference between rhumb line and
        * great circle bearing on Wikipedia. It's quite complicated. Rhumb line should be fine in most cases:
        *
        * http://en.wikipedia.org/wiki/Rhumb_line#General_and_mathematical_description
        *
        * Function heavily based on Doug Vanderweide's great PHP version (licensed under GPL 3.0)
        * http://www.dougv.com/2009/07/13/calculating-the-bearing-and-compass-rose-direction-between-two-latitude-longitude-coordinates-in-php/
        *
        * @param        object      origin coordinate (e.g. {latitude: 51.5023, longitude: 7.3815})
        * @param        object      destination coordinate
        * @return       integer     calculated bearing
        */
        getRhumbLineBearing: function(originLL, destLL) {

            // difference of longitude coords
            var diffLon = this.longitude(destLL).toRad() - this.longitude(originLL).toRad();

            // difference latitude coords phi
            var diffPhi = Math.log(
                Math.tan(
                    this.latitude(destLL).toRad() / 2 + Geolib.PI_DIV4
                ) /
                Math.tan(
                    this.latitude(originLL).toRad() / 2 + Geolib.PI_DIV4
                )
            );

            // recalculate diffLon if it is greater than pi
            if(Math.abs(diffLon) > Math.PI) {
                if(diffLon > 0) {
                    diffLon = (Geolib.PI_X2 - diffLon) * -1;
                }
                else {
                    diffLon = Geolib.PI_X2 + diffLon;
                }
            }

            //return the angle, normalized
            return (Math.atan2(diffLon, diffPhi).toDeg() + 360) % 360;

        },


        /**
        * Gets great circle bearing of two points. See description of getRhumbLineBearing for more information
        *
        * @param        object      origin coordinate (e.g. {latitude: 51.5023, longitude: 7.3815})
        * @param        object      destination coordinate
        * @return       integer     calculated bearing
        */
        getBearing: function(originLL, destLL) {

            destLL['latitude'] = this.latitude(destLL);
            destLL['longitude'] = this.longitude(destLL);
            originLL['latitude'] = this.latitude(originLL);
            originLL['longitude'] = this.longitude(originLL);

            var bearing = (
                (
                    Math.atan2(
                        Math.sin(
                            destLL['longitude'].toRad() -
                            originLL['longitude'].toRad()
                        ) *
                        Math.cos(
                            destLL['latitude'].toRad()
                        ),
                        Math.cos(
                            originLL['latitude'].toRad()
                        ) *
                        Math.sin(
                            destLL['latitude'].toRad()
                        ) -
                        Math.sin(
                            originLL['latitude'].toRad()
                        ) *
                        Math.cos(
                            destLL['latitude'].toRad()
                        ) *
                        Math.cos(
                            destLL['longitude'].toRad() - originLL['longitude'].toRad()
                        )
                    )
                ).toDeg() + 360
            ) % 360;

            return bearing;

        },


        /**
        * Gets the compass direction from an origin coordinate to a destination coordinate.
        *
        * @param        object      origin coordinate (e.g. {latitude: 51.5023, longitude: 7.3815})
        * @param        object      destination coordinate
        * @param        string      Bearing mode. Can be either circle or rhumbline
        * @return       object      Returns an object with a rough (NESW) and an exact direction (NNE, NE, ENE, E, ESE, etc).
        */
        getCompassDirection: function(originLL, destLL, bearingMode) {

            var direction;
            var bearing;

            if(bearingMode == 'circle') {
                // use great circle bearing
                bearing = this.getBearing(originLL, destLL);
            } else {
                // default is rhumb line bearing
                bearing = this.getRhumbLineBearing(originLL, destLL);
            }

            switch(Math.round(bearing/22.5)) {
                case 1:
                    direction = {exact: "NNE", rough: "N"};
                    break;
                case 2:
                    direction = {exact: "NE", rough: "N"};
                    break;
                case 3:
                    direction = {exact: "ENE", rough: "E"};
                    break;
                case 4:
                    direction = {exact: "E", rough: "E"};
                    break;
                case 5:
                    direction = {exact: "ESE", rough: "E"};
                    break;
                case 6:
                    direction = {exact: "SE", rough: "E"};
                    break;
                case 7:
                    direction = {exact: "SSE", rough: "S"};
                    break;
                case 8:
                    direction = {exact: "S", rough: "S"};
                    break;
                case 9:
                    direction = {exact: "SSW", rough: "S"};
                    break;
                case 10:
                    direction = {exact: "SW", rough: "S"};
                    break;
                case 11:
                    direction = {exact: "WSW", rough: "W"};
                    break;
                case 12:
                    direction = {exact: "W", rough: "W"};
                    break;
                case 13:
                    direction = {exact: "WNW", rough: "W"};
                    break;
                case 14:
                    direction = {exact: "NW", rough: "W"};
                    break;
                case 15:
                    direction = {exact: "NNW", rough: "N"};
                    break;
                default:
                    direction = {exact: "N", rough: "N"};
            }

            direction['bearing'] = bearing;
            return direction;

        },


        /**
        * Shortcut for getCompassDirection
        */
        getDirection: function(originLL, destLL, bearingMode) {
            return this.getCompassDirection.apply(this, arguments);
        },


        /**
        * Sorts an array of coords by distance from a reference coordinate
        *
        * @param        object      reference coordinate e.g. {latitude: 51.5023, longitude: 7.3815}
        * @param        mixed       array or object with coords [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        * @return       array       ordered array
        */
        orderByDistance: function(latlng, coords) {

            var coordsArray = Object.keys(coords).map(function(idx) {
                var distance = this.getDistance(latlng, coords[idx]);
                var augmentedCoord = Object.create(coords[idx]);
                augmentedCoord.distance = distance;
                augmentedCoord.key = idx;
                return augmentedCoord;
            }, this);

            return coordsArray.sort(function(a, b) {
                return a.distance - b.distance;
            });

        },

        /**
        * Check if a point lies in line created by two other points
        *
        * @param    object    Point to check: {latitude: 123, longitude: 123}
        * @param    object    Start of line {latitude: 123, longitude: 123}
        * @param    object    End of line {latitude: 123, longitude: 123}
        * @return   boolean
        */
        isPointInLine: function(point, start, end) {

            return (this.getDistance(start, point, 1, 3)+this.getDistance(point, end, 1, 3)).toFixed(3)==this.getDistance(start, end, 1, 3);
        },

                /**
        * Check if a point lies within a given distance from a line created by two other points
        *
        * @param    object    Point to check: {latitude: 123, longitude: 123}
        * @param    object    Start of line {latitude: 123, longitude: 123}
        * @param    object    End of line {latitude: 123, longitude: 123}
        * @pararm   float     maximum distance from line
        * @return   boolean
        */
        isPointNearLine: function(point, start, end, distance) {
            return this.getDistanceFromLine(point, start, end) < distance;
        },

                     /**
        * return the minimum distance from a point to a line
        *
        * @param    object    Point away from line
        * @param    object    Start of line {latitude: 123, longitude: 123}
        * @param    object    End of line {latitude: 123, longitude: 123}
        * @return   float     distance from point to line
        */
        getDistanceFromLine: function(point, start, end) {
            var d1 = this.getDistance(start, point, 1, 3);
            var d2 = this.getDistance(point, end, 1, 3);
            var d3 = this.getDistance(start, end, 1, 3);
            var distance = 0;

            // alpha is the angle between the line from start to point, and from start to end //
            var alpha = Math.acos((d1*d1 + d3*d3 - d2*d2)/(2*d1*d3));
            // beta is the angle between the line from end to point and from end to start //
            var beta = Math.acos((d2*d2 + d3*d3 - d1*d1)/(2*d2*d3));

            // if the angle is greater than 90 degrees, then the minimum distance is the
            // line from the start to the point //
            if(alpha>Math.PI/2) {
                distance = d1;
            }
            // same for the beta //
            else if(beta > Math.PI/2) {
                distance = d2;
            }
            // otherwise the minimum distance is achieved through a line perpendular to the start-end line,
            // which goes from the start-end line to the point //
            else {
                distance = Math.sin(alpha) * d1;
            }

            return distance;
        },

        /**
        * Finds the nearest coordinate to a reference coordinate
        *
        * @param        object      reference coordinate e.g. {latitude: 51.5023, longitude: 7.3815}
        * @param        mixed       array or object with coords [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        * @return       array       ordered array
        */
        findNearest: function(latlng, coords, offset, limit) {

            offset = offset || 0;
            limit = limit || 1;
            var ordered = this.orderByDistance(latlng, coords);

            if(limit === 1) {
                return ordered[offset];
            } else {
                return ordered.splice(offset, limit);
            }

        },


        /**
        * Calculates the length of a given path
        *
        * @param        mixed       array or object with coords [{latitude: 51.5143, longitude: 7.4138}, {latitude: 123, longitude: 123}, ...]
        * @return       integer     length of the path (in meters)
        */
        getPathLength: function(coords) {

            var dist = 0;
            var last;

            for (var i = 0, l = coords.length; i < l; ++i) {
                if(last) {
                    //console.log(coords[i], last, this.getDistance(coords[i], last));
                    dist += this.getDistance(this.coords(coords[i]), last);
                }
                last = this.coords(coords[i]);
            }

            return dist;

        },


        /**
        * Calculates the speed between to points within a given time span.
        *
        * @param        object      coords with javascript timestamp {latitude: 51.5143, longitude: 7.4138, time: 1360231200880}
        * @param        object      coords with javascript timestamp {latitude: 51.5502, longitude: 7.4323, time: 1360245600460}
        * @param        object      options (currently "unit" is the only option. Default: km(h));
        * @return       float       speed in unit per hour
        */
        getSpeed: function(start, end, options) {

            var unit = options && options.unit || 'km';

            if(unit == 'mph') {
                unit = 'mi';
            } else if(unit == 'kmh') {
                unit = 'km';
            }

            var distance = geolib.getDistance(start, end);
            var time = ((end.time*1)/1000) - ((start.time*1)/1000);
            var mPerHr = (distance/time)*3600;
            var speed = Math.round(mPerHr * this.measures[unit] * 10000)/10000;
            return speed;

        },


        /**
         * Computes the destination point given an initial point, a distance
         * and a bearing
         *
         * see http://www.movable-type.co.uk/scripts/latlong.html for the original code
         *
         * @param        object     start coordinate (e.g. {latitude: 51.5023, longitude: 7.3815})
         * @param        float      longitude of the inital point in degree
         * @param        float      distance to go from the inital point in meter
         * @param        float      bearing in degree of the direction to go, e.g. 0 = north, 180 = south
         * @param        float      optional (in meter), defaults to mean radius of the earth
         * @return       object     {latitude: destLat (in degree), longitude: destLng (in degree)}
         */
        computeDestinationPoint: function(start, distance, bearing, radius) {

            var lat = this.latitude(start);
            var lng = this.longitude(start);

            radius = (typeof radius === 'undefined') ? this.radius : Number(radius);

            var δ = Number(distance) / radius; // angular distance in radians
            var θ = Number(bearing).toRad();

            var φ1 = Number(lat).toRad();
            var λ1 = Number(lng).toRad();

            var φ2 = Math.asin( Math.sin(φ1)*Math.cos(δ) +
                Math.cos(φ1)*Math.sin(δ)*Math.cos(θ) );
            var λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),
                    Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
            λ2 = (λ2+3*Math.PI) % (2*Math.PI) - Math.PI; // normalise to -180..+180°

            return {
                latitude: φ2.toDeg(),
                longitude: λ2.toDeg()
            };

        },


        /**
        * Converts a distance from meters to km, mm, cm, mi, ft, in or yd
        *
        * @param        string      Format to be converted in
        * @param        float       Distance in meters
        * @param        float       Decimal places for rounding (default: 4)
        * @return       float       Converted distance
        */
        convertUnit: function(unit, distance, round) {

            if(distance === 0) {

                return 0;

            } else if(typeof distance === 'undefined') {

                if(this.distance === null) {
                    throw new Error('No distance was given');
                } else if(this.distance === 0) {
                    return 0;
                } else {
                    distance = this.distance;
                }

            }

            unit = unit || 'm';
            round = (null == round ? 4 : round);

            if(typeof this.measures[unit] !== 'undefined') {
                return this.round(distance * this.measures[unit], round);
            } else {
                throw new Error('Unknown unit for conversion.');
            }

        },


        /**
        * Checks if a value is in decimal format or, if neccessary, converts to decimal
        *
        * @param        mixed       Value(s) to be checked/converted (array of latlng objects, latlng object, sexagesimal string, float)
        * @return       float       Input data in decimal format
        */
        useDecimal: function(value) {

            if(Object.prototype.toString.call(value) === '[object Array]') {

                var geolib = this;

                value = value.map(function(val) {

                    //if(!isNaN(parseFloat(val))) {
                    if(geolib.isDecimal(val)) {

                        return geolib.useDecimal(val);

                    } else if(typeof val == 'object') {

                        if(geolib.validate(val)) {

                            return geolib.coords(val);

                        } else {

                            for(var prop in val) {
                                val[prop] = geolib.useDecimal(val[prop]);
                            }

                            return val;

                        }

                    } else if(geolib.isSexagesimal(val)) {

                        return geolib.sexagesimal2decimal(val);

                    } else {

                        return val;

                    }

                });

                return value;

            } else if(typeof value === 'object' && this.validate(value)) {

                return this.coords(value);

            } else if(typeof value === 'object') {

                for(var prop in value) {
                    value[prop] = this.useDecimal(value[prop]);
                }

                return value;

            }


            if (this.isDecimal(value)) {

                return parseFloat(value);

            } else if(this.isSexagesimal(value) === true) {

                return parseFloat(this.sexagesimal2decimal(value));

            }

            throw new Error('Unknown format.');

        },

        /**
        * Converts a decimal coordinate value to sexagesimal format
        *
        * @param        float       decimal
        * @return       string      Sexagesimal value (XX° YY' ZZ")
        */
        decimal2sexagesimal: function(dec) {

            if (dec in this.sexagesimal) {
                return this.sexagesimal[dec];
            }

            var tmp = dec.toString().split('.');

            var deg = Math.abs(tmp[0]);
            var min = ('0.' + (tmp[1] || 0))*60;
            var sec = min.toString().split('.');

            min = Math.floor(min);
            sec = (('0.' + (sec[1] || 0)) * 60).toFixed(2);

            this.sexagesimal[dec] = (deg + '° ' + min + "' " + sec + '"');

            return this.sexagesimal[dec];

        },


        /**
        * Converts a sexagesimal coordinate to decimal format
        *
        * @param        float       Sexagesimal coordinate
        * @return       string      Decimal value (XX.XXXXXXXX)
        */
        sexagesimal2decimal: function(sexagesimal) {

            if (sexagesimal in this.decimal) {
                return this.decimal[sexagesimal];
            }

            var regEx = new RegExp(this.sexagesimalPattern);
            var data = regEx.exec(sexagesimal);
            var min = 0, sec = 0;

            if(data) {
                min = parseFloat(data[2]/60);
                sec = parseFloat(data[4]/3600) || 0;
            }

            var dec = ((parseFloat(data[1]) + min + sec)).toFixed(8);
            //var   dec = ((parseFloat(data[1]) + min + sec));

                // South and West are negative decimals
                dec = (data[7] == 'S' || data[7] == 'W') ? parseFloat(-dec) : parseFloat(dec);
                //dec = (data[7] == 'S' || data[7] == 'W') ? -dec : dec;

            this.decimal[sexagesimal] = dec;

            return dec;

        },


        /**
        * Checks if a value is in decimal format
        *
        * @param        string      Value to be checked
        * @return       bool        True if in sexagesimal format
        */
        isDecimal: function(value) {

            value = value.toString().replace(/\s*/, '');

            // looks silly but works as expected
            // checks if value is in decimal format
            return (!isNaN(parseFloat(value)) && parseFloat(value) == value);

        },


        /**
        * Checks if a value is in sexagesimal format
        *
        * @param        string      Value to be checked
        * @return       bool        True if in sexagesimal format
        */
        isSexagesimal: function(value) {

            value = value.toString().replace(/\s*/, '');

            return this.sexagesimalPattern.test(value);

        },

        round: function(value, n) {
            var decPlace = Math.pow(10, n);
            return Math.round(value * decPlace)/decPlace;
        }

    });

    // Node module
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {

        module.exports = geolib;

        // react native
        if (typeof global === 'object') {
          global.geolib = geolib;
        }

    // AMD module
    } else if (typeof define === "function" && define.amd) {

        define("geolib", [], function () {
            return geolib;
        });

    // we're in a browser
    } else {

        global.geolib = geolib;

    }

}(this));

},{}]},{},[2]);
