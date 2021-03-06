/*!
 * TEMPLATE INSTRUCTIONS: Look for sections below marked MODIFY and adjust to fit your data and index.html page
 * Learn more at
 * Data Visualization book-in-progress by Jack Dougherty at Trinity College CT
 * http://epress.trincoll.edu/dataviz
 * and
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 1 August 2014 template modified by Jack Dougherty, based on work by Derek Eder
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //MODIFY the encrypted Table IDs of your Fusion Tables (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  fusionTableId:      "1u1KUXrwtoZWmYJrno7NdwyyJ_lWSwrnw4L8ftBsp", //Point data layer

  polygon1TableID:    "1o-Xs4sG6qgc5u_MLwzVwjOX14WUul4oA1QlZTpTx", //HPS zones

  //*MODIFY Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyDIevSvpV-ONb4Pf15VUtwyr_zZa7ccwq4",

  //MODIFY name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  //if your Fusion Table has two-column lat/lng data, see https://support.google.com/fusiontables/answer/175922
  locationColumn:     "Lat",

  map_centroid:       new google.maps.LatLng(41.7682,-72.684), //center that your map defaults to
  locationScope:      "connecticut",      //geographical area appended to all address searches
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results",

  // searchRadius:       1000,            //in meters; removed searchRadius from this tool
  defaultZoom:        12,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/star-icon.png',
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -100 }, // MODIFY Saturation and Lightness if needed
            { lightness: 40 }     // Current values make thematic polygon shading stand out over base map
          ]
        }
      ]
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;

    // MODIFY if needed: defines background polygon1 and layers
    MapsLib.polygon1 = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.polygon1TableID,
        select: "geometry"
      },
      styleId: 2,
      templateId: 2
    });

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    // if (loadRadius != "") $("#search_radius").val(loadRadius);
    // else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();

    //-----custom initializers -- default setting to display Polygon1 layer

    $("#rbPolygon1").attr("checked", "checked");

    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();

    // MODIFY if needed: shows background polygon layer depending on which checkbox is selected
    if ($("#rbPolygon1").is(':checked')) {
      MapsLib.polygon1.setMap(map);
    }

    var address = $("#search_address").val();
    // MapsLib.searchRadius = $("#search_radius").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";

  //-----MODIFY custom filters

    // for Grade drop-down menu to search across multiple columns in GFT, where select_grade (e.g. name of column=Gr1) = 1
    // set up Google Fusion Table column headers to match drop-down options in index.html, and data = 1 or 0
    if ( $('#select_grade').val() !=""){
      whereClause += "AND '" + $("#select_grade").val() + "'='1'";
    }

    // for School type checkboxes
    //-- NUMERICAL OPTION - MODIFY column header and values below to match your Google Fusion Table data AND index.html
    var type_column = "TypeNum";
    var searchType = type_column + " IN (-1,";
    if ( $("#cbType1").is(':checked')) searchType += "1,";
    if ( $("#cbType2").is(':checked')) searchType += "2,";
    if ( $("#cbType3").is(':checked')) searchType += "3,";
    if ( $("#cbType4").is(':checked')) searchType += "4,";
    // if ( $("#cbType5").is(':checked')) searchType += "5,";
    whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";

    /*-- TEXTUAL OPTION to display legend and filter by non-numerical data in your table
    var type_column = "'Program Type'";  // -- note use of single & double quotes for two-word column header
    var tempWhereClause = [];
    if ( $("#cbType1").is(':checked')) tempWhereClause.push("Interdistrict");
    if ( $("#cbType2").is(':checked')) tempWhereClause.push("District");
    if ( $("#cbType3").is(':checked')) tempWhereClause.push("MorePreK");
    whereClause += " AND " + type_column + " IN ('" + tempWhereClause.join("','") + "')"; */

    //-------end of custom filters--------

    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(address));
          // $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(12);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });

          // whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          // MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);

          // look up the Hartford zone number when we have an address
          MapsLib.getZoneNumber();
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
    MapsLib.getList(whereClause);
  },
  // MODIFY if you change the number of Polygon layers
  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.polygon1 != null)
      MapsLib.polygon1.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    // if (MapsLib.searchRadiusCircle != null)
    //   MapsLib.searchRadiusCircle.setMap(null);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  // drawSearchRadiusCircle: function(point) {
  //     var circleOptions = {
  //       strokeColor: "#4b58a6",
  //       strokeOpacity: 0.3,
  //       strokeWeight: 1,
  //       fillColor: "#4b58a6",
  //       fillOpacity: 0.05,
  //       map: map,
  //       center: point,
  //       clickable: false,
  //       zIndex: -1,
  //       radius: parseInt(MapsLib.searchRadius)
  //     };
  //     MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  // },

  query: function(selectColumns, whereClause, groupBY, orderBY, limit, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);

    if (whereClause != "")
      queryStr.push(" WHERE " + whereClause);

    if (groupBY != "")
      queryStr.push(" GROUP BY " + groupBY);

    if (orderBY != "")
      queryStr.push(" ORDER BY " + orderBY);

     if (limit != "")
      queryStr.push(" LIMIT " + limit);

    var sql = encodeURIComponent(queryStr.join(" "));
    // console.log(sql)
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause,"", "", "", "MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#result_box" ).fadeOut(function() {
        $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#result_box" ).fadeIn();
  },

  getList: function(whereClause) {
    // select specific columns from the fusion table to display in the list
    // NOTE: we'll be referencing these by their index (0 = School, 1 = GradeLevels, etc), so order matters!
    var selectColumns = "School, Manager, TypeNum, Address, City, Lat, Lng, Grades, SchoolURL, ApplyTo, ApplyURL, Transportation, TransportationURL, Rating, RatingURL, ReportURL, Zone, Report";
    MapsLib.query(selectColumns, whereClause,"", "", 500, "MapsLib.displayList");
  },

  displayList: function(json) {
    MapsLib.handleError(json);
    var columns = json["columns"];
    var rows = json["rows"];
    var template = "";

    var results = $("#listview");
    results.empty(); //hide the existing list and empty it out first

    if (rows == null) {
      //clear results list
      results.append("<span class='lead'>No results found</span>");
      }
    else {

      //set table headers  -- in future, add RATING below
      var list_table = "\
      <table class='table' id ='list_table'>\
        <thead>\
          <tr>\
            <th>School (managed by)</th>\
            <th>Grades&nbsp;&nbsp;&nbsp;&nbsp;</th>\
            <th>Address</th>\
            <th>Distance&nbsp;&nbsp;&nbsp;</th>\
            <th>To Apply</th>\
          </tr>\
        </thead>\
        <tbody>";

      for (var row in rows) {
        var schoolCombo = "<a href='" + rows[row][8] + "'>" + rows[row][0] + "</a>" + " (" + rows[row][1] + ")" + "<br />" + "<a href='" + rows[row][15] + "'>" + rows[row][17] + "</a>";
        var addressCombo = rows[row][3] + ", " + rows[row][4] + "<br />" + "(" + rows[row][16] + ")";
        var applyCombo = "<a href='" + rows[row][10] + "'>" + rows[row][9] + "</a>" + "<br />" + "<a href='" + rows[row][12] + "'>" + rows[row][11] + "</a>";

      // IN FUTURE add --   var ratingCombo = "<a href='" + rows[row][14] + "'>" rows[row][13] + "</a>"

      // based on the columns we selected in getList()
      // rows[row][0] = School
      // rows[row][1] = Manager
      // rows[row][2] = TypeNum
      // rows[row][3] = Address
      // rows[row][4] = City
      // rows[row][5] = Lat
      // rows[row][6] = Lng
      // rows[row][7] = Grades
      // rows[row][8] = SchoolURL
      // rows[row][9] = ApplyTo
      // rows[row][10] = ApplyURL
      // rows[row][11] = Transportation
      // rows[row][12] = TransportationURL
      // rows[row][13] = Rating
      // rows[row][14] = RatingURL
      // rows[row][15] = ReportURL
      // rows[row][16] = Zone
      // rows[row][17] = Report


// IN FUTURE , add: <td>" + ratingCombo + "</td>\
        var center = map.getCenter();
        list_table += "\
          <tr>\
            <td>" + schoolCombo + "</td>\
            <td>" + rows[row][7] + "</td>\
            <td>" + addressCombo + "</td>\
            <td>" + getDistance(center.lat(), center.lng(), rows[row][5], rows[row][6]) + "</td>\
            <td>" + applyCombo + "</td>\
          </tr>";
      }

      list_table += "\
          </tbody>\
        </table>";

      // add the table to the page
      results.append(list_table);

      // init datatable
      // once we have our table put together and added to the page, we need to initialize DataTables
      // reference: http://datatables.net/examples/index

      // custom sorting functions defined in js/jquery.dataTables.sorting.js
      // custom Bootstrap styles for pagination defined in css/dataTables.bootstrap.css

      // IN FUTURE add: null // ratingCombo (and insert comma at end of prior null)

      $("#list_table").dataTable({
          "aaSorting": [[0, "asc"]], //default column to sort by (School)
          "aoColumns": [ // tells DataTables how to perform sorting for each column
              null, // schoolCombo - default text sorting
              null, // grades - default text sorting
              null, // addressCombo - default text sorting
              { "sType": "numeric" }, //distance -- sort according to numerical value, ascending
              null // applyCombo - default text sorting, and last item has NO COMMA
          ],
          "bFilter": false, // disable search box since we already have our own
          "bInfo": false, // disables results count - we already do this too
          "bPaginate": true, // enables pagination
          "sPaginationType": "bootstrap", // custom CSS for pagination in Bootstrap
          "bAutoWidth": false
      });
    }
  },

  getZoneNumber: function() {
    var queryStr = [];
    var callback = "MapsLib.displayZoneNumber";
    queryStr.push("SELECT 'zone'");
    queryStr.push(" FROM " + MapsLib.polygon1TableID);

    if (MapsLib.currentPinpoint) {
      queryStr.push(" WHERE ST_INTERSECTS(geometry, CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + ", 0.1))");

      var sql = encodeURIComponent(queryStr.join(" "));
      // console.log(sql)
      $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
    }
  },
    
  displayZoneNumber: function(json) {
    MapsLib.handleError(json);
    var zone = "";
    if (json["rows"] != null) {
      zone = json["rows"][0];
      $( "#zone_number" ).fadeOut(function() {
        $( "#zone_number" ).html("You live in <strong>Hartford School Zone " + zone + "</strong>.");
      });
      $( "#zone_number" ).fadeIn();
    }
    else {
      $( "#zone_number" ).fadeOut();
    }
  },

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  }

  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above

  //-----end of custom functions-------
}
// getDistance calculation uses Haversine formula from centerpoint of map to each row lat and lng
var rad = function(x) {
  return x * Math.PI / 180;
};

var getDistance = function(p1_lat, p1_long, p2_lat, p2_long) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2_lat - p1_lat);
  var dLong = rad(p2_long - p1_long);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1_lat)) * Math.cos(rad(p2_lat)) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return Math.round(d * .0006 * 10) / 10; // returns the distance in miles, rounded to the nearest 0.1
};
