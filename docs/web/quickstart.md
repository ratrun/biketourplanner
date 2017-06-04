## Quickstart

If you want to build GraphHopper from source look at the [Developers page](../core/quickstart-from-source.md). 
The following steps are simpler and only need the JRE, a jar file and an OSM file.

 1. Install the latest JRE and get the zip of the [GraphHopper Web Service](https://github.com/graphhopper/graphhopper/blob/master/README.md#get-started)
 2. Unzip it and copy an OSM file into the created directory. For example [berlin-latest.osm.pbf](http://download.geofabrik.de/europe/germany/berlin.html)
 3. Start GraphHopper Maps via: `java -jar *.jar jetty.resourcebase=webapp config=config-example.properties datareader.file=berlin-latest.osm.pbf`
 4. After you see 'Started server at HTTP 8989' go to [http://localhost:8989/](http://localhost:8989/) and you should see a map of Berlin. You should be able to click on the map and a route appears.
 5. For offline usage you may be interested to download a OSM2VectorTiles *.mbtiles file of your area from [OSM2VectorTiles ](http://osm2vectortiles.org/downloads/) and put it to the [ratrun-mbtiles-server](https://github.com/ratrun/graphhopper/tree/master/ratrun-mbtiles-server) directory.
    Afterwards you can start a local vector tile server from the ../ratrun-mbtiles-server directory by running `npm install` and `npm start` there.
    When you re-load the page, you should be able to see the vector maps of your areas as top entries on the tile layer selector on the right of the map. When you choose one of these layers, you are using your local vector tile server.

See [here](./../core/elevation.md) how to easily enable elevation data. To see how GraphHopper is configured for production usage, see the [deployment guide](./../core/deploy.md).

## Troubleshooting

 * Make sure JRE8 is installed. If not get Java [here](http://java.com).
 * Regarding step 2:
    * The folder where you execute the java command should contain the following files: berlin-latest.osm.pbf, config-example.properties and `graphhopper-web-[version].jar`
    * The first time you execute this it'll take ~30 seconds (for Berlin), further starts will only load the graph and should be nearly instantaneous. You should see log statements but no exceptions and the last entry should be something like: Started server at HTTP 8989
 * Or [contact us](../index.md#contact)
