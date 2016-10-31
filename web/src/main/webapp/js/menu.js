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

    stopTileServerMenuItem.enabled = true;
    showInstalledMapsMenuItem.enabled = true;
    startTileServerMenuItem.enabled = false;
    deleteMapMenuItem.enabled = false;
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
       }
    }
    console.log('Starting graphhopper with graph path=' + graphpath + ' and osmfilepath=' + osmfilepath);
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

    console.log('graphhopper started: ' + graphhopper);
    graphhopperServerHasExited = false;
    stopGraphhopperServerMenuItem.enabled = true;
    changeGraphMenuItem.enabled = false;
    startGraphhopperServerMenuItem.enabled = false;
    calculateGraphMenuItem.enabled = false;

    graphhopper.on('error', function (err) {
      console.log('graphhopper error' + err);
    });

    graphhopper.stdout.on('data', function (data) {
        console.log('graphhopper stdout: ' + data);
        var creatingnotification;
        if (data.toString('utf-8').indexOf('start creating graph from') !==-1 )
             creatingnotification = showHtmlNotification("./img/mtb.png", 
                                                         "Creating routing data", 
                                                         "Going to take a while depending on the area size. Press F12 to watch the console logs for details", 
                                                         45000);
        if (data.toString('utf-8').indexOf('Started server at HTTP :8989') !==-1 )
        {
             console.log("Routing server is ready!");
             // Close the otherwise long active notification for graph creation
             if (creatingnotification)
                 creatingnotification.close(true);
             showHtmlNotification("./img/mtb.png", "Routing server", 'is ready...', 5000);
             main.resetServerRespondedOk();
             main.mainInit();
             if (graphopperServerStartedOnce) {
                 //FIXME: Windows specific workaround: understand why the "$.when(ghRequest.fetchTranslationMap(urlParams.locale), ghRequest.getInfo())"
                 // runs into a timeout after a re-start of the graphhopper server and needs some time.
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
          calculateGraphMenuItem.enabled = true;
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
            console.log("close2");
            this.close(true);
        } else {
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
   } else { // Call special shutdown URL
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

// Deletes the graphhopper graph data located in the provided directory.
function deletegraph(dir) {
    console.log('Deleting graph ' + dir);
    fs.unlinkSync(dir + '/edges');
    fs.unlinkSync(dir + '/geometry');
    fs.unlinkSync(dir + '/location_index');
    fs.unlinkSync(dir + '/names');
    fs.unlinkSync(dir + '/properties');
    fs.unlinkSync(dir + '/nodes');
    fs.rmdirSync(dir);
};

// Changes the active routing graph to the graph located in the subdirectory under osm/graphs/relativeFolder
function changeActiveRoutingGraph(relativeFolder){
    activeOsmfile = relativeFolder;
    localStorage['activeOsmfile'] = activeOsmfile;
    startGraphhopperServer(win);
}

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
function webkitapp(win) {
    gui.App.clearCache();
    runningUnderNW = true;
    var os = global.require('os');
    osplatform = os.platform();
    console.log("System:" + osplatform + " nwjs version:" + gui.process.versions['node-webkit']);
    var menu = new gui.Menu({type: "menubar"});
    fs = global.require('fs');
    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    var separator = new gui.MenuItem({ type: 'separator' , enabled : false });
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
    showInstalledMapsMenuItem = new gui.MenuItem({ label: 'Show installed maps', enabled : tilesServerHasExited,
        click: function() { 
                             $.getJSON("http://127.0.0.1:3000/mbtilesareas.json", function( data ) {
                                    showDialog("installedmaps.html", 170, 300, JSON.stringify(data).replace(/{\"country\"\:\"/g,'').replace(/\"}/g,'<br>').replace(/[\",\]\[]/g,''), 'maplist');
                             });
                          }
    });
    mapSubMenu.append(showInstalledMapsMenuItem);

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
    deleteMapMenuItem = new gui.MenuItem({ label: 'Delete map', enabled : !tilesServerHasExited,
        click: function() { stopLocalVectorTileServer();
                            chooseFile('#mbtilesFileDialog');
        }
    });
    mapSubMenu.append(deleteMapMenuItem);
    
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
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Download OSM file',
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
    changeGraphMenuItem = new gui.MenuItem({ label: 'Change routing graph', enabled : !graphhopperServerHasExited,
        click: function() {
                             graphFolderSelectionDialogWithCallback("Change routing graph", false, changeActiveRoutingGraph);
                          }
    });
    graphhopperSubMenu.append(changeGraphMenuItem);
    calculateGraphMenuItem = new gui.MenuItem({ label: 'Calculate new routing graph', enabled : !graphhopperServerHasExited,
        click: function() {
                             chooseFile('#osmFileDialog');
                          }
    });
    graphhopperSubMenu.append(calculateGraphMenuItem);

    graphhopperSubMenu.append(separator);
    graphhopperSubMenu.append(stopGraphhopperServerMenuItem);
    graphhopperSubMenu.append(startGraphhopperServerMenuItem);
    deleteGraphMenuItem = new gui.MenuItem({ label: 'Delete routing data', enabled : tilesServerHasExited,
        click: function() {
                graphFolderSelectionDialogWithCallback("Delete routing data", true, deletegraph);
        }
    });
    graphhopperSubMenu.append(deleteGraphMenuItem);

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
                            showDialog("about.html", 310, 450);
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

    console.log("Start graphhopper server handling");
    var request = http.get({hostname: '127.0.0.1', port: 8989}, function (res) {
    });
    
    request.setTimeout( 100, function( ) {
       if (graphhopperServerHasExited) {
           console.log("Our graphhopper routing server did not respond: Starting it!");
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
            calculateGraphMenuItem.enabled = false;
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
        activeOsmfile = $(this).val().split(/(\\|\/)/g).pop();
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
             fs.unlinkSync(deletedFile);
           } else
             showHtmlNotification("./img/warning.png", "Avoid deletion of protected file!", fileName);
         }
      } 
    });
    chooser.trigger('click');
}

function switchGraph(newActiveOsmfile) {
   console.log('SwitchGraph triggering stop of routing server');
   stopGraphhopperServer();
   activeOsmfile = newActiveOsmfile;
   localStorage['activeOsmfile'] = activeOsmfile;
   startGraphhopperServer(win);
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

module.exports.runningUnderNW = runningUnderNW;
module.exports.activeOsmfile = activeOsmfile;
module.exports.infoDialog = infoDialog; 
module.exports.switchGraph = switchGraph;
