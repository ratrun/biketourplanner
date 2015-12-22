MarkerArray = new Array();
CoordObj = new Object();
var Layergroup = new L.LayerGroup();
var map;

function auswahlaendern()
{
	Layergroup.clearLayers();
	MarkerArray = new Array();
	Moveaufruf();
}

function Moveaufruf(initmap)
{
	map = initmap;
	coords = map.getBounds();
	lefttop = coords.getNorthWest();
	rightbottom = coords.getSouthEast();
	//Ladenalken anmachen
	
	XMLLaden(lefttop.lat,lefttop.lng,rightbottom.lat,rightbottom.lng);
	
}

function XMLLaden(lat1,lon1,lat2,lon2)
{
	//Maximalen Zoom um karten ausschnitt nciht zu gross zu haben
	if (map.getZoom()>10)
	{
		$('#loading')[0].style.display = '';
		
		Rcamp_site = '<query type="node"><has-kv k="tourism" v="camp_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="camp_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="camp_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rchalet = '<union><query type="node"><has-kv k="tourism" v="chalet"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query></union><print/><union><query type="way"><has-kv k="tourism" v="chalet"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="chalet"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rguest_house = '<query type="node"><has-kv k="tourism" v="guest_house"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="guest_house"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="guest_house"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rhotel = '<query type="node"><has-kv k="tourism" v="hotel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="hotel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="hotel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rhostel = '<query type="node"><has-kv k="tourism" v="hostel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="hostel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="hostel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rbed_and_breakfast = '<query type="node"><has-kv k="tourism" v="bed_and_breakfast"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="bed_and_breakfast"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="bed_and_breakfast"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rcaravan_site = '<query type="node"><has-kv k="tourism" v="caravan_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="caravan_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="caravan_site"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		Rmotel = '<query type="node"><has-kv k="tourism" v="motel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><print/><union><query type="way"><has-kv k="tourism" v="motel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="way-node"/></union><print/><union><query type="relation"><has-kv k="tourism" v="motel"/><bbox-query s="'+lat2+'" n="'+lat1+'" w="'+lon1+'" e="'+lon2+'"/></query><recurse type="down"/></union><print/>';
		
		
		//XMLRequestText reseten
		XMLRequestText = "";
		
		//XMLRequestText aufbauen
		if ($('input[name=camp_site]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rcamp_site;
		}
		if ($('input[name=chalet]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rchalet;
		}
		if ($('input[name=guest_house]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rguest_house + Rbed_and_breakfast;
		}
		if ($('input[name=hotel]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rhotel;
		}
		if ($('input[name=hostel]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rhostel;
		}
		if ($('input[name=motel]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rmotel;
		}
		if ($('input[name=caravan_site]').prop( "checked" ) )
		{
			XMLRequestText = XMLRequestText + Rcaravan_site;
		}
		
		//CrossoverAPI XML request
		//XMLRequestText = Rcamp_site + Rchalet + Rguest_house + Rhotel + Rhostel + Rbed_and_breakfast + Rcaravan_site + Rmotel;
		//URL Codieren
		XMLRequestText = encodeURIComponent(XMLRequestText);
		
		RequestURL = "http://overpass-api.de/api/interpreter?data=" + XMLRequestText;
		//AJAX REQUEST
		
		
		$.ajax({
		url: RequestURL,
		type: 'GET',
		crossDomain: true,
		success: function(data){parseOSM(data);$('#loading')[0].style.display = 'none';}
		//beforeSend: setHeader
		});
			
			
	}
	
	else
	{
		//Zoom zu klein um anzuzeigen
	}
	
}

function parseOSM(daten)
{
	console.log(daten);
	
	$(daten).find('node,way,relation').each(function(){
		EleID = $(this).attr("id");
		
		
		//Wenn es Knoten ist
		if (this.tagName=="node")
		{
			EleLat = $(this).attr("lat");
			EleLon = $(this).attr("lon");
			EleObj = new Object();
			EleObj["lat"] = EleLat;
			EleObj["lon"] = EleLon;
			CoordObj[EleID] = EleObj;	
		}
		
		//Wenn es ein Weg
		if (this.tagName=="way")
		{
			EleCoordArrayLat = new Array();
			EleCoordArrayLon = new Array();
			EleObj = new Array();
			
			$(this).find('nd').each(function(){
				NdRefID = $(this).attr("ref");
				EleCoordArrayLat.push(CoordObj[NdRefID]["lat"]);
				EleCoordArrayLon.push(CoordObj[NdRefID]["lon"]);
			});
			EleCoordArrayLat = EleCoordArrayLat.sort();
			//console.log(EleCoordArrayLat);
			EleCoordArrayLon = EleCoordArrayLon.sort();
			EleLatMin = EleCoordArrayLat[0];
			EleLatArrayLenght = EleCoordArrayLat.length - 1;
			EleLatMax = EleCoordArrayLat[EleLatArrayLenght];
			EleLonMin = EleCoordArrayLon[0];
			EleLonArrayLenght = EleCoordArrayLon.length - 1;
			EleLonMax = EleCoordArrayLon[EleLonArrayLenght];
			//console.log(EleLatMin);
			//console.log(EleLatMax);
			EleLat = (EleLatMin - 0) + ((EleLatMax - EleLatMin)/2);
			EleLon = (EleLonMin - 0) + ((EleLonMax - EleLonMin)/2);
			//console.log(EleLat);
			//console.log(EleLon);
			EleObj["lat"] = EleLat;
			EleObj["lon"] = EleLon;
			//CoordObj[EleID] = EleObj;
			CoordObj[EleID] = this;
		}


		//Wenn relation
		if (this.tagName=="relation")
		{
			EleCoordArrayLat = new Array();
			EleCoordArrayLon = new Array();
			
			$(this).find('member').each(function(){
				if ($(this).attr("type")=="node"){
					NdRefID = $(this).attr("ref");
					EleCoordArrayLat.push(CoordObj[NdRefID]["lat"]);
					EleCoordArrayLon.push(CoordObj[NdRefID]["lon"]);

				}
				if ($(this).attr("type")=="way"){
					NdRefID = $(this).attr("ref");
					//console.log("---");
					//console.log(CoordObj[NdRefID]);

					$(CoordObj[NdRefID]).find('nd').each(function(){
						NdRefIDway = $(this).attr("ref");
						EleCoordArrayLat.push(CoordObj[NdRefIDway]["lat"]);
						EleCoordArrayLon.push(CoordObj[NdRefIDway]["lon"]);
					});	
				}
			});


			EleCoordArrayLat = EleCoordArrayLat.sort();
			//console.log(EleCoordArrayLat);
			EleCoordArrayLon = EleCoordArrayLon.sort();
			EleLatMin = EleCoordArrayLat[0];
			EleLatArrayLenght = EleCoordArrayLat.length - 1;
			EleLatMax = EleCoordArrayLat[EleLatArrayLenght];
			EleLonMin = EleCoordArrayLon[0];
			EleLonArrayLenght = EleCoordArrayLon.length - 1;
			EleLonMax = EleCoordArrayLon[EleLonArrayLenght];
			//console.log(EleLatMin);
			//console.log(EleLatMax);
			EleLat = (EleLatMin - 0) + ((EleLatMax - EleLatMin)/2);
			EleLon = (EleLonMin - 0) + ((EleLonMax - EleLonMin)/2);
			//console.log(EleLat);
			//console.log(EleLon);
		}
		
		EleText = "";
		EleName = "";
		EleNotiz = "";
		Adressblock = "";
		Zeltblock = "";
		Kontakblock = "";
		Restaurantblock = "";
		InternetAccessblock = "";
		EleAddrHousename = "";
		EleAddrHousenumber = "";
		EleAddrCity = "";
		EleAddrStreet = "";
		EleAddrPostcode = "";
		ElePhone = "";
		EleFax = "";
		EleWebsite = "";
		EleEmail = "";
		EleKontakt = "";
		EleRestaurant = "";
		EleKueche = "";
		EleInternetAccess = "";
		EleInternetAccessFee = "";
		EleWheelchair = "";
		EleCaravans = "";
		EleTents = "";
		EleOpenFire = "";
		LocType = "";
		
		$(this).find('tag').each(function(){
			EleKey = $(this).attr("k");
			EleValue = $(this).attr("v");
			//EleText = EleText + "<b>" + EleKey + ": </b>" + EleValue + "<br/>";
			EleKey = EleKey.toLowerCase();
			
			
			
			//Name
			if (EleKey=="name")
			{
				EleName = EleValue;
			}
			
			//Adresse
			if (EleKey=="addr:street")
			{
				EleAddrStreet = EleValue;
			}
			if (EleKey=="addr:city")
			{
				EleAddrCity = EleValue;
			}
			if (EleKey=="addr:postcode")
			{
				EleAddrPostcode = EleValue;
			}
			if (EleKey=="addr:housenumber")
			{
				EleAddrHousenumber = EleValue;
			}
			if (EleKey=="addr:housename")
			{
				EleAddrHousename = EleValue + "<br/>";
			}
			
			
			
			//Kontakt
			if (EleKey=="contact:phone")
			{
				ElePhone = EleValue;
			}
			if (EleKey=="phone")
			{
				ElePhone = EleValue;
			}
			if (EleKey=="contact:fax")
			{
				EleFax = EleValue;
			}
			if (EleKey=="fax")
			{
				EleFax = EleValue;
			}
			if (EleKey=="contact:email")
			{
				EleEmail = EleValue;
			}
			if (EleKey=="email")
			{
				EleEmail = EleValue;
			}
			if (EleKey=="contact:website")
			{
				EleWebsite = EleValue;
			}
			if (EleKey=="website")
			{
				EleWebsite = EleValue;
			}
			if (EleKey=="url")
			{
				EleWebsite = EleValue;
			}

			
			
			
			if ((EleKey=="payment:notes")&&(EleValue=="no"))
			{
				EleText = EleText + "An diesem Automat kann <b>nicht</b> mit Scheinen bezahlt werden<br />";
			}
			if (EleKey=="operator")
			{
				EleText = EleText + "Betreiber: " + EleValue + "<br/>";
			}
			
			if ((EleKey=="payment:electronic_purses")&&(EleValue=="yes"))
			{
				EleText = EleText + "An diesem Automat kann mit GeldKarte bezahlt werden<br />";
			}
			if ((EleKey=="payment:electronic_pursess")&&(EleValue=="no"))
			{
				EleText = EleText + "An diesem Automat kann <b>nicht</b> mit GeldKarte bezahlt werden<br />";
			}
			
			
			//VALUES wo CASESENSITIV WICHTIG
			
			EleValue = EleValue.toLowerCase();
			
			//Parse Welcher Elementtype
			if ((EleKey=="tourism")&&(EleValue=="hotel"))
			{
				LocType = "hotel";
				EleText = "Hotel";
			}
			if ((EleKey=="tourism")&&(EleValue=="hostel"))
			{
				LocType = "hostel";
				EleText = "Hostel";
			}
			if ((EleKey=="tourism")&&(EleValue=="motel"))
			{
				LocType = "motel";
				EleText = "Motel";
			}
			if ((EleKey=="tourism")&&(EleValue=="chalet"))
			{
				LocType = "chalet";
				EleText = "Ferienwohnung";
			}
			if ((EleKey=="tourism")&&((EleValue=="guest_house")||(EleValue=="bed_and_breakfast")))
			{
				LocType = "guest_house";
				EleText = "Pension";
			}
			if ((EleKey=="tourism")&&(EleValue=="camp_site"))
			{
				LocType = "camp_site";
				EleText = "Campingplatz";
			}
			if ((EleKey=="tourism")&&(EleValue=="caravan_site"))
			{
				LocType = "caravan_site";
				EleText = "Wohnmobilstellplatz";
			}
			
			//restaurant
			if ((EleKey=="amenity")&&(EleValue=="restaurant"))
			{
				EleRestaurant = "In dieser Unterkunft befindet sich ein Restaurant";
			}
			if ((EleKey=="amenity")&&(EleValue=="cafe"))
			{
				EleRestaurant = "In dieser Unterkunft befindet sich ein Caf&eacute;";
			}
			if ((EleKey=="amenity")&&(EleValue=="pub"))
			{
				EleRestaurant = "In dieser Unterkunft befindet sich ein Pub";
			}
			if ((EleKey=="amenity")&&(EleValue=="bar"))
			{
				EleRestaurant = "In dieser Unterkunft befindet sich eine Bar";
			}
			
			if (EleKey=="tents")
			{
				if (EleValue=="yes")
				{
					EleTents = "Zelte: ja<br/>";
				}
				if (EleValue=="no")
				{
					EleTents = "Zelte: nein<br/>";
				}
			}
			
			if (EleKey=="caravans")
			{
				if (EleValue=="yes")
				{
					EleCaravans = "Wohnwagen: ja<br/>";
				}
				if (EleValue=="no")
				{
					EleCaravans = "Wohnwagen: nein<br/>";
				}
			}
			
			if (EleKey=="openfire")
			{
				if (EleValue=="yes")
				{
					EleOpenFire = "Offenes Feuer erlaubt<br/>";
				}
				if (EleValue=="no")
				{
					EleOpenFire = "Offenes Feuer <b>nicht</b> erlaubt<br/>";
				}
			}

			
			//K�che
			if (EleKey=="cuisine")
			{
				switch(EleValue)
				{
					case "regional": EleKueche = "Regional"; break;
					case "burger": EleKueche = "Burger"; break;
					case "pizza": EleKueche = "Pizza"; break;
					case "italian": EleKueche = "Italienisch"; break;
					case "chinese": EleKueche = "Chinesisch"; break;
					case "german": EleKueche = "Deutsch"; break;
					case "kebab": EleKueche = "D&ouml;ner"; break;
					case "d�ner": EleKueche = "D&ouml;ner"; break;
					case "greek": EleKueche = "Grichisch"; break;
					case "indian": EleKueche = "Inisch"; break;
					case "sandwich": EleKueche = "Sandwich"; break;
					case "asian": EleKueche = "Asiatisch"; break;
					case "mexican": EleKueche = "Mexikanisch"; break;
					case "ice_cream": EleKueche = "Eis"; break;
					case "japanese": EleKueche = "Japanisch"; break;
					case "coffee_shop": EleKueche = "Kaffee"; break;
					case "thai": EleKueche = "Thai"; break;
					case "french": EleKueche = "Franz&ouml;sisch"; break;
					case "chicken": EleKueche = "H&uuml;nchen"; break;
					case "fish_and_chips": EleKueche = "Fish and Chips"; break;
					case "american": EleKueche = "Amerikanisch"; break;
					case "turkish": EleKueche = "T&uuml;rkisch"; break;
					case "international": EleKueche = "International"; break;
					case "sushi": EleKueche = "Sushi"; break;
					case "spanish": EleKueche = "Spanisch"; break;
					case "seafood": EleKueche = "Fisch und Meeresfr&uuml;chte"; break;
					case "steak_house": EleKueche = "Steakhouse"; break;
					case "fish": EleKueche = "Fisch"; break;
					case "vitnamese": EleKueche = "Vitnamesisch"; break;
					case "vegetarian": EleKueche = "Vegetarisch"; break;
					case "bavarian": EleKueche = "Bayrisch"; break;
					case "noodle": EleKueche = "Nudeln"; break;
					case "korean": EleKueche = "Koreanisch"; break;
					case "friture": EleKueche = "Fritiertes"; break;
					case EleValue: EleKueche = EleValue; break;
				}
			}
			
			
			//Internet Access
			if (EleKey=="internet_access")
			{
				if(EleValue!="no")
				{
					switch (EleValue)
					{
						case "wlan": EleInternetAccess = "Internetzugang: WLAN";break;
						case "wifi": EleInternetAccess = "Internetzugang: WLAN";break;
						case "terminal": EleInternetAccess = "Internetzugang: Computer vorhanden";break;
						case "wired": EleInternetAccess = "Internetzugang: Netzwerkport vorhanden";break;
						case "public": EleInternetAccess = "Internetzugang: vorhanden";break;
						case "yes": EleInternetAccess = "Internetzugang: vorhanden";break;
						case EleValue : EleInternetAccess = "Internetzugang: " + EleValue;	break;
					}		
				}
				else
				{
					EleInternetAccess = "Kein Internetzugang";
				}
			}
			
			//Internetgeb�r
			if (EleKey=="internet_access:fee")
			{
				switch(EleValue)
				{
					case "yes" : EleInternetAccessFee = "kostenpflichtig";break;
					case "no" : EleInternetAccessFee = "kostenlos";break;
					case EleValue : EleInternetAccessFee = EleValue;break;
				}
				
			}

			

		});
		
		
		//ZUSAMMENBAUEN//
		
		
		//Adressblock
		if((EleAddrHousename!="")||(EleAddrStreet!="")||(EleAddrHousenumber!="")||(EleAddrPostcode!="")||(EleAddrCity!=""))
		{
			Adressblock = "<div class='infoblock'>" + EleAddrHousename + EleAddrStreet + " " + EleAddrHousenumber + "<br>" + EleAddrPostcode + " " + EleAddrCity + "</div>";
		}
		
		//Kontaktblock				
		if((ElePhone!="")||(EleFax!="")||(EleWebsite!="")||(EleEmail!=""))
		{
			if (ElePhone!="")
			{
				EleKontakt = EleKontakt + "<tr><td>Telefon: </td><td>" + ElePhone + "</td></tr>";
			}
			if (EleFax!="")
			{
				EleKontakt = EleKontakt + "<tr><td>Fax: </td><td>" + EleFax + "</td></tr>";
			}
			if (EleEmail!="")
			{
				EleKontakt = EleKontakt + "<tr><td>Email: </td><td><a href='mailto:" + EleEmail + "'>"+ EleEmail +"</a></td></tr>";
			}
			if (EleWebsite!="")
			{
				//Website mit prefix versehen
				Elewebsitetest = EleWebsite.split("://");
				if(!Elewebsitetest[1]) EleWebsite = "http://" + EleWebsite;
				
				EleKontakt = EleKontakt + "<tr><td>Website: </td><td><a target='_blank' href='" + EleWebsite + "'>"+ EleWebsite +"</a></td></tr>";
			}
			Kontakblock = "<div class='infoblock'><table>" + EleKontakt + "</table></div>";
		}
		
		//Zeltblock
		if((EleTents!="")||(EleCaravans!="")||(EleOpenFire!=""))
		{
			Zeltblock = "<div class='infoblock'>" + EleTents + EleCaravans + EleOpenFire + "</div>";
		}
		
		//Restaurantblock
		if(EleRestaurant!="")
		{
			if(EleKueche!="")
			{
				EleRestaurant = EleRestaurant + "<br/>K&uuml;che: " + EleKueche;
			}
			EleRestaurant = "<div class='infoblock'>" + EleRestaurant + "</div>";
		}
		
		//Location Titel
		if (EleName!="") EleName = " &raquo;" + EleName + "&laquo";
		EleTitel = "<b>" + EleText + EleName + "</b><br/>";
		
		//Internetaccess
		if (EleInternetAccess!="")
		{
			if(EleInternetAccessFee!="")
			{
				EleInternetAccess = EleInternetAccess + ", " + EleInternetAccessFee;
			}
			InternetAccessblock = "<div class='infoblock'>" + EleInternetAccess + "</div>";
		}
		
		
		
		
		//Zusammenbauen
		EleText = EleTitel + Adressblock + Kontakblock +  Zeltblock + EleRestaurant + InternetAccessblock;
		
		
		
		
		
		//Nur marker malen wenn Noch keiner da ist
		if($.inArray(EleID, MarkerArray)==-1)
		{
			//Nur Marker malen wenn es �berhaupt ein Objekt ist
			if(LocType!="")
			{
				var markerLocation = new L.LatLng(EleLat,EleLon);
				var Icon = new L.icon({
					//iconUrl: "./img/unterkunft/"+LocType+".png",
					iconUrl: "./img/unterkunft/"+LocType+".png",
					iconSize: [32, 32],
					iconAnchor:   [15,32],
					popupAnchor:  [2, -34]
				});
				//var Icon = new CustomIcon("./img/mapicons/"+LocType+".png");
				var marker = new L.Marker(markerLocation,{icon : Icon});
				
				if(EleText!="")
				{
					marker.bindPopup(EleText);
					//marker.setOpacity(0.5);
				}
				
				Layergroup.addLayer(marker);
				MarkerArray.push(EleID);
			}

		}
		
		//Ladebalken ausmachen
		$('#loading')[0].style.display = 'none';
		map.addLayer(Layergroup);
	});
}

settingsausgeblendet = "ja";

function showSettings()
{
	
	
	if (settingsausgeblendet == "ja")
	{
		$('#settings')[0].style.display = "block";
		settingsausgeblendet = "nein";
	}
	else
	{
		$('#settings')[0].style.display = "none";
		settingsausgeblendet = "ja";
	}
}

var CustomIcon = L.Icon.extend({
	    iconUrl: './img/unterkunft/hotel.png',
	    shadowUrl: './img/unterkunft/shadow.png',
	    iconSize: new L.Point(32, 32),
	    opacity: 0.5,
	    //shadowSize: new L.Point(68, 95),
	    iconAnchor: new L.Point(16, 16),
	    popupAnchor: new L.Point(0, -18)
	});

