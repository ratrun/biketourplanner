var mainTemplate = require('./main-template.js');
var tileLayers = require('./config/tileLayers.js');
var translate = require('./translate.js');

var routingLayer;
var map;
var menuStart;
var menuIntermediate;
var menuEnd;
var elevationControl = null;
var initialActionsDone = false;

// Items added in every contextmenu.
var defaultContextmenuItems;

// called if window changes or before map is created
function adjustMapSize() {
    var mapDiv = $("#map");

    // See http://stackoverflow.com/questions/986937/how-can-i-get-the-browsers-scrollbar-sizes
    var width = window.innerWidth - 275;
    if (width < 400) {
        width = 400;
        mapDiv.attr("style", "position: relative; float: right;");
    } else {
        mapDiv.attr("style", "position: absolute; right: 0;");
    }
    var height = $(window).height();
    if (height < 500)
        height = 500;
    mapDiv.width(width).height(height);
    $("#input").height(height);
    $("#tabs").height(height - 17 - $("#input_header").height() - $("#footer").height());

    // reduce info size depending on how height the input_header is and reserve space for footer //34: height of tab  80: ???
    var tmp = 34 + $("#routingSettings").height() + 90;
    var instructionInfoMaxHeight = height - tmp
            - $("#input_header").height() - $("#footer").height() - $(".route_description").height();
    var tabHeight = $("#route_result_tabs li").height()
    //console.log("heightcalc:" + tmp + " instructionInfoMaxHeight=" + instructionInfoMaxHeight + " tabHeight=" + tabHeight);
    if (!isNaN(tabHeight))
        instructionInfoMaxHeight -= tabHeight;
    $(".instructions_info").css("max-height", instructionInfoMaxHeight);
}

function createBounds(bounds, useMiles) {
    map.fitBounds(new L.LatLngBounds(new L.LatLng(bounds.minLat, bounds.minLon),
            new L.LatLng(bounds.maxLat, bounds.maxLon)));

    //if (isProduction())
    //    map.setView(new L.LatLng(0, 0), 2);

    map.attributionControl.setPrefix('');

    var myStyle = {
        "color": 'black',
        "weight": 2,
        "opacity": 0.3
    };
    var geoJson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [bounds.minLon, bounds.minLat],
                [bounds.maxLon, bounds.minLat],
                [bounds.maxLon, bounds.maxLat],
                [bounds.minLon, bounds.maxLat],
                [bounds.minLon, bounds.minLat]]
        }
    };

    if (bounds.initialized)
        L.geoJson(geoJson, {
            "style": myStyle
        }).addTo(map);

    routingLayer = L.geoJson().addTo(map);

}

function initMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer, useMiles) {
    // default
    var defaultLayer = tileLayers.selectLayer(selectLayer);

defaultContextmenuItems = [{
        separator: true,
        index: 10
    }, {
        text: translate.tr('show_coords'),
        callback: function (e) {
            alert(e.latlng.lat + "," + e.latlng.lng);
        },
        index: 11
    }, {
        text: translate.tr('center_map'),
        callback: function (e) {
            map.panTo(e.latlng);
        },
        index: 12
    }];

    map = L.map('map', {
        layers: [defaultLayer],
        minZoom: 2,
        // zoomSnap: 0,  // allow fractional zoom levels
        contextmenu: true,
        contextmenuWidth: 150,
        contextmenuItems: defaultContextmenuItems,
        zoomControl: false
    });

    addOverlayLayer('Lodging', ['poi_lodging', 'poi_lodging_label'], 8);
    addOverlayLayer('Campsite', ['poi_campsites', 'poi_campsites_label'], 8);
    addOverlayLayer('Bicycle shop', [ 'poi_bicycle_shops', 'poi_label_bicycle_shops'], 8);
    addOverlayLayer('Alpine hut', [ 'poi_alpine_hut', 'poi_label_alpine_hut'], 8);
    addOverlayLayer('Hospital', ['poi_hospital', 'poi_label_hospital' ], 8);
    addOverlayLayer('Drinking water', ['poi_drinking_water'], 11);    
    addOverlayLayer('Supermarket', ['poi_supermarket'], 11);
    addOverlayLayer('Restaurant', ['poi_restaurant'], 11);
    addOverlayLayer('Fast food', ['poi_fast_food'], 11);
    addOverlayLayer('Fuel', ['poi_fuel'], 11);

    var _startItem = {
        text: translate.tr('set_start'),
        callback: setStartCoord,
        disabled: false,
        index: 0
    };
    var _intItem = {
        text: translate.tr('set_intermediate'),
        callback: setIntermediateCoord,
        disabled: true,
        index: 1
    };
    var _endItem = {
        text: translate.tr('set_end'),
        callback: setEndCoord,
        disabled: false,
        index: 2
    };
    menuStart = map.contextmenu.insertItem(_startItem, _startItem.index);
    menuIntermediate = map.contextmenu.insertItem(_intItem, _intItem.index);
    menuEnd = map.contextmenu.insertItem(_endItem, _endItem.index);

    var zoomControl = new L.Control.Zoom({
        position: 'topleft',
        zoomInTitle: translate.tr('zoom_in'),
        zoomOutTitle: translate.tr('zoom_out')
    }).addTo(map);

    L.control.layers(tileLayers.getAvailableTileLayers()/*, overlays*/).addTo(map);

    map.on('baselayerchange', function (a) {
        if (a.name) {
            tileLayers.activeLayerName = a.name;
            tileLayers.setActivelayer(a);
            $("#export-link a").attr('href', function (i, v) {
                return v.replace(/(layer=)([\w\s]+)/, '$1' + tileLayers.activeLayerName);
            });
        }
    });

    $('#layerfeatures').hide();
    $("#layerfeatures").css("visibility","hidden");

    map.on('mousemove', function (e) {
       var maplayer = tileLayers.activeLayer;
       if ((maplayer._glMap !== null) && (maplayer._glMap !== undefined)) {
           var pointarr = [e.containerPoint.x, e.containerPoint.y];
           // see https://www.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures/
           var features = maplayer._glMap.queryRenderedFeatures(pointarr, {layers: ['poi_lodging', 'poi_lodging_label', 'poi_campsites', 'poi_campsites_label', 'poi_bicycle_shops', 'poi_label_bicycle_shops', 'poi_alpine_hut', 'poi_label_alpine_hut', 'poi_hospital', 'poi_label_hospital' ]});
           // Change the cursor style as a UI indicator.
           maplayer._glMap.getCanvas().style.cursor = features.length ? 'pointer' : '';
           if (features.length) {
             $('#layerfeatures').show();
             $('#layerfeatures').css("visibility","visible");
             var feature= features[0];
             var properties = feature.properties;
             delete properties.id;
             var displaytext=JSON.stringify(properties, null, 1).replace(/{/g,'').replace(/}/g,'');
             console.log("displaytext=" + displaytext);
             document.getElementById('layerfeatures').innerHTML = displaytext.replace(/\",/g,'').replace(/\"/g,'');
             $('#layerfeatures').css('top', $('#layer_menu').position().top + $('#layer_menu').height() + 'px');
             var len = 0.5 + 1.5 * displaytext.split('\": \"').length;
             $('#layerfeatures').css('height', len  + 'em');
           } else {
              $('#layerfeatures').hide();
              $("#layerfeatures").css("visibility","hidden");
              return;
           }
       }
    });

    map.on('zoomend', function() {
        var currentZoom = map.getZoom();
        var layers_menu = document.getElementById('layer_menu');
        for (var i=0; i<layers_menu.childNodes.length; i++) {
            if (currentZoom < layers_menu.childNodes[i].minzoom) {
                if (layers_menu.childNodes[i].className !== 'disabled') {
                    layers_menu.childNodes[i].activeClassName = layers_menu.childNodes[i].className; // Save the current state 
                    layers_menu.childNodes[i].className = 'disabled';
                }
            } else {
                layers_menu.childNodes[i].className = layers_menu.childNodes[i].activeClassName;
                layers_menu.childNodes[i].activeClassName = layers_menu.childNodes[i].className;
            }
        }
    });

    scaleControl = L.control.scale(useMiles ? {
        metric: false
    } : {
        imperial: false
    }).addTo(map);

    createBounds(bounds, useMiles);

    routingLayer.options = {
        // use style provided by the 'properties' entry of the geojson added by addDataToRoutingLayer
        style: function (feature) {
            return feature.properties && feature.properties.style;
        },
        contextmenu: true,
        contextmenuItems: defaultContextmenuItems.concat([{
                text: translate.tr('route'),
                disabled: true,
                index: 0
            }, {
                text: translate.tr('set_intermediate'),
                callback: setIntermediateCoord,
                index: 1
            }]),
        contextmenuInheritItems: false
    };
    initialActionsDone = true;
}

function multipleCallableInitMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer, useMiles) {
    adjustMapSize();
    console.log("init map at " + JSON.stringify(bounds));
    if (initialActionsDone) {
        createBounds(bounds);
    } else {
        initMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer, useMiles);
    }
}

function focus(coord, zoom, index) {
    if (coord.lat && coord.lng) {
        if (!zoom)
            zoom = 11;
        routingLayer.clearLayers();
        map.setView(new L.LatLng(coord.lat, coord.lng), zoom);
        mainTemplate.setFlag(coord, index);
    }
}

module.exports.clearLayers = function () {
    routingLayer.clearLayers();
};

module.exports.getRoutingLayer = function () {
    return routingLayer;
};

module.exports.getSubLayers = function(name) {
    var subLayers = routingLayer.getLayers();
    return subLayers.filter(function(sl) {
        return sl.feature && sl.feature.properties && sl.feature.properties.name === name;
    });
};

module.exports.addDataToRoutingLayer = function (geoJsonFeature) {
    routingLayer.addData(geoJsonFeature);
};

module.exports.eachLayer = function (callback) {
    routingLayer.eachLayer(callback);
};

module.exports.setDisabledForMapsContextMenu = function (entry, value) {
    if (entry === 'start')
        map.contextmenu.setDisabled(menuStart, value);
    if (entry === 'end')
        map.contextmenu.setDisabled(menuEnd, value);
    if (entry === 'intermediate')
        map.contextmenu.setDisabled(menuIntermediate, value);
};

module.exports.fitMapToBounds = function (bounds) {
    map.fitBounds(bounds, {
        padding: [42, 42]
    });
};

module.exports.removeLayerFromMap = function (layer) {
    map.removeLayer(layer);
};

module.exports.focus = focus;
module.exports.multipleCallableInitMap = multipleCallableInitMap;
module.exports.adjustMapSize = adjustMapSize;

module.exports.addElevation = function (geoJsonFeature, useMiles) {
    if (elevationControl === null) {
        elevationControl = L.control.elevation({
            position: "bottomright",
            theme: "white-theme", //default: lime-theme
            width: 450,
            height: 125,
            margins: {
                top: 10,
                right: 20,
                bottom: 30,
                left: 60
            },
            useHeightIndicator: true, //if false a marker is drawn at map position
            interpolation: "linear", //see https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-area_interpolate
            hoverNumber: {
                decimalsX: 2, //decimals on distance (in km or mi)
                decimalsY: 0, //decimals on height (in m or ft)
                formatter: undefined //custom formatter function may be injected
            },
            xTicks: undefined, //number of ticks in x axis, calculated by default according to width
            yTicks: undefined, //number of ticks on y axis, calculated by default according to height
            collapsed: false    //collapsed mode, show chart on click or mouseover
        });
        elevationControl.addTo(map);
    }
    elevationControl.options.imperial = useMiles;
    elevationControl.addData(geoJsonFeature);
};

module.exports.clearElevation = function () {
    if (elevationControl)
        elevationControl.clear();
};

module.exports.getMap = function () {
    return map;
};

module.exports.updateScale = function (useMiles) {
    if (scaleControl === null) {
        return;
    }
    map.removeControl(scaleControl);
    var options = useMiles ? {metric: false} : {imperial: false};
    scaleControl = L.control.scale(options).addTo(map);
};

var FROM = 'from', TO = 'to';
function getToFrom(index, ghRequest) {
    if (index === 0)
        return FROM;
    else if (index === (ghRequest.route.size() - 1))
        return TO;
    return -1;
}

var iconFrom = L.icon({
    iconUrl: './img/marker-icon-green.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

var iconTo = L.icon({
    iconUrl: './img/marker-icon-red.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

module.exports.createMarker = function (index, coord, setToEnd, setToStart, deleteCoord, ghRequest) {
    var toFrom = getToFrom(index, ghRequest);
    return L.marker([coord.lat, coord.lng], {
        icon: ((toFrom === FROM) ? iconFrom : ((toFrom === TO) ? iconTo : new L.NumberedDivIcon({number: index}))),
        draggable: true,
        contextmenu: true,
        contextmenuItems: defaultContextmenuItems.concat([{
                text: translate.tr("marker") + ' ' + ((toFrom === FROM) ?
                        translate.tr("start_label") : ((toFrom === TO) ?
                        translate.tr("end_label") : translate.tr("intermediate_label") + ' ' + index)),
                disabled: true,
                index: 0
            }, {
                text: translate.tr((toFrom !== TO) ? "set_end" : "set_start"),
                callback: (toFrom !== TO) ? setToEnd : setToStart,
                index: 2
            }, {
                text: translate.tr("delete_from_route"),
                callback: deleteCoord,
                disabled: (toFrom !== -1 && ghRequest.route.size() === 2) ? true : false, // prevent to and from
                index: 3
            }]),
        contextmenuInheritItems: false
    }).addTo(routingLayer).bindPopup(((toFrom === FROM) ?
            translate.tr("start_label") : ((toFrom === TO) ?
            translate.tr("end_label") : translate.tr("intermediate_label") + ' ' + index)));
};

module.exports.createStaticMarker = function (coord, i, amount) {
    var icon = (i===0) ? iconFrom: (i==amount-i) ?  iconTo : new L.NumberedDivIcon({number: i});
    return L.marker([coord.lat, coord.lng], {icon: icon}).addTo(routingLayer).bindPopup(' ' + i);
};

function addOverlayLayer(name, id, minzoom) {
    var link = document.createElement('a');
    link.href = '#';
    link.className = '';
    link.textContent = name;
    link.minzoom = minzoom;

    link.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.className !== 'disabled')
        {
            var maplayer = tileLayers.activeLayer;
            for (index = 0; index < id.length; ++index) {
              var visibility = maplayer._glMap.getLayoutProperty(id[index], 'visibility');

              if (visibility === 'visible') {
                  maplayer._glMap.setLayoutProperty(id[index], 'visibility', 'none');
                  this.className = '';
              } else {
                  this.className = 'active';
                  maplayer._glMap.setLayoutProperty(id[index], 'visibility', 'visible');
              }
            }
        }
        link.activeClassName = link.className;
    };
    
    var layers_menu = document.getElementById('layer_menu');
    layers_menu.appendChild(link);
}
