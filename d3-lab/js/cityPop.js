/* Javascript by Todd Burciaga, 2020 */

// execute script when window is loaded
window.onload = function(){

    //SVG dimension variables
    var w = 900, h = 500
    
    // container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //assign a class as the block name for styling and future selection
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

    //inner rectangle block
    var innerRect = container.append("rect") // put a new rect in the svg
        .datum(400) //single value is a datum
        .attr("width", function(d){ //rectangle width
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function(d){ // rectanlge height
            return d //400
        }) 
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x axis
        .attr("y", 50) //position from top on the y axis
        .style("fill", "#FFFFFF"); //fill color

    var dataArray = [10, 20, 30, 40, 50];

    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    //find the minimum value of the array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //color scale generator
    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])
        .domain([
            minPop,
            maxPop
        ]);

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50]) //changed from 440, 95
        .domain([ //was minPop, maxPop
            0,
            700000
        ]);

    //scale for circles center x coordinate
    var x = d3.scaleLinear()  //create the scale
        .range([90, 810]) //output min and max
        .domain([0, 3]); //input min and max
        
    //create circles
    var circles = container.selectAll(".circles") //create an empty selection
        .data(cityPop) //feed in the array
        .enter()
        .append("circle") //inspect the HTML
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){
            //calculate the radius based on population value as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){
            //use the scale generator with the index to place each circle horizontally
            return x(i);
        })
        .attr("cy", function(d){
            //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
            return y(d.population)
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.population);
        })
        .style("stroke", "#000"); //black circle stroke

    //create y axis generator
    var yAxis = d3.axisLeft(y)
        .scale(y);
        // .orient("left");

    //create axis g element and add axis
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    //create a title
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    //create circle labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        // .attr("x", function(d,i){
        //     //horizontal position to the right of each circle
        //     return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        // })
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population) - 5;
        // })
        // .text(function(d){
        //     return d.city + ", Pop. " + d.population;
        });

    //first line of each label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    //create format generator
    var format = d3.format(",");

    //second line of each label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "20") //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population); //use format generator to format numbers
        });
};