var isArray = function (value) {
    var stringValue = Object.prototype.toString.call(value);
    return (stringValue.toLowerCase() === "[object array]");
};

function parseUrlWithHisto() {
    if (window.location.hash)
        return parseUrl(window.location.hash);

    return parseUrl(window.location.search);
}

function parseUrl(query) {
    var index = query.indexOf('?');
    if (index >= 0)
        query = query.substring(index + 1);
    var res = {};
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var indexPos = vars[i].indexOf("=");
        if (indexPos < 0)
            continue;

        var key = vars[i].substring(0, indexPos);
        var value = vars[i].substring(indexPos + 1);
        value = decodeURIComponent(value.replace(/\+/g, ' '));
        // Handle keys witch contain a "." such as alternative_route.max_patch or "round_trip.distance"
        // Here we need to create objects and not arrays
        var dotPos = key.indexOf(".");
        if (dotPos > 0) {
            var tagname = key.substring(dotPos+1);
            key = key.substring(0, dotPos);
            var obj = {};
            obj[tagname] = value;
            if (res[key] !== undefined) {
                jQuery.extend(obj, res[key]); // Merging multiple objects into one. This was detected during debugging of "round_trip.distance" and "round_trip.seed" 
            }
            value = obj;
        }

        // force array for heading and point
        if (typeof res[key] === "undefined" && key !== "heading" && key !== "point") {
            if (value === 'true')
                value = true;
            else if (value === 'false')
                value = false;

            res[key] = value;
        } else {
            var tmpVal = res[key];
            if (isArray(tmpVal)) {
                tmpVal.push(value);
            } else if (tmpVal) {
                if (isArray(res[key]))
                   res[key] = [tmpVal, value];
                else
                   res[key] = value;  // Here we store the new object, which was created above.
            } else {
                res[key] = [value];
            }
        }
    }
    return res;
}

module.exports.parseUrl = parseUrl;
module.exports.parseUrlWithHisto = parseUrlWithHisto;
