
const { ajaxGet, config } = require("./utils.js");
const geolib = require("geolib");


class App {
	constructor() {
		document.addEventListener("tizenhwkey", this.onKey.bind(this));
		document.addEventListener("rotarydetent", this.onRotate.bind(this));
		
		this.state = "LOCATING";
		this.location = null;
		this.lastLocation = null;
		this.bearing = null;
		this.compassDirection = null;
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
	}

	onLocation(result) {
		this.lastLocation = this.location;
		this.location = {latitude: result.coords.latitude, longitude: result.coords.longitude};
		if (this.lastLocation) {
			this.bearing = geolib.getBearing(this.lastLocation, this.location);
			this.compassDirection = geolib.getCompassDirection(this.lastLocation, this.location).exact;
		}
		if (this.state == "LOCATING") this.state = "SEARCH";
	}

	search(query) {
		const opts = {
			key: config.googleApiKey,
			location: this.location.latitude + "," + this.location.longitude,
			rankby: "distance",
			keyword: query
		};
		ajaxGet("https://maps.googleapis.com/maps/api/place/nearbysearch/json", opts, this.onSearchResult.bind(this));
		this.state = "SEARCHING";
	}

	onSearchResult(text) {
		const parse = item => ({
			name: item.name,
			location: {latitude: item.geometry.location.lat, longitude: item.geometry.location.lng},
			vicinity: item.vicinity,
			distance: this.printDistance(geolib.getDistance(this.location, item.geometry.location)),
			bearing: geolib.getBearing(this.location, item.geometry.location),
			direction: geolib.getCompassDirection(this.location, item.geometry.location).exact
		});
		this.searchResult = {
			items: JSON.parse(text).results.map(parse),
			index: 0
		};
		if (this.bearing != null) this.searchResult.items.sort(this.sortByBearing.bind(this));
		this.state = "SEARCH_RESULT";
	}

	sortByBearing(a, b) {
		let alpha = Math.abs(a.bearing-this.bearing);
		let beta = Math.abs(b.bearing-this.bearing);
		if (alpha > 180) alpha = 360-alpha;
		if (beta > 180) beta = 360-beta;
		if (alpha < beta) return -1;
		if (alpha > beta) return 1;
		return 0;
	}

	select() {
		const dest = this.searchResult.items[this.searchResult.index].location;
		const opts = {
			key: config.googleApiKey,
			origin: this.location.latitude + "," + this.location.longitude,
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
	
	printCoords(coords) {
		if (!coords) return '';
		return Number(coords.latitude).toFixed(6) + ',' + Number(coords.longitude).toFixed(6);
	}

	setArrowRotation(elem, myBearing, myLocation, destination) {
		if (myBearing != null && myLocation && destination) {
			const placeBearing = geolib.getBearing(myLocation, destination);
			const angle = placeBearing - myBearing;
			elem.style.transform = "rotate(" + angle + "deg)";
		}
	}
}


module.exports = { App };
