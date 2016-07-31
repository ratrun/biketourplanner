var mbtiles;
var graphhopper;

var stopTileServerMenuItem;
var startTileServerMenuItem;
var stopGraphhopperServerMenuItem;
var startGraphhopperServerMenuItem;
var showInstalledMapsMenuItem;
var changeGraphMenuItem;
var deleteMapMenuItem;

var aboutWindow = null;
var selectCountryWindow = null;
var tilesServerHasExited = true;
var graphhopperServerHasExited = true;
var shutdownapp = false;
var fs;
var activeOsmfile = localStorage.activeOsmfile;
var gui;

if (activeOsmfile === undefined)
    activeOsmfile = 'liechtenstein-latest.osm.pbf';

function startLocalVectorTileServer(win)
{
    tilesServerHasExited = false;
    // On Windows only ???
    var exec = global.require('child_process').spawn;
    mbtiles = exec('../node.exe' , ['server.js'], {
       cwd: 'ratrun-mbtiles-server',
       detached: false
    });

    stopTileServerMenuItem.enabled = true;
    showInstalledMapsMenuItem.enabled = true;
    startTileServerMenuItem.enabled = false;
    deleteMapMenuItem.enabled = false;

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
        showHtmlNotification("./img/mtb.png", 'Tile server stopped !!' , '');
        tilesServerHasExited = true;
        setTimeout(function(){ 
              if (signal === 'SIGTERM')
                this.close(true);
              else
                if (code === 100) // Code for received stop trigger 
                {
                    stopTileServerMenuItem.enabled = false;
                    showInstalledMapsMenuItem.enabled = false;
                    startTileServerMenuItem.enabled = true;
                    deleteMapMenuItem.enabled = true;
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
    var os = global.require('os');
    console.log('Starting graphhopper');
    const initialpercent = 40; // Intitial percentage of heap space of total available RAM to reserve for graphhopper
    const maxpercent = 80; // Max percentage of total available RAM to reserve as max heap space for graphhopper
    var initialreserved = Math.trunc((os.totalmem() * (initialpercent/100))/(1024*1000));
    var maxreserved = Math.trunc((os.totalmem() * (maxpercent/100))/(1024*1000));
    console.log('Installed RAM:' + os.totalmem() + ' Bytes. Initial heap ' + initialpercent + '%=' + initialreserved + 'MB, max heap ' + maxpercent + '%=' +  maxreserved +'MB');
    // On Windows only ???
    var exec = global.require('child_process').spawn;

    //-Xms<size>        set initial Java heap size
    //-Xmx<size>        set maximum Java heap size
    graphhopper = exec('java.exe' , ['-Xmx' + maxreserved + 'm', '-Xms' + initialreserved + 'm', '-jar', 
                       'graphhopper-web-0.8-SNAPSHOT-with-dep.jar', 
                       'jetty.resourcebase=../', 
                       'jetty.port=8989', 
                       'config=config.properties', 
                       'datareader.osm=osmfiles/' + activeOsmfile, 
                       'graph.location=graph'], {
       cwd: 'graphhopper',
       detached: false
    });

    console.log('graphhopper started: ' + graphhopper);
    graphhopperServerHasExited = false;
    stopGraphhopperServerMenuItem.enabled = true;
    changeGraphMenuItem.enabled = false;
    startGraphhopperServerMenuItem.enabled = false;

    graphhopper.on('error', function (err) {
      console.log('graphhopper error' + err);
    });

    graphhopper.stdout.on('data', function (data) {
        console.log('graphhopper stdout: ' + data);
        if (data.toString('utf-8').indexOf('creating graph') !==-1 )
             showHtmlNotification("./img/mtb.png", "Creating graph", 'might take a while!');
        if (data.toString('utf-8').indexOf('Started server at HTTP :8989') !==-1 )
             showHtmlNotification("./img/mtb.png", "Graphhopper server", 'is ready...');
    });

    graphhopper.stderr.on('data', function (data) {
        console.log('graphhopper stderr: ' + data);
    });

    graphhopper.on('close', function (code) {
        console.log('graphhopper child process closed with code ' + code + ' shutdownapp=' + shutdownapp);
        graphhopperServerHasExited = true;
        showHtmlNotification("./img/mtb.png", 'Graphhopper routing server stopped !!' , '');
        if (shutdownapp)
           win.close();
    });

    graphhopper.on('exit', function (code, signal) {
        console.log('graphhopper child process exited with code ' + code +' signal=' + signal);
        graphhopperServerHasExited = true;
        if (shutdownapp)
            win.close();
    });

    win.on('close', function() {
        this.hide(); // Pretend to be closed already
        shutdownapp = true;
        console.log("win.on close tilesServerHasExited=" + tilesServerHasExited + " ,graphhopperServerHasExited="+ graphhopperServerHasExited);
        if ((tilesServerHasExited) && (graphhopperServerHasExited))
        {
            console.log("close2");
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
  {
   if (shutdownapp)
   {
      // Inform the tile server via SIGTERM to close
      var res = mbtiles.kill('SIGTERM');
      console.log("mbtiles kill SIGTERM returned:" + res);
   }
   else
   {  // Call special shutdown URL
      $.getJSON("http://127.0.0.1:3000/4cede326-7166-4cbd-994f-699c6dc271e9", function( data ) {
                             console.log("Tile server stop response was" + data);
      });
   }
   stopTileServerMenuItem.enabled = false;
   showInstalledMapsMenuItem.enabled = false;
   startTileServerMenuItem.enabled = true;
   deleteMapMenuItem.enabled = true;
  }
}

function stopGraphhopperServer()
{
  if (!graphhopperServerHasExited)
  {   // Inform the graphhopper server to close
      stopGraphhopperServerMenuItem.enabled = false;
      changeGraphMenuItem.enabled = true;
      startGraphhopperServerMenuItem.enabled = true;
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
  { console.log('Deleting graph in ' + dir);
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
    gui.App.clearCache();
    var menu = new gui.Menu({type: "menubar"});
    fs = global.require('fs');

    if (!fs.existsSync('graphhopper\\osmfiles\\' + activeOsmfile)) 
    {
       alert("OSM file " + activeOsmfile + " not found!");
       localStorage.removeItem('activeOsmfile');
    }

    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    var separator = new gui.MenuItem({ type: 'separator' , enabled : false });
    // FIXME or delete: alert does not work in case the list gets long, we need a special dialog. But this seems too expensive
    showInstalledMapsMenuItem = new gui.MenuItem({ label: 'Show installed maps', enabled : tilesServerHasExited,
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    alert("Installed maps: \n" + JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,'\n'));
                             });
                          }
    });
    mapSubMenu.append(showInstalledMapsMenuItem);
    var country_extracts = global.require('./ratrun-mbtiles-server/country_extracts.json');

    mapSubMenu.append(new gui.MenuItem({ label: 'Download map',
        click: function() {
                            var dialog;
                            var selected_country_file_name;

                            $('#mapDropDownDest').change(function () {
                                            selected_country_file_name = $(this).val();
                                        });

                            $(function () {
                                dialog = $("#map_selection_dialog").dialog({
                                    width: 420,
                                    height: 260,
                                    autoOpen: false,
                                    resizable: false,
                                    draggable: false,
                                    buttons: {
                                        "Download": function () {
                                        	  stopLocalVectorTileServer();
                                            showHtmlNotification("./img/mtb.png", 'Starting download of' , selected_country_file_name);
                                            download("https://osm2vectortiles-downloads.os.zhdk.cloud.switch.ch/v2.0/extracts/" + selected_country_file_name + ".mbtiles", "ratrun-mbtiles-server\\" + selected_country_file_name + ".mbtiles",
                                            function(result) {
                                               showHtmlNotification("./img/mtb.png", 'Download result:', result);
                                               startLocalVectorTileServer(win);
                                            });
                                            $(this).dialog("close");
                                        },
                                        Cancel: function () {
                                            $(this).dialog("close");
                                        }
                                    }
                                });
                           });
                           $.each(country_extracts, function (key, value) {
                             // Populate selected_country_file_name with value of first entry
                             if (selected_country_file_name == undefined)
                                 selected_country_file_name = value.extract;
                             console.log('country: '+ value.country );
                                $('#mapDropDownDest').append($('<option></option>').val(value.extract).html(value.country));
                           });
                            $("#map_selection_dialog").dialog('open');
                          }
    }));

    deleteMapMenuItem = new gui.MenuItem({ label: 'Delete map', enabled : !tilesServerHasExited,
        click: function() { stopLocalVectorTileServer();
                            chooseFile('#mbtilesFileDialog');
        }
    });
    mapSubMenu.append(deleteMapMenuItem);
    stopTileServerMenuItem = new gui.MenuItem({ label: 'Stop tile server', enabled : tilesServerHasExited,
        click: function() { stopLocalVectorTileServer(); }
    });
    startTileServerMenuItem = new gui.MenuItem({ label: 'Start tile server', enabled : !tilesServerHasExited,
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

    stopGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Stop Graphhopper server', enabled : graphhopperServerHasExited,
        click: function() { 
                             console.log('Stop Graphhopper server clicked');
                             stopGraphhopperServer();
                           }
    });
    startGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Start Graphhopper server', enabled : !graphhopperServerHasExited,
        click: function() {  console.log('Start Graphhopper server clicked');
                             startGraphhopperServer(win);
                             this.enabled = false;
                          }
    });
    //graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph: Fixme' ,  enabled : false} ));
    //graphhopperSubMenu.append(separator);
    //graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change graph settings', enabled : false })); // ?? Needed ??
    changeGraphMenuItem = new gui.MenuItem({ label: 'Change graph', enabled : !graphhopperServerHasExited,
        click: function() {
                             chooseFile('#osmFileDialog');
                          }
    });
    graphhopperSubMenu.append(changeGraphMenuItem);
    graphhopperSubMenu.append(separator);
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Download OSM data file: Fixme',
        click: function() {
            download("https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf", "graphhopper\\osmfiles\\liechtenstein-latest.osm.pbf",
               function(result) {
                   alert('Download OSM resulted in:' + result);
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
                            var opt = {resizable: false, show: true, height: 270, width: 450};
                            if (aboutWindow == null)
                            {
                                aboutWindow = gui.Window.open("about.html", opt);
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

var showHtmlNotification = function (icon, title, body, callback) 
{
    var notif = showNotification(icon, title, body);
    setTimeout(function () {
      notif.close();
    }, 6000);
};


var writeLog = function (msg) {
  var logElement = $("#output");
  logElement.innerHTML += msg + "<br>";
  logElement.scrollTop = logElement.scrollHeight;
};

var showNotification = function (icon, title, body) {

  var notification = new Notification(title, {icon: icon, body: body});
/*
  notification.onclick = function () {
    writeLog("Notification clicked");
  };

  notification.onclose = function () {
    writeLog("Notification closed");
    NW.Window.get().focus();
  };
*/  

  notification.onshow = function () {
    writeLog("-----<br>" + title);
  };

  return notification;
}

function chooseFile(name) {
    var chooser = $(name);
    chooser.unbind('change');
    chooser.change(function(evt) {
      if (name === '#osmFileDialog')
      { activeOsmfile = $(this).val().split(/(\\|\/)/g).pop();
        console.log('Selected OSM file:' + activeOsmfile);
        localStorage['activeOsmfile'] = activeOsmfile;
        deletegraph('graphhopper/graph');
        startGraphhopperServer(win);
      }
      else
      {
         if(name === '#mbtilesFileDialog')
         {
           var deletedFile = $(this).val();
           fileName = deletedFile.split(/(\\|\/)/g).pop();
           console.log('fileName:' + fileName);
           if ( fileName.indexOf('bicycle') === -1)
           {
             console.log('Delete map file:' + deletedFile);
             fs.unlinkSync(deletedFile);
           }
           else
             showHtmlNotification("./img/warning.png", "Avoid deletion of protected file!", fileName);
         }
      }
    });
    chooser.trigger('click');
}

// Test if we are running under nwjs
try {
  gui = nw;
  var win = gui.Window.get();
  //win.showDevTools();
  webkitapp(win);
}
catch (err) 
{
  console.log("We are not running under nw" + err);
}
