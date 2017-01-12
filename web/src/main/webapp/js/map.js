var mainTemplate = require('./main-template.js');
var tileLayers = require('./config/tileLayers.js');
var translate = require('./translate.js');

var routingLayer;
var coverBox;
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

var pathIndex = 0;

function setPathIndex(newIndex) {
    pathIndex = newIndex;
}
module.exports.setPathIndex = setPathIndex;

var highlightRouteStyle = {color: "#00cc33", "weight": 6, "opacity": 0.8};
var highlightUnpavedRouteStyle = { weight: 5,
                    opacity: 0.8,
                    color: '#00cc33',
                    dashArray: '7',
                    fillOpacity: 0.6,
                    fillColor: 'white'}
var alternativeRouteStye = {color: "darkgray", "weight": 6, "opacity": 0.8};

var pavedUnPavedRouteStype = function(feature) {
    if (feature.properties) {
        if (feature.properties.pathIndex !== pathIndex)
            return alternativeRouteStye;
        else {
            if (feature.properties.paved)
                return highlightRouteStyle;
            else
                return highlightUnpavedRouteStyle;
            }
        } else {
            return highlightUnpavedRouteStyle;
    }
}

function createBounds(bounds, useMiles, firstCall) {
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

    if (!firstCall) {
        map.removeLayer(routingLayer);
        if (coverBox)
          map.removeLayer(coverBox);
    }

    if (bounds.initialized)
     coverBox =  L.geoJson(geoJson, {
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
        text: translate.tr('create_poi'),
        callback: function (e) {
            var defaulIconNumber = 5;
            POIDialog("Create new POI at " + e.latlng.lat + "," + e.latlng.lng, defaulIconNumber);
        },
        index: 11
    }, {
        text: translate.tr('show_coords'),
        callback: function (e) {
            alert(e.latlng.lat + "," + e.latlng.lng);
        },
        index: 12
    }, {
        text: translate.tr('center_map'),
        callback: function (e) {
            map.panTo(e.latlng);
        },
        index: 13
    }];

    map = L.map('map', {
        layers: [defaultLayer],
        minZoom: 2,
        // zoomSnap: 0,  // allow fractional zoom levels
        contextmenu: true,
        contextmenuItems: defaultContextmenuItems,
        zoomControl: false
    });

    addOverlayLayer(translate.tr('lodging'), ['poi_lodging', 'poi_lodging_label'], 8);
    addOverlayLayer(translate.tr('campsites'), ['poi_campsites', 'poi_campsites_label'], 8);
    addOverlayLayer(translate.tr('bicycle_shops'), [ 'poi_bicycle_shops', 'poi_label_bicycle_shops'], 8);
    addOverlayLayer(translate.tr('alpine_huts'), [ 'poi_alpine_hut', 'poi_label_alpine_hut'], 8);
    addOverlayLayer(translate.tr('mountain_pass'), [ 'poi_mountain_pass', 'poi_label_mountain_pass'], 8);
    addOverlayLayer(translate.tr('hospital'), ['poi_hospital', 'poi_label_hospital' ], 8);
    addOverlayLayer(translate.tr('drinking_water'), ['poi_drinking_water'], 11);    
    addOverlayLayer(translate.tr('supermarket'), ['poi_supermarket'], 11);
    addOverlayLayer(translate.tr('restaurants'), ['poi_restaurant'], 11);
    addOverlayLayer(translate.tr('fast_food'), ['poi_fast_food'], 11);
    addOverlayLayer(translate.tr('fuel'), ['poi_fuel'], 11);

    var _startItem = {
        text: translate.tr('set_start'),
        icon: './img/marker-small-green.png',
        callback: setStartCoord,
        disabled: false,
        index: 0
    };
    var _intItem = {
        text: translate.tr('set_intermediate'),
        icon: './img/marker-small-blue.png',
        callback: setIntermediateCoord,
        disabled: true,
        index: 1
    };
    var _endItem = {
        text: translate.tr('set_end'),
        icon: './img/marker-small-red.png',
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
           var features = maplayer._glMap.queryRenderedFeatures(pointarr, {layers: ['poi_lodging',
                                                                                    'poi_lodging_label',
                                                                                    'poi_campsites',
                                                                                    'poi_campsites_label',
                                                                                    'poi_bicycle_shops',
                                                                                    'poi_label_bicycle_shops',
                                                                                    'poi_alpine_hut',
                                                                                    'poi_mountain_pass',
                                                                                    'poi_label_alpine_hut',
                                                                                    'poi_hospital',
                                                                                    'poi_label_hospital' ]});
           // Change the cursor style as a UI indicator.
           if ( (features)&&(features.length) ) {
             maplayer._glMap.getCanvas().style.cursor = features.length ? 'pointer' : '';
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

    createBounds(bounds, useMiles, true);

    initialActionsDone = true;
}

function multipleCallableInitMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer, useMiles) {
    adjustMapSize();
    console.log("init map at " + JSON.stringify(bounds));
    if (initialActionsDone) {
        createBounds(bounds, useMiles, false);
    } else {
        initMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer, useMiles);
    }
    routingLayer.options = {
        style: pavedUnPavedRouteStype,
        contextmenu: true,
        contextmenuItems: defaultContextmenuItems.concat([{
                text: translate.tr('route'),
                disabled: true,
                index: 0
            }, {
                text: translate.tr('set_intermediate'),
                icon: './img/marker-small-blue.png',
                callback: setIntermediateCoord,
                index: 1
            }]),
        contextmenuInheritItems: false
    };
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
    pathIndex = 0;
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
                icon: (toFrom !== TO) ? './img/marker-small-red.png' : './img/marker-small-green.png',
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
    var icon = (i===0) ? iconFrom: (i===amount-1) ?  iconTo : new L.NumberedDivIcon({number: i});
    if ((coord.lat!==undefined)&&(coord.lng!==undefined))
        L.marker([coord.lat, coord.lng], {icon: icon}).addTo(routingLayer).bindPopup(' ' + i);
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

var selectedPOIText = null;
function POIDialog(title, iconNumber) {
    if (selectedPOIText === null)
        selectedPOIText = document.getElementById('selected-poi-text');
    selectedPOIText.value = iconNumber;

    document.getElementById('poi-dialog').addEventListener('changed', function(e){
       selectedPOIText.value = iconSelect.getSelectedValue();
    });

    var iconSelect = new IconSelect("poi-dialog", 
        {'selectedIconWidth':48,
        'selectedIconHeight':48,
        'selectedBoxPadding':1,
        'iconsWidth':23,
        'iconsHeight':23,
        'boxIconSpace':1,
        'vectoralIconNumber':14,
        'horizontalIconNumber':14});

    var icons = [];
    icons.push({'iconFilePath':'images/icons/abseiling.svg',                  'iconValue':'1'});
    icons.push({'iconFilePath':'images/icons/accounting.svg',                 'iconValue':'2'});
    icons.push({'iconFilePath':'images/icons/airport.svg',                    'iconValue':'3'});
    icons.push({'iconFilePath':'images/icons/amusement-park.svg',             'iconValue':'4'});
    icons.push({'iconFilePath':'images/icons/aquarium.svg',                   'iconValue':'5'});
    icons.push({'iconFilePath':'images/icons/archery.svg',                    'iconValue':'6'});
    icons.push({'iconFilePath':'images/icons/art-gallery.svg',                'iconValue':'7'});
    icons.push({'iconFilePath':'images/icons/assistive-listening-system.svg', 'iconValue':'8'});
    icons.push({'iconFilePath':'images/icons/atm.svg',                        'iconValue':'9'});
    icons.push({'iconFilePath':'images/icons/audio-description.svg',          'iconValue':'10'});
    icons.push({'iconFilePath':'images/icons/bakery.svg',                     'iconValue':'11'});
    icons.push({'iconFilePath':'images/icons/bank.svg',                       'iconValue':'12'});
    icons.push({'iconFilePath':'images/icons/bar.svg',                        'iconValue':'13'});
    icons.push({'iconFilePath':'images/icons/baseball.svg',                   'iconValue':'14'});
    icons.push({'iconFilePath':'images/icons/beauty-salon.svg',               'iconValue':'15'});
    icons.push({'iconFilePath':'images/icons/bicycle-store.svg',              'iconValue':'16'});
    icons.push({'iconFilePath':'images/icons/boating.svg',                    'iconValue':'18'});
    icons.push({'iconFilePath':'images/icons/boat-ramp.svg',                  'iconValue':'19'});
    icons.push({'iconFilePath':'images/icons/boat-tour.svg',                  'iconValue':'20'});
    icons.push({'iconFilePath':'images/icons/book-store.svg',                 'iconValue':'21'});
    icons.push({'iconFilePath':'images/icons/bowling-alley.svg',              'iconValue':'22'});
    icons.push({'iconFilePath':'images/icons/braille.svg',                    'iconValue':'23'});
    icons.push({'iconFilePath':'images/icons/bus-station.svg',                'iconValue':'24'});
    icons.push({'iconFilePath':'images/icons/cafe.svg',                       'iconValue':'25'});
    icons.push({'iconFilePath':'images/icons/campground.svg',                 'iconValue':'26'});
    icons.push({'iconFilePath':'images/icons/canoe.svg',                      'iconValue':'27'});
    icons.push({'iconFilePath':'images/icons/car-dealer.svg',                 'iconValue':'28'});
    icons.push({'iconFilePath':'images/icons/car-rental.svg',                 'iconValue':'29'});
    icons.push({'iconFilePath':'images/icons/car-repair.svg',                 'iconValue':'30'});
    icons.push({'iconFilePath':'images/icons/car-wash.svg',                   'iconValue':'31'});
    icons.push({'iconFilePath':'images/icons/casino.svg',                     'iconValue':'32'});
    icons.push({'iconFilePath':'images/icons/cemetery.svg',                   'iconValue':'33'});
    icons.push({'iconFilePath':'images/icons/chairlift.svg',                  'iconValue':'34'});
    icons.push({'iconFilePath':'images/icons/church.svg',                     'iconValue':'35'});
    icons.push({'iconFilePath':'images/icons/circle.svg',                     'iconValue':'36'});
    icons.push({'iconFilePath':'images/icons/city-hall.svg',                  'iconValue':'37'});
    icons.push({'iconFilePath':'images/icons/climbing.svg',                   'iconValue':'38'});
    icons.push({'iconFilePath':'images/icons/closed-captioning.svg',          'iconValue':'39'});
    icons.push({'iconFilePath':'images/icons/clothing-store.svg',             'iconValue':'40'});
    icons.push({'iconFilePath':'images/icons/compass.svg',                    'iconValue':'41'});
    icons.push({'iconFilePath':'images/icons/convenience-store.svg',          'iconValue':'42'});
    icons.push({'iconFilePath':'images/icons/courthouse.svg',                 'iconValue':'43'});
    icons.push({'iconFilePath':'images/icons/cross-country-skiing.svg',       'iconValue':'44'});
    icons.push({'iconFilePath':'images/icons/crosshairs.svg',                 'iconValue':'45'});
    icons.push({'iconFilePath':'images/icons/dentist.svg',                    'iconValue':'46'});
    icons.push({'iconFilePath':'images/icons/department-store.svg',           'iconValue':'47'});
    icons.push({'iconFilePath':'images/icons/diving.svg',                     'iconValue':'48'});
    icons.push({'iconFilePath':'images/icons/doctor.svg',                     'iconValue':'49'});
    icons.push({'iconFilePath':'images/icons/electrician.svg',                'iconValue':'50'});
    icons.push({'iconFilePath':'images/icons/electronics-store.svg',          'iconValue':'51'});
    icons.push({'iconFilePath':'images/icons/embassy.svg',                    'iconValue':'52'});
    icons.push({'iconFilePath':'images/icons/expand.svg',                     'iconValue':'53'});
    icons.push({'iconFilePath':'images/icons/female.svg',                     'iconValue':'54'});
    icons.push({'iconFilePath':'images/icons/finance.svg',                    'iconValue':'55'});
    icons.push({'iconFilePath':'images/icons/fire-station.svg',               'iconValue':'56'});
    icons.push({'iconFilePath':'images/icons/fish-cleaning.svg',              'iconValue':'57'});
    icons.push({'iconFilePath':'images/icons/fishing-pier.svg',               'iconValue':'59'});
    icons.push({'iconFilePath':'images/icons/florist.svg',                    'iconValue':'60'});
    icons.push({'iconFilePath':'images/icons/food.svg',                       'iconValue':'61'});
    icons.push({'iconFilePath':'images/icons/fullscreen.svg',                 'iconValue':'62'});
    icons.push({'iconFilePath':'images/icons/funeral-home.svg',               'iconValue':'63'});
    icons.push({'iconFilePath':'images/icons/furniture-store.svg',            'iconValue':'64'});
    icons.push({'iconFilePath':'images/icons/gas-station.svg',                'iconValue':'65'});
    icons.push({'iconFilePath':'images/icons/general-contractor.svg',         'iconValue':'66'});
    icons.push({'iconFilePath':'images/icons/grocery-or-supermarket.svg',     'iconValue':'68'});
    icons.push({'iconFilePath':'images/icons/gym.svg',                        'iconValue':'69'});
    icons.push({'iconFilePath':'images/icons/hair-care.svg',                  'iconValue':'70'});
    icons.push({'iconFilePath':'images/icons/hang-gliding.svg',               'iconValue':'71'});
    icons.push({'iconFilePath':'images/icons/hardware-store.svg',             'iconValue':'72'});
    icons.push({'iconFilePath':'images/icons/health.svg',                     'iconValue':'73'});
    icons.push({'iconFilePath':'images/icons/hindu-temple.svg',               'iconValue':'74'});
    icons.push({'iconFilePath':'images/icons/hospital.svg',                   'iconValue':'76'});
    icons.push({'iconFilePath':'images/icons/ice-fishing.svg',                'iconValue':'77'});
    icons.push({'iconFilePath':'images/icons/ice-skating.svg',                'iconValue':'78'});
    icons.push({'iconFilePath':'images/icons/inline-skating.svg',             'iconValue':'79'});
    icons.push({'iconFilePath':'images/icons/insurance-agency.svg',           'iconValue':'80'});
    icons.push({'iconFilePath':'images/icons/jet-skiing.svg',                 'iconValue':'81'});
    icons.push({'iconFilePath':'images/icons/jewelry-store.svg',              'iconValue':'82'});
    icons.push({'iconFilePath':'images/icons/kayaking.svg',                   'iconValue':'83'});
    icons.push({'iconFilePath':'images/icons/laundry.svg',                    'iconValue':'84'});
    icons.push({'iconFilePath':'images/icons/lawyer.svg',                     'iconValue':'85'});
    icons.push({'iconFilePath':'images/icons/library.svg',                    'iconValue':'86'});
    icons.push({'iconFilePath':'images/icons/liquor-store.svg',               'iconValue':'87'});
    icons.push({'iconFilePath':'images/icons/local-government.svg',           'iconValue':'88'});
    icons.push({'iconFilePath':'images/icons/location-arrow.svg',             'iconValue':'89'});
    icons.push({'iconFilePath':'images/icons/locksmith.svg',                  'iconValue':'90'});
    icons.push({'iconFilePath':'images/icons/lodging.svg',                    'iconValue':'91'});
    icons.push({'iconFilePath':'images/icons/low-vision-access.svg',          'iconValue':'92'});
    icons.push({'iconFilePath':'images/icons/male.svg',                       'iconValue':'93'});
    icons.push({'iconFilePath':'images/icons/map-pin.svg',                    'iconValue':'94'});
    icons.push({'iconFilePath':'images/icons/marina.svg',                     'iconValue':'95'});
    icons.push({'iconFilePath':'images/icons/mosque.svg',                     'iconValue':'96'});
    icons.push({'iconFilePath':'images/icons/movie-rental.svg',               'iconValue':'98'});
    icons.push({'iconFilePath':'images/icons/movie-theater.svg',              'iconValue':'99'});
    icons.push({'iconFilePath':'images/icons/moving-company.svg',             'iconValue':'101'})
    icons.push({'iconFilePath':'images/icons/museum.svg',                     'iconValue':'102'})
    icons.push({'iconFilePath':'images/icons/natural-feature.svg',            'iconValue':'103'})
    icons.push({'iconFilePath':'images/icons/night-club.svg',                 'iconValue':'104'})
    icons.push({'iconFilePath':'images/icons/open-captioning.svg',            'iconValue':'105'})
    icons.push({'iconFilePath':'images/icons/painter.svg',                    'iconValue':'106'})
    icons.push({'iconFilePath':'images/icons/park.svg',                       'iconValue':'107'})
    icons.push({'iconFilePath':'images/icons/parking.svg',                    'iconValue':'108'})
    icons.push({'iconFilePath':'images/icons/pet-store.svg',                  'iconValue':'109'})
    icons.push({'iconFilePath':'images/icons/pharmacy.svg',                   'iconValue':'110'})
    icons.push({'iconFilePath':'images/icons/physiotherapist.svg',            'iconValue':'111'})
    icons.push({'iconFilePath':'images/icons/place-of-worship.svg',           'iconValue':'112'})
    icons.push({'iconFilePath':'images/icons/playground.svg',                 'iconValue':'113'})
    icons.push({'iconFilePath':'images/icons/plumber.svg',                    'iconValue':'114'})
    icons.push({'iconFilePath':'images/icons/point-of-interest.svg',          'iconValue':'115'})
    icons.push({'iconFilePath':'images/icons/police.svg',                     'iconValue':'116'})
    icons.push({'iconFilePath':'images/icons/political.svg',                  'iconValue':'117'})
    icons.push({'iconFilePath':'images/icons/postal-code.svg',                'iconValue':'118'})
    icons.push({'iconFilePath':'images/icons/postal-code-prefix.svg',         'iconValue':'119'})
    icons.push({'iconFilePath':'images/icons/post-box.svg',                   'iconValue':'120'})
    icons.push({'iconFilePath':'images/icons/post-office.svg',                'iconValue':'121'})
    icons.push({'iconFilePath':'images/icons/rafting.svg',                    'iconValue':'122'})
    icons.push({'iconFilePath':'images/icons/real-estate-agency.svg',         'iconValue':'123'})
    icons.push({'iconFilePath':'images/icons/restaurant.svg',                 'iconValue':'124'})
    icons.push({'iconFilePath':'images/icons/roofing-contractor.svg',         'iconValue':'125'})
    icons.push({'iconFilePath':'images/icons/route.svg',                      'iconValue':'126'})
    icons.push({'iconFilePath':'images/icons/route-pin.svg',                  'iconValue':'127'})
    icons.push({'iconFilePath':'images/icons/rv-park.svg',                    'iconValue':'128'})
    icons.push({'iconFilePath':'images/icons/sailing.svg',                    'iconValue':'129'})
    icons.push({'iconFilePath':'images/icons/school.svg',                     'iconValue':'130'})
    icons.push({'iconFilePath':'images/icons/scuba-diving.svg',               'iconValue':'131'})
    icons.push({'iconFilePath':'images/icons/search.svg',                     'iconValue':'132'})
    icons.push({'iconFilePath':'images/icons/sheild.svg',                     'iconValue':'133'})
    icons.push({'iconFilePath':'images/icons/shopping-mall.svg',              'iconValue':'134'})
    icons.push({'iconFilePath':'images/icons/sign-language.svg',              'iconValue':'135'})
    icons.push({'iconFilePath':'images/icons/skateboarding.svg',              'iconValue':'136'})
    icons.push({'iconFilePath':'images/icons/skiing.svg',                     'iconValue':'137'})
    icons.push({'iconFilePath':'images/icons/ski-jumping.svg',                'iconValue':'138'})
    icons.push({'iconFilePath':'images/icons/sledding.svg',                   'iconValue':'139'})
    icons.push({'iconFilePath':'images/icons/snow.svg',                       'iconValue':'140'})
    icons.push({'iconFilePath':'images/icons/snowboarding.svg',               'iconValue':'151'})
    icons.push({'iconFilePath':'images/icons/snowmobile.svg',                 'iconValue':'152'})
    icons.push({'iconFilePath':'images/icons/snow-shoeing.svg',               'iconValue':'153'})
    icons.push({'iconFilePath':'images/icons/spa.svg',                        'iconValue':'154'})
    icons.push({'iconFilePath':'images/icons/square.svg',                     'iconValue':'155'})
    icons.push({'iconFilePath':'images/icons/square-pin.svg',                 'iconValue':'156'})
    icons.push({'iconFilePath':'images/icons/square-rounded.svg',             'iconValue':'157'})
    icons.push({'iconFilePath':'images/icons/stadium.svg',                    'iconValue':'158'})
    icons.push({'iconFilePath':'images/icons/storage.svg',                    'iconValue':'159'})
    icons.push({'iconFilePath':'images/icons/store.svg',                      'iconValue':'160'})
    icons.push({'iconFilePath':'images/icons/subway-station.svg',             'iconValue':'161'})
    icons.push({'iconFilePath':'images/icons/surfing.svg',                    'iconValue':'162'})
    icons.push({'iconFilePath':'images/icons/swimming.svg',                   'iconValue':'163'})
    icons.push({'iconFilePath':'images/icons/synagogue.svg',                  'iconValue':'164'})
    icons.push({'iconFilePath':'images/icons/taxi-stand.svg',                 'iconValue':'165'})
    icons.push({'iconFilePath':'images/icons/tennis.svg',                     'iconValue':'166'})
    icons.push({'iconFilePath':'images/icons/toilet.svg',                     'iconValue':'167'})
    icons.push({'iconFilePath':'images/icons/train-station.svg',              'iconValue':'169'})
    icons.push({'iconFilePath':'images/icons/transit-station.svg',            'iconValue':'170'})
    icons.push({'iconFilePath':'images/icons/travel-agency.svg',              'iconValue':'171'})
    icons.push({'iconFilePath':'images/icons/unisex.svg',                     'iconValue':'172'})
    icons.push({'iconFilePath':'images/icons/university.svg',                 'iconValue':'173'})
    icons.push({'iconFilePath':'images/icons/veterinary-care.svg',            'iconValue':'174'})
    icons.push({'iconFilePath':'images/icons/volume-control-telephone.svg',   'iconValue':'176'})
    icons.push({'iconFilePath':'images/icons/waterskiing.svg',                'iconValue':'178'})
    icons.push({'iconFilePath':'images/icons/whale-watching.svg',             'iconValue':'179'})
    icons.push({'iconFilePath':'images/icons/wheelchair.svg',                 'iconValue':'180'})
    icons.push({'iconFilePath':'images/icons/wind-surfing.svg',               'iconValue':'181'})
    icons.push({'iconFilePath':'images/icons/zoo.svg',                        'iconValue':'182'})
    icons.push({'iconFilePath':'images/icons/zoom-in.svg',                    'iconValue':'183'})
    icons.push({'iconFilePath':'images/icons/zoom-in-alt.svg',                'iconValue':'184'})
    icons.push({'iconFilePath':'images/icons/zoom-out.svg',                   'iconValue':'185'})
    icons.push({'iconFilePath':'images/icons/zoom-out-alt.svg',               'iconValue':'186'})

    iconSelect.refresh(icons);
    iconSelect.setSelectedIndex(iconNumber);

    $("#poi-dialog").dialog({
      resizable: false,
      title: title,
      height: 500,
      width: 500,
      modal: true,
      buttons: {
        Ok: function() {
          $(this).dialog( "close" );
        }
      }
    });
}
