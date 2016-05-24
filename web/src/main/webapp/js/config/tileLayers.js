var osmAttr = '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

// Automatically enable high-DPI tiles if provider and browser support it.
var retinaTiles = L.Browser.retina;
var host;

var mapBox = require('../leaflet-mapbox-gl.js')

var lyrk = L.tileLayer('https://tiles.lyrk.org/' + (retinaTiles ? 'lr' : 'ls') + '/{z}/{x}/{y}?apikey=6e8cfef737a140e2a58c8122aaa26077', {
    attribution: osmAttr + ', <a href="https://geodienste.lyrk.de/">Lyrk</a>'
});

var omniscale = L.tileLayer.wms('https://maps.omniscale.net/v1/mapsgraph-bf48cc0b/tile', {
    layers: 'osm',
    attribution: osmAttr + ', &copy; <a href="http://maps.omniscale.com/">Omniscale</a>'
});

var mapquest = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://open.mapquest.co.uk" target="_blank">MapQuest</a>',
    subdomains: '1234'
});

var mapquestAerial = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://open.mapquest.co.uk" target="_blank">MapQuest</a>',
    subdomains: '1234'
});

var openMapSurfer = L.tileLayer('http://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}', {
    attribution: osmAttr + ', <a href="http://korona.geog.uni-heidelberg.de/contact.html">GIScience Heidelberg</a>'
});

// Not an option as too fast over limit.
// var mapbox= L.tileLayer('https://{s}.tiles.mapbox.com/v4/peterk.map-vkt0kusv/{z}/{x}/{y}' + (retinaTiles ? '@2x' : '') + '.png?access_token=pk.eyJ1IjoicGV0ZXJrIiwiYSI6IkdFc2FJd2MifQ.YUd7dS_gOpT3xrQnB8_K-w', {
//     attribution: osmAttr + ', <a href="https://www.mapbox.com/about/maps/">&copy; MapBox</a>'
// });

var sorbianLang = L.tileLayer('http://map.dgpsonline.eu/osmsb/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://www.alberding.eu/">&copy; Alberding GmbH, CC-BY-SA</a>'
});

var thunderTransport = L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://www.thunderforest.com/transport/" target="_blank">Thunderforest Transport</a>'
});

var thunderCycle = L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://www.thunderforest.com/opencyclemap/" target="_blank">Thunderforest Cycle</a>'
});

var thunderOutdoors = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://www.thunderforest.com/outdoors/" target="_blank">Thunderforest Outdoors</a>'
});

var wrk = L.tileLayer('http://{s}.wanderreitkarte.de/topo/{z}/{x}/{y}.png', {
    attribution: osmAttr + ', <a href="http://wanderreitkarte.de" target="_blank">WanderReitKarte</a>',
    subdomains: ['topo4', 'topo', 'topo2', 'topo3']
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: osmAttr
});

var osmde = L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
    attribution: osmAttr
});

var mapLink = '<a href="http://www.esri.com/">Esri</a>';
var wholink = 'i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
var esriAerial = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; ' + mapLink + ', ' + wholink,
    maxZoom: 18
});

module.exports.activeLayerName = "Omniscale";
module.exports.defaultLayer = omniscale;
module.exports.activeLayer = module.exports.defaultLayer;

var availableRasterTileLayers = {};
var availableVectorTileLayers = {};
// availableTileLayers["Lyrk"] = lyrk;
availableRasterTileLayers["Omniscale"] = omniscale;
availableRasterTileLayers["MapQuest"] = mapquest;
availableRasterTileLayers["MapQuest Aerial"] = mapquestAerial;
availableRasterTileLayers["Esri Aerial"] = esriAerial;
availableRasterTileLayers["OpenMapSurfer"] = openMapSurfer;
availableRasterTileLayers["TF Transport"] = thunderTransport;
availableRasterTileLayers["TF Cycle"] = thunderCycle;
availableRasterTileLayers["TF Outdoors"] = thunderOutdoors;
availableRasterTileLayers["WanderReitKarte"] = wrk;
availableRasterTileLayers["OpenStreetMap"] = osm;
availableRasterTileLayers["OpenStreetMap.de"] = osmde;
availableRasterTileLayers["Sorbian Language"] = sorbianLang;

module.exports.getAvailableTileLayers = function () {
    return $.extend(availableVectorTileLayers, availableRasterTileLayers);
};

var styleTileURL = {};

module.exports.setActivelayer = function (layerEvent)
{
    // Obviously the style needs to be changed together with every layer change - this we do here:
    if (styleTileURL[layerEvent.name])
    {
       layerEvent.layer.options.style.sources.mapbox.tiles[0] = styleTileURL[layerEvent.name]; 
       module.exports.activeLayer = availableVectorTileLayers[layerEvent.name];
       localStorage['lastlayerName'] = layerEvent.name;
    }
}

module.exports.selectLayer = function (layerName) {
    var defaultLayer = availableRasterTileLayers[layerName];
    if (!defaultLayer)
    {
        defaultLayer = module.exports.defaultLayer;
        try {
             // Change the tile url
             defaultLayer.options.style.sources.mapbox.tiles[0] = styleTileURL[module.exports.activeLayerName];
            }
         catch(err) {
            // Ignore for raster tile layer
         }
    }
    
    return defaultLayer;
};

// Remove the following block in case that you do not intend to run a local vector tile server. 
// The code does not break anything, but is unnecessary then.
var stylejsonObj = require('../../vectorstyles/bright-v9.json');

module.exports.setHost = function (hostname) {
    host = hostname;
    if (hostname === "")
        host = "localhost";
    console.log("tileLayers module.exports.setHost host=" + host + " hostname=" + hostname);
    // Get the list of served vector tile areas
    $.getJSON("http://" + host + ":3000/mbtilesareas.json", function( data ) {
        var i = 0;
        $.each( data, function( key, val ) {
                var layerName = "Vector " + val.country.charAt(0).toUpperCase() + val.country.slice(1);
                var url = "http://" + host + ":3000/" + val.country + "/{z}/{x}/{y}.pbf";
                stylejsonObj.sources.mapbox.tiles[0] = url;
                stylejsonObj.sprite = "http://" + host + ":8989/assets/bright-v8";
                stylejsonObj.glyphs = "http://" + host + ":8989/assets/font/{fontstack}/{range}.pbf";
                styleTileURL[layerName] = url;
                var vectorlayer = L.mapboxGL({
                                          attribution: osmAttr + " © <a href='https://www.mapbox.com/about/maps/'>Mapbox</a>",
                                          style: stylejsonObj
                                       });
                availableVectorTileLayers[layerName] = vectorlayer;
                lastlayerName = localStorage.lastlayerName;
                if (lastlayerName === undefined)
                    lastlayerName = layerName;
                if (layerName === lastlayerName) // Select the default
                {
                    module.exports.activeLayerName = layerName;
                    module.exports.defaultLayer = vectorlayer;
                    module.exports.activeLayer = vectorlayer;
                }
                i++;
        });
    });
};
