var mbtiles;

var stopTileServerMenuItem;
var startTileServerMenuItem;

function startLocalVectorTileServer(win)
{
    var tilesServerHasExited = false;
    // On Windows Only ...
    const exec = global.require('child_process').spawn;
    mbtiles = exec('node' , ['server.js'], {
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

// Here we define the functionality for the graphhopper webkit application
function webkitapp(win)
{
    startLocalVectorTileServer(win);
    var menu = new gui.Menu({type: "menubar"});

    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    mapSubMenu.append(new gui.MenuItem({ label: 'Show installed map areas',
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    alert("Installed tiles: " + JSON.stringify(data))
                             });
                          }
    }));
    mapSubMenu.append(new gui.MenuItem({ label: 'Download new map data' }));
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

    // Create the osm data sub-menu
    var osmDataSubMenu = new gui.Menu();
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Show available OSM data files' }));
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Download new OSM data file' }));
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Delete OSM data file' }));

    menu.append(
        new gui.MenuItem({
            label: 'OSM data',
            submenu: osmDataSubMenu 
        })
    );

    var graphhopperSubMenu = new gui.Menu();
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph' ,  enabled : false} ));
    graphhopperSubMenu.append(new gui.MenuItem({ type: 'separator' ,  enabled : false }))
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change graph settings' }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Calculate graph' ,  enabled : false}));

    menu.append(
        new gui.MenuItem({
            label: 'Graphhopper',
            submenu: graphhopperSubMenu 
        })
    );

    // Create the about sub-menu
    var aboutSubMenu = new gui.Menu();
    aboutSubMenu.append(new gui.MenuItem({ label: 'Active graph: None' ,  enabled : false} ));

    menu.append(
        new gui.MenuItem({
            label: 'About',
            submenu: aboutSubMenu
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


