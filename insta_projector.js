
function getJsonFromUrl(hashBased) {
    var query;
    if(hashBased) {
      var pos = location.href.indexOf("?");
      if(pos==-1) return [];
      query = location.href.substr(pos+1);
    } else {
      query = location.search.substr(1);
    }
    var result = {};
    query.split("&").forEach(function(part) {
      if(!part) return;
      part = part.split("+").join(" "); // replace every + with space, regexp-free version
      var eq = part.indexOf("=");
      var key = eq>-1 ? part.substr(0,eq) : part;
      var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
      var from = key.indexOf("[");
      if(from==-1) result[decodeURIComponent(key)] = val;
      else {
        var to = key.indexOf("]",from);
        var index = decodeURIComponent(key.substring(from+1,to));
        key = decodeURIComponent(key.substring(0,from));
        if(!result[key]) result[key] = [];
        if(!index) result[key].push(val);
        else result[key][index] = val;
      }
    });
    return result;
}



async function filterNodes(thedata=[], nodecut=20, basetag=''){
	let rmnodes = []

	function rmBaseTag(text, id){
		let textA = text.split("#")
		textA.shift()
		let retVal = true
		
		if(textA.length <= 1){
			rmnodes.push(id)
			retVal = false
		}
		return retVal
	}
	filterObj = {
		"nodes" : thedata.nodes.filter(function(d){
						for (var i = 0; i < basetag.length; i++){
							if(d.id ==  basetag[i]){
					  			return false
					  		}
						}
					  	
					  	if(d.count != undefined){
					  		if (d.count < nodecut){
					  			rmnodes.push(d.id)
					  			return false
					  		}
					  	}
						else{
							return rmBaseTag(d.text, d.id)
						}
				  		return true
  					}),
		"removedNodes" : rmnodes
	}
	return filterObj
}

async function filterLinks(thedata=[], rmnodes=rNodes, basetag=''){

	return thedata.links.filter(function(d){
		for (var i = 0; i < basetag.length; i++){
		  	if(d.target == basetag[i] || d.source == basetag[i]){
		  		return false
		  	}
		  }
  		setfalse = true
  		rmnodes.forEach(function(n){
  			if (d.target == n || d.source == n){
  				setfalse = false
  			}
  		})
  		return setfalse
 	})

}

async function wrapper(){

  let params  = getJsonFromUrl(window.location.search);
  console.log(params)
  let fp = params.hashtag
  let basetags = [fp]
  let nodecut = 10;
  let data = await d3.json('graph_data_' + fp + '.json')

  let transform = d3.zoomIdentity;

  if(fp == 'cloudgate'){
    nodecut =  20
  }

  if(fp == 'wtccortlandt'){
    nodecut = 2
  }
  if(fp == 'vietnamveteransmemorial'){
    nodecut = 20
  }


  d3.select("#the-label").text(fp)
  d3.select('#nodecut').text(nodecut)

  //let fp = 'cloudgate';
  //let basetags = [fp, 'thebean', 'CloudGate', 'TheBean', 'chicago']
  
  $('#loading-label').text("Filtering data")
  let filteredNodes = await filterNodes(thedata=data, nodecut=nodecut, basetag=basetags);
  const nodes = filteredNodes.nodes;
  const rmnodes = filteredNodes.removedNodes;
  const links = await filterLinks(thedata=data, rmnode=rmnodes, basetag=basetags)
  console.log(nodes)
  console.log(links)
  


  const width = window.innerWidth
  const height = window.innerHeight



  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id)
        .distance((d) => 5 )
        .strength(0.1)
      )
      .force("charge", d3.forceManyBody()
        .strength(-200)
      )
       .force('center', d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

  const svg = d3.select('#graph_svg')

  svg.style("height", height).style("width", width)
  
  const link = svg.append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.3)
    .selectAll("line")
    .data(links)
    .enter().append("line")
      .attr("stroke-width", function(d){
      	return 1
      })
      /*.attr("class", function(d){
      	return "link_" + d.source.id + " " + "link_"+ d.target.id
      })*/;
  
  const zoomRect = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    
  const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("id", 'nodes_outer_g')
    .selectAll("g")
    .data(nodes)
    .enter().append("g")
    	.attr("class", 'node_g')
    	.attr("id", function(d){
    		return "id_" + d.id
    	})

  node.append("circle")
  	.attr("r", function(d){
  		if (d.count != undefined){
 			return Math.sqrt(d.count / Math.PI)
 		}
 		return 5
  	})
    .attr("fill", "black");


  node.append("text")
  	.style("stroke", "black")
  	.style("stroke-width", '.5px')
  	.text(function(d){
  		if(d.count != undefined){
  			return '#' + d.id
  		}
  		else d3.select(this).remove()
  	})

  $('.mouseover').off()


  node.append("image").attr("xlink:href",  function(d) {
 	if (d.comments != undefined){
 		return  fp + '/' + d.id + '.thumbnail';
 	}
 	else {
 		return ''
 	}
  	
  })
        .attr("x", function(d) { return -10;})
        .attr("y", function(d) { return -10;})
        .style("stroke", 'red')
        .style("outline", "2px solid white")
        .attr("height", 20)
        .attr("width", 20).on("click", function(d){
        	highlightEdges(d.id)
        }).on("mouseover", function(d){
				$('.mouseover').removeClass('hidden')
       			let mouseloc = d3.mouse(document.getElementById('graph_svg'))
       			let data = { left: mouseloc[0] + 25, top: mouseloc[1] + 48}
       			$('.mouseover').offset(data)
       			if(d.text != undefined){
       				$('.mouseover p').text(d.text)
       			}
       			else{
       				$('.mouseover p').text(d.id + ":" + d.count)
       			}
       			

        })
        .on("mouseout", function(d){
			$('.mouseover').addClass('hidden')
        })

/*
  $('.node_g').on("mouseover", function(e){
  	 var data = { left: e.pageX, top: e.pageY};
  	 console.log(data)
  	 $('.mouseover').offset(data)
  	 $('.mousover p').text("")
  	 console.log($('.mouseover').offset())
  })
  */
  const zoom = d3.zoom()
      .scaleExtent([.2, 200])
      .on("zoom", zoomed);

  zoomRect.on("click", function(){
  	$('.deselected_node').removeClass('deselected_node')
  	$('.selected_edge').removeClass('selected_edge')
  }
  )
  zoomRect.call(zoom)
    //.call(zoom.translateTo, 0, 0)
    .call(zoom.scaleTo, .5);
  
  node.append("title")
      .text(d => d.id);

  $('#loading-label').text("Rendering")

function highlightEdges(id){
	/*console.log(id)
	console.log($(".link_" + id))
	$('.selected_edge').removeClass('selected_edge')
	$(".link_" + id).addClass("selected_edge")*/
	$('.selected_edge').removeClass('selected_edge')
	$('.node_g').addClass("deselected_node")
	$('#' + "id_" + id).removeClass("deselected_node")
	link.attr("class", function(d){
		if(d.target.id == id){
			$('#' + "id_" + d.source.id).removeClass("deselected_node")
			return 'selected_edge'
		}
		else if(d.source.id == id){
			$('#' + "id_" + d.target.id).removeClass("deselected_node")
			return 'selected_edge'
		}
		else{
			return ''
		}
	})

}


function fixna(x) {
    if (isFinite(x)) return x;
    return 0;
}
  let tickcount = 0
  simulation.on("tick", () => {
  	$('#loading-label').text("Generating network locations " + tickcount + "%")
  	tickcount += 1
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    /*node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);*/


    node.attr("transform", function(d) {
        return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
    });
    if (tickcount >= 100){
    	simulation.stop()
    	$('#loading-label').text("Finishing up")
    	  $('#loading-div').addClass("hidden")
  $('#vis-div').removeClass("hidden")
    	
    }
  });

  //invalidation.then(() => );

 // return svg.node();
    
  function zoomed() {

    transform = d3.event.transform;
    d3.select('#nodes_outer_g').attr("transform", d3.event.transform);
    link.attr("transform", d3.event.transform);
  }
}

wrapper()


