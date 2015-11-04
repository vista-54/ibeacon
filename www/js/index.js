///* 
// * To change this license header, choose License Headers in Project Properties.
// * To change this template file, choose Tools | Templates
// * and open the template in the editor.
// */
var isMobile = false;
if (document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1) {
    isMobile = true;
}
var ibeaconsCoords = [
    {name: 'mTDB', lat: 49.585966493118995, lng: 34.546907767653465, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '14575', minor: '21386', height: 1, level: 1},
    {name: 'A4xg', lat: 49.58594519167159, lng: 34.54695001244545, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46650', minor: '37051', height: 1, level: 1},
    {name: 'c5nr', lat: 49.585991272342035, lng: 34.54693593084812, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46609', minor: '33951', height: 1, level: 1}];
document.addEventListener("deviceready", onDeviceReady, false);
function initapp() {

    if (isMobile) {
        window.locationManager = cordova.plugins.locationManager;
        // Start tracking beacons!

        startScan();


    }

    // Display refresh timer.
    updateTimer = setInterval(displayBeaconList, 500);

    // initIndoorMap();

}
$(document).ready(function () {
    console.log('document ready');
    checkFullReady();

});

function onDeviceReady() {
    console.log('Device is ready');

//    alert("device ready");
//    StatusBar.overlaysWebView(false);
    deviceIsReady = true;
    checkFullReady();
}

function checkFullReady() {
    var its = checkFullReady;
    if (!its.readyCounter) {
        its.readyCounter = 0;
    }
    its.readyCounter++;
    if (!isMobile) {
        its.readyCounter++;
    }
    if (its.readyCounter === 2) {
        console.log('full ready');
        fullReady();
    }
}
function fullReady() {
//    readHost();
//    initIndoorLocation();
    googleMapLoadScript();
//    getExistedBeaconsArr();
}

function googleMapLoadScript() {

    setTimeout(function () {
        $.getScript('http://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true&' +
                'callback=initializeGoogleMap');
    }, 500);
}
function waitForLoadingMapsApi(callback, inited) {
    var its = waitForLoadingMapsApi;
    if (!its.callbacks) {
        its.callbacks = [];
    }
    if (!its.apiIsLoaded) {
        its.apiIsLoaded = false;
    }

    if (inited) {
        its.apiIsLoaded = true;
    }

    if (its.apiIsLoaded) {
        if (callback) {
            callback.call(null);
        }
    } else {
        if (callback) {
            its.callbacks.push(callback);
        }
    }

    if (its.apiIsLoaded) {
        while (its.callbacks.length > 0) {
            var currCallback = its.callbacks.shift();
            currCallback.call(null);
        }
    }
}
function initializeGoogleMap() {
    waitForLoadingMapsApi.apiIsLoaded = true;
    waitForLoadingMapsApi(null, true);
    console.log('google maps initialized success');


    var markerSize = {x: 22, y: 40};


    google.maps.Marker.prototype.setLabel = function (label) {
        this.label = new MarkerLabel({
            map: this.map,
            marker: this,
            text: label
        });
        this.label.bindTo('position', this, 'position');
    };

    var MarkerLabel = function (options) {
        this.setValues(options);
        this.span = document.createElement('span');
        this.span.className = 'map-marker-label';
    };

    MarkerLabel.prototype = $.extend(new google.maps.OverlayView(), {
        onAdd: function () {
            this.getPanes().overlayImage.appendChild(this.span);
            var self = this;
            this.listeners = [
                google.maps.event.addListener(this, 'position_changed', function () {
                    self.draw();
                })];
        },
        draw: function () {
            var text = String(this.get('text'));
            var position = this.getProjection().fromLatLngToDivPixel(this.get('position'));
            this.span.innerHTML = text;
            this.span.style.left = (position.x - (markerSize.x / 2)) - (text.length * 3) + 10 + 'px';
            this.span.style.top = (position.y - markerSize.y + 40) + 'px';
            this.span.style.height = 500 + 'px';
        }
    });


    // Animated Marker Movement. Robert Gerlach 2012-2013 https://github.com/combatwombat/marker-animate
// MIT license
//
// params:
// newPosition        - the new Position as google.maps.LatLng()
// options            - optional options object (optional)
// options.duration   - animation duration in ms (default 1000)
// options.easing     - easing function from jQuery and/or the jQuery easing plugin (default 'linear')
// options.complete   - callback function. Gets called, after the animation has finished
    google.maps.Marker.prototype.animateTo = function (newPosition, options) {
        defaultOptions = {
            duration: 1000,
            easing: 'linear',
            complete: null
        }
        options = options || {};

        // complete missing options
        for (key in defaultOptions) {
            options[key] = options[key] || defaultOptions[key];
        }

        // throw exception if easing function doesn't exist
        if (options.easing != 'linear') {
            if (typeof jQuery == 'undefined' || !jQuery.easing[options.easing]) {
                throw '"' + options.easing + '" easing function doesn\'t exist. Include jQuery and/or the jQuery easing plugin and use the right function name.';
                return;
            }
        }

        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

        // save current position. prefixed to avoid name collisions. separate for lat/lng to avoid calling lat()/lng() in every frame
        this.AT_startPosition_lat = this.getPosition().lat();
        this.AT_startPosition_lng = this.getPosition().lng();
        var newPosition_lat = newPosition.lat();
        var newPosition_lng = newPosition.lng();

        // crossing the 180� meridian and going the long way around the earth?
        if (Math.abs(newPosition_lng - this.AT_startPosition_lng) > 180) {
            if (newPosition_lng > this.AT_startPosition_lng) {
                newPosition_lng -= 360;
            } else {
                newPosition_lng += 360;
            }
        }

        var animateStep = function (marker, startTime) {
            var ellapsedTime = (new Date()).getTime() - startTime;
            var durationRatio = ellapsedTime / options.duration; // 0 - 1
            var easingDurationRatio = durationRatio;

            // use jQuery easing if it's not linear
            if (options.easing !== 'linear') {
                easingDurationRatio = jQuery.easing[options.easing](durationRatio, ellapsedTime, 0, 1, options.duration);
            }

            if (durationRatio < 1) {
                var deltaPosition = new google.maps.LatLng(marker.AT_startPosition_lat + (newPosition_lat - marker.AT_startPosition_lat) * easingDurationRatio,
                        marker.AT_startPosition_lng + (newPosition_lng - marker.AT_startPosition_lng) * easingDurationRatio);
                marker.setPosition(deltaPosition);

                // use requestAnimationFrame if it exists on this browser. If not, use setTimeout with ~60 fps
                if (window.requestAnimationFrame) {
                    marker.AT_animationHandler = window.requestAnimationFrame(function () {
                        animateStep(marker, startTime)
                    });
                } else {
                    marker.AT_animationHandler = setTimeout(function () {
                        animateStep(marker, startTime)
                    }, 17);
                }

            } else {

                marker.setPosition(newPosition);

                if (typeof options.complete === 'function') {
                    options.complete();
                }

            }
        }

        // stop possibly running animation
        if (window.cancelAnimationFrame) {
            window.cancelAnimationFrame(this.AT_animationHandler);
        } else {
            clearTimeout(this.AT_animationHandler);
        }

        animateStep(this, (new Date()).getTime());
    }





    //=============  Map  =========================

    google.maps.Map.prototype.animateTo = function (newPosition, options) {
        defaultOptions = {
            duration: 1000,
            easing: 'linear',
            complete: null
        }
        options = options || {};

        // complete missing options
        for (key in defaultOptions) {
            options[key] = options[key] || defaultOptions[key];
        }

        // throw exception if easing function doesn't exist
        if (options.easing != 'linear') {
            if (typeof jQuery == 'undefined' || !jQuery.easing[options.easing]) {
                throw '"' + options.easing + '" easing function doesn\'t exist. Include jQuery and/or the jQuery easing plugin and use the right function name.';
                return;
            }
        }

        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

        // save current position. prefixed to avoid name collisions. separate for lat/lng to avoid calling lat()/lng() in every frame
        this.AT_startPosition_lat = this.getCenter().lat();
        this.AT_startPosition_lng = this.getCenter().lng();
        var newPosition_lat = newPosition.lat();
        var newPosition_lng = newPosition.lng();

        // crossing the 180� meridian and going the long way around the earth?
        if (Math.abs(newPosition_lng - this.AT_startPosition_lng) > 180) {
            if (newPosition_lng > this.AT_startPosition_lng) {
                newPosition_lng -= 360;
            } else {
                newPosition_lng += 360;
            }
        }

        var animateStep = function (map, startTime) {
            var ellapsedTime = (new Date()).getTime() - startTime;
            var durationRatio = ellapsedTime / options.duration; // 0 - 1
            var easingDurationRatio = durationRatio;

            // use jQuery easing if it's not linear
            if (options.easing !== 'linear') {
                easingDurationRatio = jQuery.easing[options.easing](durationRatio, ellapsedTime, 0, 1, options.duration);
            }

            if (durationRatio < 1) {
                var deltaPosition = new google.maps.LatLng(map.AT_startPosition_lat + (newPosition_lat - map.AT_startPosition_lat) * easingDurationRatio,
                        map.AT_startPosition_lng + (newPosition_lng - map.AT_startPosition_lng) * easingDurationRatio);
                map.setCenter(deltaPosition);

                // use requestAnimationFrame if it exists on this browser. If not, use setTimeout with ~60 fps
                if (window.requestAnimationFrame) {
                    map.AT_animationHandler = window.requestAnimationFrame(function () {
                        animateStep(map, startTime)
                    });
                } else {
                    map.AT_animationHandler = setTimeout(function () {
                        animateStep(map, startTime)
                    }, 17);
                }

            } else {

                map.setCenter(newPosition);

                if (typeof options.complete === 'function') {
                    options.complete();
                }

            }
        }

        // stop possibly running animation
        if (window.cancelAnimationFrame) {
            window.cancelAnimationFrame(this.AT_animationHandler);
        } else {
            clearTimeout(this.AT_animationHandler);
        }

        animateStep(this, (new Date()).getTime());
    }


    ///===========================================
    initIndoorLocation();

    //createMap();
}
function createMap() {
    console.log("mapcreate");
    var position = {latitude: 49.586005, longitude: 34.546943};

    //getCurrentPosition(afterGettingPosition);
    drawMap(position);
    /*function afterGettingPosition(result) {
     if (result.error) {
     showErrorMessage(eMsg.cannotGetPosition + ' : ' + result.error);
     return;
     }
     
     position = result.position;
     console.log(' position.latitude : ' + position.latitude + ';   position.longitude : ' + position.longitude);
     
     waitForLoadingMapsApi(function () {
     drawMap(position);
     });
     
     
     }
     ;
     */

}
function drawMap(fromPosition) {
    var mapContainer = $('#indoor-map').get(0);
    var trackCoords = [];
    var fromPos = new google.maps.LatLng(fromPosition.latitude, fromPosition.longitude);
//    var toPos = new google.maps.LatLng(toPosition.latitude, toPosition.longitude);
    trackCoords.push(fromPos);
//    trackCoords.push(toPos);

    var mapOptions = {
        zoom: 15,
        center: new google.maps.LatLng(fromPosition.latitude, fromPosition.longitude),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };


    map = new google.maps.Map(mapContainer, mapOptions);
//    directionsService = new google.maps.DirectionsService();
    /* var markerCurrPos = new google.maps.Marker({
     position: fromPos,
     map: map,
     title: 'My pos'
     });
     
     var markerMuseumPos = new google.maps.Marker({
     position: toPos,
     map: map,
     title: 'Museum pos'
     });*/
    var image = 'js/images/beacon.png';
    for (var i = 0; i < ibeaconsCoords.length; i++) {
        var beachMarker = new google.maps.Marker({
            position: {lat: ibeaconsCoords[i].lat, lng: ibeaconsCoords[i].lng},
            map: map,
            icon: image
        });
    }

    $('.map').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        var target = e.target;
        if (target.tagName === 'IMG') {
            return false;
        }
    });
    // requestDirections(fromPos, toPos, {strokeColor: "#ff0000"});
//    map.setCenter(trackCoords[0]);
//var trackPath = new google.maps.Polyline({
//        path: trackCoords ,
//        strokeColor: "#FF0000",
//        strokeOpacity: 1.0,
//        strokeWeight: 4
//    });
//
//trackPath.setMap(map);
//    addMarker(trackCoords[0],"Start");
//    addMarker(trackCoords[trackCoords.length-1],"finish");
}

function getCurrentPosition(callback) {
    var its = getCurrentPosition;
    if (!its.previousCallTime) {
        its.previousCallTime = 0;
    }
    if (!its.callbacks) {
        its.callbacks = [];
    }

    var previousCallTime = its.previousCallTime;
    var currTime = new Date().getTime();
    var addToCallbacks = false;
    if (currTime - previousCallTime < 100) {  // 100 milliseconds default timeout
        addToCallbacks = true;

    }
    its.previousCallTime = currTime;

    if (addToCallbacks) {
        its.callbacks.push(callback);
        return;
    }
    its.callbacks.push(callback);


    //if(! isDeviceReady() ){ return false;}
    navigator.geolocation.getCurrentPosition(
            function (position) {
                its.lastSavedCoords = position.coords;
                var retObj = {status: {success: true}, position: position.coords};
                while (its.callbacks.length > 0) {
                    var currCallback = its.callbacks.shift();
                    currCallback.call(null, retObj);
                }
                its.callbacks = [];
                console.log("return geo coords Success");
            },
            function (error) {
                var retObj = {status: {error: true}, error: error.message};
                while (its.callbacks.length > 0) {
                    var currCallback = its.callbacks.shift();
                    currCallback.call(null, retObj);
                }
                console.log("Fail getting coords");
            },
            {
                //enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
    );
}
