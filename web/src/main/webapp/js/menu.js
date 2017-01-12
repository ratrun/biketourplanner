/*  Copyright (C) 2015  ratrun@gmx.at
    This JavaScript code is free software: you can
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
var calculateGraphMenuItem;
var deleteGraphMenuItem;
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
var translate;
var shortcut;

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

    if (stopTileServerMenuItem !== undefined) {
        stopTileServerMenuItem.enabled = true;
        showInstalledMapsMenuItem.enabled = true;
        startTileServerMenuItem.enabled = false;
        deleteMapMenuItem.enabled = false;
    }
    showHtmlNotification("./img/mtb.png", 'Starting tile server!' , '', 1000);

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
    var graphpath = path.join('data/graphs',  activeOsmfile);
    console.log("Checking for " + graphpath);
    if (!fs.existsSync(graphpath)) { // We do not have a pre-calculated graph
       var osmfilepath = path.join('data/osmfiles', activeOsmfile);
       if (!fs.existsSync(osmfilepath)) {
         activeOsmfile = 'liechtenstein-latest.osm.pbf';
         osmfilepath = path.join('data/osmfiles', activeOsmfile);
         infoDialog( activeOsmfile + " not found and no graph available. <br> Now switching to " + activeOsmfile + "!");
         localStorage['activeOsmfile'] = activeOsmfile;
         graphpath = path.join('data/graphs',  activeOsmfile);
       }
    }
    console.log('Starting graphhopper with graph path=' + graphpath + ' and osmfilepath=' + osmfilepath);
    showHtmlNotification("./img/mtb.png", 'Starting routing server for ' + activeOsmfile, '', 1000);
    var initialpercent = 40; // Intitial percentage of heap space of total available RAM to reserve for graphhopper
    var maxpercent = 80; // Max percentage of total available RAM to reserve as max heap space for graphhopper
    var initialreserved = Math.trunc((os.totalmem() * (initialpercent/100))/(1024*1000));
    var maxreserved = Math.trunc((os.totalmem() * (maxpercent/100))/(1024*1000));
    console.log('Installed RAM:' + os.totalmem() + ' Bytes. Initial heap ' + initialpercent + '%=' + initialreserved + 'MB, max heap ' + maxpercent + '%=' +  maxreserved +'MB');
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
                       'datareader.file=' + '../' + osmfilepath, 
                       'graph.location=../' + graphpath], {
       cwd: 'graphhopper',
       detached: false
    });

    console.log('graphhopper started!');

    graphhopper.on('error', function (err) {
      console.log('graphhopper error' + err);
    });

    graphhopper.stdout.on('data', function (data) {
        console.log('graphhopper stdout: ' + data);
        var creatingnotification;
        if (data.toString('utf-8').indexOf('start creating graph from') !==-1 )
             creatingnotification = showHtmlNotification("./img/mtb.png", 
                                                         "Creating routing data", 
                                                         "Going to take a while depending on the covered area size. Press F12 to watch the console logs for details", 
                                                         45000);
        if (data.toString('utf-8').indexOf('Started server at HTTP :8989') !==-1 ) {
             console.log("Routing server is ready!");
             // Close the otherwise long active notification for graph creation
             if (creatingnotification)
                 creatingnotification.close(true);
             showHtmlNotification("./img/mtb.png", "Routing server", 'is ready!', 5000);
             main.resetServerRespondedOk();
             main.mainInit(graphopperServerStartedOnce);
             graphopperServerStartedOnce = true;
        }
    });

    graphhopper.stderr.on('data', function (data) {
        console.log('graphhopper stderr: ' + data);
    });

    graphhopper.on('close', function (code) {
        console.log('graphhopper child process closed with code ' + code + ' shutdownapp=' + shutdownapp);
        graphhopperServerHasExited = true;
        if (shutdownapp) {
            // Unregister the global desktop shortcut.
            gui.App.unregisterGlobalHotKey(shortcut);
            win.close();
        } else {
          showHtmlNotification("./img/mtb.png", 'Routing server stopped !!' , '', 1000);
          stopGraphhopperServerMenuItem.enabled = false;
          changeGraphMenuItem.enabled = true;
          startGraphhopperServerMenuItem.enabled = true;
          calculateGraphMenuItem.enabled = true;
          deleteGraphMenuItem.enabled = true;
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
        console.log("win.on close tilesServerHasExited=" + tilesServerHasExited + " ,graphhopperServerHasExited=" + graphhopperServerHasExited);
        shutdownapp = true;
        if ((tilesServerHasExited) && (graphhopperServerHasExited)) {
            console.log("close1");
            this.close(true);
        } else {
           console.log("close2");
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
          tilesServerHasExited = res;
      }
   } else { // Call special shutdown URL
      stopTileServerMenuItem.enabled = false;
      showInstalledMapsMenuItem.enabled = false;
      startTileServerMenuItem.enabled = true;
      deleteMapMenuItem.enabled = true;
      $.getJSON("http://127.0.0.1:3000/4cede326-7166-4cbd-994f-699c6dc271e9", function( data ) {
            console.log("Tile server stop response was" + data);
      });
   }
  }
}

function stopGraphhopperServer() {
  console.log("stopGraphhopperServer graphhopperServerHasExited=" + graphhopperServerHasExited + " running=" + (graphhopper!==undefined));
  var mapLayer = require('./map.js');
  mapLayer.clearLayers();
  if (!graphhopperServerHasExited) {   // Inform the graphhopper server to close
      if (graphhopper!==undefined) {
        console.log("Requesting graphhopper server to stop!");
        $.ajax({
                                url: "http://localhost:8989/shutdown?token=osm",
                                timeout: 50,
                                type: "GET",
                                dataType: "json",
                                crossDomain: true,
                                async: true
                    });
        setTimeout(function(){ 
          var res = graphhopper.kill('SIGTERM');
          console.log("graphhopper kill SIGTERM returned:" + res);
        }, 100);
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

// Deletes the graphhopper graph data located in the provided directory.
function deletegraph(dir) {
    console.log('Deleting graph ' + dir);
    fs.unlink(dir + '/edges');
    fs.unlink(dir + '/geometry');
    fs.unlink(dir + '/location_index');
    fs.unlink(dir + '/names');
    fs.unlink(dir + '/properties');
    fs.unlink(dir + '/nodes');
    fs.rmdir(dir);
};

/*
 Display a dialog. The paramaters data and dataDivDestination are optional. 
 They specify text, which is to be put into a nav in the html template file.
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

function infoDialog(message) {
    var text= $("#infoDialogText");
    text.html(message);
    $("#infoDialog").dialog({
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
      buttons: {
        Ok: function() {
          $(this).dialog( "close" );
        }
      }
    });
}

// Dialog for the selection of an routing graph subdirectory
// Parameters: 
//   buttonText (string): Specifies the text for the OK button
//   absolutepath (booloean): Specifies if the callback folder parameter expects an absolute or a relative path
//   calbback: The callback function to be executed when the user presses OK.
function graphFolderSelectionDialogWithCallback(buttonText, absolutpath, callback) {
    var $tree = $('#graphTree');
    if ($tree.jstree() !== undefined)
       $tree.jstree().destroy();
    $(function() {
        $tree.jstree({
           "plugins" : [ "themes", "contextmenu", "dnd", "state", "types" ],
           'core' : {
              "check_callback" : true
           }});
        $tree.on("select_node.jstree",
            function(evt, data) {
                console.log("graphTree data=" + data);
        });
    });
    var graphDir = path.join(gui.process.cwd(), 'data/graphs');
    fs.readdir(graphDir, function (err, files) {
      if (err) throw err;
      id = 1;
      var root= {"id" : id, "text" : "data/graphs", 'type': 'folder'};
      $tree.jstree().create_node("#" ,  root, "last");
      id++;
      files.forEach(function(value){
          var abspath = path.join(graphDir, value);
          if (fs.statSync(abspath).isDirectory()) {
              $tree.jstree().create_node(root ,  {"id" : id, "text" : value, 'type': 'folder'}, "last");
              console.log("graph " + abspath + " has id=" + id);
              id++;
          }
      });
      if (id>2) {
          $tree.jstree("open_all");
          $( "#dialogGraphSelect" ).dialog({
              resizable: false,
              height: "auto",
              width: 400,
              modal: true,
              buttons: {
                "Ok": function() {
                    var currentNode = $tree.jstree("get_selected");
                    var selectedpath;
                    if (absolutpath)
                      selectedpath = path.join(graphDir, $tree.jstree(true).get_node(currentNode).text);
                    else
                      selectedpath = $tree.jstree(true).get_node(currentNode).text;
                    callback(selectedpath);
                  $(this).dialog( "close" );
                },
                Cancel: function() {
                  $(this).dialog( "close" );
                }
              }
            });
            // Give an ID attribute to the 'Ok' Button.
            $('.ui-dialog-buttonpane button:contains(Ok)').attr("id", "dialog-confirm_ok-button");
            // Change text of 'Ok' button to buttonText.
            $('#dialog-confirm_ok-button').html(buttonText);
            } else {
                $( function() {
                    infoDialog("No graph folder found!");
                });
            }
    });
}

// Here we define the menu functionality for the BikeTourPlanner application
function initBikeTourPlannerMenu() {
    var menu = new gui.Menu({type: "menubar"});
    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    var separator = new gui.MenuItem({ type: 'separator' , enabled : false });
    var country_extracts = global.require('./ratrun-mbtiles-server/country_extracts.json');

    mapSubMenu.append(new gui.MenuItem({ label: translate.tr('download_map'),
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
                                               infoDialog("Restart the application such that the new map becomes selectable!");
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
    showInstalledMapsMenuItem = new gui.MenuItem({ label: translate.tr('show_installed_maps'), enabled : tilesServerHasExited,
        click: function() {  console.log("showInstalledMaps requesting maps");
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    showDialog("installedmaps.html", 170, 300, JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,'<br>').replace(/[\",\]\[]/g,''), 'maplist');
                             });
                          }
    });
    mapSubMenu.append(showInstalledMapsMenuItem);

    stopTileServerMenuItem = new gui.MenuItem({ label: translate.tr('stop_tile_server'), enabled : tilesServerHasExited,
        click: function() { stopLocalVectorTileServer(); }
    });
    startTileServerMenuItem = new gui.MenuItem({ label: translate.tr('start_tile_server'), enabled : !tilesServerHasExited,
        click: function() { 
                             startLocalVectorTileServer(win);
                             this.enabled = false;
                          }
    });
    mapSubMenu.append(separator);
    mapSubMenu.append(stopTileServerMenuItem);
    mapSubMenu.append(startTileServerMenuItem);
    deleteMapMenuItem = new gui.MenuItem({ label: translate.tr('delete_map'), enabled : !tilesServerHasExited,
        click: function() { stopLocalVectorTileServer();
                            chooseFile('#mbtilesFileDialog', path.join(gui.process.cwd(), 'data/mbtiles'));
        }
    });
    mapSubMenu.append(deleteMapMenuItem);
    
    menu.append(
        new gui.MenuItem({
            label: translate.tr('map'),
            submenu: mapSubMenu 
        })
    );

    var graphhopperSubMenu = new gui.Menu()
    var win = gui.Window.get();

    stopGraphhopperServerMenuItem = new gui.MenuItem({ label: translate.tr('stop_routing_server'), enabled : !graphhopperServerHasExited,
        click: function() { 
                             console.log('Stop routing server clicked');
                             stopGraphhopperServer();
                           }
    });
    startGraphhopperServerMenuItem = new gui.MenuItem({ label: translate.tr('start_routing_server'), enabled : graphhopperServerHasExited,
        click: function() {  console.log('Start routing server clicked');
                             startGraphhopperServer(win);
                             this.enabled = false;
                          }
    });
    graphhopperSubMenu.append(new gui.MenuItem({ label: translate.tr('download_osm_file'),
        click: function() {
                var text = $("#OSMDownLoadText");
                text.html("Please manually download the extract to your " + path.join(gui.process.cwd(), 'data/osmfiles') + "folder!");

                $("#dialogDownLoadOSM" ).dialog({
                  resizable: false,
                  height: "auto",
                  width: win.width-200,
                  modal: true,
                  buttons: {
                    "Start download": function() {
                      myWindow = gui.Window.open("http://download.geofabrik.de", {  position: 'center',  width: 1200,  height: 850 });
                      $( this ).dialog( "close" );
                    },
                    Cancel: function() {
                      $( this ).dialog( "close" );
                    }
                  }
                });
        }
    }));
    changeGraphMenuItem = new gui.MenuItem({ label: translate.tr('change_routing_graph'), enabled : !graphhopperServerHasExited,
        click: function() {
                             graphFolderSelectionDialogWithCallback("Change routing graph", false, changeActiveRoutingGraph);
                          }
    });
    graphhopperSubMenu.append(changeGraphMenuItem);
    calculateGraphMenuItem = new gui.MenuItem({ label: translate.tr('calculate_new_routing_graph'), enabled : !graphhopperServerHasExited,
        click: function() {
                             chooseFile('#osmFileDialog', path.join(gui.process.cwd(), 'data/osmfiles'));
                          }
    });
    graphhopperSubMenu.append(calculateGraphMenuItem);

    graphhopperSubMenu.append(separator);
    graphhopperSubMenu.append(stopGraphhopperServerMenuItem);
    graphhopperSubMenu.append(startGraphhopperServerMenuItem);
    deleteGraphMenuItem = new gui.MenuItem({ label: translate.tr('delete_routing_graph'), enabled : tilesServerHasExited,
        click: function() {
                graphFolderSelectionDialogWithCallback("Delete routing graph", true, deletegraph);
        }
    });
    graphhopperSubMenu.append(deleteGraphMenuItem);

    menu.append(
        new gui.MenuItem({
            label: translate.tr('routing'),
            submenu: graphhopperSubMenu 
        })
    );

    // Create the help sub-menu
    var helpSubMenu = new gui.Menu();
    helpSubMenu.append(new gui.MenuItem({ label: translate.tr('vector_tile_map_keys') ,
        click: function() {
                            showDialog("mapkeys.html", 382, 630);
                          }
    }));

    helpSubMenu.append(new gui.MenuItem({ label: translate.tr('online_project_page') ,
        click: function() {
                            showDialog("https://ratrun.github.io/BikeTourPlannerGHPages/", win.height-100, 800);
                          }
    }));

    helpSubMenu.append(new gui.MenuItem({ label: translate.tr('about') ,
        click: function() {
                            showDialog("about.html", 310, 450);
                          }
    }));

    helpSubMenu.append(new gui.MenuItem({ label: translate.tr('poi') ,
        click: function() {
                            POIDialog("POI");
                          }
    }));
    menu.append(
        new gui.MenuItem({
            label: translate.tr('help'),
            submenu: helpSubMenu
        })
    );

    // Append Menu to Window
    gui.Window.get().menu = menu;
    // Set initial state
    graphhopperServerHasExited = false;
    stopGraphhopperServerMenuItem.enabled = true;
    changeGraphMenuItem.enabled = false;
    startGraphhopperServerMenuItem.enabled = false;
    calculateGraphMenuItem.enabled = false;
    deleteGraphMenuItem.enabled = false;
}

function webkitapp(win) {
    gui.App.clearCache();
    runningUnderNW = true;
    var os = global.require('os');
    osplatform = os.platform();
    console.log("System:" + osplatform + " nwjs version:" + gui.process.versions['node-webkit']);
    
    //See https://github.com/nwjs/nw.js/issues/4115 for toggling full screen via F11
    var option = {
      key : "F11",
      active : function() {
        win.toggleFullscreen();
      },
      failed : function(msg) {
        // :(, fail to register the |key| or couldn't parse the |key|.
        console.log(msg);
      }
    };

    // Create a shortcut with |option|.
    shortcut = new gui.Shortcut(option);

    // Register global desktop shortcut, which can work without focus.
    gui.App.registerGlobalHotKey(shortcut);

    // If register |shortcut| successfully and user struck "Ctrl+Shift+A", |shortcut|
    // will get an "active" event.

    // You can also add listener to shortcut's active and failed event.
    shortcut.on('active', function() {
      console.log("Global desktop keyboard shortcut: " + this.key + " active."); 
    });

    shortcut.on('failed', function(msg) {
      console.log(msg);
    });

    fs = global.require('fs');
    translate = require('./translate.js');

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
            if (stopTileServerMenuItem !== undefined) {
                stopTileServerMenuItem.enabled = true;
                showInstalledMapsMenuItem.enabled = true;
                startTileServerMenuItem.enabled = false;
                deleteMapMenuItem.enabled = false;
            }
        }
    });

    console.log("Start graphhopper server handling");
    var request = http.get({hostname: '127.0.0.1', port: 8989}, function (res) {
    });
/*
    request.setTimeout( 100, function( ) {
       if (graphhopperServerHasExited) {
           console.log("Our graphhopper routing server did not respond: Starting it!");
           startGraphhopperServer(win);
       } else
           console.log("Graphhopper server request timeout");
    });
*/
    request.on("error", function(err) {
        if ((err.code === 'ECONNREFUSED')&&((graphhopperServerHasExited))) {
            console.log("GraphhopperServer ECONNREFUSED: Starting it!");
            startGraphhopperServer(win);
        } else {
            console.log("http://127.0.0.0:8989 responded with " + err);
            graphhopperServerHasExited = false;
            if (stopGraphhopperServerMenuItem !== undefined) {
                stopGraphhopperServerMenuItem.enabled = true;
                changeGraphMenuItem.enabled = false;
                startGraphhopperServerMenuItem.enabled = false;
                calculateGraphMenuItem.enabled = false;
                deleteGraphMenuItem.enabled = true;
            }
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

function chooseFile(name, defaultDir) {
    var chooser = $(name);
    chooser.attr('nwworkingdir', defaultDir);
    //http://stackoverflow.com/questions/18245783/node-webkit-saveas-file-dialog-only-triggers-for-unique-file-names
    function fileHandler (evt) {
      var val = $(this).val();
      if (val !== "") {  // This event is sometimes fired twice, the second time with "" 
          if (name === '#osmFileDialog') {
            activeOsmfile = val.split(/(\\|\/)/g).pop();
            console.log('Selected OSM file:' + activeOsmfile);
            localStorage['activeOsmfile'] = activeOsmfile;
            startGraphhopperServer(win);
          } else {
             if(name === '#mbtilesFileDialog') {
               var deletedFile = $(this).val();
               fileName = deletedFile.split(/(\\|\/)/g).pop();
               console.log('fileName:' + fileName);
               if ( fileName.indexOf('bicycle') === -1) {
                 console.log('Delete map file:' + deletedFile);
                 fs.unlink(deletedFile);
               } else
                 showHtmlNotification("./img/warning.png", "Avoid deletion of protected file!", fileName);
             }
          }
      }
      var f = new File('',''); 
      var files = new FileList(); 
      files.append(f); 
      chooser.unbind('change');
      document.getElementById(name.substring(1)).files = files; 
      chooser.change(fileHandler);
    }
    chooser.change(fileHandler);
    chooser.trigger('click'); 
}

// Change the active routing graph to the graph located in the subdirectory under osm/graphs/relativeFolder
function changeActiveRoutingGraph(relativeFolder){
    if (!graphhopperServerHasExited)
       stopGraphhopperServer();
   
    setTimeout(function() {
        console.log("Polling for graphhopperServerHasExited to become true, is:" + graphhopperServerHasExited);
         if (graphhopperServerHasExited) {
            activeOsmfile = relativeFolder;
            localStorage['activeOsmfile'] = activeOsmfile;
            startGraphhopperServer(win);
         }
    },1000);
}

// Test if we are running under nwjs
try {
  gui = nw;
  var win = gui.Window.get();
  path = global.require('path');
  //win.showDevTools();
  webkitapp(win);
}
catch (err) 
{
  console.log("We are not running under nw" + err);
}

function getActiveOSMfile() {
    return activeOsmfile;
}

function POIDialog(title) {
    var iconSelect = new IconSelect("poi-dialog", 
        {'selectedIconWidth':48,
        'selectedIconHeight':48,
        'selectedBoxPadding':1,
        'iconsWidth':23,
        'iconsHeight':23,
        'boxIconSpace':1,
        'vectoralIconNumber':14,
        'horizontalIconNumber':14});

    var icons = [];
    icons.push({'iconFilePath':'images/icons/abseiling.svg',                  'iconValue':'1'});
    icons.push({'iconFilePath':'images/icons/accounting.svg',                 'iconValue':'2'});
    icons.push({'iconFilePath':'images/icons/airport.svg',                    'iconValue':'3'});
    icons.push({'iconFilePath':'images/icons/amusement-park.svg',             'iconValue':'4'});
    icons.push({'iconFilePath':'images/icons/aquarium.svg',                   'iconValue':'5'});
    icons.push({'iconFilePath':'images/icons/archery.svg',                    'iconValue':'6'});
    icons.push({'iconFilePath':'images/icons/art-gallery.svg',                'iconValue':'7'});
    icons.push({'iconFilePath':'images/icons/assistive-listening-system.svg', 'iconValue':'8'});
    icons.push({'iconFilePath':'images/icons/atm.svg',                        'iconValue':'9'});
    icons.push({'iconFilePath':'images/icons/audio-description.svg',          'iconValue':'10'});
    icons.push({'iconFilePath':'images/icons/bakery.svg',                     'iconValue':'11'});
    icons.push({'iconFilePath':'images/icons/bank.svg',                       'iconValue':'12'});
    icons.push({'iconFilePath':'images/icons/bar.svg',                        'iconValue':'13'});
    icons.push({'iconFilePath':'images/icons/baseball.svg',                   'iconValue':'14'});
    icons.push({'iconFilePath':'images/icons/beauty-salon.svg',               'iconValue':'15'});
    icons.push({'iconFilePath':'images/icons/bicycle-store.svg',              'iconValue':'16'});
    icons.push({'iconFilePath':'images/icons/boating.svg',                    'iconValue':'18'});
    icons.push({'iconFilePath':'images/icons/boat-ramp.svg',                  'iconValue':'19'});
    icons.push({'iconFilePath':'images/icons/boat-tour.svg',                  'iconValue':'20'});
    icons.push({'iconFilePath':'images/icons/book-store.svg',                 'iconValue':'21'});
    icons.push({'iconFilePath':'images/icons/bowling-alley.svg',              'iconValue':'22'});
    icons.push({'iconFilePath':'images/icons/braille.svg',                    'iconValue':'23'});
    icons.push({'iconFilePath':'images/icons/bus-station.svg',                'iconValue':'24'});
    icons.push({'iconFilePath':'images/icons/cafe.svg',                       'iconValue':'25'});
    icons.push({'iconFilePath':'images/icons/campground.svg',                 'iconValue':'26'});
    icons.push({'iconFilePath':'images/icons/canoe.svg',                      'iconValue':'27'});
    icons.push({'iconFilePath':'images/icons/car-dealer.svg',                 'iconValue':'28'});
    icons.push({'iconFilePath':'images/icons/car-rental.svg',                 'iconValue':'29'});
    icons.push({'iconFilePath':'images/icons/car-repair.svg',                 'iconValue':'30'});
    icons.push({'iconFilePath':'images/icons/car-wash.svg',                   'iconValue':'31'});
    icons.push({'iconFilePath':'images/icons/casino.svg',                     'iconValue':'32'});
    icons.push({'iconFilePath':'images/icons/cemetery.svg',                   'iconValue':'33'});
    icons.push({'iconFilePath':'images/icons/chairlift.svg',                  'iconValue':'34'});
    icons.push({'iconFilePath':'images/icons/church.svg',                     'iconValue':'35'});
    icons.push({'iconFilePath':'images/icons/circle.svg',                     'iconValue':'36'});
    icons.push({'iconFilePath':'images/icons/city-hall.svg',                  'iconValue':'37'});
    icons.push({'iconFilePath':'images/icons/climbing.svg',                   'iconValue':'38'});
    icons.push({'iconFilePath':'images/icons/closed-captioning.svg',          'iconValue':'39'});
    icons.push({'iconFilePath':'images/icons/clothing-store.svg',             'iconValue':'40'});
    icons.push({'iconFilePath':'images/icons/compass.svg',                    'iconValue':'41'});
    icons.push({'iconFilePath':'images/icons/convenience-store.svg',          'iconValue':'42'});
    icons.push({'iconFilePath':'images/icons/courthouse.svg',                 'iconValue':'43'});
    icons.push({'iconFilePath':'images/icons/cross-country-skiing.svg',       'iconValue':'44'});
    icons.push({'iconFilePath':'images/icons/crosshairs.svg',                 'iconValue':'45'});
    icons.push({'iconFilePath':'images/icons/dentist.svg',                    'iconValue':'46'});
    icons.push({'iconFilePath':'images/icons/department-store.svg',           'iconValue':'47'});
    icons.push({'iconFilePath':'images/icons/diving.svg',                     'iconValue':'48'});
    icons.push({'iconFilePath':'images/icons/doctor.svg',                     'iconValue':'49'});
    icons.push({'iconFilePath':'images/icons/electrician.svg',                'iconValue':'50'});
    icons.push({'iconFilePath':'images/icons/electronics-store.svg',          'iconValue':'51'});
    icons.push({'iconFilePath':'images/icons/embassy.svg',                    'iconValue':'52'});
    icons.push({'iconFilePath':'images/icons/expand.svg',                     'iconValue':'53'});
    icons.push({'iconFilePath':'images/icons/female.svg',                     'iconValue':'54'});
    icons.push({'iconFilePath':'images/icons/finance.svg',                    'iconValue':'55'});
    icons.push({'iconFilePath':'images/icons/fire-station.svg',               'iconValue':'56'});
    icons.push({'iconFilePath':'images/icons/fish-cleaning.svg',              'iconValue':'57'});
    icons.push({'iconFilePath':'images/icons/fishing-pier.svg',               'iconValue':'59'});
    icons.push({'iconFilePath':'images/icons/florist.svg',                    'iconValue':'60'});
    icons.push({'iconFilePath':'images/icons/food.svg',                       'iconValue':'61'});
    icons.push({'iconFilePath':'images/icons/fullscreen.svg',                 'iconValue':'62'});
    icons.push({'iconFilePath':'images/icons/funeral-home.svg',               'iconValue':'63'});
    icons.push({'iconFilePath':'images/icons/furniture-store.svg',            'iconValue':'64'});
    icons.push({'iconFilePath':'images/icons/gas-station.svg',                'iconValue':'65'});
    icons.push({'iconFilePath':'images/icons/general-contractor.svg',         'iconValue':'66'});
    icons.push({'iconFilePath':'images/icons/grocery-or-supermarket.svg',     'iconValue':'68'});
    icons.push({'iconFilePath':'images/icons/gym.svg',                        'iconValue':'69'});
    icons.push({'iconFilePath':'images/icons/hair-care.svg',                  'iconValue':'70'});
    icons.push({'iconFilePath':'images/icons/hang-gliding.svg',               'iconValue':'71'});
    icons.push({'iconFilePath':'images/icons/hardware-store.svg',             'iconValue':'72'});
    icons.push({'iconFilePath':'images/icons/health.svg',                     'iconValue':'73'});
    icons.push({'iconFilePath':'images/icons/hindu-temple.svg',               'iconValue':'74'});
    icons.push({'iconFilePath':'images/icons/hospital.svg',                   'iconValue':'76'});
    icons.push({'iconFilePath':'images/icons/ice-fishing.svg',                'iconValue':'77'});
    icons.push({'iconFilePath':'images/icons/ice-skating.svg',                'iconValue':'78'});
    icons.push({'iconFilePath':'images/icons/inline-skating.svg',             'iconValue':'79'});
    icons.push({'iconFilePath':'images/icons/insurance-agency.svg',           'iconValue':'80'});
    icons.push({'iconFilePath':'images/icons/jet-skiing.svg',                 'iconValue':'81'});
    icons.push({'iconFilePath':'images/icons/jewelry-store.svg',              'iconValue':'82'});
    icons.push({'iconFilePath':'images/icons/kayaking.svg',                   'iconValue':'83'});
    icons.push({'iconFilePath':'images/icons/laundry.svg',                    'iconValue':'84'});
    icons.push({'iconFilePath':'images/icons/lawyer.svg',                     'iconValue':'85'});
    icons.push({'iconFilePath':'images/icons/library.svg',                    'iconValue':'86'});
    icons.push({'iconFilePath':'images/icons/liquor-store.svg',               'iconValue':'87'});
    icons.push({'iconFilePath':'images/icons/local-government.svg',           'iconValue':'88'});
    icons.push({'iconFilePath':'images/icons/location-arrow.svg',             'iconValue':'89'});
    icons.push({'iconFilePath':'images/icons/locksmith.svg',                  'iconValue':'90'});
    icons.push({'iconFilePath':'images/icons/lodging.svg',                    'iconValue':'91'});
    icons.push({'iconFilePath':'images/icons/low-vision-access.svg',          'iconValue':'92'});
    icons.push({'iconFilePath':'images/icons/male.svg',                       'iconValue':'93'});
    icons.push({'iconFilePath':'images/icons/map-pin.svg',                    'iconValue':'94'});
    icons.push({'iconFilePath':'images/icons/marina.svg',                     'iconValue':'95'});
    icons.push({'iconFilePath':'images/icons/mosque.svg',                     'iconValue':'96'});
    icons.push({'iconFilePath':'images/icons/movie-rental.svg',               'iconValue':'98'});
    icons.push({'iconFilePath':'images/icons/movie-theater.svg',              'iconValue':'99'});
    icons.push({'iconFilePath':'images/icons/moving-company.svg',             'iconValue':'101'})
    icons.push({'iconFilePath':'images/icons/museum.svg',                     'iconValue':'102'})
    icons.push({'iconFilePath':'images/icons/natural-feature.svg',            'iconValue':'103'})     
    icons.push({'iconFilePath':'images/icons/night-club.svg',                 'iconValue':'104'})
    icons.push({'iconFilePath':'images/icons/open-captioning.svg',            'iconValue':'105'})     
    icons.push({'iconFilePath':'images/icons/painter.svg',                    'iconValue':'106'})
    icons.push({'iconFilePath':'images/icons/park.svg',                       'iconValue':'107'})
    icons.push({'iconFilePath':'images/icons/parking.svg',                    'iconValue':'108'})
    icons.push({'iconFilePath':'images/icons/pet-store.svg',                  'iconValue':'109'})
    icons.push({'iconFilePath':'images/icons/pharmacy.svg',                   'iconValue':'110'})
    icons.push({'iconFilePath':'images/icons/physiotherapist.svg',            'iconValue':'111'})     
    icons.push({'iconFilePath':'images/icons/place-of-worship.svg',           'iconValue':'112'})     
    icons.push({'iconFilePath':'images/icons/playground.svg',                 'iconValue':'113'})
    icons.push({'iconFilePath':'images/icons/plumber.svg',                    'iconValue':'114'})
    icons.push({'iconFilePath':'images/icons/point-of-interest.svg',          'iconValue':'115'})     
    icons.push({'iconFilePath':'images/icons/police.svg',                     'iconValue':'116'})
    icons.push({'iconFilePath':'images/icons/political.svg',                  'iconValue':'117'})
    icons.push({'iconFilePath':'images/icons/postal-code.svg',                'iconValue':'118'})
    icons.push({'iconFilePath':'images/icons/postal-code-prefix.svg',         'iconValue':'119'})      
    icons.push({'iconFilePath':'images/icons/post-box.svg',                   'iconValue':'120'})
    icons.push({'iconFilePath':'images/icons/post-office.svg',                'iconValue':'121'})
    icons.push({'iconFilePath':'images/icons/rafting.svg',                    'iconValue':'122'})
    icons.push({'iconFilePath':'images/icons/real-estate-agency.svg',         'iconValue':'123'})      
    icons.push({'iconFilePath':'images/icons/restaurant.svg',                 'iconValue':'124'})
    icons.push({'iconFilePath':'images/icons/roofing-contractor.svg',         'iconValue':'125'})      
    icons.push({'iconFilePath':'images/icons/route.svg',                      'iconValue':'126'})
    icons.push({'iconFilePath':'images/icons/route-pin.svg',                  'iconValue':'127'})
    icons.push({'iconFilePath':'images/icons/rv-park.svg',                    'iconValue':'128'})
    icons.push({'iconFilePath':'images/icons/sailing.svg',                    'iconValue':'129'})
    icons.push({'iconFilePath':'images/icons/school.svg',                     'iconValue':'130'})
    icons.push({'iconFilePath':'images/icons/scuba-diving.svg',               'iconValue':'131'})
    icons.push({'iconFilePath':'images/icons/search.svg',                     'iconValue':'132'})
    icons.push({'iconFilePath':'images/icons/sheild.svg',                     'iconValue':'133'})
    icons.push({'iconFilePath':'images/icons/shopping-mall.svg',              'iconValue':'134'}) 
    icons.push({'iconFilePath':'images/icons/sign-language.svg',              'iconValue':'135'}) 
    icons.push({'iconFilePath':'images/icons/skateboarding.svg',              'iconValue':'136'}) 
    icons.push({'iconFilePath':'images/icons/skiing.svg',                     'iconValue':'137'})
    icons.push({'iconFilePath':'images/icons/ski-jumping.svg',                'iconValue':'138'})
    icons.push({'iconFilePath':'images/icons/sledding.svg',                   'iconValue':'139'})
    icons.push({'iconFilePath':'images/icons/snow.svg',                       'iconValue':'140'})
    icons.push({'iconFilePath':'images/icons/snowboarding.svg',               'iconValue':'151'})
    icons.push({'iconFilePath':'images/icons/snowmobile.svg',                 'iconValue':'152'})
    icons.push({'iconFilePath':'images/icons/snow-shoeing.svg',               'iconValue':'153'})
    icons.push({'iconFilePath':'images/icons/spa.svg',                        'iconValue':'154'})
    icons.push({'iconFilePath':'images/icons/square.svg',                     'iconValue':'155'})
    icons.push({'iconFilePath':'images/icons/square-pin.svg',                 'iconValue':'156'})
    icons.push({'iconFilePath':'images/icons/square-rounded.svg',             'iconValue':'157'})  
    icons.push({'iconFilePath':'images/icons/stadium.svg',                    'iconValue':'158'})
    icons.push({'iconFilePath':'images/icons/storage.svg',                    'iconValue':'159'})
    icons.push({'iconFilePath':'images/icons/store.svg',                      'iconValue':'160'})
    icons.push({'iconFilePath':'images/icons/subway-station.svg',             'iconValue':'161'})  
    icons.push({'iconFilePath':'images/icons/surfing.svg',                    'iconValue':'162'})
    icons.push({'iconFilePath':'images/icons/swimming.svg',                   'iconValue':'163'})
    icons.push({'iconFilePath':'images/icons/synagogue.svg',                  'iconValue':'164'})
    icons.push({'iconFilePath':'images/icons/taxi-stand.svg',                 'iconValue':'165'})
    icons.push({'iconFilePath':'images/icons/tennis.svg',                     'iconValue':'166'})
    icons.push({'iconFilePath':'images/icons/toilet.svg',                     'iconValue':'167'})
    icons.push({'iconFilePath':'images/icons/train-station.svg',              'iconValue':'169'}) 
    icons.push({'iconFilePath':'images/icons/transit-station.svg',            'iconValue':'170'})   
    icons.push({'iconFilePath':'images/icons/travel-agency.svg',              'iconValue':'171'}) 
    icons.push({'iconFilePath':'images/icons/unisex.svg',                     'iconValue':'172'})
    icons.push({'iconFilePath':'images/icons/university.svg',                 'iconValue':'173'})
    icons.push({'iconFilePath':'images/icons/veterinary-care.svg',            'iconValue':'174'})   
    icons.push({'iconFilePath':'images/icons/volume-control-telephone.svg',   'iconValue':'176'})            
    icons.push({'iconFilePath':'images/icons/waterskiing.svg',                'iconValue':'178'})
    icons.push({'iconFilePath':'images/icons/whale-watching.svg',             'iconValue':'179'})  
    icons.push({'iconFilePath':'images/icons/wheelchair.svg',                 'iconValue':'180'})
    icons.push({'iconFilePath':'images/icons/wind-surfing.svg',               'iconValue':'181'})
    icons.push({'iconFilePath':'images/icons/zoo.svg',                        'iconValue':'182'})
    icons.push({'iconFilePath':'images/icons/zoom-in.svg',                    'iconValue':'183'})
    icons.push({'iconFilePath':'images/icons/zoom-in-alt.svg',                'iconValue':'184'})
    icons.push({'iconFilePath':'images/icons/zoom-out.svg',                   'iconValue':'185'})
    icons.push({'iconFilePath':'images/icons/zoom-out-alt.svg',               'iconValue':'186'})
                                                                              
                                                                              
    iconSelect.refresh(icons);                                                
                                                                              
    $("#poi-dialog").dialog({
      resizable: false,
      title: title,
      height: 500,
      width: 500,
      modal: true,
      buttons: {
        Ok: function() {
          $(this).dialog( "close" );
        }
      }
    });
}

module.exports.runningUnderNW = runningUnderNW;
module.exports.getActiveOSMfile = getActiveOSMfile;
module.exports.infoDialog = infoDialog; 
module.exports.switchGraph = changeActiveRoutingGraph;
module.exports.initBikeTourPlannerMenu = initBikeTourPlannerMenu;