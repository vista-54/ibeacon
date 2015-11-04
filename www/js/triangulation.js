var existedBeaconsArr = [
    // {name, lat, lng, uid, major, minor}
//    {name: 'mTDB', lat: 0, lng: 0, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '14575', minor: '21386'},
//    {name: 'A4xg', lat: 7, lng: 0, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46650', minor: '37051'},
//    {name: 'c5nr', lat: 0, lng: 4.2, uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46609', minor: '33951'},

    //{name: 'mTDB', lat: 49.585966493118995,  lng: 34.546907767653465,  uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '14575', minor: '21386', height: 1 , level:1 },
    //{name: 'A4xg', lat: 49.58594519167159,   lng: 34.54695001244545,   uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46650', minor: '37051', height: 1 , level:1 },
    //{name: 'c5nr', lat: 49.585991272342035,  lng: 34.54693593084812,   uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46609', minor: '33951', height: 1 , level:1 },
];


//var scannedBeaconsArr = [
////    //  uuid, major, minor, rssi
//    {uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '14575', minor: '21386', rssi: -82, accuracy: 8.2 /*10*/},
//    {uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46650', minor: '37051', rssi: -76, accuracy: 4.2},
//    {uuid: 'F7826DA6-4FA2-4E98-8024-BC5B71E0893E', major: '46609', minor: '33951', rssi: -62, accuracy: 7}
//];


function buildRegionsFromExistedBeacons(existedBeacons) {
    var regionsArr = [];
    for (var i in existedBeacons) {
        var currExtBcn = existedBeacons[i];
        var exists = false;
        for (var j in regionsArr) {
            var currReg = regionsArr[j];
            if (currReg.uuid.toLowerCase() === currExtBcn.uuid.toLowerCase()) {
                exists = true;
                continue;
            }
        }
        if (!exists) {
            regionsArr.push({uuid: currExtBcn.uuid});
        }

    }
    return regionsArr;
}


function buildBeaconsWithRadiusesArray(scannedBeaconsArr, existedBeaconsArr) {
    var beaconsWithRadiuses = [];
    for (var i in scannedBeaconsArr) {
        var currScannedBeacon = scannedBeaconsArr[i];
        for (var j in existedBeaconsArr) {
            var currExistedBeacon = existedBeaconsArr[j];
            if ((currScannedBeacon.uuid.toLowerCase() == currExistedBeacon.uuid.toLowerCase())
                && (currScannedBeacon.major == currExistedBeacon.major)
                && (currScannedBeacon.minor == currExistedBeacon.minor)
            ) {
                beaconsWithRadiuses.push({
                    lng: currExistedBeacon.lng,
                    lat: currExistedBeacon.lat,
                    uuid: currExistedBeacon.uuid,
                    major: currExistedBeacon.major,
                    minor: currExistedBeacon.minor,
                    name:  currExistedBeacon.name,
                    radius: currScannedBeacon.avgAccuracy ? currScannedBeacon.avgAccuracy : currScannedBeacon.accuracy
                });
            }
        }
    }
    return beaconsWithRadiuses;
}


function calculateDistanceBetweenTwoDots(P1, P2, measure, withSign) {

    if (measure == 'deg') {
        var R = 6378.137; // Radius of earth in KM
        var dLat = (P1.lat - P2.lat) * Math.PI / 180;
        var dLng = (P1.lng - P2.lng) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(P1.lat * Math.PI / 180) * Math.cos(P2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        if(withSign  && (dLat<0 || dLng<0)  ){
            d= -d;
        }
        return d * 1000; // meters
    }
    if (measure == 'met') {
        var k1 = P1.lat - P2.lat;
        var k2 = P1.lng - P2.lng;
        var dist = Math.sqrt(k1 * k1 + k2 * k2);
        if(withSign && (k1<0 || k2<0)){
            dist = -dist;
        }
        return dist;
    }
    throw 'define measure: "deg" or "met" ';
    return null;
}


function findIntersectDotsByTwoCircles(P1, P2, measure) {  //Px{ lat, lng, radius }
    var l = calculateDistanceBetweenTwoDots(P1, P2, measure);
    var R1 = P1.radius;
    var R2 = P2.radius;

    var b = (R2 * R2 - R1 * R1 + l * l) / (2 * l);
    var a = l - b;
    var h = Math.sqrt(R2 * R2 - b * b);

    var P0lng = P1.lng + (a / l) * (P2.lng - P1.lng);
    var P0lat = P1.lat + (a / l) * (P2.lat - P1.lat);

    var D1lng = P0lng + ( P2.lat - P1.lat ) / l * h;
    var D1lat = P0lat - ( P2.lng - P1.lng ) / l * h;

    var D2lng = P0lng - ( P2.lat - P1.lat ) / l * h;
    var D2lat = P0lat + ( P2.lng - P1.lng ) / l * h;

    return {D1: {lng: D1lng, lat: D1lat}, D2: {lng: D2lng, lat: D2lat}};
}


function detectRealPosition(beaconsWithRadiuses, measure) {
    var interDots = [];
    var lines = [];

    if (beaconsWithRadiuses.length == 0) {
        return null;
    }

    //only one beacon
    if (beaconsWithRadiuses.length == 1) {
        var beacon = beaconsWithRadiuses[0];
        var dot = {
            lat: beacon.lat,
            lng: beacon.lng,
            probability: 0.1,
            avgRadius: beacon.radius,
            maxDistance: beacon.radius,
            minDistance: 0
        };
        return dot;
    }


    for (var i = 0; i < beaconsWithRadiuses.length; i++) {
        for (var j = i; j < beaconsWithRadiuses.length; j++) {
            if (i != j) {
                var dotsPair = findIntersectDotsByTwoCircles(beaconsWithRadiuses[i], beaconsWithRadiuses[j], measure);
                if (!isNaN(dotsPair.D1.lat) && !isNaN(dotsPair.D1.lng) && !isNaN(dotsPair.D2.lat) && !isNaN(dotsPair.D2.lng)) {
                    //interDots.push(dotsPair.D1);
                    //interDots.push(dotsPair.D2);
                    dotsPair.R1 = beaconsWithRadiuses[i].radius;
                    dotsPair.R2 = beaconsWithRadiuses[j].radius;
                    lines.push(dotsPair);  // its line

                } else {
                    // not intersects
                    //console.log('not intersects: '+beaconsWithRadiuses[i]+ ' with '+beaconsWithRadiuses[j]);
                    return null;
                    //continue;
                }
            }
        }
    }


    for (var i = 0; i < lines.length; i++) {
        for (var j = i; j < lines.length; j++) {
            if (i != j) {
                var interDot = getIntersectDot(lines[i], lines[j]);
                if (interDot) {
                    interDots.push(interDot);
                }

            }
        }
    }


    // one line , no intersect dots
    if (lines.length == 1) {
        //one line is two centers of circles
        var lineCirclesCenters = {D1: beaconsWithRadiuses[0], D2: beaconsWithRadiuses[1]};
        lines.push(lineCirclesCenters);
        var interDot = getIntersectDot(lines[0], lineCirclesCenters);
        interDots.push(interDot);
        interDots.push(interDot); // need for working algorithm

    }


    var intersectDot = {};
    if(interDots.length == 1){
        intersectDot = interDots[0];
    }
    if(interDots.length>1){
        var id = {lng_sum: 0, lat_sum: 0, count: 0};
        for (var i = 0; i < interDots.length; i++) {
            for (var j = i; j < interDots.length; j++) {
                if (i != j) {
                    id.count++;
                    id.lat_sum += interDots[i].lat;
                    id.lng_sum += interDots[j].lng;
                }
            }
        }
        intersectDot.lat = id.lat_sum / id.count;
        intersectDot.lng = id.lng_sum / id.count;
    }




    // get minimal length;
    var nearDots = [];
    for (var i = 0; i < lines.length; i++) {
        var dot1len = calculateDistanceBetweenTwoDots(intersectDot, lines[i].D1, measure);
        var dot2len = calculateDistanceBetweenTwoDots(intersectDot, lines[i].D2, measure);
        var min = Math.min(dot1len, dot2len);
        var nearDot = dot2len - dot1len >= 0 ? lines[i].D1 : lines[i].D2;
        nearDot.probability = 1 / min;
        nearDot.distance = min;
        nearDots.push(nearDot);
    }


    var s = {
        lng_num: 0,
        lng_den: 0,
        lat_num: 0,
        lat_den: 0,
        sum_prob: 0,
        sum_distance: 0,
        maxDistance: 0,
        minDistance: 1000
    };
    for (var i = 0; i < nearDots.length; i++) {
        var currDot = nearDots[i];
        s.lat_num += currDot.lat * currDot.probability;
        s.lat_den += currDot.probability;
        s.lng_num += currDot.lng * currDot.probability;
        s.lng_den += currDot.probability;
        s.sum_prob += currDot.probability;
        s.sum_distance += currDot.distance;
        if (currDot.distance > s.maxDistance) {
            s.maxDistance = currDot.distance;
        }
        if (currDot.distance < s.minDistance) {
            s.minDistance = currDot.distance;
        }
    }

    var avgLat = s.lat_num / s.lat_den;
    var avgLng = s.lng_num / s.lng_den;
    var probability = s.sum_prob / nearDots.length;
    var avgRadius = s.sum_distance / nearDots.length;

    return {
        lng: avgLng,
        lat: avgLat,
        probability: probability,
        avgRadius: avgRadius,
        maxDistance: s.maxDistance,
        minDistance: s.minDistance
    };
}



function corelateResult(beaconsWithRadiuses) {
    var beaconsWithRadiusesCopy = JSON.parse(JSON.stringify(beaconsWithRadiuses));
    if(beaconsWithRadiusesCopy.length == 1){
        //beaconsWithRadiusesCopy.push(beaconsWithRadiusesCopy[0]);
        //beaconsWithRadiusesCopy.push(beaconsWithRadiusesCopy[0]);
        return beaconsWithRadiusesCopy[0];
    }
    if(beaconsWithRadiusesCopy.length == 2){
        var p1 = beaconsWithRadiusesCopy[0];
        var p2 = beaconsWithRadiusesCopy[1];
        var dist = calculateDistanceBetweenTwoDots(p1, p2, 'deg');
        var k = dist/(p1.radius + p2.radius);
        p1.radius = p1.radius * k;
        p2.radius = p2.radius * k;

        var line = findIntersectDotsByTwoCircles(p1, p2, 'deg');
        var lArr=[];
        lArr.push(line.D1);
        lArr.push(line.D2);
        var centralDot = averageOfDots(lArr);

        //var centralDot1 = JSON.parse(JSON.stringify(beaconsWithRadiusesCopy[0]));
        //var centralDot2 = JSON.parse(JSON.stringify(beaconsWithRadiusesCopy[0]));
        //centralDot1.lat -=0.00005;
        //centralDot1.lng -=0.00005;
        //centralDot1.radius += 0.1;

        //centralDot2.lat +=0.00005;
        //centralDot2.lng +=0.00005;
        //centralDot2.radius += 0.1;
        //beaconsWithRadiusesCopy.push(centralDot1);
        //beaconsWithRadiusesCopy.push(centralDot2);
        return centralDot;
    }


    var positions = [];

    for (var i = 0; i < beaconsWithRadiusesCopy.length; i++) {
        for (var j = i; j < beaconsWithRadiusesCopy.length; j++) {
            for (var k = j; k < beaconsWithRadiusesCopy.length; k++) {
                if (i != j  &&  j != k) {
                    var cb1 = beaconsWithRadiusesCopy[i];
                    var cb2 = beaconsWithRadiusesCopy[j];
                    var cb3 = beaconsWithRadiusesCopy[k];
                    var pos = getTrilaterationMod(cb1, cb2, cb3, 'deg');
                    positions.push(pos);
                }
            }
        }
    }

    var pos = averageOfDots(positions);



    //var realPosition = getTrilaterationMod(beaconsWithRadiuses[0], beaconsWithRadiuses[1], beaconsWithRadiuses[2] , 'deg' )
    return pos;

}



function averageOfDots(dotsArr){
    var id = {lng_sum: 0, lat_sum: 0, count: 0};
    for (var i = 0; i < dotsArr.length; i++) {
        id.count++;
        id.lat_sum += dotsArr[i].lat;
        id.lng_sum += dotsArr[i].lng;
    }

    var avgDot = {};
    avgDot.lat = id.lat_sum / id.count;
    avgDot.lng = id.lng_sum / id.count;
    return avgDot;
}


//   http://download.milesburton.com/Trilateration/


//  http://inside.mines.edu/~whereman/talks/TurgutOzal-11-Trilateration.pdf


function getTrilaterationMod(P1, P2, P3, measure) {

    addUtmCoordinatesToDot(P1);
    addUtmCoordinatesToDot(P2);
    addUtmCoordinatesToDot(P3);

    var zone = P1.zone;
    var xa = P1.x;
    var ya = P1.y;
    var xb = P2.x;
    var yb = P2.y;
    var xc = P3.x;
    var yc = P3.y;

    var ra = P1.radius;
    var rb = P2.radius;
    var rc = P3.radius;
    var S = (Math.pow(xc, 2.) - Math.pow(xb, 2.) + Math.pow(yc, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(rc, 2.)) / 2.0;
    var T = (Math.pow(xa, 2.) - Math.pow(xb, 2.) + Math.pow(ya, 2.) - Math.pow(yb, 2.) + Math.pow(rb, 2.) - Math.pow(ra, 2.)) / 2.0;
    var y = ((T * (xb - xc)) - (S * (xb - xa))) / (((ya - yb) * (xb - xc)) - ((yc - yb) * (xb - xa)));
    var x = ((y * (ya - yb)) - T) / (xb - xa);

    var position = {x: x, y: y, z: 0};
    var returnedDegressCoords = {};
    var southHemi = false;
    if (P1.lat < 0){
        southHemi = true;
    }
    UTMXYToLatLon(x, y, zone, southHemi, returnedDegressCoords);

    position.lat = RadToDeg (returnedDegressCoords[0]);
    position.lng = RadToDeg (returnedDegressCoords[1]);

    return position;
}







//
//
//var beaconsWithRadiuses = buildBeaconsWithRadiusesArray(scannedBeaconsArr, existedBeaconsArr);
//var realPosition = corelateResult(beaconsWithRadiuses, 'deg');
//var realPosition = detectRealPosition(beaconsWithRadiuses, 'deg');
//realPosition;








//  cambertx.com/utm/


var pi = 3.14159265358979;

/* Ellipsoid model constants (actual values here are for WGS84) */
var sm_a = 6378137.0;
var sm_b = 6356752.314;
var sm_EccSquared = 6.69437999013e-03;

var UTMScaleFactor = 0.9996;


function addUtmCoordinatesToDot(p){

    var xy = new Array(2);

    var lat = p.lat;
    var lng = p.lng;

    if ((lng < -180.0) || (180.0 <= lng)) {
        //alert ("The longitude you entered is out of range.  " +
        //"Please enter a number in the range [-180, 180).");
        return false;
    }

    if ((lat < -90.0) || (90.0 < lat)) {
        //alert ("The latitude you entered is out of range.  " +
        //"Please enter a number in the range [-90, 90].");
        return false;
    }

    // Compute the UTM zone.
    var zone = Math.floor ((lng + 180.0) / 6) + 1;

    zone = LatLonToUTMXY (DegToRad (lat), DegToRad (lng), zone, xy);

    p.x = xy[0];
    p.y =  xy[1];
    p.zone = zone;
    //return {x: xy[0], y: xy[1] , zone: zone };


}

function UTMXYToLatLon (x, y, zone, southhemi, latlon)
{
    var cmeridian;

    x -= 500000.0;
    x /= UTMScaleFactor;

    /* If in southern hemisphere, adjust y accordingly. */
    if (southhemi)
        y -= 10000000.0;

    y /= UTMScaleFactor;

    cmeridian = UTMCentralMeridian (zone);
    MapXYToLatLon (x, y, cmeridian, latlon);

    return;
}

function LatLonToUTMXY (lat, lon, zone, xy)
{
    MapLatLonToXY (lat, lon, UTMCentralMeridian (zone), xy);

    /* Adjust easting and northing for UTM system. */
    xy[0] = xy[0] * UTMScaleFactor + 500000.0;
    xy[1] = xy[1] * UTMScaleFactor;
    if (xy[1] < 0.0)
        xy[1] = xy[1] + 10000000.0;

    return zone;
}




function DegToRad (deg)
{
    return (deg / 180.0 * pi)
}

function RadToDeg (rad)
{
    return (rad / pi * 180.0)
}



function UTMCentralMeridian (zone)
{
    var cmeridian;

    cmeridian = DegToRad (-183.0 + (zone * 6.0));

    return cmeridian;
}

function MapLatLonToXY (phi, lambda, lambda0, xy)
{
    var N, nu2, ep2, t, t2, l;
    var l3coef, l4coef, l5coef, l6coef, l7coef, l8coef;
    var tmp;

    /* Precalculate ep2 */
    ep2 = (Math.pow (sm_a, 2.0) - Math.pow (sm_b, 2.0)) / Math.pow (sm_b, 2.0);

    /* Precalculate nu2 */
    nu2 = ep2 * Math.pow (Math.cos (phi), 2.0);

    /* Precalculate N */
    N = Math.pow (sm_a, 2.0) / (sm_b * Math.sqrt (1 + nu2));

    /* Precalculate t */
    t = Math.tan (phi);
    t2 = t * t;
    tmp = (t2 * t2 * t2) - Math.pow (t, 6.0);

    /* Precalculate l */
    l = lambda - lambda0;

    /* Precalculate coefficients for l**n in the equations below
     so a normal human being can read the expressions for easting
     and northing
     -- l**1 and l**2 have coefficients of 1.0 */
    l3coef = 1.0 - t2 + nu2;

    l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2);

    l5coef = 5.0 - 18.0 * t2 + (t2 * t2) + 14.0 * nu2
    - 58.0 * t2 * nu2;

    l6coef = 61.0 - 58.0 * t2 + (t2 * t2) + 270.0 * nu2
    - 330.0 * t2 * nu2;

    l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - (t2 * t2 * t2);

    l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - (t2 * t2 * t2);

    /* Calculate easting (x) */
    xy[0] = N * Math.cos (phi) * l
    + (N / 6.0 * Math.pow (Math.cos (phi), 3.0) * l3coef * Math.pow (l, 3.0))
    + (N / 120.0 * Math.pow (Math.cos (phi), 5.0) * l5coef * Math.pow (l, 5.0))
    + (N / 5040.0 * Math.pow (Math.cos (phi), 7.0) * l7coef * Math.pow (l, 7.0));

    /* Calculate northing (y) */
    xy[1] = ArcLengthOfMeridian (phi)
    + (t / 2.0 * N * Math.pow (Math.cos (phi), 2.0) * Math.pow (l, 2.0))
    + (t / 24.0 * N * Math.pow (Math.cos (phi), 4.0) * l4coef * Math.pow (l, 4.0))
    + (t / 720.0 * N * Math.pow (Math.cos (phi), 6.0) * l6coef * Math.pow (l, 6.0))
    + (t / 40320.0 * N * Math.pow (Math.cos (phi), 8.0) * l8coef * Math.pow (l, 8.0));

    return;
}

function ArcLengthOfMeridian (phi)
{
    var alpha, beta, gamma, delta, epsilon, n;
    var result;

    /* Precalculate n */
    n = (sm_a - sm_b) / (sm_a + sm_b);

    /* Precalculate alpha */
    alpha = ((sm_a + sm_b) / 2.0)
    * (1.0 + (Math.pow (n, 2.0) / 4.0) + (Math.pow (n, 4.0) / 64.0));

    /* Precalculate beta */
    beta = (-3.0 * n / 2.0) + (9.0 * Math.pow (n, 3.0) / 16.0)
    + (-3.0 * Math.pow (n, 5.0) / 32.0);

    /* Precalculate gamma */
    gamma = (15.0 * Math.pow (n, 2.0) / 16.0)
    + (-15.0 * Math.pow (n, 4.0) / 32.0);

    /* Precalculate delta */
    delta = (-35.0 * Math.pow (n, 3.0) / 48.0)
    + (105.0 * Math.pow (n, 5.0) / 256.0);

    /* Precalculate epsilon */
    epsilon = (315.0 * Math.pow (n, 4.0) / 512.0);

    /* Now calculate the sum of the series and return */
    result = alpha
    * (phi + (beta * Math.sin (2.0 * phi))
    + (gamma * Math.sin (4.0 * phi))
    + (delta * Math.sin (6.0 * phi))
    + (epsilon * Math.sin (8.0 * phi)));

    return result;
}






function MapXYToLatLon (x, y, lambda0, philambda)
{
    var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf;
    var x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac;
    var x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;

    /* Get the value of phif, the footpoint latitude. */
    phif = FootpointLatitude (y);

    /* Precalculate ep2 */
    ep2 = (Math.pow (sm_a, 2.0) - Math.pow (sm_b, 2.0))
    / Math.pow (sm_b, 2.0);

    /* Precalculate cos (phif) */
    cf = Math.cos (phif);

    /* Precalculate nuf2 */
    nuf2 = ep2 * Math.pow (cf, 2.0);

    /* Precalculate Nf and initialize Nfpow */
    Nf = Math.pow (sm_a, 2.0) / (sm_b * Math.sqrt (1 + nuf2));
    Nfpow = Nf;

    /* Precalculate tf */
    tf = Math.tan (phif);
    tf2 = tf * tf;
    tf4 = tf2 * tf2;

    /* Precalculate fractional coefficients for x**n in the equations
     below to simplify the expressions for latitude and longitude. */
    x1frac = 1.0 / (Nfpow * cf);

    Nfpow *= Nf;   /* now equals Nf**2) */
    x2frac = tf / (2.0 * Nfpow);

    Nfpow *= Nf;   /* now equals Nf**3) */
    x3frac = 1.0 / (6.0 * Nfpow * cf);

    Nfpow *= Nf;   /* now equals Nf**4) */
    x4frac = tf / (24.0 * Nfpow);

    Nfpow *= Nf;   /* now equals Nf**5) */
    x5frac = 1.0 / (120.0 * Nfpow * cf);

    Nfpow *= Nf;   /* now equals Nf**6) */
    x6frac = tf / (720.0 * Nfpow);

    Nfpow *= Nf;   /* now equals Nf**7) */
    x7frac = 1.0 / (5040.0 * Nfpow * cf);

    Nfpow *= Nf;   /* now equals Nf**8) */
    x8frac = tf / (40320.0 * Nfpow);

    /* Precalculate polynomial coefficients for x**n.
     -- x**1 does not have a polynomial coefficient. */
    x2poly = -1.0 - nuf2;

    x3poly = -1.0 - 2 * tf2 - nuf2;

    x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2
    - 3.0 * (nuf2 *nuf2) - 9.0 * tf2 * (nuf2 * nuf2);

    x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;

    x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2
    + 162.0 * tf2 * nuf2;

    x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);

    x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);

    /* Calculate latitude */
    philambda[0] = phif + x2frac * x2poly * (x * x)
    + x4frac * x4poly * Math.pow (x, 4.0)
    + x6frac * x6poly * Math.pow (x, 6.0)
    + x8frac * x8poly * Math.pow (x, 8.0);

    /* Calculate longitude */
    philambda[1] = lambda0 + x1frac * x
    + x3frac * x3poly * Math.pow (x, 3.0)
    + x5frac * x5poly * Math.pow (x, 5.0)
    + x7frac * x7poly * Math.pow (x, 7.0);

    return;
}

function FootpointLatitude (y)
{
    var y_, alpha_, beta_, gamma_, delta_, epsilon_, n;
    var result;

    /* Precalculate n (Eq. 10.18) */
    n = (sm_a - sm_b) / (sm_a + sm_b);

    /* Precalculate alpha_ (Eq. 10.22) */
    /* (Same as alpha in Eq. 10.17) */
    alpha_ = ((sm_a + sm_b) / 2.0)
    * (1 + (Math.pow (n, 2.0) / 4) + (Math.pow (n, 4.0) / 64));

    /* Precalculate y_ (Eq. 10.23) */
    y_ = y / alpha_;

    /* Precalculate beta_ (Eq. 10.22) */
    beta_ = (3.0 * n / 2.0) + (-27.0 * Math.pow (n, 3.0) / 32.0)
    + (269.0 * Math.pow (n, 5.0) / 512.0);

    /* Precalculate gamma_ (Eq. 10.22) */
    gamma_ = (21.0 * Math.pow (n, 2.0) / 16.0)
    + (-55.0 * Math.pow (n, 4.0) / 32.0);

    /* Precalculate delta_ (Eq. 10.22) */
    delta_ = (151.0 * Math.pow (n, 3.0) / 96.0)
    + (-417.0 * Math.pow (n, 5.0) / 128.0);

    /* Precalculate epsilon_ (Eq. 10.22) */
    epsilon_ = (1097.0 * Math.pow (n, 4.0) / 512.0);

    /* Now calculate the sum of the series (Eq. 10.21) */
    result = y_ + (beta_ * Math.sin (2.0 * y_))
    + (gamma_ * Math.sin (4.0 * y_))
    + (delta_ * Math.sin (6.0 * y_))
    + (epsilon_ * Math.sin (8.0 * y_));

    return result;
}
