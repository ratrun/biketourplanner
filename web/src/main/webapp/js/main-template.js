var menu = require('./menu.js');
global.d3 = require('d3');
var L = require('leaflet');
require('./lib/leaflet.contextmenu.js');
require('leaflet-loading');
require('./lib/leaflet.elevation-0.0.4.min.js');
require('./lib/leaflet_numbered_markers.js');

global.jQuery = require('jquery');
global.$ = global.jQuery;
require('./lib/jquery-ui-custom-1.12.0.min.js');
require("./lib/jquery.history.js"),
require('./lib/jquery.autocomplete.js');
var mathTools = require('./tools/math.js');

var ghServerRespondedOk = false;

var ghenv = require("./config/options.js").options;

console.log("Environment=" + ghenv.environment);

var GHInput = require('./graphhopper/GHInput.js');
var GHRequest = require('./graphhopper/GHRequest.js');
var host = ghenv.routing.host;
if (!host) {
    if (location.port === '') {
        host = location.protocol + '//' + location.hostname;
    } else {
        host = location.protocol + '//' + location.hostname + ":" + location.port;
    }
}
var seed = 0;
var switchingUrlParams;

var AutoComplete = require('./autocomplete.js');
if (ghenv.environment === 'development')
    var autocomplete = AutoComplete.prototype.createStub();
else
    var autocomplete = new AutoComplete(ghenv.geocoding.host, ghenv.geocoding.api_key);

var mapLayer = require('./map.js');
var nominatim = require('./nominatim.js');
var routeManipulation = require('./routeManipulation.js');
var gpxExport = require('./gpxexport.js');
var messages = require('./messages.js');
var translate = require('./translate.js');

var format = require('./tools/format.js');
var urlTools = require('./tools/url.js');
var vehicle = require('./tools/vehicle.js');
var tileLayers = require('./config/tileLayers.js');

var debug = false;
var ghRequest = new GHRequest(host, ghenv.routing.api_key);
var bounds = {};

var metaVersionInfo;
var lastghResponse; // Copy of the last routing result (json format)

// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
if (global.window) {
    window.log = function () {
        log.history = log.history || [];   // store logs to an array for reference
        log.history.push(arguments);
        if (this.console && debug) {
            console.log(Array.prototype.slice.call(arguments));
        }
    };
}

function enableRoundTripButton(newseed, distance, headingEnabled) {
  $("#roundTripButton").show();
  $("#ABTourButton").show();
  $("#roundTripButton").prop("disabled", true);
  $("#ABTourButton").prop("disabled", false);
  $("#roundtripcontrol").show();
  $("#roundtripcontrol").css("visibility","visible");
  $("#roundtripdistance").show();
  $("#roundtripdistance").css("visibility","visible");
  $("#roundtripdistance").spinner( "value", distance / 1000 );
  ghRequest.api_params.round_trip.distance = 1000 * $("#roundtripdistance").spinner('value');
  $("#alternativeRoutecontrol").hide();
  $("#useHeading").prop("checked",headingEnabled!==undefined);
  if (headingEnabled!==undefined) {
      $("#roundtripheading").val(headingEnabled[0]).trigger('change');

  }
  $("#1_Div").hide();
  $("#routingSettings").show();
  $( "#tabs" ).tabs({ active: 0 });

  ghRequest.api_params.algorithm = "roundTrip";
  for (i=1;i<=ghRequest.route.size();i++) {
      ghRequest.route.removeSingle(i);
  }
  mapLayer.clearLayers();
  mapLayer.adjustMapSize();
  mapLayer.setDisabledForMapsContextMenu('start', false);
  mapLayer.setDisabledForMapsContextMenu('intermediate', true);
  mapLayer.setDisabledForMapsContextMenu('end', true);
  seed = newseed;
}

function enableABButton(clearmap) {
  $("#roundTripButton").show();
  $("#ABTourButton").show();
  $("#roundTripButton").prop("disabled", false);
  $("#ABTourButton").prop("disabled", true);
  $("#roundtripcontrol").hide();
  $("#roundtripdistance").hide();
  $("#alternativeRoutecontrol").show();
  $("#alternativeRoutecontrol").css("visibility","visible");
  $("#routingSettings").show();
  $( "#tabs" ).tabs({ active: 0 });
  
  if (clearmap) {
    mapLayer.clearLayers();
    mapLayer.adjustMapSize();
  }
  $("#1_Div").show();
  ghRequest.api_params.algorithm = "";
  mapLayer.setDisabledForMapsContextMenu('start', false);
  mapLayer.setDisabledForMapsContextMenu('intermediate', false);
  mapLayer.setDisabledForMapsContextMenu('end', false);
}

function mainInit(graphopperServerStartedOnce) {
  if (!graphopperServerStartedOnce) {
    tileLayers.setHost("localhost");
    console.log("mainInit() called with graphopperServerStartedOnce=" + graphopperServerStartedOnce);
    // fixing cross domain support e.g in Opera
    jQuery.support.cors = true;

    //gpxExport.addGpxExport(ghRequest);

    if (isProduction())
        $('#hosting').show();

    var History = window.History;
    if (History.enabled) {
        History.Adapter.bind(window, 'statechange', function () {
            // No need for workaround?
            // Chrome and Safari always emit a popstate event on page load, but Firefox doesn’t
            // https://github.com/defunkt/jquery-pjax/issues/143#issuecomment-6194330

            var state = History.getState();
            initFromParams(state.data, true);
        });
    }

    $('#locationform').submit(function (e) {
        // no page reload
        e.preventDefault();
        graphHopperSubmit();
    });

    $('#tripForm').submit(function (e) {
        // no page reload
        e.preventDefault();
        tripSubmit();
    });

    last_id = parseInt(localStorage['last_id']);
    if (isNaN(last_id))
        last_id = 1; // Start with 1
    
    $('#saveTripButton').click(function(e) {
        e.preventDefault();
        var roundtripActive = $("#roundTripButton").prop("disabled");
        if ( (!roundtripActive) && (ghRequest.route.isResolved()) ||
             (roundtripActive) && (ghRequest.from.isResolved()) ) {
            var $tree = $('#tripTree');
            last_id += 1;
            var route = [];
            for (var i=0; i<ghRequest.route.length;i++) {
                route.push({ "lat": ghRequest.route[i].lat, 
                             "lng": ghRequest.route[i].lng });
            }

            $tree.jstree().create_node("#" ,  { 
                                       "id" : last_id, 
                                       "text" : "Tour " + last_id,
                                       "data" : {"historyURL": ghRequest.createHistoryURL(),
                                                 "activeOsmfile": menu.getActiveOSMfile(),
                                                 "route" : route
                                                }},
                                       "last");

            localStorage['tripData'] = JSON.stringify($tree.jstree(true).get_json('#', { 'flat': true }));
            localStorage['last_id'] = last_id;
            saveghResponses(lastghResponse, last_id, function () {
                 console.log('lastghResponse saved');
            });
        }
        return;
    });

    $("#roundTripButton").click(function(e) {
        enableRoundTripButton(0, 40000, undefined);
    });

    $("#ABTourButton").click(function(e) {
        enableABButton(true);
    });

    $("#roundtripheading").knob({
        'release' : function (v) { 
            $("#useHeading").prop("checked",true);
            ghRequest.api_params.round_trip.distance = 1000 * $("#roundtripdistance").spinner('value');
            ghRequest.api_params.heading = v;
            seed = 0;
            graphHopperSubmit();
        }
    });
  } else {
      var roundtripActive = $("#roundTripButton").prop("disabled");
      if (!roundtripActive)
          enableABButton(false);
  }

    var urlParams = urlTools.parseUrlWithHisto();
    ghRequest = new GHRequest(host, ghenv.routing.api_key);

    if ((!graphopperServerStartedOnce) && (switchingUrlParams === undefined))
       ghRequest.initVehicle("bike");
    $.when(ghRequest.fetchTranslationMap(urlParams.locale), ghRequest.getInfo())
            .then(function (arg1, arg2) {
                ghServerRespondedOk = true;
                console.log("fetchTranslationMap and getInfo finished. ghServerRespondedOk = " + ghServerRespondedOk);
                // init translation retrieved from first call (fetchTranslationMap)
                var translations = arg1[0];
                autocomplete.setLocale(translations.locale);
                ghRequest.setLocale(translations.locale);
                translate.init(translations);

                // init bounding box from getInfo result
                var json = arg2[0];
                var tmp = json.bbox;
                bounds.initialized = true;
                bounds.minLon = tmp[0];
                bounds.minLat = tmp[1];
                bounds.maxLon = tmp[2];
                bounds.maxLat = tmp[3];
                nominatim.setBounds(bounds);
                var vehiclesDiv = $("#vehicles");
                vehiclesDiv.empty();
                $('#error').empty();

                function createButton(vehicle, hide) {
                    var button = $("<button class='vehicle-btn' title='" + translate.tr(vehicle) + "'/>");
                    if (hide)
                        button.hide();

                    button.attr('id', vehicle);
                    button.html("<img src='./img/" + vehicle + ".png' alt='" + translate.tr(vehicle) + "'></img>");
                    button.click(function () {
                        ghRequest.initVehicle(vehicle);
                        resolveAll();
                        routeLatLng(ghRequest);
                    });
                    return button;
                }

                if (json.features) {
                    ghRequest.features = json.features;

                    // car, foot and bike should come first. mc comes last
                    var prefer = {"car": 1, "foot": 2, "bike": 3, "motorcycle": 10000};
                    var showAllVehicles = urlParams.vehicle && (!prefer[urlParams.vehicle] || prefer[urlParams.vehicle] > 3);
                    var vehicles = vehicle.getSortedVehicleKeys(json.features, prefer);
                    if (vehicles.length > 0)
                        ghRequest.initVehicle(vehicles[0]);

                    var hiddenVehicles = [];
                    for (var i in vehicles) {
                        var btn = createButton(vehicles[i].toLowerCase(), !showAllVehicles && i > 2);
                        vehiclesDiv.append(btn);

                        if (i > 2)
                            hiddenVehicles.push(btn);
                    }

                    if (!showAllVehicles && vehicles.length > 3) {
                        var moreBtn = $("<a id='more-vehicle-btn'> ...</a>").click(function () {
                            moreBtn.hide();
                            for (var i in hiddenVehicles) {
                                hiddenVehicles[i].show();
                            }
                        });
                        vehiclesDiv.append($("<a class='vehicle-info-link' href='https://graphhopper.com/api/1/docs/supported-vehicle-profiles/'>?</a>"));
                        vehiclesDiv.append(moreBtn);
                    }
                }
                metaVersionInfo = messages.extractMetaVersionInfo(json);
                if (switchingUrlParams === undefined) {
                    mapLayer.multipleCallableInitMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, urlParams.layer, urlParams.use_miles);
                    if (!graphopperServerStartedOnce)
                       initFromParams(urlParams, true);
                } else {
                    mapLayer.multipleCallableInitMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, switchingUrlParams.layer, switchingUrlParams.use_miles);
                    initFromParams(switchingUrlParams, true);
                    switchingUrlParams = undefined;
                }
                checkInput();
                gpxExport.addGpxExport(ghRequest);
            }, function (err) {
                ghServerRespondedOk = false;
                console.log(err);

                $('#error').html('GraphHopper server offline? <a href="http://" + host + "/">Refresh</a>' + '<br/>Status: ' + err.statusText + '<br/>' + 'host=' + host);

                bounds = {
                    "minLon": -180,
                    "minLat": -90,
                    "maxLon": 180,
                    "maxLat": 90
                };
                nominatim.setBounds(bounds);

                mapLayer.multipleCallableInitMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, urlParams.use_miles);
            });

    $(window).resize(function () {
        mapLayer.adjustMapSize();
    });

    if (menu.runningUnderNW) {
        nw.Window.get().on('close', function(){
            // Save eventually altered trip data
            localStorage['tripData'] = JSON.stringify($('#tripTree').jstree(true).get_json('#', { 'flat': true }));
        });
        setTimeout(function() {
           menu.initBikeTourPlannerMenu();
        }, 1000);
    }

    $("#locationpoints").sortable({
        items: ".pointDiv",
        cursor: "n-resize",
        containment: "parent",
        handle: ".pointFlag",
        update: function (event, ui) {
            var origin_index = $(ui.item[0]).data('index');
            sortable_items = $("#locationpoints > div.pointDiv");
            $(sortable_items).each(function (index) {
                var data_index = $(this).data('index');
                if (origin_index === data_index) {
                    //log(data_index +'>'+ index);
                    ghRequest.route.move(data_index, index);
                    if (!routeIfAllResolved())
                        checkInput();
                    return false;
                }
            });
        }
    });

    $('#locationpoints > div.pointAdd').click(function () {
        ghRequest.route.add(new GHInput());
        checkInput();
    });

    checkInput();
}

module.exports.mainInit = mainInit;

function getghServerRespondedOk()
{
    return ghServerRespondedOk;
}
function resetServerRespondedOk()
{
    ghServerRespondedOk = false;
}
module.exports.getghServerRespondedOk = getghServerRespondedOk;
module.exports.resetServerRespondedOk = resetServerRespondedOk;

$(document).ready(function () {
    console.log("document ready");
    if (!menu.runningUnderNW)
       mainInit(true);
});

function initFromParams(params, doQuery) {
    ghRequest.init(params);
    var count = 0;
    var singlePointIndex;
    if (params.point)
        for (var key = 0; key < params.point.length; key++) {
            if (params.point[key] !== "") {
                count++;
                singlePointIndex = key;
            }
        }

    var routeNow = params.point && count >= 2;
    if (routeNow) {
        resolveCoords(params.point, doQuery);
    } else if (params.point && count === 1) {
        ghRequest.route.set(params.point[singlePointIndex], singlePointIndex, true);
        resolveIndex(singlePointIndex).done(function () {
            mapLayer.focus(ghRequest.route.getIndex(singlePointIndex), 15, singlePointIndex);
        });
    }
}

function resolveCoords(pointsAsStr, doQuery) {
    for (var i = 0, l = pointsAsStr.length; i < l; i++) {
        var pointStr = pointsAsStr[i];
        var coords = ghRequest.route.getIndex(i);
        if (!coords || pointStr !== coords.input || !coords.isResolved())
            ghRequest.route.set(pointStr, i, true);
    }

    checkInput();

    if (ghRequest.route.isResolved()) {
        resolveAll();
        routeLatLng(ghRequest, doQuery);
    } else {
        // at least one text input from user -> wait for resolve as we need the coord for routing
        $.when.apply($, resolveAll()).done(function () {
            routeLatLng(ghRequest, doQuery);
        });
    }
}

var FROM = 'from', TO = 'to';
function getToFrom(index) {
    if (index === 0)
        return FROM;
    else if (index === (ghRequest.route.size() - 1))
        return TO;
    return -1;
}

function checkInput() {
    var template = $('#pointTemplate').html(),
            len = ghRequest.route.size();

    // remove deleted points
    if ($('#locationpoints > div.pointDiv').length > len) {
        $('#locationpoints > div.pointDiv:gt(' + (len - 1) + ')').remove();
    }

    // properly unbind previously click handlers
    $("#locationpoints .pointDelete").off();

    var deleteClickHandler = function () {
        var index = $(this).parent().data('index');
        ghRequest.route.removeSingle(index);
        mapLayer.clearLayers();
        routeLatLng(ghRequest, false);
    };

    // console.log("## new checkInput");
    for (var i = 0; i < len; i++) {
        var div = $('#locationpoints > div.pointDiv').eq(i);
        // console.log(div.length + ", index:" + i + ", len:" + len);
        if (div.length === 0) {
            $('#locationpoints > div.pointAdd').before(translate.nanoTemplate(template, {id: i}));
            div = $('#locationpoints > div.pointDiv').eq(i);
        }

        var toFrom = getToFrom(i);
        div.data("index", i);
        div.find(".pointFlag").attr("src",
                (toFrom === FROM) ? './img/marker-small-green.png' :
                ((toFrom === TO) ? './img/marker-small-red.png' : './img/marker-small-blue.png'));
        if (len > 2) {
            div.find(".pointDelete").click(deleteClickHandler).prop('disabled', false).removeClass('ui-state-disabled');
        } else {
            div.find(".pointDelete").prop('disabled', true).addClass('ui-state-disabled');
        }

        autocomplete.showListForIndex(ghRequest, routeIfAllResolved, i);
        if (translate.isI18nIsInitialized()) {
            var input = div.find(".pointInput");
            if (i === 0)
                $(input).attr("placeholder", translate.tr("from_hint"));
            else if (i === (len - 1))
                $(input).attr("placeholder", translate.tr("to_hint"));
            else
                $(input).attr("placeholder", translate.tr("via_hint"));
        }
    }
}

function setToStart(e) {
    var latlng = e.relatedTarget.getLatLng(),
            index = ghRequest.route.getIndexByCoord(latlng);
    ghRequest.route.move(index, 0);
    routeIfAllResolved();
}

function setToEnd(e) {
    var latlng = e.relatedTarget.getLatLng(),
            index = ghRequest.route.getIndexByCoord(latlng);
    ghRequest.route.move(index, -1);
    routeIfAllResolved();
}

function setStartCoord(e) {
    ghRequest.route.set(e.latlng.wrap(), 0);
    resolveFrom();
    routeIfAllResolved();
}

function setIntermediateCoord(e) {
    var routeLayers = mapLayer.getSubLayers("route");
    var routeSegments = routeLayers.map(function(rl) {
        return {
            coordinates: rl.getLatLngs(),
            wayPoints: rl.feature.properties.snapped_waypoints.coordinates.map(function(wp) {
                return L.latLng(wp[1], wp[0]);
            })
        };
    });
    var index = routeManipulation.getIntermediatePointIndex(routeSegments, e.latlng);
    ghRequest.route.add(e.latlng.wrap(), index);
    resolveIndex(index);
    routeIfAllResolved();
}

function deleteCoord(e) {
    var latlng = e.relatedTarget.getLatLng();
    ghRequest.route.removeSingle(latlng);
    mapLayer.clearLayers();
    routeLatLng(ghRequest, false);
}

function setEndCoord(e) {
    var index = ghRequest.route.size() - 1;
    ghRequest.route.set(e.latlng.wrap(), index);
    resolveTo();
    routeIfAllResolved();
}

function routeIfAllResolved(doQuery) {
    if ((ghRequest.route.isResolved()) || (($("#roundTripButton").prop("disabled")))) {
        routeLatLng(ghRequest, doQuery);
        return true;
    }
    return false;
}

function setFlag(coord, index) {
    if (coord.lat) {
        var toFrom = getToFrom(index);
        // intercept openPopup
        var marker = mapLayer.createMarker(index, coord, setToEnd, setToStart, deleteCoord, ghRequest);
        marker._openPopup = marker.openPopup;
        marker.openPopup = function () {
            var latlng = this.getLatLng(),
                    locCoord = ghRequest.route.getIndexFromCoord(latlng),
                    content;
            if (locCoord.resolvedList && locCoord.resolvedList[0] && locCoord.resolvedList[0].locationDetails) {
                var address = locCoord.resolvedList[0].locationDetails;
                content = format.formatAddress(address);
                // at last update the content and update
                this._popup.setContent(content).update();
            }
            this._openPopup();
        };
        var _tempItem = {
            text: translate.tr('set_start'),
            icon: './img/marker-small-green.png',
            callback: setToStart,
            index: 1
        };
        if (toFrom === -1)
            marker.options.contextmenuItems.push(_tempItem); // because the Mixin.ContextMenu isn't initialized
        marker.on('dragend', function (e) {
            mapLayer.clearLayers();
            // inconsistent leaflet API: event.target.getLatLng vs. mouseEvent.latlng?
            var latlng = e.target.getLatLng();
            autocomplete.hide();
            ghRequest.route.getIndex(index).setCoord(latlng.lat, latlng.lng);
            resolveIndex(index);
            // do not wait for resolving and avoid zooming when dragging
            ghRequest.do_zoom = false;
            routeLatLng(ghRequest, false);
        });
    }
}

function resolveFrom() {
    return resolveIndex(0);
}

function resolveTo() {
    return resolveIndex((ghRequest.route.size() - 1));
}

function resolveIndex(index) {
    setFlag(ghRequest.route.getIndex(index), index);
    if (!$("#roundTripButton").prop("disabled")) {
        if (index === 0) {
            if (!ghRequest.to.isResolved())
                mapLayer.setDisabledForMapsContextMenu('start', true);
            else
                mapLayer.setDisabledForMapsContextMenu('start', false);
        } else if (index === (ghRequest.route.size() - 1)) {
            if (!ghRequest.from.isResolved())
                mapLayer.setDisabledForMapsContextMenu('end', true);
            else
                mapLayer.setDisabledForMapsContextMenu('end', false);
        }
    }

    return nominatim.resolve(index, ghRequest.route.getIndex(index));
}

function resolveAll() {
    var ret = [];
    for (var i = 0, l = ghRequest.route.size(); i < l; i++) {
        ret[i] = resolveIndex(i);
    }
    return ret;
}

function flagAll() {
    for (var i = 0, l = ghRequest.route.size(); i < l; i++) {
        setFlag(ghRequest.route.getIndex(i), i);
    }
}

function routeLatLng(request, doQuery) {
    // do_zoom should not show up in the URL but in the request object to avoid zooming for history change
    var doZoom = request.do_zoom;
    request.do_zoom = true;

    var urlForHistory = request.createHistoryURL() + "&layer=" + tileLayers.activeLayerName;

    // not enabled e.g. if no cookies allowed (?)
    // if disabled we have to do the query and cannot rely on the statechange history event
    if (!doQuery && History.enabled) {
        // 2. important workaround for encoding problems in history.js
        var params = urlTools.parseUrl(urlForHistory);
        params.do_zoom = doZoom;
        // force a new request even if we have the same parameters
        params.mathRandom = Math.random();
        History.pushState(params, messages.browserTitle, urlForHistory);
        return;
    }
    var infoDiv = $("#info");
    infoDiv.empty();
    infoDiv.show();
    var routeResultsDiv = $("<div class='route_results'/>");
    infoDiv.append(routeResultsDiv);

    mapLayer.clearElevation();
    mapLayer.clearLayers();
    flagAll();

    if (!$("#roundTripButton").prop("disabled")) {
        mapLayer.setDisabledForMapsContextMenu('intermediate', false);
    }

    $("#vehicles button").removeClass("selectvehicle");
    $("button#" + request.getVehicle().toLowerCase()).addClass("selectvehicle");

    var urlForAPI = request.createURL();
    routeResultsDiv.html('<img src="img/indicator.gif"/> Search Route ...');
    request.doRequest(urlForAPI, function (json) {
        lastghResponse = $.extend({}, json); // Copy, see http://api.jquery.com/jQuery.extend/
        handleGhResponse(true, json, routeResultsDiv, doZoom, request, urlForHistory);
    });
}

function handleGhResponse(callClickHandler, json, routeResultsDiv, doZoom, request, urlForHistory) {
        routeResultsDiv.html("");
        $("#saveTripButton").prop('disabled', false);
        if (json.message) {
            $("#saveTripButton").prop('disabled', true);
            var tmpErrors = json.message;
            console.log(tmpErrors);
            var roundtripActive = !$("#roundTripButton").prop("disabled");
            mapLayer.setDisabledForMapsContextMenu('start', false);
            mapLayer.setDisabledForMapsContextMenu('intermediate', roundtripActive);
            mapLayer.setDisabledForMapsContextMenu('end', roundtripActive);
            if (json.hints) {
                for (var m = 0; m < json.hints.length; m++) {
                    routeResultsDiv.append("<div class='error'>" + json.hints[m].message + "</div>");
                }
            } else {
                routeResultsDiv.append("<div class='error'>" + tmpErrors + "</div>");
            }
            return;
        }

        if (callClickHandler) {
          function createClickHandler(geoJsons, currentLayerIndex, tabHeader, oneTab, hasElevation, useMiles) {
            return function () {
                mapLayer.clearLayers();
                mapLayer.setPathIndex(currentLayerIndex);
                flagAll();
                mapLayer.addDataToRoutingLayer(geoJsons);
                if (hasElevation) {
                    mapLayer.clearElevation();
                    var alternativeGeoJson = { 
                        "type" : "Feature",
                        "geometry": {
                            "coordinates" : [],
                            "type": "LineString"
                        }
                    }
                    for (var i=0; i<geoJsons.length;i++) {
                        var feat = geoJsons[i];
                        if (feat.properties.pathIndex === currentLayerIndex) {
                           alternativeGeoJson.geometry.coordinates = alternativeGeoJson.geometry.coordinates.concat(feat.geometry.coordinates);
                        }
                    }
                    mapLayer.addElevation(alternativeGeoJson, useMiles);
                }

                headerTabs.find("li").removeClass("current");
                routeResultsDiv.find("div").removeClass("current");

                tabHeader.addClass("current");
                oneTab.addClass("current");
            };
          }
        }

        var headerTabs = $("<ul id='route_result_tabs'/>");
        if (json.paths.length > 1) {
            routeResultsDiv.append(headerTabs);
            routeResultsDiv.append("<div class='clear'/>");
        }

        var geoJsons = [];
        var firstHeader;

        // Create buttons to toggle between SI and imperial units.
        var createUnitsChooserButtonClickHandler = function (useMiles) {
            return function () {
                mapLayer.updateScale(useMiles);
                ghRequest.useMiles = useMiles;
                resolveAll();
                routeLatLng(ghRequest);
            };
        };

        for (var pathIndex = 0; pathIndex < json.paths.length; pathIndex++) {
            var tabHeader = $("<li>").append((pathIndex + 1) + "<img class='alt_route_img' src='./img/alt_route.png'/>");
            if (pathIndex === 0)
                firstHeader = tabHeader;

            headerTabs.append(tabHeader);
            var path = json.paths[pathIndex];
            var style = (pathIndex === 0) ? "defaultRouteStyle" : "alternativeRouteStye";

            var len = path.instructions.length;
            var geojsonFeature;
            var slicestart = path.instructions[0].interval[0];
            var lastsegmentPaved = path.instructions[0].annotation_pavement;
            for (var m = 1; m < len; m++) {
                var instr = path.instructions[m];
                geojsonFeature = {
                    "type": "Feature",
                    "geometry": {
                        coordinates: path.points.coordinates.slice(slicestart,instr.interval[0]+1),
                        type: "LineString"
                    },
                    "properties": {
                        // the routing layer uses the geojson properties.style for the style, see map.js
                        "style": style,
                        name: "route",
                        snapped_waypoints: path.snapped_waypoints,
                        "paved": lastsegmentPaved,
                        "pathIndex": pathIndex
                    }
                };
                geoJsons.push(geojsonFeature);
                lastsegmentPaved = instr.annotation_pavement;
                slicestart = instr.interval[0];
            }
            mapLayer.addDataToRoutingLayer(geoJsons);

            var oneTab = $("<div class='route_result_tab'>");
            routeResultsDiv.append(oneTab);
            if (callClickHandler)
               tabHeader.click(createClickHandler(geoJsons, pathIndex, tabHeader, oneTab, request.hasElevation(), request.useMiles));

            var tmpTime = translate.createTimeString(path.time);
            var tmpDist = translate.createDistanceString(path.distance, request.useMiles);
            var tmpwaytype="";

            if (path.haswaytypeinfo === "yes")
            {
                if (path.unpavedDistance !== 0)
                    tmpwaytype += "<br/>" + translate.tr2("unpaved") + ":" + translate.createDistanceString(path.unpavedDistance, request.useMiles);
                if (path.cyclewayDistance !== 0 )
                    tmpwaytype += "<br/>" + translate.tr2("cycleway") + ":" + translate.createDistanceString(path.cyclewayDistance, request.useMiles);
                if (path.pushingSectionDistance !== 0)
                    tmpwaytype += "<br/>" + translate.tr2("off_bike") + ":" + translate.createDistanceString(path.pushingSectionDistance, request.useMiles);
                if (path.roadDistance !== 0)
                    tmpwaytype += "<br/>" + translate.tr2("road") + ":" + translate.createDistanceString(path.roadDistance, request.useMiles);
                if (path.unspecificWayDistance !== 0)
                    tmpwaytype += "<br/>" + translate.tr2("unspecific") + ":" + translate.createDistanceString(path.unspecificWayDistance, request.useMiles);
            }

            var routeInfo = $("<div class='route_description'>");
            if (path.description && path.description.length > 0) {
                routeInfo.text(path.description);
                routeInfo.append("<br/>");
            }
            routeInfo.append(translate.tr("route_info", [tmpDist, tmpTime]));

            var kmButton = $("<button class='plain_text_button " + (request.useMiles ? "gray" : "") + "'>");
            kmButton.text(translate.tr2("km_abbr"));
            kmButton.click(createUnitsChooserButtonClickHandler(false));

            var miButton = $("<button class='plain_text_button " + (request.useMiles ? "" : "gray") + "'>");
            miButton.text(translate.tr2("mi_abbr"));
            miButton.click(createUnitsChooserButtonClickHandler(true));

            var buttons = $("<span style='float: right;'>");
            buttons.append(kmButton);
            buttons.append('|');
            buttons.append(miButton);

            routeInfo.append(buttons);

            if (request.hasElevation()) {
                routeInfo.append(translate.createEleInfoString(path.ascend, path.descend, request.useMiles));
            }
            routeInfo.append(tmpwaytype);
            oneTab.append(routeInfo);

            if (path.instructions) {
                var instructions = require('./instructions.js');
                oneTab.append(instructions.create(mapLayer, path, urlForHistory, request));
            }
        }
        // already select best path
        if (callClickHandler)
           firstHeader.click();

        mapLayer.adjustMapSize();
        // TODO change bounding box on click
        var firstPath = json.paths[0];
        if (firstPath.bbox && doZoom) {
            var minLon = firstPath.bbox[0];
            var minLat = firstPath.bbox[1];
            var maxLon = firstPath.bbox[2];
            var maxLat = firstPath.bbox[3];
            var tmpB = new L.LatLngBounds(new L.LatLng(minLat, minLon), new L.LatLng(maxLat, maxLon));
            mapLayer.fitMapToBounds(tmpB);
        }

        $('.defaulting').each(function (index, element) {
            $(element).css("color", "black");
        });
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function graphHopperSubmit() {
    var fromStr,
            toStr,
            viaStr,
            allStr = [],
            inputOk = true;
    var location_points = $("#locationpoints > div.pointDiv > input.pointInput");
    var len = location_points.size;
    $( "#tabs" ).tabs({ active: 0 });
    $.each(location_points, function (index) {
        if (index === 0) {
            fromStr = $(this).val();
            if (fromStr !== translate.tr("from_hint") && fromStr !== "")
                allStr.push(fromStr);
            else
                inputOk = false;
        } else { 
        if(!$("#roundTripButton").prop("disabled")) {
                if (index === (len - 1)) {
                toStr = $(this).val();
                if (toStr !== translate.tr("to_hint") && toStr !== "")
                    allStr.push(toStr);
                else
                    inputOk = false;
            } else {
                viaStr = $(this).val();
                if (viaStr !== translate.tr("via_hint") && viaStr !== "")
                    allStr.push(viaStr);
                else
                    inputOk = false;
            }
        }}
    });
    if (!inputOk) {
        // TODO print warning
        return;
    }
    if (fromStr === translate.tr("from_hint")) {
        // no special function
        return;
    }
    if (toStr === translate.tr("to_hint")) {
        // lookup area
        ghRequest.from.setStr(fromStr);
        $.when(resolveFrom()).done(function () {
            mapLayer.focus(ghRequest.from, null, 0);
        });
        return;
    }
    if($("#roundTripButton").prop("disabled")) {
        ghRequest.api_params.round_trip.seed = seed;
        seed ++;
        if (seed===3)
           seed = 0;
        ghRequest.api_params.round_trip.distance = 1000 * $("#roundtripdistance").spinner('value');
        if (!$("#useHeading").prop("checked")) 
           ghRequest.api_params.heading = getRandomArbitrary(0,360);
    }

    // route!
    if (inputOk)
        resolveCoords(allStr);
}

function tripSubmit() {
    var currentNode = $("#tripTree").jstree("get_selected");
    if ($('#tripTree').jstree(true).get_node(currentNode).data) {
        switchingUrlParams = undefined;
        var historyURL = $('#tripTree').jstree(true).get_node(currentNode).data.historyURL;
        var selectedActiveOsmfile = $('#tripTree').jstree(true).get_node(currentNode).data.activeOsmfile;
        var urlParams = urlTools.parseUrl(historyURL);
        ghRequest.initVehicle(urlParams.vehicle);
        console.log("tripSubmit: historyURL=" + historyURL + " selectedActiveOsmfile=" + selectedActiveOsmfile + " menu.getActiveOSMfile()=" + menu.getActiveOSMfile());
        if (historyURL) {
            $("#tripDiv").hide();
            // Activate buttons based on urlParams.algorithm
            (urlParams.algorithm === "roundTrip") ? enableRoundTripButton(urlParams["round_trip"].seed, urlParams["round_trip"].distance, urlParams.heading) : enableABButton(true);
            if ((selectedActiveOsmfile !== undefined) && (selectedActiveOsmfile !== menu.getActiveOSMfile())) {
                menu.switchGraph(selectedActiveOsmfile); // This triggers a call of mainInit when the new graph is loaded.
                menu.infoDialog("Be patient!<br> Switching to graph " + selectedActiveOsmfile + " will take a while!");
                switchingUrlParams = urlParams;
            }
            if (switchingUrlParams === undefined) {
               initFromParams(urlParams, true);
               graphHopperSubmit();
            }
            // Activate buttons based on urlParams.algorithm
            (urlParams.algorithm === "roundTrip") ? enableRoundTripButton(urlParams["round_trip"].seed, urlParams["round_trip"].distance, urlParams.heading) : enableABButton(true);
        }
    }
}

$(function() {
    $( "#slider-range-ascend" ).slider({
      range: "max",
      min: -1.0,
      max: 1.0,
      step: 0.1,
      slide: function( event, ui ) {
        $( "#ascendAvoidance" ).val( ui.value );
        ghRequest.api_params.ascendAvoidance = ui.value;
        ghRequest.api_params.weighting = "elevation";
        graphHopperSubmit();
      }
    });
    $( "#ascendAvoidance" ).val( $( "#slider-range-ascend" ).slider( "value" ) );
});

$(function() {
    var boostValues = [1/4, 1/3.5, 1/3.0, 1/2.5, 1/2.0, 1/1.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4];
    $( "#slider-range-niceLevel" ).slider({
      range: "max",
      min: 0.0,
      value: 6.0,  //->niceLevel=1.0
      max: 12.0,
      step: 1.0,
      slide: function( event, ui ) {
        $( "#niceLevel" ).val( ui.value );
        ghRequest.api_params.niceLevel = boostValues[ui.value];
        graphHopperSubmit();
      }
    });
    $( "#niceLevel" ).val( $( "#slider-range-niceLevel" ).slider( "value" ) );
});

$(function() {
    $( "#roundtripdistance" ).spinner({
      min: 0,
      step: 10.0,
      max: 500,
      spin: function( event, ui ) {
        seed = 0;
        if ($(this).spinner('value') > 0) {
           ghRequest.api_params.round_trip.distance = 1000 * $(this).spinner('value');
           graphHopperSubmit();
        }
      },
      change: function( event, ui ) {
        seed = 0;
        if ($(this).spinner('value') > 0) {
           ghRequest.api_params.round_trip.distance = 1000 * $(this).spinner('value');
           graphHopperSubmit();
        }
      }
    });
});

$(function() {
    $( "#slider-range-alternativeRoutesMaxPaths" ).slider({
      range: "max",
      min: 1.0,
      max: 5.0,
      step: 1.0,
      slide: function( event, ui ) {
        $( "#alternativeRoutesMaxPaths" ).val( ui.value );
        if (ui.value > 1) {
            ghRequest.api_params.algorithm = "alternativeRoute";
            ghRequest.api_params.alternative_route.max_paths = ui.value;
        } else {
            ghRequest.api_params.algorithm = "";
        }
        routeLatLng(ghRequest, false);
      }
    });
    $( "#alternativeRoutesMaxPaths" ).val( $( "#slider-range-alternativeRoutesMaxPaths" ).slider( "value" ) );
});

function isProduction() {
    return host.indexOf("graphhopper.com") > 0;
}

module.exports.setFlag = setFlag;

// Retrieve tour data from localStorage
var tripData = JSON.parse(localStorage.getItem("tripData"));
/*
if (tripData === null) {
    tripData = [{"id": "0", "parent" : "#", "text": "POIs"}];
    // Initialize tourData in localStorage
    localStorage['tripData'] = JSON.stringify(tripData);
}
*/

function getGhResponseFilePath(id) {
    var path = global.require('path');
    return path.join(nw.App.dataPath, path.normalize('graphhopperResponses/' + 'gh' + id + '.json'));
}

$(function() {
    $('#tripTree').jstree({
       'plugins' : [ "themes", "contextmenu", "dnd", "state", "types" ],
       'core' : {
       'check_callback' : function (operation, node, node_parent, node_position, more) {
            // operation can be 'create_node', 'rename_node', 'delete_node', 'move_node' or 'copy_node'
            // in case of 'rename_node' node_position is filled with the new node name
            return node.id === "0" ? false : true;
       },
       'data' : tripData,
       }});
    $("#tripTree").on("select_node.jstree",
        function(evt, data) {
            $( "#cloneChangeTripButton" ).prop( "disabled", (data.node.data.historyURL === undefined) );
            handleTrip(data);
    });
    $("#tripTree").on("delete_node.jstree", function(evt, data) {
            var filePath = getGhResponseFilePath(data.node.id);
            var fs = global.require('fs');
            fs.unlink(filePath, function (err) {
                if (err) {
                    console.log("Error attempting to delete " + filePath);
                    return;
                }
            });
    });
});

$( function() {
   $( "#tabs" ).tabs({ active: 0, activate: function(event, ui) {
     // Handle switching between the tabs
     var id = ui.newPanel.attr('id');
     mapLayer.clearElevation();
     mapLayer.clearLayers();
     mapLayer.setDisabledForMapsContextMenu('start', id==="tripDiv");
     mapLayer.setDisabledForMapsContextMenu('intermediate', true);
     mapLayer.setDisabledForMapsContextMenu('end', id==="tripDiv");
     if (id==="tripDiv") {
        $("#tripDiv").show();
        $(".route_result_tab").hide();
        $("#routingSettings").hide();
        $("#ABTourButton").hide();
        $("#roundTripButton").hide();
     } else {
        enableABButton(true);
     }
   }});
});

function saveghResponses (response, id, callback) {
    if (menu.runningUnderNW) {
        // c:\Users\User\AppData\Local\BikeTourPlanner\User Data\Default\graphhopperResponses\
        //  on Linux it is here: /home/username/.config/YourAppName/graphhopperResponses.
        var path = global.require('path');
        var fs = global.require('fs');
        var filePath = path.join(nw.App.dataPath,'graphhopperResponses');
        fs.mkdir(filePath,function(err){
            if (err) {
               console.log(err);
            }
            fs.writeFile(getGhResponseFilePath(id), JSON.stringify(response), function (err) {
                if (err) {
                    console.log("Error attempting to save graphhopperResponse to " + filePath);
                    return;
                } else if (callback) {
                    callback();
                    return;
                }
            });
        });
    }
}

function handleTrip(data) { 
    if ((menu.runningUnderNW) && (data.node.id !== "0")) {
        var absolutFileName = getGhResponseFilePath(data.node.id);
        var fs = global.require('fs');
        fs.readFile(absolutFileName, (err, fdata) => {
            if (err) throw err;

            var json = JSON.parse(fdata);
            var routeResultsDiv = $("<div class='route_results'/>");
            var infoDiv = $("#info");
            infoDiv.append(routeResultsDiv);

            mapLayer.clearElevation();
            mapLayer.clearLayers();
            mapLayer.setDisabledForMapsContextMenu('start', true);
            mapLayer.setDisabledForMapsContextMenu('intermediate', true);
            mapLayer.setDisabledForMapsContextMenu('end', true);

            if (data.node.data.route) {
                for (i=0; i<data.node.data.route.length; i++) {
                    mapLayer.createStaticMarker(data.node.data.route[i], i, data.node.data.route.length);
                }
           }
           handleGhResponse(false, json, routeResultsDiv, true, ghRequest, data.node.data.historyURL);
        });
    }
}

