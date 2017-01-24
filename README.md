# BikeTourPlanner

BikeTourPlanner is an open source desktop application for offline planning of bicycle tours based on the [GraphHopper](https://github.com/graphhopper/graphhopper) routing engine. 
It allows the user to generate routing data from [OpenStreetMap](http://www.openstreetmap.org/about)(OSM) data on demand.

BikeTourPlanner is a [nwjs](http://nwjs.io/) application.
It uses offline maps which are provided by [OSM2VectorTiles](http://osm2vectortiles.org/about) and displayed using [Leaflet](https://github.com/mapbox/mapbox-gl-js) and [mapbox-gl-js](https://github.com/mapbox/mapbox-gl-js). 
BikeTourPlanner comes with an integrated local vector tile map server which uses [nodejs](https://nodejs.org/en/). It requires an installed Java 8 runtime.

The currently supported platforms are: 

* Linux 64-bit 
* Microsoft Windows 64-bit / 32 bit  should work, but is not tested

Implementation of support for Mac OS X 64-bit should be possible with few changes.

The look and feel is similar to [GraphHopper Maps](https://graphhopper.com/maps) as most parts are identical. Here is a screen-shot of the main window:

![BikeTourPlanner](biketourplanner/doc/BikeTourPlanner_001.png)

User documentation is located [here](https://ratrun.github.io/BikeTourPlannerGHPages/).

## Developer information
The BikeTourPlanner [nwjs](http://docs.nwjs.io/en/latest/) application root is located under in the directory `web/src/main/webapp`.
The GraphHopper graphhopper-web-x.y-SNAPSHOT-with-dep.jar file checked in under `web/src/main/webapp/graphhopper` is the 
result of the Graphhopper Web NetBeans project. This file may be built built from the contained modified GraphHopper source files and checked in to git 
under web\src\main\webapp\graphhopper (web\src\main\webapp\graphhopper\graphhopper-web-x.y-SNAPSHOT-with-dep.jar). The documentation for the graphopper 
build process is located under [docs\core\quickstart-from-source.md](docs\core\quickstart-from-source.md).
The vector tile server located at [web\src\main\webapp\ratrun-mbtiles-server](web\src\main\webapp\ratrun-mbtiles-server) is a git submodul.
Development requires installed [nodejs](https://nodejs.org/en/) version 0.18.6. 

These are the installation steps for Linux: 

```
npm install -g nw@0.19.0-sdk 
git clone --recursive https://github.com/ratrun/biketourplanner
cd biketourplanner/web/src/main/webapp
cd web
npm install
cd src/main/webapp
npm install
cd ratrun-mbtiles-server/
npm install 
```

Verify that the tile server works by starting 
`../nodejs server.js`
Here you should see the following output:

```
Serving files from /home/ratrun/biketourplanner/web/src/main/webapp/data/mbtiles
Listening on port: 3000
Serving following areas:
bicyclenodes
bicycleroutes
liechtenstein 
```
Press CTRL C and start the application by 
```
cd ..
nw .
```

You should see the main window and popup notification windows about the start of the tile the server and graph creation. 
On Windows you probably will get notifications from the firewall.
After a litte while the map of Liechtenstein should become visible.

* To make that js source code modifcations become active automatically, run `npm run watch` from the `web` directory in a separate console

## Bugs
Report bugs on [https://github.com/ratrun/biketourplanner](https://github.com/ratrun/biketourplanner/issues). 
If possible attach relevant log information. Log information can be created by starting the application via:
`nw --enable-logging=stderr 1>&2 2>logfile.txt`
