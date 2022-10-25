
xVal = data.nodes.x;
yVal = data.nodes.y;
titles = data.nodes.title;
sources = data.edges.from;
targets = data.edges.to;
node_radius_values = data.nodes.value;
node_colour_values = data.nodes.year;
node_groups = data.nodes.group;
unique_groups = node_groups.filter((item, i, ar) => ar.indexOf(item) === i).sort(function (a, b) { return a - b });

centroid_nodes_x = data.centroid_nodes.x
centroid_nodes_y = data.centroid_nodes.y
centroid_nodes_label = data.centroid_nodes.label



var last_node_hovered;
var contextNodeId;
var pinned;
var pinnedArray = [];
var colour_by_val = false;
var groupColour = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'];
var clusterTabCount = 0;
var nodeTabCount = 0;
var zoomscale = 0;

var scaleX  = d3.scaleLinear().domain([0, width/2])
    .range([0, width * zoomscale]);

var scaleY = d3.scaleLinear().domain([0, height/2])
    .range([0, height * zoomscale]);


//----------------------------------------------------------------------------
//Zoom, BG Rect for canvas menu and axes definition
//----------------------------------------------------------------------------


var canvas = svg.append('rect')
    .attr('height', height)
    .attr('width', width)
    .style('fill', 'white')
    .style("opacity", 0);

// Add X axis
var x = d3.scaleLinear()
    .domain([-2.8, 2.8])
    .range([0, width]);

// Add Y axis
var y = d3.scaleLinear()
    .domain([-4, 5])
    .range([height, 0]);

var node_size_transform = d3.scaleSqrt()
    .domain([Math.min.apply(Math, node_radius_values), Math.max.apply(Math, node_radius_values)])
    .range([2, 6]);

var node_colour_transform = d3.scaleLinear()
    .domain([Math.min.apply(Math, node_colour_values), Math.max.apply(Math, node_colour_values)])
    .range(['#f1a340', '#998ec3']);


svg.call(d3.zoom().on("zoom", function () {
  console.log(d3.event);
   zoomscale = d3.event.transform.k;
    canvas.attr("transform", d3.event.transform);
    circles.attr("transform", d3.event.transform);
    annotations.attr("transform", d3.event.transform);
    node_titles.attr("transform",d3.event.transform);
    
    circles.each(function() {
      d3.select(this).attr("r", d3.select(this).attr("radius")*4/d3.event.transform.k);
    });
    
    lines.attr("transform", d3.event.transform);
    
    lines.each(function() {
        d3.select(this).style("stroke-width", 1/d3.event.transform.k); 
      });
      
    node_titles.each(function() {
      if(d3.event.transform.k>5){
        d3.select(this).style("font-size",(1/d3.event.transform.k)*15); 
        
      }else{
        d3.select(this).style("font-size",h(d3.event.transform.k));// 5*(1/15*d3.event.transform.k)); 
      }
  });
      annotations.each(function() {
      if(d3.event.transform.k>10){
        d3.select(this).style("font-size",0); 
      }else{
        
        d3.select(this).style("font-size",15*(1/d3.event.transform.k)); 
        
      }

  });
  
  if(d3.event.sourceEvent.type="wheel"){
    console.log(scaleX(0-d3.event.transform.x) + "  .. " + scaleX(-d3.event.transform.x+width));
    moveBrush(scaleX.invert(-d3.event.transform.x),scaleY.invert(-d3.event.transform.y), 
                scaleX.invert(-d3.event.transform.x+width), scaleY.invert(-d3.event.transform.y+height));
  }
      
  
}));

//----------------------------------------------------------------------------
//draw edges
//----------------------------------------------------------------------------
svg.selectAll("line").remove();
for (var i = 0; i < sources.length; i++) {
    svg.append('line')
        .attr("x1", x(xVal[data.nodes.id.indexOf(sources[i])]))
        .attr("y1", y(yVal[data.nodes.id.indexOf(sources[i])]))
        .attr("source", sources[i])
        .attr("x2", x(xVal[data.nodes.id.indexOf(targets[i])]))
        .attr("y2", y(yVal[data.nodes.id.indexOf(targets[i])]))
        .attr("target", targets[i])
        .style("stroke", "lightgreen")
        .style("stroke-width", 1)
        .attr("stroke-opacity", 0.1);
}

for (var i = 0; i < data.nodes.id.length; i++) {
    pinnedArray[i] = "false";
}





//----------------------------------------------------------------------------
//draw nodes
//----------------------------------------------------------------------------

if (options.colourNodesBy == "colourNodesByYear") {
    svg.selectAll('circle').remove();
    svg.selectAll('circle')
        .data(data.nodes.id)
        .enter().append('circle')
        .attr("class", "nodes")
        .attr('cx', function (d, i) {
            return x(xVal[i]);
        })
        .attr('cy', function (d, i) {
            return y(yVal[i]);
        })
        .attr('r', function (d, i) {
            return node_size_transform(node_radius_values[i]);
        }) 
        .attr('radius', function (d, i) {
            return node_size_transform(node_radius_values[i]);
        })
        .attr('title', function (d, i) {
            return titles[i];
        })
        .attr('id', function (d, i) {
            return d;
        })
        .attr('pinned', false)
        .style('fill', function (d, i) {
            return node_colour_transform(node_colour_values[i]);
        })
        .style('opacity', 0.5);
} else {
    svg.selectAll('circle').remove();
    svg.selectAll('circle').data(data.nodes.id)
        .enter().append('circle')
        .attr("class", "nodes")
        .attr('cx', function (d, i) {
            return x(xVal[i]);
        })
        .attr('cy', function (d, i) {
            return y(yVal[i]);
        })
        .attr('r', function (d, i) {
            return node_size_transform(node_radius_values[i]);
        }) 
        .attr('radius', function (d, i) {
            return node_size_transform(node_radius_values[i]);
        })
        .attr('title', function (d, i) {
            return titles[i];
        })
        .attr('id', function (d, i) {
            return d;
        })
        .attr('pinned', false)
        .style('fill', function (d, i) {
            return groupColour[node_groups[i] - 1];
        })
        .style('opacity',0.5);
}



var circles = svg.selectAll('.nodes');
var lines = svg.selectAll('line');

var outgoing_edges;
var incoming_edges;


svg.selectAll('text').remove()
svg.selectAll('text')
  .data(data.centroid_nodes.id)
  .enter()
  .append('text')
  .attr("class", "annotations")
  .attr("x", function(d,i) { return  x(centroid_nodes_x[i])})
  .attr("y", function(d,i) { return  y(centroid_nodes_y[i])})
  .style('opacity', 1)
  .style('fill','black')
  .text(function(d,i) { return centroid_nodes_label[i]})
  .call(wrap, 30); // wrap the text in <= 30 pixels
  
svg.selectAll('text')
    .data(data.nodes.id)
    .enter()
    .append('text')
    .attr("class", "node_title")
    .attr("x", function(d,i){return x(data.nodes.x[i])})
    .attr("y", function(d,i){return y(data.nodes.y[i])})
    .style('opacity', 1)
    .style('fill','black')
    .style('font-size',0)
    .text(function(d,i){return data.nodes.title[i]})
    .call(wrap, 60); // wrap the text in <= 30 pixels

var node_titles = svg.selectAll('.node_title');


var annotations = svg.selectAll('.annotations');

//----------------------------------------------------------------------------
// Function for mouse over on nodes - Highlight colour of node and its links
//----------------------------------------------------------------------------
circles.on('mouseover', function (d) {
    node_h = d3.select(this);
    d3.select(this).style('opacity', 1);
    


    outgoing_edges = lines.filter(function () {
        return d3.select(this).attr("x1") == x(xVal[data.nodes.id.indexOf(d)]); // filter by single attribute
    });

    outgoing_edges.style("stroke", "orange").attr("stroke-opacity", 1);

    incoming_edges = lines.filter(function () {
        return d3.select(this).attr("x2") == x(xVal[data.nodes.id.indexOf(d)]); // filter by single attribute
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
                if (options.colourNodesBy == "colourNodesByYear") {
                    return node_colour_transform(node_colour_values[data.nodes.id.indexOf(d)]);
                } else {
                    return groupColour[node_groups[data.nodes.id.indexOf(d)] - 1];
                }

            }).style('opacity', 0.5);
    }

    outgoing_edges = lines.filter(function () {
        return d3.select(this).attr("x1") == x(xVal[data.nodes.id.indexOf(d)]); // filter by single attribute
    });

    outgoing_edges.style("stroke", "lightgreen").attr("stroke-opacity", 0.2);

    incoming_edges = lines.filter(function () {
        return d3.select(this).attr("x2") == x(xVal[data.nodes.id.indexOf(d)]); // filter by single attribute
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

            if (pinnedArray[data.nodes.id.indexOf(contextNodeId)] == "true") {
                pin_node.attr("pinned", false)
                    .attr('r', function (d, i) {
                        return node_size_transform(node_radius_values[data.nodes.id.indexOf(contextNodeId)]);
                    })
                    .style("fill", "green");
                pinnedArray[data.nodes.id.indexOf(contextNodeId)] = "false";
            } else {
                pin_node.attr("pinned", true)
                    .attr('r', function (d, i) {
                        return node_size_transform(node_radius_values[data.nodes.id.indexOf(contextNodeId)]) + 2;
                    })
                    .style("fill", "red");

                pinnedArray[data.nodes.id.indexOf(contextNodeId)] = "true"
            }

        }
    },
    {
        title: 'Explore cluster',
        action: function() {
          clusterTabCount++;
          Shiny.setInputValue("clusterToExpl", getNodesFromGrp(data.nodes.group[data.nodes.id.indexOf(contextNodeId)]), {priority: "event"});
          Shiny.setInputValue("openClusterTab", clusterTabCount);
        }
    }/*,
    {
        title: 'Explore node',
        action: function() {
          
          nodeTabCount++;
          Shiny.setInputValue("nodeToExpl", contextNodeId, {priority: "event"});
          Shiny.setInputValue("openNodeTab", nodeTabCount);
        }
    }*/
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



if (options.colourNodesBy == "colourNodesByYear") {
    svg.selectAll(".clusterLegendRects").remove();
    svg.selectAll(".clusterLegendLabels").remove();

    // Create the scale
    var x_colourBarContainer = d3.scalePoint()
        .domain([Math.min.apply(Math, node_colour_values), Math.max.apply(Math, node_colour_values)])
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

} /*else if (options.colourNodesBy == "colourNodesByCluster") {
    svg.selectAll("defs").remove();
    svg.selectAll(".domain").remove();
    svg.selectAll(".tick").remove();
    svg.selectAll(".clusterLegendRects").remove();
    svg.selectAll(".clusterLegendLabels").remove();

    svg.selectAll("mydots")
        .data(unique_groups)
        .enter()
        .append("rect")
        .attr('class', 'clusterLegendRects')
        .attr("x", 800)
        .attr("y", function (d, i) { return i * (10 + 5) }) // 800 is where the first dot appears. 25 is the distance between dots
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function (d) { return groupColour[d - 1] })

    svg.selectAll("mylabels")
        .data(unique_groups)
        .enter()
        .append("text")
        .attr('class', 'clusterLegendLabels')
        .attr("x", 800 + 10 * 3)
        .attr("y", function (d, i) { return 5 + i * (10 + 5) }) // 800 is where the first dot appears. 25 is the distance between dots
        .style("fill", function (d) { return groupColour[d - 1] })
        .text(function (d) { return "Group " + d })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")

}  */

//----------------------------------------------------------------------------
// Functions
//----------------------------------------------------------------------------

function getNodesFromGrp(grp){
  
  var nodesFromGrp = [];
  var j = 0;
  
  for(var i = 0 ; i < data.nodes.id.length; i++){
    if(data.nodes.group[i] == grp){
      nodesFromGrp[j] = data.nodes.id[i];
      j++;
    }
  }
  
  return nodesFromGrp;
}




function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}


function h(x){
  return (-x*Math.log2(x)-(1-x)*Math.log2(1-x));
}

function moveBrush(xPos1, yPos1, xPos2, yPos2){
  
  if(xPos1 < 0) xPos1 = 0;
  if(yPos1 < 0) yPos1 = 0;
  if(xPos2 > width/2) xPos2 = width/2;
  if(yPos2 > height/2) yPos2 = height/2;
  
  mini_brush.move(gBrush, [[xPos1, yPos1],  [xPos2, yPos2]]);
} 


//----------------------------------------------------------------------------
// Minimap
//----------------------------------------------------------------------------
/*
d3.selectAll('.minimap').remove();
d3.selectAll('.minimap').data([1])
        .enter()
        .append('div')
        .attr('class', 'minimap');

const minimap = d3.select('.minimap').append('svg').attr('class', 'mini_svg').attr('width', width/2).attr('height', height/2);
minimap.append('rect').attr('width', width/2).attr('height', height/2).attr('fill', 'lightblue');

const mini_brush = d3.brush().extent( [ [0,0], [width/2,height/2] ] );
const gBrush = d3.select('.mini_svg').append('g');

gBrush.call(mini_brush);

mini_brush.move(gBrush, [[0, 0],  [width/2, height/2]]);
    
minimap.selectAll('.handle').remove();
minimap.selectAll('.overlay').remove();
*/