---
layout: default
---

# BikeTourPlanner

BikeTourPlanner is an open source [nwjs](http://nwjs.io/) desktop application for offline planning of bicycle tours based on the [GraphHopper](https://github.com/graphhopper/graphhopper) routing engine. 
It allows the user to generate the routing data from [OpenStreetMap](http://www.openstreetmap.org/about) (OSM) data.
It uses offline maps which are provided by [OSM2VectorTiles](http://osm2vectortiles.org/about) and displayed using [Leaflet](https://github.com/mapbox/mapbox-gl-js) and [mapbox-gl-js](https://github.com/mapbox/mapbox-gl-js). 
BikeTourPlanner comes with an integrated local vector tile map server which uses [nodejs](https://nodejs.org/en/). 
BikeTourPlanner requires an installed Java 8 runtime.

The currently supported platforms are: 

* Linux 64-bit 
* Microsoft Windows 64-bit. 

Implementation of support for Mac OS X 64-bit should be possible with few changes.

The look and feel is similar to [GraphHopper Maps](https://graphhopper.com/maps) as most parts are identical. Here is a screen-shot of the main window:

![BikeTourPlanner](biketourplanner/doc/BikeTourPlanner_001.png)

BikeTourPlanner comes with the map and OSM data of Liechtenstein. 
The map features and the routing features are completely separated. 
This means changing a region requires the user to switch the map in one step and in a second step to seperatly switch the covered routing area. 
The reason is that the data comes from two separated sources.

## Map features
* Integrated download possibility for the installation of OSM2VectorTiles map extracts. 
* Rendering of OSM bicycle route relations in four different colors, which are derived from the OSM `network` tag. Unpaved way segments show up as a dotted line
* Bicycle specific point of interests:
  * Logging with the possibility to show up OSM features
  * Campsites with the possibility to show up OSM features
  * Bicycle shops with the possibility to show up OSM features
  * Alpine huts with the possibility to show up OSM features
  * Hospitals with the possibility to show up OSM features
  * Drinking water
  * Supermarkets
  * Restaurants
  * Fast food
  * Fuel
* BikeTourPlanner comes with the bicycle specific rendering covering the Liechtenstein area to keep the package small.
  It is possible to replace the contained two files with two files hosted on ??? in order to extend the bicycle specific 
  rendering to world wide coverage. This download would be about 1.4GB
* Display of smoothed elevation profile
* The usage of a map containing the whole planet is possible. Its size currently (2016) is about 56GB. Please do not try to download the whole planet via the menu, but rather use a web browser for downloading it.

## Routing features
* Routing profiles are switchable between bicycle types commuting, mountainbike and racebike
* OSM file download from [GeoFabric](http://download.geofabrik.de) can be started from the menu
* Routing data is locally stored. Switching between the covered routing regions is possible via the menu
* Calculation of routing data from *.pbf or *.osm OSM files. The duration for a calculation depends on the size of the OSM file and the covered area. Please note that calculation of the routing data is time consuming. 
* The region size which can be handled mainly depends on the RAM. 8 GB RAM should currently (2016) be sufficient to cover the whole DACH area (Germany, Switzerland, Austria). For a German Bundesland 4 GB RAM should be sufficient.
* Automatic download of elevation data during route data calculation. This data is cached locally. This process requires internet connectivity in case that the cache does not contain the region. This data might become pretty big.
* Route from A to B with optional stopover points
* Round-trips from a starting point with a targeted distance and optional heading
* Display of the distance spent on way classifications
* Display of guessed ascend. Please note that the calculated value might be quite inaccurate!
* Tuning between fast or nice routes
* Routing takes elevation data into account. Tuning between steep or flat routes is possible for all the bicycle types
* Alternative routes calculation
* GPX export
* Storing of tours and modification of stored tours

##Other features
* The OSM files, the vector tiles, and calculated graph data reside under the data folder located relative to the intallation root folder.
* Searching OSM data by name and address via [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim) is possible but requires internet connectivity.
* As the application uses a local web server, its URL located at http://localhost:8989 may be accessed via web browsers on the same machine. 
  In case that firewall rules allows it, this server can be accessed from other hosts with the network, but routing would require a manual change 
  of the `localhost` string in the file js\config\options.js into the local IP address.
  The application menu serves as management interface for the server.

## Limitations
* Altough localisation code would be available in those parts which are common to GraphHopper, the localiszation is hard-coded to English. This way mixing up of languages is avoided.

## Bugs
Report bugs on [https://github.com/ratrun/biketourplanner](https://github.com/ratrun/biketourplanner/issues)
  
## Developer information
The BikeTourPlanner [nw](http://docs.nwjs.io/en/latest/) application root is located under [web\src\main\webapp\package.json](web\src\main\webapp\package.json).
The GraphHopper graphhopper-web-x.y-SNAPSHOT-with-dep.jar file checked in under [web\src\main\webapp\graphhopper](web\src\main\webapp\graphhopper) is the result of the Graphhopper Web NetBeans project. This file may be built built from the contained modified GraphHopper source file and checked in to git under web\src\main\webapp\graphhopper (web\src\main\webapp\graphhopper\graphhopper-web-x.y-SNAPSHOT-with-dep.jar). The documentation for the graphopper build process is located under [docs\core\quickstart-from-source.md](docs\core\quickstart-from-source.md).
The vector tile server is located at [web\src\main\webapp\ratrun-mbtiles-server](web\src\main\webapp\ratrun-mbtiles-server) is a git submodul.
Development requires installed [nodejs](https://nodejs.org/en/). Installation is performed with `npm install -g nw --nwjs_build_type=sdk`

After git clone, the command `npm install` needs to be executed in the following folders:

* [web](web)
* [web\src\main\webapp](web\src\main\webapp)
* [web\src\main\webapp\ratrun-mbtiles-server](web\src\main\webapp\ratrun-mbtiles-server)
   
The application is started by running [`nw`](http://nwjs.io/) from [web\src\main\webapp](web\src\main\webapp)

