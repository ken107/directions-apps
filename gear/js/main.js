
require("databind");
const controllers = require("./components.js");
const util = require("./utils.js");

const children = document.querySelector("template").children;
for (var i=0; i<children.length; i++) {
	const className = children[i].getAttribute("data-class");
	if (!className || !controllers[className]) throw new Error("Missing controller class " + className);
	dataBinder.views[className] = {template: children[i], controller: controllers[className]};
}

window.toggle = util.toggle;
