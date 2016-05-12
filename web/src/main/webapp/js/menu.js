var mbtiles;

var stopTileServerMenuItem;
var startTileServerMenuItem;
var aboutWindow = null;

function startLocalVectorTileServer(win)
{
    var tilesServerHasExited = false;
    // On Windows Only ...
    const exec = global.require('child_process').spawn;
    mbtiles = exec('../node.exe' , ['server.js'], {
       cwd: 'ratrun-mbtiles-server',
       detached: true
    });
    mbtiles.unref();

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
    
    win.on('close', function() {
        this.hide(); // Pretend to be closed already
        if (tilesServerHasExited)
        {
            if (aboutWindow != null)
                aboutWindow.close(true);
            this.close(true);
        }
        else
        {   // Inform the tile server via SIGINT to close
            var res = mbtiles.kill('SIGINT');
            console.log("Guiwindow.on exit kill SIGINT returned:" + res);
            setTimeout(function(){ 
                console.log("Wait for second close");
            }, 500);
        }
    });
    
    mbtiles.on('uncaughtException', function (err) {
      console.log('Caught exception: ' + err);
    });

}

var download = function(url, dest, cb) {
    var http = global.require('https');
    var fs = global.require('fs');
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
// Here we define the functionality for the graphhopper webkit application
function webkitapp(win)
{
    startLocalVectorTileServer(win);
    var menu = new gui.Menu({type: "menubar"});

    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    mapSubMenu.append(new gui.MenuItem({ label: 'Show installed maps',
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    alert("Installed map: " + JSON.stringify(data))
                             });
                          }
    }));
    mapSubMenu.append(new gui.MenuItem({ label: 'Add map',
        click: function() {
               download("https://osm2vectortiles-downloads.os.zhdk.cloud.switch.ch/v1.0/extracts/liechtenstein.mbtiles", "ratrun-mbtiles-server\\liechtenstein.mbtiles",
               function(err) {
                   alert(err);
               }
               );
        }
    }));
    stopTileServerMenuItem = new gui.MenuItem({ label: 'Stop tile server',
        click: function() { 
                             console.log("Stop tile server clicked");
                             $.getJSON("http://127.0.0.1:3000/4cede326-7166-4cbd-994f-699c6dc271e9", function( data ) {
                                    console.log("Tile server stop response was" + data);
                             });
                           }
    });
    startTileServerMenuItem = new gui.MenuItem({ label: 'Start tile server', enabled : false , 
        click: function() { 
                             startLocalVectorTileServer(win);
                             this.enabled = false;
                             stopTileServerMenuItem.enabled = true;
                          }
    });
    mapSubMenu.append(stopTileServerMenuItem);    
    mapSubMenu.append(startTileServerMenuItem);
    
    menu.append(
        new gui.MenuItem({
            label: 'Map',
            submenu: mapSubMenu 
        })
    );

    var graphhopperSubMenu = new gui.Menu();
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph' ,  enabled : false} ));
    graphhopperSubMenu.append(new gui.MenuItem({ type: 'separator' ,  enabled : false }))
    // graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change graph settings', enabled : false }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Calculate new graph' ,  enabled : false}));
    graphhopperSubMenu.append(new gui.MenuItem({ type: 'separator' ,  enabled : false }))
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Show available OSM data files' ,  enabled : false  }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Download new OSM data file',
        click: function() {
            download("https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf", "graphhopper\\osmfiles\\liechtenstein-latest.osm.pbf",
               function(err) {
                   alert(err);
               });
        }
    }));

    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Delete OSM data file' ,  enabled : false  }));

    menu.append(
        new gui.MenuItem({
            label: 'Routing',
            submenu: graphhopperSubMenu 
        })
    );

    // Create the help sub-menu
    var helpSubMenu = new gui.Menu();
    helpSubMenu.append(new gui.MenuItem({ label: 'Info' ,  enabled : false}));
    helpSubMenu.append(new gui.MenuItem({ type: 'separator' ,  enabled : false }));
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
            label: 'About',
            submenu: helpSubMenu
        })
    );

        // Append Menu to Window
    gui.Window.get().menu = menu;
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


