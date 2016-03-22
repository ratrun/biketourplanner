// Here we define the functionality for the graphhopper webkit application
function webkitapp()
{
    var menu = new gui.Menu({type: "menubar"});

    // Create a sub-menu
    var mapSubMenu = new gui.Menu();
    mapSubMenu.append(new gui.MenuItem({ label: 'Show available map areas' }));
    mapSubMenu.append(new gui.MenuItem({ label: 'Download new map data' }));
    
    menu.append(
        new gui.MenuItem({
            label: 'Map',
            submenu: mapSubMenu 
        })
    );

    // Create a sub-menu
    var osmDataSubMenu = new gui.Menu();
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Show available OSM data files' }));
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Download new OSM data file' }));
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Delete OSM data file' }));
    osmDataSubMenu.append(new gui.MenuItem({ label: 'Create marker data' }));

    menu.append(
        new gui.MenuItem({
            label: 'OSM data',
            submenu: osmDataSubMenu 
        })
    );

    var graphhopperSubMenu = new gui.Menu();
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Change active graph: None' ,  enabled : false} ));
    graphhopperSubMenu.append(new gui.MenuItem({ type: 'separator' ,  enabled : false }))
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'change graph settings' }));
    graphhopperSubMenu.append(new gui.MenuItem({ label: 'Create graph' ,  enabled : false}));
    
        
    menu.append(
        new gui.MenuItem({
            label: 'Graphhopper',
            submenu: graphhopperSubMenu 
        })
    );

        // Append Menu to Window
    gui.Window.get().menu = menu;
}

// Test if we are running under nw. If so the window.require('nw.gui'); command succeeds, otherwise we get an exception
try {
     var gui = window.require('nw.gui');
     webkitapp();
 }
 catch(err) {
     // Ignore: We are not running under nw
 }

