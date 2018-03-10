
const { ajaxGet, config } = require("./utils.js");
const geolib = require("geolib");


class App {
	constructor() {
		document.addEventListener("tizenhwkey", this.onKey.bind(this));
		document.addEventListener("rotarydetent", this.onRotate.bind(this));
		
		this.state = "LOCATE";
		this.location = null;
		this.searchResult = null;
		this.directionsResult = null;
		this.locate();
	}

	onKey(event) {
		if (event.keyName == "back") this.goBack();
	}

	onRotate(event) {
		this.scroll(event.detail.direction == 'CCW' ? 'UP' : 'DOWN');
	}

	goBack() {
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

	scroll(direction) {
		let data;
		if (this.state == "SEARCH_RESULT") data = this.searchResult;
		else if (this.state == "DIRECTIONS") data = this.directionsResult;
		
		if (data) {
			if (direction == 'UP' && data.index > 0) data.index--;
			if (direction == 'DOWN' && data.index+1 < data.items.length) data.index++;
		}
	}

	locate() {
		navigator.geolocation.getCurrentPosition(this.onLocation.bind(this));
		this.state = "LOCATING";
	}

	onLocation(result) {
		this.location = result;
		this.state = "SEARCH";
	}

	search(query) {
		const opts = {
			key: config.googleApiKey,
			location: this.location.coords.latitude + "," + this.location.coords.longitude,
			rankby: "distance",
			keyword: query
		};
		ajaxGet("https://maps.googleapis.com/maps/api/place/nearbysearch/json", opts, this.onSearchResult.bind(this));
		this.state = "SEARCHING";
	}

	onSearchResult(text) {
		this.searchResult = {
			items: JSON.parse(text).results.map(item => {
				return {
					name: item.name,
					location: {latitude: item.geometry.location.lat, longitude: item.geometry.location.lng},
					vicinity: item.vicinity,
					distance: this.printDistance(geolib.getDistance(this.location.coords, item.geometry.location)),
					direction: this.printDirection(geolib.getCompassDirection(this.location.coords, item.geometry.location))
				}
			}),
			index: 0
		};
		this.state = "SEARCH_RESULT";
	}

	select() {
		const dest = this.searchResult.items[this.searchResult.index].location;
		const opts = {
			key: config.googleApiKey,
			origin: this.location.coords.latitude + "," + this.location.coords.longitude,
			destination: dest.latitude + "," + dest.longitude
		}
		ajaxGet("https://maps.googleapis.com/maps/api/directions/json", opts, this.onDirectionsResult.bind(this));
		this.state = "GETTING_DIRECTIONS";
	}
	
	onDirectionsResult(text) {
		this.directionsResult = {
			items: JSON.parse(text).routes[0].legs[0].steps.map(step => {
				return {
					instruction: step.html_instructions,
					distance: step.distance.text
				}
			}),
			index: 0
		}
		this.state = "DIRECTIONS";
	}
	
	printDistance(d) {
		return (d /1000 *5 /8).toFixed(2) + ' mi';
	}
	
	printDirection(d) {
		return d.exact;
	}
}


module.exports = { App };
