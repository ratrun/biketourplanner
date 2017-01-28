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

var tileServerHasExited = true;
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

/* Fall back to liechtenstein in case persistence value was lost 
 * as either its a new installation, or the user has interrupted 
 * an ongoing graph calculation*/
function defaultActiveOsmfile() {
    if (activeOsmfile === undefined) {
        activeOsmfile = 'liechtenstein-latest.osm.pbf';
        console.log('defaulting activeOsmfile to:' + activeOsmfile);
    } else {
        console.log('activeOsmfile is set to:' + activeOsmfile);
    }
}

defaultActiveOsmfile();

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
    tileServerHasExited = false;
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
        tileServerHasExited = true;
    });

    mbtiles.on('exit', function (code, signal) {
        console.log('tiles server child process exited with code ' + code +' signal=' + signal);
        tileServerHasExited = true;
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
       defaultActiveOsmfile();
       var osmfilepath = path.join('data/osmfiles', activeOsmfile);
       if (!fs.existsSync(osmfilepath)) {
         activeOsmfile = 'liechtenstein-latest.osm.pbf';
         osmfilepath = path.join('data/osmfiles', activeOsmfile);
         infoDialog( activeOsmfile + " not found and no graph available. <br> Now switching to " + activeOsmfile + "!");
         localStorage['activeOsmfile'] = activeOsmfile;
         graphpath = path.join('data/graphs',  activeOsmfile);
       }
    } else {
        osmfilepath = path.join('data/osmfiles', activeOsmfile);
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
    // -d64: Force 64 bit
    //-Xms<size>        set initial Java heap size
    //-Xmx<size>        set maximum Java heap size
    graphhopper = exec( exename , ['-d64 -Xmx' + maxreserved + 'm', '-Xms' + initialreserved + 'm', '-jar', 
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
        console.log("win.on close tileServerHasExited=" + tileServerHasExited + " ,graphhopperServerHasExited=" + graphhopperServerHasExited);
        shutdownapp = true;
        if ((tileServerHasExited) && (graphhopperServerHasExited)) {
            console.log("close1");
            this.close(true);
        } else {
           console.log("close2");
           if (!tileServerHasExited)
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
  if (!tileServerHasExited) {
   if (shutdownapp) {
      if (mbtiles !== undefined) {
          // Inform the tile server via SIGTERM to close
          var res = mbtiles.kill('SIGTERM');
          console.log("mbtiles kill SIGTERM returned:" + res);
          tileServerHasExited = res;
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
            return cb(response.statusCode);
        }

        response.pipe(file);

        file.on('finish', function() {
            file.close(cb(200));  // close() is async, call cb after close completes.
        });
    });

    // check for request error too
    request.on('error', function (err) {
        fs.unlink(dest);

        if (cb) {
            return cb(err);
        }
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)

        if (cb) {
            return cb(err);
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
                                            download("https://openmaptiles.os.zhdk.cloud.switch.ch/v3.3/extracts/" + 
                                                    selected_country_file_name + ".mbtiles", "data\\mbtiles\\" 
                                                    + selected_country_file_name + ".mbtiles",
                                            function(result) {
                                                showHtmlNotification("./img/mtb.png", 'Download result:', result.message, 6000);
                                                if (result === 200) {
                                                   startLocalVectorTileServer(win);
                                                   infoDialog("Map download succeeded! <br>Restart the application now to ensure that the new map becomes selectable!");
                                                } else 
                                                   infoDialog("Map download failed with result code:" + result);
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
    showInstalledMapsMenuItem = new gui.MenuItem({ label: translate.tr('show_installed_maps'), enabled : tileServerHasExited,
        click: function() {  console.log("showInstalledMaps requesting maps");
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    showDialog("installedmaps.html", 170, 300, JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,'<br>').replace(/[\",\]\[]/g,''), 'maplist');
                             });
                          }
    });
    mapSubMenu.append(showInstalledMapsMenuItem);

    stopTileServerMenuItem = new gui.MenuItem({ label: translate.tr('stop_tile_server'), enabled : !tileServerHasExited,
        click: function() { stopLocalVectorTileServer(); }
    });
    
    startTileServerMenuItem = new gui.MenuItem({ label: translate.tr('start_tile_server'), enabled : tileServerHasExited,
        click: function() { 
                             startLocalVectorTileServer(win);
                             this.enabled = false;
                          }
    });
    mapSubMenu.append(separator);
    mapSubMenu.append(stopTileServerMenuItem);
    mapSubMenu.append(startTileServerMenuItem);
    deleteMapMenuItem = new gui.MenuItem({ label: translate.tr('delete_map'), enabled : !tileServerHasExited,
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
    deleteGraphMenuItem = new gui.MenuItem({ label: translate.tr('delete_routing_graph'), enabled : tileServerHasExited,
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
       if (tileServerHasExited) {
          console.log("Tileserver was stopped and did not respond: Starting it!");
          startLocalVectorTileServer(win);
       } else
          console.log("Error: Tileserver request timeout");
    });

    request.on("error", function(err) {
        console.log("http://127.0.0.0:3000 responded with " + err);
        if ((err.code === 'ECONNREFUSED')&& (tileServerHasExited)) {
            console.log("Tileserver was stopped and connection was refused: Starting it!");
            startLocalVectorTileServer(win);
        } else {
            console.log("Tileserver responded with " + err + " stopTileServerMenuItem=" + stopTileServerMenuItem);
            tileServerHasExited = false;
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

module.exports.runningUnderNW = runningUnderNW;
module.exports.getActiveOSMfile = getActiveOSMfile;
module.exports.infoDialog = infoDialog; 
module.exports.switchGraph = changeActiveRoutingGraph;
module.exports.initBikeTourPlannerMenu = initBikeTourPlannerMenu;