REM Command for OSMOSIS 
REM See https://wiki.openstreetmap.org/wiki/Osmosis/Detailed_Usage_0.44
SET format=pbf
SET inputfile=c:\Stefan\mkgmap\myanmar\austria.osm.pbf
REM SET inputfile=d:\Surfing\liechtenstein-latest.osm.pbf
REM SET format=xml
REM SET inputfile=d:\temp\eichgr.osm

REM c:\Stefan\mkgmap\myanmar\osmosis-0.44\bin\osmosis.bat --read-%format% %inputfile% --tf accept-nodes tourism=* amenity=drinking_water --tf reject-relations --tf reject-ways ^
REM     --read-%format% %inputfile% --tf accept-relations type=route --tf accept-relations route=bicycle,mtb --used-way --used-node --merge ^
REM     --write-xml d:\temp\austriafiltered.osm
     
c:\Stefan\mkgmap\myanmar\osmosis-0.44\bin\osmosis.bat --read-%format% %inputfile% --tf accept-relations type=route --tf accept-relations route=bicycle,mtb --used-way --used-node --write-xml d:\temp\austriafiltered.osm
REM From https://wiki.openstreetmap.org/wiki/Osmosis/Detailed_Usage_0.44

REM osmtogeojson D:\temp\test.osm > D:\temp\test.json
REM osmtogeojson --help
node  D:\Stefan\graphhopperlatestmaster\mytourplan\ratrunosmtogeojson\osmtogeojson -p d:\temp\austriafiltered.osm >d:\temp\austria.mytourplan.json
REM geojson-pick name route network < d:\temp\test.json > d:\temp\austria.json

REM Afterwards under Linux: tippecanoe
REM tilegen@wenks-virtual-machine:~/myanmar$ cd tippecanoeosm2vector/
REM tilegen@wenks-virtual-machine:~/myanmar/tippecanoeosm2vector$
 
