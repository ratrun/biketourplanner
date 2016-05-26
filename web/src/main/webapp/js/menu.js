var mbtiles;
var graphhopper;

var stopTileServerMenuItem;
var startTileServerMenuItem;
var stopGraphhopperServerMenuItem;
var startGraphhopperServerMenuItem;

var aboutWindow = null;
var tilesServerHasExited = true;
var graphhopperServerHasExited = true;
var shutdownapp = false;
var fs = global.require('fs');

function startLocalVectorTileServer(win)
{
    tilesServerHasExited = false;
    // On Windows Only ...
    var exec = global.require('child_process').spawn;
    mbtiles = exec('../node.exe' , ['server.js'], {
       cwd: 'ratrun-mbtiles-server',
       detached: false
    });
    
    stopTileServerMenuItem.enabled = true;
    startTileServerMenuItem.enabled = false;

    console.log('mbtiles started: ' + mbtiles);
        
    mbtiles.on('error', function (err) {
      console.log('mbtiles error' + err);
    });

    mbtiles.stdout.on('data', function (data) {
        console.log('mbtiles stdout: ' + data);
    });

    mbtiles.stderr.on('data', function (data) {
        console.log('mbtiles stderr: ' + data);
    });

    mbtiles.on('close', function (code) {
        console.log('tiles server child process closed with code ' + code);
    });

    mbtiles.on('exit', function (code, signal) {
        console.log('tiles server child process exited with code ' + code +' signal=' + signal);
        tilesServerHasExited = true;
        setTimeout(function(){ 
              if (signal === 'SIGINT')
                this.close(true);
              else
                if (code === 100) // Code for received stop trigger 
                {
                    stopTileServerMenuItem.enabled = false;
                    startTileServerMenuItem.enabled = true;
                }
                else
                   // We got this most likely during startup because the vector tile server is already active and the 
                   // new instance cannot bind to the tile server port again as it is in use.
                   console.log("Running tile server detected, keep it active");
        }, 500);
    });
    
    mbtiles.on('uncaughtException', function (err) {
      console.log('Caught exception: ' + err);
    });
}

function startGraphhopperServer(win)
{
    console.log('Starting graphhopper');
    // On Windows Only 
    var exec = global.require('child_process').spawn;
    graphhopper = exec('java.exe' , ['-Xmx1500m', '-Xms1500m', '-jar', 'graphhopper-web-0.7-SNAPSHOT-with-dep.jar', 'jetty.resourcebase=../', 'jetty.port=8989', 'config=config.properties', 'osmreader.osm=osmfiles/liechtenstein-latest.osm.pbf', 'graph.location=graph'], {
       cwd: 'graphhopper',
       detached: false
    });

    console.log('graphhopper started: ' + graphhopper);
    graphhopperServerHasExited = false;
    stopGraphhopperServerMenuItem.enabled = true;
    startGraphhopperServerMenuItem.enabled = false;
    deleteGraphMenuItem.enabled = false;

    graphhopper.on('error', function (err) {
      console.log('graphhopper error' + err);
    });

    graphhopper.stdout.on('data', function (data) {
        console.log('graphhopper stdout: ' + data);
    });

    graphhopper.stderr.on('data', function (data) {
        console.log('graphhopper stderr: ' + data);
    });

    graphhopper.on('close', function (code) {
        console.log('graphhopper child process closed with code ' + code);
    });

    graphhopper.on('exit', function (code, signal) {
        console.log('graphhopper child process exited with code ' + code +' signal=' + signal);
        graphhopperServerHasExited = true;
        if (shutdownapp)
        {
            setTimeout(function(){ 
                  if (signal === 'SIGTERM')
                    this.close(true);
            }, 500);
        }
    });

    win.on('close', function() {
        this.hide(); // Pretend to be closed already
        shutdownapp = true;
        if ((tilesServerHasExited) && (graphhopperServerHasExited))
        {
            if (aboutWindow != null)
                aboutWindow.close(true);
            this.close(true);
        }
        else
        {
           stopLocalVectorTileServer();
           stopGraphhopperServer();
        }
    });

    graphhopper.on('uncaughtException', function (err) {
      console.log('Caught exception: ' + err);
    });
}

function stopLocalVectorTileServer()
{
  if (!tilesServerHasExited)
  {   // Inform the tile server via SIGINT to close
      var res = mbtiles.kill('SIGTERM');
      console.log("mbtiles kill SIGTERM returned:" + res);
      stopTileServerMenuItem.enabled = false;
      startTileServerMenuItem.enabled = true;
  }
}

function stopGraphhopperServer()
{
  if (!graphhopperServerHasExited)
  {   // Inform the graphhopper server to close
      stopGraphhopperServerMenuItem.enabled = false;
      startGraphhopperServerMenuItem.enabled = true;
      deleteGraphMenuItem.enabled = true;
      var res = graphhopper.kill('SIGTERM');
      console.log("graphhopper kill SIGTERM returned:" + res);
  }
}

var download = function(url, dest, cb) {
    var http = global.require('https');
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {

        // check if response is success
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }

        response.pipe(file);

        file.on('finish', function() {
            file.close(cb('Download of ' + url + ' finished!'));  // close() is async, call cb after close completes.
        });
    });

    // check for request error too
    request.on('error', function (err) {
        fs.unlink(dest);

        if (cb) {
            return cb(err.message);
        }
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (cb) {
            return cb(err.message);
        }
    });
};

// Deletes the graph data file from the provided directory.
function deletegraph(dir)
{
  if (graphhopperServerHasExited)
  {
      fs.unlinkSync(dir + '/edges');
      fs.unlinkSync(dir + '/geometry');
      fs.unlinkSync(dir + '/location_index');
      fs.unlinkSync(dir + '/names');
      fs.unlinkSync(dir + '/properties');
      fs.unlinkSync(dir + '/nodes');
  }
  else
      alert("Cannot delete graph as graphhopper server is running!");
};

// Here we define the functionality for the graphhopper webkit application
function webkitapp(win)
{
    var menu = new gui.Menu({type: "menubar"});

    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    var separator = new gui.MenuItem({ type: 'separator' , enabled : false });
    mapSubMenu.append(new gui.MenuItem({ label: 'Show installed maps',
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    alert("Installed maps: \n" + JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,''));
                             });
                          }
    }));
    mapSubMenu.append(new gui.MenuItem({ label: 'Add map: Fixme',
        click: function() {
        	     stopLocalVectorTileServer();
               download("https://osm2vectortiles-downloads.os.zhdk.cloud.switch.ch/v2.0/extracts/liechtenstein.mbtiles", "ratrun-mbtiles-server\\liechtenstein.mbtiles",
               function(err) {
                   alert(err);
               }
               );
        }
    }));
    mapSubMenu.append(new gui.MenuItem({ label: 'Delete map: Fixme' , enabled : false }));
    stopTileServerMenuItem = new gui.MenuItem({ label: 'Stop tile server', enabled : tilesServerHasExited ,
        click: function() { 
                             console.log("Stop tile server clicked");
                             $.getJSON("http://127.0.0.1:3000/4cede326-7166-4cbd-994f-699c6dc271e9", function( data ) {
                                    console.log("Tile server stop response was" + data);
                             });
                             startTileServerMenuItem.enabled = true;
                             stopTileServerMenuItem.enabled = false;
                           }
    });
    startTileServerMenuItem = new gui.MenuItem({ label: 'Start tile server', enabled : !tilesServerHasExited , 
        click: function() { 
                             startLocalVectorTileServer(win);
                             this.enabled = false;
                          }
    });
    mapSubMenu.append(separator);
    mapSubMenu.append(stopTileServerMenuItem);
    mapSubMenu.append(startTileServerMenuItem);
    
    menu.append(
        new gui.MenuItem({
            label: 'Map',
            submenu: mapSubMenu 
        })
    );

    var graphhopperSubMenu = new gui.Menu()
    var win = gui.Window.get();

    stopGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Stop Graphhopper server', enabled : graphhopperServerHasExited , 
        click: function() { 
                             console.log('Stop Graphhopper server clicked');
                             stopGraphhopperServer();
                           }
    });
    startGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Start Graphhopper server', enabled : !graphhopperServerHasExited , 
        click: function() {  console.log('Start Graphhopper server clicked');
                             startGraphhopperServer(win);
                             this.enabled = false;
                          }
    });
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph: Fixme' ,  enabled : false} ));
    graphhopperSubMenu.append(separator);
    // graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change graph settings', enabled : false }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Calculate new graph: Fixme' ,  enabled : false}));
    deleteGraphMenuItem = new gui.MenuItem({ label: 'Delete graph', enabled : !graphhopperServerHasExited , 
        click: function() {  console.log('Delete graph clicked');
                             deletegraph('graphhopper/graph');
                          }
    });
    graphhopperSubMenu.append(deleteGraphMenuItem);
    graphhopperSubMenu.append(separator);
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Show available OSM data files: Fixme' , enabled : false }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Download new OSM data file: Fixme',
        click: function() {
            download("https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf", "graphhopper\\osmfiles\\liechtenstein-latest.osm.pbf",
               function(err) {
                   alert(err);
               });
        }
    }));

    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Delete OSM data file' , enabled : false }));
    graphhopperSubMenu.append(separator);
    graphhopperSubMenu.append(stopGraphhopperServerMenuItem);
    graphhopperSubMenu.append(startGraphhopperServerMenuItem);

    menu.append(
        new gui.MenuItem({
            label: 'Routing',
            submenu: graphhopperSubMenu 
        })
    );

    // Create the help sub-menu
    var helpSubMenu = new gui.Menu();
    helpSubMenu.append(new gui.MenuItem({ label: 'Help: Fixme' ,  enabled : false}));
    helpSubMenu.append(separator);
    helpSubMenu.append(new gui.MenuItem({ label: 'About' ,
        click: function() {
                            var params = {toolbar: false, resizable: false, show: true, height: 270, width: 450};
                            if (aboutWindow == null)
                            {
                                aboutWindow = gui.Window.open('about.html', params);
                                    aboutWindow.on('document-end', function() {
                                      aboutWindow.focus();
                                      // open link in default browser
                                      $(aboutWindow.window.document).find('a').bind('click', function (e) {
                                        e.preventDefault();
                                        gui.Shell.openExternal(this.href);
                                      });
                                    });
                            }
                            aboutWindow.on('close', function() {
                                   aboutWindow.close(true);
                                   aboutWindow = null;
                                });    
                          }
    }));
    
        menu.append(
        new gui.MenuItem({
            label: 'Help',
            submenu: helpSubMenu
        })
    );

        // Append Menu to Window
    gui.Window.get().menu = menu;

    startLocalVectorTileServer(win);
    startGraphhopperServer(win);

}

// Test if we are running under nwjs. If so the window.require('nw.gui'); command succeeds, otherwise we get an exception
try {
     var gui = window.require('nw.gui');
     var win = gui.Window.get();
     webkitapp(win);
 }
 catch(err) {
     // Ignore: We are not running under nw
 }


