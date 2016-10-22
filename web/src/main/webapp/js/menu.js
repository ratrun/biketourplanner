/*  Copyright (C) 2015  ratrun@gmx.at
    The JavaScript code in this page is free software: you can
    redistribute it and/or modify it under the terms of the GNU
    General Public License (GNU GPL) as published by the Free Software
    Foundation, either version 3 of the License, or (at your option)
    any later version.  The code is distributed WITHOUT ANY WARRANTY;
    without even the implied warranty of MERCHANTABILITY or FITNESS
    FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
*/

var mbtiles;
var graphhopper;

var stopTileServerMenuItem;
var startTileServerMenuItem;
var stopGraphhopperServerMenuItem;
var startGraphhopperServerMenuItem;
var showInstalledMapsMenuItem;
var changeGraphMenuItem;
var deleteMapMenuItem;

var tilesServerHasExited = true;
var graphhopperServerHasExited = true;
var shutdownapp = false;
var fs;
var activeOsmfile = localStorage.activeOsmfile;
var gui;
var main = require('./main-template.js');
var runningUnderNW = false;
var path = require('path');
var osplatform;

if (activeOsmfile === undefined)
    activeOsmfile = 'liechtenstein-latest.osm.pbf';

function startLocalVectorTileServer(win) {
    var exec = global.require('child_process').spawn;
    var exename = "../node.exe";
    if (osplatform === "linux")
        exename = "../nodejs";
    console.log("Launching " + exename);
    mbtiles = exec(exename , ['server.js'], {
       cwd: 'ratrun-mbtiles-server',
       detached: false
    });
    tilesServerHasExited = false;
    console.log(exename + " started.");

    stopTileServerMenuItem.enabled = true;
    showInstalledMapsMenuItem.enabled = true;
    startTileServerMenuItem.enabled = false;
    deleteMapMenuItem.enabled = false;
    showHtmlNotification("./img/mtb.png", 'Tile server started !' , '', 1000);

    console.log('mbtiles started: ' + mbtiles);

    mbtiles.on('error', function (err) {
      console.log('mbtiles error' + err);
    });

    mbtiles.stdout.on('data', function (data) {
        console.log('mbtiles stdout: ' + data);
    });

    mbtiles.stderr.on('data', function (data) {
        console.log('mbtiles data: ' + data);
    });

    mbtiles.on('close', function (code) {
        console.log('tiles server child process closed with code ' + code);
        tilesServerHasExited = true;
    });

    mbtiles.on('exit', function (code, signal) {
        console.log('tiles server child process exited with code ' + code +' signal=' + signal);
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
                    showHtmlNotification("./img/mtb.png", 'Tile server stopped !' , '', 1000);
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

var graphopperServerStartedOnce = false;

function startGraphhopperServer(win) {
    var os = global.require('os');
    console.log('Starting graphhopper');
    var initialpercent = 40; // Intitial percentage of heap space of total available RAM to reserve for graphhopper
    var maxpercent = 80; // Max percentage of total available RAM to reserve as max heap space for graphhopper
    var initialreserved = Math.trunc((os.totalmem() * (initialpercent/100))/(1024*1000));
    var maxreserved = Math.trunc((os.totalmem() * (maxpercent/100))/(1024*1000));
    console.log('Installed RAM:' + os.totalmem() + ' Bytes. Initial heap ' + initialpercent + '%=' + initialreserved + 'MB, max heap ' + maxpercent + '%=' +  maxreserved +'MB');
    // On Windows only ???
    var exec = global.require('child_process').spawn;
    var exename = "java.exe";
    if (osplatform === "linux")
        exename = "java";
    //-Xms<size>        set initial Java heap size
    //-Xmx<size>        set maximum Java heap size
    graphhopper = exec( exename , ['-Xmx' + maxreserved + 'm', '-Xms' + initialreserved + 'm', '-jar', 
                       'graphhopper-web-0.9-SNAPSHOT-with-dep.jar', 
                       'jetty.resourcebase=../', 
                       'jetty.port=8989', 
                       'config=config.properties', 
                       'datareader.file=osmfiles/' + activeOsmfile, 
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
        var creatingnotification;
        if (data.toString('utf-8').indexOf('start creating graph from') !==-1 )
             creatingnotification = showHtmlNotification("./img/mtb.png", "Creating routing data", 'Going to take a while depending on the size. You may press F12 and watch the console logs for details', 45000);
        if (data.toString('utf-8').indexOf('Started server at HTTP :8989') !==-1 )
        {
             console.log("Routing server is ready!");
             // close the otherwise long active notification for graph creation
             if (creatingnotification)
                 creatingnotification.close(true);
             showHtmlNotification("./img/mtb.png", "Routing server", 'is ready...', 5000);
             main.resetServerRespondedOk();
             main.mainInit();
             if (graphopperServerStartedOnce) {
                 //FIXME: Windows specific workaround: understand why the "$.when(ghRequest.fetchTranslationMap(urlParams.locale), ghRequest.getInfo())" runs into a timeout after a re-start of the graphhopper server and needs some time.
                 for(var i=0; i<10; i++) {
                     setTimeout(function() {
                         //FIXME: Here we simply run it once again and now $.when(ghRequest.fetchTranslationMap(urlParams.locale), ghRequest.getInfo())" works!!!, but no idea why.!
                         console.log("Check main.ghServerRespondedOk=" + main.getghServerRespondedOk());
                         if (!main.getghServerRespondedOk())
                            main.mainInit();
                     },1000 + i*1000);
                 }
             }
             graphopperServerStartedOnce = true;
        }
    });

    graphhopper.stderr.on('data', function (data) {
        console.log('graphhopper stderr: ' + data);
    });

    graphhopper.on('close', function (code) {
        console.log('graphhopper child process closed with code ' + code + ' shutdownapp=' + shutdownapp);
        graphhopperServerHasExited = true;
        if (shutdownapp)
           win.close();
        else {
          showHtmlNotification("./img/mtb.png", 'Routing server stopped !!' , '', 1000);
          stopGraphhopperServerMenuItem.enabled = false;
          changeGraphMenuItem.enabled = true;
          startGraphhopperServerMenuItem.enabled = true;
        }
    });

    graphhopper.on('exit', function (code, signal) {
        console.log('graphhopper child process exited with code ' + code +' signal=' + signal);
        graphhopperServerHasExited = true;
        if (shutdownapp)
            win.close();
    });

    win.on('close', function() {
        this.hide(); // Pretend to be closed already
        console.log("win.on close tilesServerHasExited=" + tilesServerHasExited + " ,graphhopperServerHasExited="+ graphhopperServerHasExited);
        shutdownapp = true;
        if ((tilesServerHasExited) && (graphhopperServerHasExited))
        {
            console.log("close2");
            this.close(true);
        }
        else
        {
           if (!tilesServerHasExited)
              stopLocalVectorTileServer();
           if (!graphhopperServerHasExited)
              stopGraphhopperServer();
        }
    });

    graphhopper.on('uncaughtException', function (err) {
      console.log('Caught exception: ' + err);
    });
}

function stopLocalVectorTileServer() {
  console.log("stopLocalVectorTileServer mbtiles=" + mbtiles);
  var mapLayer = require('./map.js');
  mapLayer.clearLayers();
  if (!tilesServerHasExited) {
   if (shutdownapp) {
      if (mbtiles !== undefined) {
          // Inform the tile server via SIGTERM to close
          var res = mbtiles.kill('SIGTERM');
          console.log("mbtiles kill SIGTERM returned:" + res);
      }
   }
   else { // Call special shutdown URL
      $.getJSON("http://127.0.0.1:3000/4cede326-7166-4cbd-994f-699c6dc271e9", function( data ) {
                             console.log("Tile server stop response was" + data);
      });
      stopTileServerMenuItem.enabled = false;
      showInstalledMapsMenuItem.enabled = false;
      startTileServerMenuItem.enabled = true;
      deleteMapMenuItem.enabled = true;
   }
  }
}

function stopGraphhopperServer() {
  console.log("stopGraphhopperServer graphhopper=" + graphhopper);
  var mapLayer = require('./map.js');
  mapLayer.clearLayers();
  if (!graphhopperServerHasExited) {   // Inform the graphhopper server to close
      if (graphhopper !==undefined) {
          var res = graphhopper.kill('SIGTERM');
          console.log("graphhopper kill SIGTERM returned:" + res);
      }
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
function deletegraph(dir) {
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
      alert("Cannot delete routing data as graphhopper server is still running!");
};

/*
 Display a dialog. The paramaters data and dataDivDestination are optional. 
 They specfiy text, which is to be put into a nav in the html template file.
 */
function showDialog( htmltemplate, height, width, data , dataNavDestination) {
    var opt = {resizable: false, show: true, height: height, width: width, focus: true};
    gui.Window.open(htmltemplate, opt, function(dialogWindow) {
        var document = dialogWindow.window.document;
        dialogWindow.on('document-end', function() {
              if (data !== undefined)
                  document.getElementById(dataNavDestination).innerHTML =  data;
              dialogWindow.focus();
              // open contained links in a second big window
              $(document).find('a').bind('click', function (e) {
                  var linkopt = {resizable: false, show: true, height: win.height-100, width: 1000, focus: true};
                  e.preventDefault();
                  gui.Window.open(this.href, linkopt);
              });
            });
        dialogWindow.on('close', function() {
           dialogWindow.close(true);
        });
        // Close open child dialog windows automatically with the close of main application:
        win.on('close', function() {
           dialogWindow.close(true);
        });
    });
}

// Here we define the functionality for the graphhopper webkit application
function webkitapp(win) {
    gui.App.clearCache();
    runningUnderNW = true;
    var os = global.require('os');
    osplatform = os.platform();
    console.log("System:" + osplatform + " nwjs version:" + gui.process.versions['node-webkit']);
    var menu = new gui.Menu({type: "menubar"});
    fs = global.require('fs');
    var activeOSMfilePath = path.normalize('graphhopper/osmfiles/' + activeOsmfile);
    console.log("Checking "+ activeOSMfilePath);
    if (!fs.existsSync(activeOSMfilePath)) 
    {
       alert("OSM file " + activeOSMfilePath + " not found!");
       localStorage.removeItem('activeOsmfile');
    }
    console.log("OSMFile check for " + activeOSMfilePath + " passed");
    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    var separator = new gui.MenuItem({ type: 'separator' , enabled : false });
    // FIXME or delete: alert does not work in case the list gets long, we need a special dialog. But this seems too expensive
    showInstalledMapsMenuItem = new gui.MenuItem({ label: 'Show installed maps', enabled : tilesServerHasExited,
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    showDialog("installedmaps.html", 170, 300, JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,'<br>').replace(/[\",\]\[]/g,''), 'maplist');
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
                                            showHtmlNotification("./img/mtb.png", 'Starting download of' , selected_country_file_name, 6000);
                                            download("https://osm2vectortiles-downloads.os.zhdk.cloud.switch.ch/v2.0/extracts/" + selected_country_file_name + ".mbtiles", "ratrun-mbtiles-server\\" + selected_country_file_name + ".mbtiles",
                                            function(result) {
                                               showHtmlNotification("./img/mtb.png", 'Download result:', result, 6000);
                                               startLocalVectorTileServer(win);
                                               alert("Restart the application such that the new map becomes selectable!");
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

    stopGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Stop routing server', enabled : !graphhopperServerHasExited,
        click: function() { 
                             console.log('Stop routing server clicked');
                             stopGraphhopperServer();
                           }
    });
    startGraphhopperServerMenuItem = new gui.MenuItem({ label: 'Start routing server', enabled : graphhopperServerHasExited,
        click: function() {  console.log('Start routing server clicked');
                             startGraphhopperServer(win);
                             this.enabled = false;
                          }
    });
    //graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph: Fixme' ,  enabled : false} ));
    //graphhopperSubMenu.append(separator);
    //graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change graph settings', enabled : false })); // ?? Needed ??
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Download OSM file',

        click: function() {
            var r = window.confirm("Confirm to open a window for downloading of an OSM pbf file.\nPlease store the file to the " + gui.process.cwd() + path.normalize('graphhopper/osmfiles/') + "folder.");
            if (r)
                myWindow = gui.Window.open("http://download.geofabrik.de", {  position: 'center',  width: 1200,  height: 850 });
        }
    }));

    changeGraphMenuItem = new gui.MenuItem({ label: 'Select routing region', enabled : !graphhopperServerHasExited,
        click: function() {
                             chooseFile('#osmFileDialog');
                          }
    });
    graphhopperSubMenu.append(changeGraphMenuItem);

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
    //helpSubMenu.append(new gui.MenuItem({ label: 'Help: Fixme' ,  enabled : false}));
    helpSubMenu.append(new gui.MenuItem({ label: 'Vector tile map keys' ,
        click: function() {
                            showDialog("mapkeys.html", 382, 630);
                          }
    }));


    helpSubMenu.append(new gui.MenuItem({ label: 'About' ,
        click: function() {
                            showDialog("about.html", 300, 450);
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

    // Check our two servers and start them in case that they are not responding quickly
    var http = global.require('https');
    var request = http.get({hostname: '127.0.0.1', port: 3000}, function (res) {
    });

    request.setTimeout( 100, function( ) {
       if (tilesServerHasExited) {
          console.log("Tileserver was stopped and did not respond: Starting it!");
          startLocalVectorTileServer(win);
       } else
          console.log("Error: Tileserver request timeout");
    });

    request.on("error", function(err) {
        console.log("http://127.0.0.0:3000 responded with " + err);
        if ((err.code === 'ECONNREFUSED')&& (tilesServerHasExited)) {
            console.log("Tileserver was stopped and connection was refused: Starting it!");
            startLocalVectorTileServer(win);
        } else {
            console.log("Tileserver responded with " + err);
            tilesServerHasExited = false;
            stopTileServerMenuItem.enabled = true;
            showInstalledMapsMenuItem.enabled = true;
            startTileServerMenuItem.enabled = false;
            deleteMapMenuItem.enabled = false;
        }
    });

    console.log("Starting graphhopper server handling");
    var request = http.get({hostname: '127.0.0.1', port: 8989}, function (res) {
    });
    
    request.setTimeout( 100, function( ) {
       if (graphhopperServerHasExited) {
           console.log("Our Graphhopper routing server did not respond: Starting it!");
           startGraphhopperServer(win);
       } else
           console.log("Graphhopper server request timeout");
    });

    request.on("error", function(err) {
        if ((err.code === 'ECONNREFUSED')&&((graphhopperServerHasExited))) {
            console.log("GraphhopperServer ECONNREFUSED: Starting it!");
            startGraphhopperServer(win);
        } else {
            console.log("http://127.0.0.0:8989 responded with " + err);
            graphhopperServerHasExited = false;
            stopGraphhopperServerMenuItem.enabled = true;
            changeGraphMenuItem.enabled = false;
            startGraphhopperServerMenuItem.enabled = false;
        }
    });
}

var showHtmlNotification = function (icon, title, body, callback, timeout) {
    var notif = showNotification(icon, title, body);
    setTimeout(function () {
      notif.close();
    }, timeout);
};

var writeLog = function (msg) {
  var logElement = $("#output");
  logElement.innerHTML += msg + "<br>";
  logElement.scrollTop = logElement.scrollHeight;
};

var showNotification = function (icon, title, body) {

  var notification = new Notification(title, {icon: icon, body: body});

  notification.onshow = function () {
    writeLog("-----<br>" + title);
  };

  // Close open child dialog windows automatically with the close of main application:
  win.on('close', function() {
    notification.close(true);
  });

  return notification;
}

function chooseFile(name) {
    var chooser = $(name);
    chooser.unbind('change');
    chooser.change(function(evt) {
      if (name === '#osmFileDialog') {
        chooser.attr('nwworkingdir',path.normalize('graphhopper/osmfiles/'));
        activeOsmfile = $(this).val().split(/(\\|\/)/g).pop();
        console.log('Selected OSM file:' + activeOsmfile);
        localStorage['activeOsmfile'] = activeOsmfile;
        deletegraph(path.normalize('graphhopper/graph'));
        startGraphhopperServer(win);
      } else {
         if(name === '#mbtilesFileDialog') {
           chooser.attr('nwworkingdir',path.normalize('graphhopper/ratrun-mbtiles-server/'));
           var deletedFile = $(this).val();
           fileName = deletedFile.split(/(\\|\/)/g).pop();
           console.log('fileName:' + fileName);
           if ( fileName.indexOf('bicycle') === -1) {
             console.log('Delete map file:' + deletedFile);
             fs.unlinkSync(deletedFile);
           } else
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

module.exports.runningUnderNW = runningUnderNW;
