/* Javascript by Todd Burciaga, 2020 */

//anonymous function wrapper to move all to local scope
(function(){
    
    //psuedo-global variables
    //variables for data join
    var attrArray = ["TOTAL_POPULATION", "MEDIAN_AGE", "PCT_POVERTY", "PCT_HSNGCSTS_OVR_50_PCT", "PCT_OVR_25_HGHSCL_CMPLT", "PCT_OVR_25_BCHLRS_CMPLT", "PCT_UNEMPLOYED"];
    var attrArrayGroup = ["TOTAL_POPULATION", "MEDIAN_AGE", "PCT_POVERTY", "PCT_HSNGCSTS_OVR_50_PCT", "PCT_OVR_25_HGHSCL_CMPLT", "PCT_OVR_25_BCHLRS_CMPLT", "PCT_UNEMPLOYED"];
    // var attrArrayGroup = ["Total Population", "Median Age", "% Poverty", "% Housing Costs > 50% Income", "% > 25 High School Complete", "% > 25 Bachelors Complete", "% Unemployed"];
    var expressed = attrArray[0]; //initial attribute
    var expressedGroup = attrArrayGroup[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 790,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 550000]);


    //begin script when window loads
    window.onload = setMap()

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 790;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create conic conformal projection centered on Chicago
        var projection = d3.geoConicConformal()
            .center([-.08, 41.84])
            .rotate([87.61, 0.00, 0])
            .parallels([29.27, 74.72])
            .scale(120000.00)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use d3.queue to parallelize asychronous data loading
        d3.queue()
            .defer(d3.csv, "data/Census_Data.csv") //load attributes from csv
            .defer(d3.csv, "data/Community_Census_Data.csv") //load aggregated census data from csv
            //.defer(d3.json, "data/City_Boundary.topojson") //load background spatial data
            .defer(d3.json, "data/LakeMichigan.topojson") //load background spatial data
            .defer(d3.json, "data/Census_Tracts.topojson") //load choropleth spatial data
            .defer(d3.json, "data/CommunityArea_Groups.topojson") //load community area groups (sides)
            .await(callback);

        //callback function
        function callback(error, csvData, csvDataGroup, /*chicago,*/ lakemichigan, tracts, communitygroups){
            
            //translate Chicago data TopoJSON back to geoJSON
            var /*chicagoBoundary = topojson.feature(chicago, chicago.objects.Chicago_City_Boundary_WGS84),*/
                lakeMichigan = topojson.feature(lakemichigan, lakemichigan.objects.LakeMichiganWGS84),
                censusTracts = topojson.feature(tracts, tracts.objects.Chicago_Census_Tract_Boundaries_WGS84).features,
                communityGroups = topojson.feature(communitygroups, communitygroups.objects.Chicago_CommunityArea_Groups_WGS84).features;

            // var cityBoundary = map.append("path")
            //     .datum(chicagoBoundary)
            //     .attr("class", "cityBoundary")
            //     .attr("d", path);

            // join csv data to GeoJSON tract and community group enumeration units
            censusTracts = joinData(censusTracts, csvData);
            communityGroups = joingroupData(communityGroups, csvDataGroup);

            //create the color scale
            var colorScale = makeColorScale(csvData);
            var colorScaleGroup = makeColorScale(csvDataGroup);

            // add tract enumeration units to the map
            setEnumerationUnits(censusTracts, colorScale, map, path);

            // add community area enumeration units to the map
            setEnumerationUnitsGroups(communityGroups, colorScaleGroup, map, path)

            // add background data
            setBackgroundData(/*chicagoBoundary, */lakeMichigan, map, path);

            // // add coordinated visualization to the map
            // setChart(csvData, colorScale);

            // add coordinated visualization from community areas to the map
            setChartGroup(csvDataGroup, colorScaleGroup)

            // var lakeMichigan = map.append("path")
            //     .datum(lakeMichigan)
            //     .attr("class", "lakeMichigan")
            //     .attr("d", path);

            // //add census tract boundaries to map
            // var tractBoundaries = map.selectAll(".tracts")
            //     .data(censusTracts)
            //     .enter()
            //     .append("path")
            //     .attr("class", function(d){
            //         return "tracts " + d.properties.GEOID;
            //     })
            //     .attr("d", path);

            // //variables for data join
            // var attrArray = ["TOTAL_POPULATION", "MEDIAN_AGE", "PCT_POVERTY", "PCT_HSNGCSTS_OVR_50_PCT", "PCT_OVR_25_HGHSCL_CMPLT", "PCT_OVR_25_BCHLRS_CMPLT", "PCT_UNEMPLOYED"];

            // //loop through csv to assign each set of csv attribute values to geojson tract
            // for (var i=0; i<csvData.length; i++){
            //     var csvTract = csvData[i]; //the current tract
            //     var csvKey = csvTract.GEOID; //the CSV primary key

            //     //loop through geojson tracts to find correct tract
            //     for (var a=0; a<censusTracts.length; a++){

            //         var geojsonProps = censusTracts[a].properties; //the current tract geojson properties
            //         var geojsonKey = geojsonProps.GEOID; //the geojson primary key

            //         //where primary keys match, transfer csv data to geojson properties object
            //         if (geojsonKey == csvKey){

            //             //assign all attributes and values
            //             attrArray.forEach(function(attr){
            //                 var val = parseFloat(csvTract[attr]); //get csv attribute value
            //                 geojsonProps[attr] = val; //assign attribute and value to geojson properties
            //             });
            //         };
            //     };
            // };

            // //examine the results
            // console.log(chicagoBoundary);
            // console.log(censusTracts);
            // console.log(error);
            // console.log(csvData);
            // console.log(chicago);
            // console.log(tracts);

            createDropdown()

            setLabel()

        };
    };

    //join census data to census tracts
    function joinData(censusTracts, csvData){
    //loop through csv to assign each set of csv attribute values to geojson tract
        for (var i=0; i<csvData.length; i++){
            var csvTract = csvData[i]; //the current tract
            var csvKey = csvTract.GEOID; //the CSV primary key

            //loop through geojson tracts to find correct tract
            for (var a=0; a<censusTracts.length; a++){

                var geojsonProps = censusTracts[a].properties; //the current tract geojson properties
                var geojsonKey = geojsonProps.GEOID; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvTract[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return censusTracts;
    };

    //join census data to community areas
    function joingroupData(communityGroups, csvDataGroup){
    //loop through csv to assign each set of csv attribute values to geojson community area
        for (var i=0; i<csvDataGroup.length; i++){
            var csvGroup = csvDataGroup[i]; //the current community area
            var csvKey = csvGroup.SIDES; //the CSV primary key

            //loop through geojson tracts to find correct community area
            for (var a=0; a<communityGroups.length; a++){

                var geojsonProps = communityGroups[a].properties; //the current community area geojson properties
                var geojsonKey = geojsonProps.SIDES; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArrayGroup.forEach(function(attr){
                        var val = parseFloat(csvGroup[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return communityGroups;
    };

    // add census tract boundaries
    function setEnumerationUnits(censusTracts, colorScale, map, path){
        //add census tract boundaries to map
            //below Example 2.2 line 16...add style descriptor to each path
        var desc = censusTracts.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
            
        var tractBoundaries = map.selectAll(".tracts")
            .data(censusTracts)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "tracts " + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            }); 
    };

    // add community area boundaries
    function setEnumerationUnitsGroups(communityGroups, colorScaleGroup, map, path){
        //add census tract boundaries to map
        var communityareaGroups = map.selectAll(".communitygroups")
            .data(communityGroups)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "Area " + d.properties.SIDES;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScaleGroup);
            })
            .style("stroke-width", "3px")
            .style("stroke", "#000")
            .style("fill-opacity", 0)
            .on("mouseover", function(d){
                highlight(d.properties)
            .on("mouseout", dehighlight);
            })
            .on("mousemove", moveLabel);
            
            // .style("fill", function(d){
            //     return choropleth(d.properties, colorScale);
            // }); 
    };

    // add background data
    function setBackgroundData(/*cityBoundary, */lakeMichigan, map, path){
        var lakeMichigan = map.append("path")
            .datum(lakeMichigan)
            .attr("class", "lakeMichigan")
            .attr("d", path);

        // var cityBoundary = map.append("path")
        //     .datum(cityBoundary)
        //     .attr("class", "cityBoundary")
        //     .attr("d", path);
    //return lakeMichigan, cityBoundary;

    };

    // color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#f2f0f7",
            "#cbc9e2",
            "#9e9ac8",
            "#756bb1",
            "#54278f",
        ];

        // //create color scale generator
        // var colorScale = d3.scaleQuantile()
        //     .range(colorClasses);
 
        //create color scale generator
        var colorScale = d3.scaleThreshold()
        .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        // //build two-value array of minimum and maximum expressed attribute values
        // var minmax = [
        //     d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        //     d3.max(data, function(d) { return parseFloat(d[expressed]); })
        // ];

        // EQUAL INTERVAL COLOR SCALE GENERATOR   
        // //assign two-value array as scale domain
        // colorScale.domain(minmax);

        // //build array of all values of the expressed attribute
        // var domainArray = [];
        // for (var i=0; i<data.length; i++){
        //     var val = parseFloat(data[i][expressed]);
        //     domainArray.push(val);
        // };

        // //assign array of expressed values as scale domain
        // colorScale.domain(domainArray);
       
        // //check the class breaks that the scale creates
        //console.log(colorScale.quantiles())
       
        return colorScale;

    };

    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    // // create coordinated bar chart
    // function setChart(csvData, colorScale){
    //     //chart frame dimensions
    //     var chartWidth = window.innerWidth * 0.425,
    //         chartHeight = 790;

    //     var yScale = d3.scaleLinear()
    //         .range([0, chartHeight])
    //         .domain([0, 105]);
    
    //     //create a second svg element to hold the bar chart
    //     var chart = d3.select("body")
    //         .append("svg")
    //         .attr("width", chartWidth)
    //         .attr("height", chartHeight)
    //         .attr("class", "chart");

    //      //Example 2.4 line 8...set bars 
    //     var bars = chart.selectAll(".bars")
    //         .data(csvData)
    //         .enter()
    //         .append("rect")
    //         .attr("class", function(d){
    //             return "bars " + d.GEOID;
    //         })
    //         .attr("width", chartWidth / csvData.length - 1)
    //         .attr("x", function(d, i){
    //             return i * (chartWidth / csvData.length);
    //         })
    //         .attr("height", function(d){
    //             return yScale(parseFloat(d[expressed]));
    //         })
    //         .attr("y", function(d){
    //             return chartHeight - yScale(parseFloat(d[expressed]));
    //         })
    //         .style("fill", function(d){
    //             return choropleth(d, colorScale);
    //         });

    //     // //set bars for each tract
    //     // var bars = chart.selectAll(".bars")
    //     //     .data(csvData)
    //     //     .enter()
    //     //     .append("rect")
    //     //     .attr("class", function(d){
    //     //         return "bars " + d.GEOID;
    //     //     })
    //     //     .attr("width", chartWidth / csvData.length - 1)
    //     //     .attr("x", function(d, i){
    //     //         return i * (chartWidth / csvData.length);
    //     //     })
    //     //     .attr("height", function(d){
    //     //         return yScale(parseFloat(d[expressed]));
    //     //     })
    //     //     .attr("y", function(d){
    //     //         return chartHeight - yScale(parseFloat(d[expressed]));
    //     //     });
    // };



    // create coordinated bar chart for group areas
    function setChartGroup(csvDataGroup, colorScaleGroup){
       
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //Set bars for each community area
        var bars = chart.selectAll(".bars")
            .data(csvDataGroup)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.SIDES;
            })
            .attr("width", chartInnerWidth / csvDataGroup.length - 1)
            .style("fill", function(d){
                return choropleth(d, colorScaleGroup)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
            });

        //add chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressedGroup + " in each community area: ")

        //add bar annotation
        var numbers = chart.selectAll(".numbers")
            .data(csvDataGroup)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.SIDES;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvDataGroup.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressedGroup])) + 15;
            })
            .text(function(d){
                return d[expressedGroup];
            });
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)
            //.orient("left");

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // //set bars for each tract
        // var bars = chart.selectAll(".bars")
        //     .data(csvData)
        //     .enter()
        //     .append("rect")
        //     .attr("class", function(d){
        //         return "bars " + d.GEOID;
        //     })
        //     .attr("width", chartWidth / csvData.length - 1)
        //     .attr("x", function(d, i){
        //         return i * (chartWidth / csvData.length);
        //     })
        //     .attr("height", function(d){
        //         return yScale(parseFloat(d[expressed]));
        //     })
        //     .attr("y", function(d){
        //         return chartHeight - yScale(parseFloat(d[expressed]));
        //     });
    };

//function to create a dropdown menu for attribute selection
    function createDropdown(csvDataGroup){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvDataGroup)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArrayGroup)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change listener handler
    function changeAttribute(attribute, csvDataGroup){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvDataGroup);

        //recolor enumeration units
        var tracts = d3.selectAll(".tracts")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

         //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, csvDataGroup.length, colorScaleGroup);
            // .attr("x", function(d, i){
            //     return i * (chartInnerWidth / csvDataGroup.length) + leftPadding;
            // })
            // //resize bars
            // .attr("height", function(d, i){
            //     return 463 - yScale(parseFloat(d[expressed]));
            // })
            // .attr("y", function(d, i){
            //     return yScale(parseFloat(d[expressed])) + topBottomPadding;
            // })
            // //recolor bars
            // .style("fill", function(d){
            //     return choropleth(d, colorScale);
    };


    function updateChart(bars, n, colorScaleGroup){
        //position bars
        bars.attr("x", function(d, i){
            return i * (chartInnerWidth / csvDataGroup.length) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            // console.log(yScale(parseFloat(d[expressedGroup])))
            return yScale(parseFloat(d[expressedGroup]));
        })
        .attr("y", function(d, i){
            // console.log(yScale(parseFloat(d[expressedGroup])))
            // console.log(parseFloat(d[expressedGroup]))
            // console.log(chartHeight - yScale(parseFloat(d[expressedGroup])))
            return chartHeight - yScale(parseFloat(d[expressedGroup])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " in each community area");
    };

    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.SIDES)
            .style("stroke", "white")
            .style("stroke-width", "2");
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.SIDES)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            })
            //below Example 2.4 line 21...remove info label
            d3.select(".infolabel")
            .remove();
            

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    };

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.SIDES + "_label")
            .html(labelAttribute);

        var tractName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.SIDES);
    };

    //function to move info label with mouse
    function moveLabel(){
        //use coordinates of mousemove event to set label coordinates
        var x = d3.event.clientX + 10,
            y = d3.event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    //Example 2.8 line 1...function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

})();

/*
//create global variables array
var keyArray = ["TOTAL_POPULATION","MEDIAN_AGE","PCT_POVERTY","PCT_HSNGCSTS_OVR_50_PCT","PCT_OCR_25_HGHSCL_CMPLT","PCT_OVR_25_BCHLRS_CMPLT","PCT_UNEMPLOYED"];
var expressed = keyArray[0];

window.onload = initialize(); //start script after HTML loaded

function initialize(){ //the first function called
    setMap();
};

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 860;

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
    var projection = d3.geoConicConformal()
        .center([-.08, 41.84])
        .rotate([87.61, 0.00, 0])
        .parallels([29.27, 74.72])
        .scale(120000.00)
        .translate([width / 2, height / 2]);
    // var projection = d3.geoAlbers()
    //     .center([5.95, 41.89])
    //     .rotate([93.63, 0.00, 0])
    //     .parallels([29.27, 74.72])
    //     .scale(50000.00)
    //     .translate([width / 2, height / 2]);

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
*/
