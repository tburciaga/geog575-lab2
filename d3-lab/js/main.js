/* Javascript by Todd Burciaga, 2020 */

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/Census_Data.csv") //load attributes from csv
        .defer(d3.json, "data/Census_Tracts.topojson") //load choropleth spatial data
        .defer(d3.json, "data/City_Boundary.topojson") //load city boundary
        .await(callback);

    function callback(error, csvData, censusTracts, cityBoundary){
        //translate topoJSON
        var censusTracts = topojson.feature(censusTracts, censusTracts.objects.Chicago_Census_Tract_Boundaries_WGS84),
            cityBoundary = topojson.feature(cityBoundary, cityBoundary.objects.Chicago_City_Boundary_WGS84).features;

        //examine the results
        console.log(censusTracts);
        console.log(cityBoundary); 
    };
};

