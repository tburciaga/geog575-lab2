/* Javascript by Todd Burciaga, 2020 */

//create global variables array
var keyArray = ["GEOID","TOTAL_POPULATION","MEDIAN_AGE","PCT_POVERTY","PCT_HSNGCSTS_OVR_50_PCT","PCT_OCR_25_HGHSCL_CMPLT","PCT_OVR_25_BCHLRS_CMPLT","PCT_UNEMPLOYED"];
var expressed = keyArray[0];

window.onload = initialize(); //start script after HTML loaded

function initialize(){ //the first function called
    setMap();
};

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create a page title
    var title = d3.select("body")
        .append("h1")
        .text("Chicago Census Data Choropleth");
    
    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on Chicago
    var projection = d3.geoAlbers()
        .center([5.95, 41.89])
        .rotate([93.63, 0.00, 0])
        .parallels([29.27, 74.72])
        .scale(50000.00)
        .translate([width / 2, height / 2]);

    //create a path generator
    var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/Census_Data.csv") //load attributes from csv
        .defer(d3.json, "data/Census_Tracts.topojson") //load choropleth spatial data (Chicago_Census_Tract_Boundaries_WGS84)
        .defer(d3.json, "data/City_Boundary.topojson") //load city boundary (Chicago_City_Boundary_WGS84)
        .await(callback);

    function callback(error, csvData, censusTracts, cityBoundary){
        
        var recolorMap = colorScale(csvData); //call color scale generator

        //csv to json data transfer
        var jsonTracts = censusTracts.objects.Chicago_Census_Tract_Boundaries_WGS84.geometries;

        //loop through json tracts to assign csv data to each json tract properties
        for (var i=0; i<csvData.length; i++) {
            var csvTract = csvData[i]; //current tract's attributes
            var csvGeoid = csvTract.GEOID; //GEOID

            //loop through json tracts to assign csv data to the right tract
            for (var a=0; a<censusTracts.length; a++){

                //where adm1 codes match, attach csv data to json object
                if (censusTracts[a].properties.GEOID == csvGeoid){
                    
                    //for loop to assign all key/value pairs to json object
                    for (var key in keyArray){
                        var attr = keyArray[key];
                        var val = parseFloat(csvTract[attr]);
                        censusTracts[a].properties[attr] = val;
                    };

                    censusTracts[a].properties.name = csvTract.name; //set prop
                    break; //stop looking through json tracts
                };
            };
        };

        //add city boundary to map
        var cityBoundary = map.append("path") //create SVG path element
			.datum(topojson.feature(cityBoundary, cityBoundary.objects.Chicago_City_Boundary_WGS84)) //bind city boundary data to path element
			.attr("class", "cityBoundary") //assign class for styling city
			.attr("d", path); //project data as geometry in svg

        //add tracts to map as enumeration units colored by data
		var censusTracts = map.selectAll(".tracts")
            .data(topojson.feature(censusTracts, censusTracts.objects.Chicago_Census_Tract_Boundaries_WGS84)) //bind tract data to path element
            .enter() //create elements
            .append("path") //append elements to svg
            .attr("class", "tracts") //assign class for additional styling
            .attr("id", function(d) { return d.properties.GEOID })
            .attr("d", path) //project data as geometry in svg
            .style("fill", function(d) { //color enumeration units
                return choropleth(d, recolorMap);
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel)
            .append("desc") //append the current color
                .text(function(d) {
                    return choropleth(d, recolorMap);
                });

        createDropdown(csvData); //create the dropdown menu

    };
};

function createDropdown(csvData){
	//add a select element for the dropdown menu
	var dropdown = d3.select("body")
		.append("div")
		.attr("class","dropdown") //for positioning menu with css
		.html("<h3>Select Variable:</h3>")
		.append("select")
		.on("change", function(){ changeAttribute(this.value, csvData) }); //changes expressed attribute
	
	//create each option element within the dropdown
	dropdown.selectAll("options")
		.data(keyArray)
		.enter()
		.append("option")
		.attr("value", function(d){ return d })
		.text(function(d) {
			// d = d[0].toUpperCase() + d.substring(1,3) + " " + d.substring(3);
			return d
		});
};

function colorScale(csvData){

    //create quantile classes with color scale
    var color = d3.scaleQuantile() //quantile scale generator
        .range([
            "#D4B9DA",
			"#C994C7",
			"#DF65B0",
			"#DD1C77",
			"#980043"
        ]);

    //build array of expressed values for input domain
    var domainArray = [];
    for (var i in csvData){
        domainArray.push(Number(csvData[i][expressed]));
    };

    //for equal-interval scale, use min and max expressed data values as domain
	// color.domain([
	// 	d3.min(csvData, function(d) { return Number(d[expressed]); }),
	// 	d3.max(csvData, function(d) { return Number(d[expressed]); })
    // ]);
    
    //for quantile scale, pass array of expressed values as domain
    color.domain(domainArray);

    return color; //returns the color scale generator
};

function choropleth(d, recolorMap){

    //get data value
    var valeu = d.properties[expressed];
    //if exists, assign it a color; otherwise assign gray
    if (value) {
        return recolorMap(value); //recolorMap holds the colorScale generator
    } else {
        return "#ccc";
    };
};

function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recolor the map
    d3.selectAll(".tracts") //select every tract
        .style("fill", function(d) { //recolor enumeration units
            return choropleth(d, colorScale(csvData)); 
        })
        .select("desc") //replace the color text in each tract's desc element
            .text(function(d) {
                return choropleth(d, colorScale(csvData));
            });
};

function format(value){

    //format the value's display according to the attribute
    if (expressed != "Population"){
        value = "$"+roundRight(value);
    } else {
        value = roundRight(value);
    };
    return value;
};

function roundRight(number){
	
	if (number>=100){
		var num = Math.round(number);
		return num.toLocaleString();
	} else if (number<100 && number>=10){
		return number.toPrecision(4);
	} else if (number<10 && number>=1){
		return number.toPrecision(3);
	} else if (number<1){
		return number.toPrecision(2);
	};
};

function highlight(data){
	
	var props = data.properties; //json properties

	d3.select("#"+props.GEOID) //select the current tract in the DOM
		.style("fill", "#000"); //set the enumeration unit fill to black

	var labelAttribute = "<h1>"+props[expressed]+
		"</h1><br><b>"+expressed+"</b>"; //label content
	var labelName = props.name //html string for name to go in child div
	
	//create info label div
	var infolabel = d3.select("body")
		.append("div") //create the label div
		.attr("class", "infolabel")
		.attr("id", props.GEOID+"label") //for styling label
		.html(labelAttribute) //add text
		.append("div") //add child div for feature name
		.attr("class", "labelname") //for styling name
		.html(labelName); //add feature name to label
};

function dehighlight(data){
	
	var props = data.properties; //json properties
	var tract = d3.select("#"+props.GEOID); //select the current tract
	var fillcolor = tract.select("desc").text(); //access original color from desc
	tract.style("fill", fillcolor); //reset enumeration unit to orginal color
	
	d3.select("#"+props.GEOID+"label").remove(); //remove info label
};

function moveLabel() {
	
	var x = d3.event.clientX+10; //horizontal label coordinate based mouse position stored in d3.event
	var y = d3.event.clientY-75; //vertical label coordinate
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};


//         //translate topoJSON
//         var censusTracts = topojson.feature(censusTracts, censusTracts.objects.Chicago_Census_Tract_Boundaries_WGS84),
//             cityBoundary = topojson.feature(cityBoundary, cityBoundary.objects.Chicago_City_Boundary_WGS84).features;

//         var boundary = map.append("path")
//             .datum(cityBoundary)
//             .attr("class", "boundary")
//             .attr("d", path);

//         //add census tracts to map
//         var tracts = map.selectAll(".tracts")
//             .data(censusTracts)
//             .enter()
//             .append("path")
//             .attr("class", function(d){
//                 return "Tract: " + d.properties.GEOID;
//             })
//             .attr("d", path);
//         };
// };

