titles = data.nodes.title;

var new_sources = [];
var new_targets = [];
var new_xVal = [];
var new_yVal = [];
var new_node_radius = [];
var new_node_colour = [];

//----------------------------------------------------------------------------
//isolate edges conatining group nodes
//----------------------------------------------------------------------------

for(var i = 0; i < sources.length; i++){
  if(options.group_nodes.includes(sources[i])&&options.group_nodes.includes(targets[i])){
      new_sources.push(sources[i]);
      new_targets.push(targets[i]);
  }
}

for(var i = 0; i < data.nodes.id.length; i++){
  if(options.group_nodes.includes(data.nodes.id[i])){
    new_xVal.push(data.nodes.x[i]);
    new_yVal.push(data.nodes.y[i]);
    new_node_radius.push(data.nodes.value[i]);
    new_node_colour.push(data.nodes.year[i]);
  }
}


var last_node_hovered;
var contextNodeId;
var pinned;
var pinnedArray = [];
var colour_by_val = false;
var groupColour = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'];
var nodeTabCount2 = 0;




//----------------------------------------------------------------------------
//Zoom, BG Rect for canvas menu and axes definition
//----------------------------------------------------------------------------

svg.call(d3.zoom().on("zoom", function () {
    canvas.attr("transform", d3.event.transform);
    circles.attr("transform", d3.event.transform);
    lines.attr("transform", d3.event.transform);
}));


var canvas = svg.append('rect')
    .attr('height', height)
    .attr('width', width)
    .style('fill', 'white')
    .style("opacity", 0);

// Add X axis
var x = d3.scaleLinear()
    .domain([Math.min.apply(Math, new_xVal), Math.max.apply(Math, new_xVal)])
    .range([10, width-10]);

// Add Y axis
var y = d3.scaleLinear()
    .domain([Math.min.apply(Math, new_yVal), Math.max.apply(Math, new_yVal)])
    .range([height-10, 10]);


var node_size_transform = d3.scaleLinear()
    .domain([Math.min.apply(Math, new_node_radius), Math.max.apply(Math, new_node_radius)])
    .range([3, 8]);

var node_colour_transform = d3.scaleLinear()
    .domain([Math.min.apply(Math, new_node_colour), Math.max.apply(Math, new_node_colour)])
    .range(['#f1a340', '#998ec3']);

//----------------------------------------------------------------------------
//draw edges
//----------------------------------------------------------------------------
svg.selectAll("line").remove();
for (var i = 0; i < new_sources.length; i++) {
    svg.append('line')
        .attr("x1", x(new_xVal[options.group_nodes.indexOf(new_sources[i])]))
        .attr("y1", y(new_yVal[options.group_nodes.indexOf(new_sources[i])]))
        .attr("source", new_sources[i])
        .attr("x2", x(new_xVal[options.group_nodes.indexOf(new_targets[i])]))
        .attr("y2", y(new_yVal[options.group_nodes.indexOf(new_targets[i])]))
        .attr("target", new_targets[i])
        .style("stroke", "lightgreen")
        .style("stroke-width", 2)
        .attr("stroke-opacity", 0.2);
}

for (var i = 0; i < options.group_nodes.length; i++) {
    pinnedArray[i] = "false";
}





//----------------------------------------------------------------------------
//draw nodes
//----------------------------------------------------------------------------

svg.selectAll('circle').remove();
svg.selectAll('circle')
      .data(options.group_nodes)
      .enter().append('circle')
      .attr('cx', function (d, i) {
          return x(new_xVal[i]);
       })
      .attr('cy', function (d, i) {
          return y(new_yVal[i]);
      })
      .attr('r', function (d, i) {
          return node_size_transform(new_node_radius[options.group_nodes.indexOf(d)]);
      })
      .attr('id', function (d, i) {
          return d;
      })
      .attr('pinned', false)
      .style('fill', function (d, i) {
         return node_colour_transform(new_node_colour[options.group_nodes.indexOf(d)]);
      }).style('opacity', 1);


var circles = svg.selectAll('circle');
var lines = svg.selectAll('line');

var outgoing_edges;
var incoming_edges;

//----------------------------------------------------------------------------
// Function for mouse over on nodes - Highlight colour of node and its links
//----------------------------------------------------------------------------
circles.on('mouseover', function (d) {
    d3.select(this)
        .style('fill', 'orange');

    outgoing_edges = lines.filter(function () {
        return d3.select(this).attr("x1") == x(new_xVal[options.group_nodes.indexOf(d)]); // filter by single attribute
    });

    outgoing_edges.style("stroke", "orange").attr("stroke-opacity", 1);

    incoming_edges = lines.filter(function () {
        return d3.select(this).attr("x2") == x(new_xVal[options.group_nodes.indexOf(d)]); // filter by single attribute
    });

    incoming_edges.style("stroke", "pink").attr("stroke-opacity", 1);


    last_node_hovered = d3.select(this).attr("id");

})

//----------------------------------------------------------------------------
// Function for mouse out on nodes - un - highlight colour of node and its links
//----------------------------------------------------------------------------
circles.on('mouseout', function (d) {
    if (d3.select(this).attr("pinned") == "true") {
        d3.select(this).style('fill', 'red');
    } else {
        d3.select(this)
            .style('fill', function (d, i) {
                  return node_colour_transform(new_node_colour[options.group_nodes.indexOf(d)]);
            }).style('opacity', 1);
    }

    outgoing_edges = lines.filter(function () {
        return d3.select(this).attr("x1") == x(new_xVal[options.group_nodes.indexOf(d)]); // filter by single attribute
    });

    outgoing_edges.style("stroke", "lightgreen").attr("stroke-opacity", 0.2);

    incoming_edges = lines.filter(function () {
        return d3.select(this).attr("x2") == x(new_xVal[options.group_nodes.indexOf(d)]); // filter by single attribute
    });

    incoming_edges.style("stroke", "lightgreen").attr("stroke-opacity", 0.2);
})

//----------------------------------------------------------------------------
// What fresh hell is this - Context Menus
//----------------------------------------------------------------------------


var nodeMenu = [
    {
        title: 'Hide node',
        action: function (d) {
            var hide_node = circles.filter(function () {
                return d3.select(this).attr("id") == contextNodeId;
            });
            hide_node.style("visibility", "hidden");

            var hide_outgoing_links = lines.filter(function () {
                return d3.select(this).attr("source") == contextNodeId;
            });
            hide_outgoing_links.style("visibility", "hidden");

            var hide_incoming_links = lines.filter(function () {
                return d3.select(this).attr("target") == contextNodeId;
            });
            hide_incoming_links.style("visibility", "hidden");

        }
    },
    {
        title: 'Pin/Unpin node',
        action: function (d) {

            var pin_node = circles.filter(function () {
                return d3.select(this).attr("id") == contextNodeId;
            });

            if (pinnedArray[options.group_nodes.indexOf(contextNodeId)] == "true") {
                pin_node.attr("pinned", false)
                    .attr('r', function (d, i) {
                        return node_size_transform(new_node_radius[options.group_nodes.indexOf(contextNodeId)]);
                    })
                    .style("fill", "green");
                pinnedArray[options.group_nodes.indexOf(contextNodeId)] = "false";
            } else {
                pin_node.attr("pinned", true)
                    .attr('r', function (d, i) {
                        return node_size_transform(new_node_radius[options.group_nodes.indexOf(contextNodeId)]) + 2;
                    })
                    .style("fill", "red");

                pinnedArray[options.group_nodes.indexOf(contextNodeId)] = "true"
            }

        }
    },
    {
        title: 'Explore node',
        action: function() {
          
          nodeTabCount2++;
          Shiny.setInputValue("nodeToExpl", contextNodeId, {priority: "event"});
          Shiny.setInputValue("openNodeTab", nodeTabCount2);
        }
    }
];

var canvasMenu = [
    {
        title: 'Unpin all pinned nodes',
        action: function (d) {
            var pinned_nodes = circles.filter(function () {
                return d3.select(this).attr("pinned") == "true";
            });
            pinned_nodes.attr('pinned', false)
                .attr('r', 5)
                .style("fill", "green");
        }
    },
    {
        title: 'Show all hidden nodes',
        action: function (d) {
            var hide_node = circles.filter(function () {
                return d3.select(this).style("visibility") == "hidden";
            });
            hide_node.style("visibility", "visible");

            var hide_outgoing_links = lines.filter(function () {
                return d3.select(this).style("visibility") == "hidden";
            });
            hide_outgoing_links.style("visibility", "visible");

            var hide_incoming_links = lines.filter(function () {
                return d3.select(this).style("visibility") == "hidden";
            });
            hide_incoming_links.style("visibility", "visible");

        }
    }
];


d3.contextMenu = function (menu, openCallback) {



    // create the div element that will hold the context menu
    d3.selectAll('.d3-context-menu').data([1])
        .enter()
        .append('div')
        .attr('class', 'd3-context-menu');

    // close menu
    d3.select('body').on('click.d3-context-menu', function () {
        d3.select('.d3-context-menu').style('display', 'none');

    });

    // this gets executed when a contextmenu event occurs
    return function (data, index) {
        var elm = this;

        d3.selectAll('.d3-context-menu').html('');
        var list = d3.selectAll('.d3-context-menu').append('ul');
        list.selectAll('li').data(menu).enter()
            .append('li')
            .html(function (d) {
                return d.title;
            })
            .on('click', function (d, i) {
                d.action(elm, data, index);
                d3.select('.d3-context-menu').style('display', 'none');
            });

        // the openCallback allows an action to fire before the menu is displayed
        // an example usage would be closing a tooltip
        if (openCallback) openCallback(data, index);

        // display context menu
        d3.select('.d3-context-menu')
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
            .style('display', 'block');

        d3.event.preventDefault();
    };
};

circles.on('contextmenu', d3.contextMenu(nodeMenu, function (d) {
        contextNodeId = d;
}));


svg.selectAll('rect').on('contextmenu', d3.contextMenu(canvasMenu));

//----------------------------------------------------------------------------
// Details on right clicked node
//----------------------------------------------------------------------------

clicked_node = circles.on('click', function () {
    Shiny.setInputValue(
        "node_title",
        data.nodes.title[data.nodes.id.indexOf(last_node_hovered)],
        { priority: "event" }
    );
    Shiny.setInputValue(
        "node_abstract",
        data.nodes.abstract[data.nodes.id.indexOf(last_node_hovered)],
        { priority: "event" }
    );
    Shiny.setInputValue(
        "node_venue",
        data.nodes.venue[data.nodes.id.indexOf(last_node_hovered)],
        { priority: "event" }
    );
});

//----------------------------------------------------------------------------
// Legends for overview
//---------------------------------------------------------------------------- 






    // Create the scale
    var x_colourBarContainer = d3.scalePoint()
        .domain([Math.min.apply(Math, new_node_colour), Math.max.apply(Math, new_node_colour)])
        .range([650, 800]);       // This is where the axis is placed: from 100px to 800px


    var defs = svg.append("defs");
    var linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    //Set the color for the start (0%)
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f1a340");

    //Set the color for the end (100%)
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#998ec3");

    svg.attr("transform", "translate(0,50)")      // This controls the vertical position of the Axis
        .call(d3.axisBottom(x_colourBarContainer))
        .attr('id', 'colorBox')
        .attr("x", "600px")
        .attr("y", "50px")
        .style("fill", "url(#linear-gradient)");


