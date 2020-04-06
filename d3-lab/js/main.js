/* Javascript by Todd Burciaga, 2020 */

//anonymous function wrapper to move all to local scope
(function(){
    
    //psuedo-global variables for data join
    var attrArray = ["TOTAL_POPULATION", "MEDIAN_AGE", "PCT_POVERTY", "PCT_HSNGCSTS_OVR_50_PCT", "PCT_OVR_25_HGHSCL_CMPLT", "PCT_OVR_25_BCHLRS_CMPLT", "PCT_UNEMPLOYED"];
    var expressed = attrArray[0]; //first attribute
 
    //map frame dimensions
    var mapWidth = window.innerWidth * 0.5,
        mapHeight = 790;

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 790,
        margin = 60,
        leftPadding = 60,
        rightPadding = 2,
        topPadding = 10,
        topBottomPadding = 0,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, 10000]);  // first attribute maxes under 10000
    
    // begin script when window loads
    window.onload = setMap()

    // set up choropleth map
    function setMap(){

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight);

        //create conic conformal projection centered on Chicago
        var projection = d3.geoConicConformal()
            .center([-.08, 41.84])
            .rotate([87.61, 0.00, 0])
            .parallels([29.27, 74.72])
            .scale(120000.00)
            .translate([mapWidth / 2, mapHeight / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use d3.queue to parallelize asychronous data loading
        d3.queue()
            .defer(d3.csv, "data/CensusData.csv") //load attributes from csv
            .defer(d3.json, "data/LakeMichigan.topojson") //load background spatial data
            .defer(d3.json, "data/CensusTracts.topojson") //load choropleth spatial data
            .await(callback);

        //callback function
        function callback(error, csvData, lakeMichigan, censusTracts){
            
            //translate TopoJSON back to geoJSON
            var lakeMichigan = topojson.feature(lakeMichigan, lakeMichigan.objects.LakeMichiganWGS84),
                censusTracts = topojson.feature(censusTracts, censusTracts.objects.Chicago_Census_Tracts_WGS84).features;

            // join csv data to GeoJSON tract and community tract enumeration units
            censusTracts = joinData(censusTracts, csvData);

            // create the color scale
            var colorScale = makeColorScale(csvData);

            // add tract enumeration units to the map
            setEnumerationUnits(censusTracts, colorScale, map, path);

            // add background data
            setBackgroundData(lakeMichigan, map, path);

            // create chart
            setChart(csvData, colorScale)
            
            // call drop-down creation function
            createDropdown(csvData)

            // call label creation function
            setLabel(csvData)

            // console.log(censusTracts);

        };
    };

    // join census data to census tracts
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

    // add background data
    function setBackgroundData(lakeMichigan, map, path){
        var lakeMichigan = map.append("path")
            .datum(lakeMichigan)
            .attr("class", "lakeMichigan")
            .attr("d", path);
    };

    // add census tract boundaries
    function setEnumerationUnits(censusTracts, colorScale, map, path){
       
        //add census tract boundaries to map
        var censusTracts = map.selectAll(".tracts")
            .data(censusTracts)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "tracts " + d.properties.GEOID;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        //add style descriptor to each path
        var desc = censusTracts.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    };

    // color scale generator
    function makeColorScale(data){
        // blue yellow color classes
        var colorClasses = [
            "#ffffcc",
            "#a1dab4",
            "#41b6c4",
            "#2c7fb8",
            "#253494"
        ];

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
       
        return colorScale;

    };

    // function to test for data value and return color
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

    // create coordinated bar chart
    function setChart(csvData, colorScale){

        // var domainArray = [];
        // for (var i=0; i<csvData.length; i++){
        //     var val = parseFloat(csvData[i][expressed]);
        //     domainArray.push(val);
        // };        

        // var yScale = d3.scaleLinear()
        //     .range([0, chartHeight])
        //     .domain([d3.max(csvData, function(d) { return parseFloat(d[expressed]); }), 0]);
    
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

        
         //Example 2.4 line 8...set bars 
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.GEOID;
            })
            .attr("width", chartInnerWidth / csvData.length)
            // .attr("x", function(d, i){
            //     return i * (chartInnerWidth / csvData.length) + leftPadding;
            // })
            // .attr("height", function(d){
            //     return yScale(parseFloat(d[expressed]));
            // })
            // .attr("y", function(d){
            //     return chartHeight - yScale(parseFloat(d[expressed]));
            // })
            // .style("fill", function(d){
            //     return choropleth(d, colorScale)
            // })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);

        //add style descriptor to each bar
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');



        // //add bar annotation
        // var numbers = chart.selectAll(".numbers")
        //     .data(csvData)
        //     .enter()
        //     .append("text")
        //     .sort(function(a, b){
        //         return b[expressed]-a[expressed]
        //     })
        //     .attr("class", function(d){
        //         return "numbers " + d.SIDES;
        //     })
        //     .attr("text-anchor", "middle")
        //     .attr("x", function(d, i){
        //         var fraction = chartWidth / csvData.length;
        //         return i * fraction + (fraction - 1) / 2;
        //     })
        //     .attr("y", function(d){
        //         return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        //     })
        //     .text(function(d){
        //         return d[expressed];
        //     });
       
        //add chart title
        var chartTitle = chart.append("text")
            .attr("x", 80)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " per tract");
      
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)

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

        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);

    };        

    // function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        
        // I HAVE NO IDEA WHY THIS WOULD BE NECESSARY
        // BUT IT WAS PART OF DEBUGGING SOLUTION
        var csvData = csvData
        
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    // dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //this changes the yscale when the attribute is changed
        csvmax = d3.max(csvData, function (d) { return parseFloat(d[expressed]); });

        yScale = d3.scaleLinear()
            .range([chartHeight - 10, 0])
            .domain([0, csvmax*1.1]);

        //update vertical axis
        d3.select(".axis").remove();
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = d3.select(".chart")
            .append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis)

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var tracts = d3.selectAll(".tracts")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

         //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale)
    };

    // update chart after attribute change
    function updateChart(bars, n, colorScale){
        // position bars
        bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        // size/resize bars
        .attr("height", function(d, i){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        // add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " per tract");
    };

    // function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.GEOID)
            .style("stroke", "white")
            .style("stroke-width", "2");

        setLabel(props);
    };

    // function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.GEOID)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

            // remove info label
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

    // create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div") // create label div
            .attr("class", "infolabel")
            .attr("id", props.GEOID + "label") // to style label
            .html(labelAttribute)

        var tractName = infolabel.append("div")
            .attr("class", "labelname") //for styling name
            .html(props.name); //add feature name to label

        // var tractName = infolabel.append("div")
        //     .attr("class", "labelname")
        //     .html(props.GEOID);
    };

    // move info label with mouse
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