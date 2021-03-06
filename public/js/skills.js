(function(win, d3, $) {  

    var cols = 12,
        imgs = [],
        skills; //10;

    function loadImage(skill) {

      var $dfd = $.Deferred(),
          img = new Image();

      skill.img = img;

      img.onload = function() {
        img.onload = img.onerror = img.onabort = null;
        console.log('finished loading ' + skill.name);
        $dfd.resolve();
      }

      img.onerror = img.onabort = function() {
        img.onload = img.onerror = img.onabort = null;
        console.log('image errored');
        $dfd.reject();
      }

      skill.img.src = skill.image.url;

      return $dfd.promise();
    }

    function loadImages() {

      var $dfd = $.Deferred(),
          funcs = [];

      for (var i = 0; i < skills.length; i++) {
        funcs.push(loadImage(skills[i]));
      }

      console.log(funcs);

      $.when.apply($, funcs)
        .done(function() {
          console.log('images loaded...');
          return $dfd.resolve();
        })
        .fail($dfd.reject);

      return $dfd.promise();
    }

    $.ajax('api/skills').done(function(results) {

      skills = results;

      //console.log(skills);

      var height =  460,
          imageWidth = 192, //129,
          imageHeight = 192, //152,
          radius = 96, //75,
          depth = 6, //4,
          currentFocus = [win.innerWidth / 2, height / 2],
          desiredFocus, 
          idle = true;

      skills.forEach(function(d, i) {
        d.i = i % cols;
        d.j = i / cols | 0;
      });

      Math.seedrandom(+d3.time.hour(new Date()));
      d3.shuffle(skills);

      var style = document.body.style,
          transform = ("webkitTransform" in style ? "-webkit-"
              : "MozTransform" in style ? "-moz-"
              : "msTransform" in style ? "-ms-"
              : "OTransform" in style ? "-o-"
              : "") + "transform";

      var hexbin = d3.hexbin().radius(radius);

      if (!("ontouchstart" in document)) {
        d3.select("#examples").on("mousemove", mouseMoved);
      }

      var deep = d3.select("#examples-deep");
      var canvas = deep.append("canvas")
          .attr("height", height);
      var context = canvas.node().getContext("2d");
      var svg = deep.append("svg")
          .attr("height", height);
      var mesh = svg.append("path")
          .attr("class", "example-mesh");
      var anchor = svg.append("g")
          .attr("class", "example-anchor")
          .selectAll("a");
      var graphic = deep.selectAll("svg,canvas");

      $.when(loadImages())
        .done(function() {
          //console.log(skills);
          resized();
          d3.select(window)
            .on("resize", resized)
            .each(resized);
        })
        .fail(function() { console.log('loadImages failed!') });

      function drawImage(d) { 

        if (!d) return;

        context.save();
        context.beginPath();
        context.moveTo(0, -radius);
      
        for (var i = 1; i < 6; ++i) {
          var angle = i * Math.PI / 3,
              x = Math.sin(angle) * radius,
              y = -Math.cos(angle) * radius;
          context.lineTo(x, y);
        }

        var sx = 0, //sx = imageWidth * d.i,
            sy = 0, //sy = imageHeight * d.j,
            sw = imageWidth,
            sh = imageHeight,
            dx = -imageWidth / 2,
            dy = -imageHeight / 2,
            dw = sw,
            dh = sh;
        console.log('drawing "' + d.name + '" "' + d.image.url 
          + '" from (' + sx + ',' + sy + ',' + sw + ',' + sh + ')' 
          + '" at (' + dx + ',' + dy + ',' + dw + ',' + dh + ')');
        context.clip();
        context.drawImage(d.img, 
          sx, sy, sw, sh,
          dx, dy, dw, dh);
        context.restore();  
      
      }

      function resized() {

        console.log('resized!');
        
        var deepWidth = win.innerWidth * (depth - 1) / depth,
            deepHeight = height * (depth + 1) / depth,
            centers = hexbin
                        .size([deepWidth, deepHeight]) //pixels
                        .centers(); //[{i:c,j:r}, ...]

        desiredFocus = [win.innerWidth / 2, height / 2]; //center

        graphic
          .style('left', Math.round((win.innerWidth - deepWidth) / 2) + 'px')
          .style('top', Math.round((height - deepHeight) / 2) + 'px')
          .attr('width', deepWidth)
          .attr('height', deepHeight);

        var idx;
        centers.forEach(function(center, i) {
          center.j = Math.round(center[1] / (radius * 1.5));
          center.i = Math.round((center[0] - (center.j & 1) * radius * Math.sin(Math.PI / 3)) / (radius * 2 * Math.sin(Math.PI / 3)));
          context.save();
          context.translate(Math.round(center[0]), Math.round(center[1]));
          idx = (center.i % cols) + ((center.j + (center.i / cols & 1) * 5) % cols) * cols;
          console.log('idx = ' + idx);
          drawImage(center.example = skills[idx]);
          context.restore();
        });

        mesh.attr('d', hexbin.mesh);

        anchor = anchor.data(centers, function(d) {
          if (!d) return '0,0';
          return d.i + ',' + d.j;
        });

        anchor.exit().remove();

        anchor.enter().append('a')
          .attr('xref:href', function(d) { if (!d || !d.example) return ''; return d.example.url; })
          .attr('xref.title', function(d) { if (!d || !d.example) return ''; return d.example.name })
          .append('path')
          .attr('d', hexbin.hexagon());

        anchor.attr('transform', function(d) { if (!d) return ''; return 'translate (' + d + ')'; });

      }

      function mouseMoved() {
        var m = d3.mouse(this); //[x,y]
        desiredFocus = [
          Math.round((m[0] - win.innerWidth / 2) / depth) * depth + win.innerWidth / 2,
          Math.round((m[1] - height / 2) / depth) * depth + height / 2
        ];
        moved();
      }

      //handle shifting hexbins as user moves mouse
      function moved() {
        //what is "idle"?
        //runs repeatedly until it returns true
        if (idle) d3.timer(function() {
          if (idle == Math.abs(desiredFocus[0] - currentFocus[0]) < .5 && Math.abs(desiredFocus[1] - currentFocus[1]) < .5) {
            currentFocus = desiredFocus;
          }
          else {
            currentFocus[0] += (desiredFocus[0] - currentFocus[0]) * .14;
            currentFocus[1] += (desiredFocus[1] - currentFocus[1]) * .14;
          }
          deep.style(transform, 'translate(' + (win.innerWidth / 2 - currentFocus[0]) / depth + 'px,' + (height / 2 - currentFocus[1]) / depth + 'px)');
        });
      }

    });

}(window, d3, jQuery));

// var data = [
//       {title: "Reingold–Tilford Tree (Radial)", url: "http://bl.ocks.org/mbostock/4063550"},
//       {title: "Factorisation Diagrams", url: "http://www.jasondavies.com/factorisation-diagrams/"},
//       {title: "Phylogenetic Tree of Life", url: "http://www.jasondavies.com/tree-of-life/"},
//       {title: "Geographic Clipping", url: "http://www.jasondavies.com/maps/clip/"},
//       {title: "Les Misérables Co-occurrence Matrix", url: "http://bost.ocks.org/mike/miserables/"},
//       {title: "L*a*b* and HCL color spaces", url: "http://bl.ocks.org/mbostock/3014589"},
//       {title: "Treemap", url: "http://bl.ocks.org/mbostock/4063582"},
//       {title: "Map Projection Transitions", url: "http://www.jasondavies.com/maps/transition/"},
//       {title: "Across U.S. Companies, Tax Rates Vary Greatly", url: "http://www.nytimes.com/interactive/2013/05/25/sunday-review/corporate-taxes.html"},
//       {title: "Rotating Voronoi", url: "http://bl.ocks.org/mbostock/4636377"},
//       {title: "Zoomable Geography", url: "http://bl.ocks.org/mbostock/2374239"},
//       {title: "Fisheye Distortion", url: "http://bost.ocks.org/mike/fisheye/"},
//       {title: "Geodesic Rainbow", url: "http://bl.ocks.org/mbostock/3057239"},
//       {title: "Hierarchical Bar Chart", url: "http://bl.ocks.org/mbostock/1283663"},
//       {title: "Exoplanets", url: "http://bl.ocks.org/mbostock/3007180"},
//       {title: "Crossfilter", url: "http://square.github.io/crossfilter/"},
//       {title: "Alaska’s villages on the frontline of climate change", url: "http://www.guardian.co.uk/environment/interactive/2013/may/14/alaska-villages-frontline-global-warming"},
//       {title: "The federal health-care exchange’s abysmal success rate", url: "http://www.washingtonpost.com/wp-srv/special/politics/state-vs-federal-exchanges/"},
//       {title: "Counties Blue and Red, Moving Right and Left", url: "http://www.nytimes.com/interactive/2012/11/11/sunday-review/counties-moving.html"},
//       {title: "At the National Conventions, the Words They Used", url: "http://www.nytimes.com/interactive/2012/09/06/us/politics/convention-word-counts.html"},
//       {title: "Reprojected Raster Tiles", url: "http://www.jasondavies.com/maps/raster/"},
//       {title: "Hive Plots", url: "http://bost.ocks.org/mike/hive/"},
//       {title: "Donut Transitions", url: "http://bl.ocks.org/mbostock/4341417"},
//       {title: "Non-Contiguous Cartogram", url: "http://bl.ocks.org/mbostock/4055908"},
//       {title: "Spermatozoa", url: "http://bl.ocks.org/mbostock/1136236"},
//       {title: "Zoomable Circle Packing", url: "http://bl.ocks.org/mbostock/7607535"},
//       {title: "Transform Transitions", url: "http://bl.ocks.org/mbostock/1345853"},
//       {title: "Scatterplot Matrix", url: "http://bl.ocks.org/mbostock/3213173"},
//       {title: "Janet L. Yellen, on the Economy’s Twists and Turns", url: "http://www.nytimes.com/interactive/2013/10/09/us/yellen-fed-chart.html"},
//       {title: "Front Row to Fashion Week", url: "http://www.nytimes.com/newsgraphics/2013/09/13/fashion-week-editors-picks/"},
//       {title: "Interrupted Sinu-Mollweide", url: "http://bl.ocks.org/mbostock/4481520"},
//       {title: "Streamgraph", url: "http://bl.ocks.org/mbostock/4060954"},
//       {title: "Force-Directed Graph", url: "http://bl.ocks.org/mbostock/4062045"},
//       {title: "Zoomable Icicle", url: "http://bl.ocks.org/mbostock/1005873"},
//       {title: "Collision Detection", url: "http://bl.ocks.org/mbostock/3231298"},
//       {title: "Waterman Butterfly", url: "http://bl.ocks.org/mbostock/4458497"},
//       {title: "Airocean World", url: "http://www.jasondavies.com/maps/airocean/"},
//       {title: "Countries by Area", url: "http://www.jasondavies.com/maps/countries-by-area/"},
//       {title: "Bilevel Partition", url: "http://bl.ocks.org/mbostock/5944371"},
//       {title: "Map Zooming", url: "http://bl.ocks.org/mbostock/6242308"},
//       {title: "Fisher–Yates Shuffle", url: "http://bost.ocks.org/mike/shuffle/"},
//       {title: "Sphere Spirals", url: "http://www.jasondavies.com/maps/sphere-spirals/"},
//       {title: "World Tour", url: "http://bl.ocks.org/mbostock/4183330"},
//       {title: "Zoomable Treemaps", url: "http://bost.ocks.org/mike/treemap/"},
//       {title: "Clipped Map Tiles", url: "http://bl.ocks.org/mbostock/4150951"},
//       {title: "Cubism.js", url: "http://square.github.io/cubism/"},
//       {title: "Voronoi Labels", url: "http://bl.ocks.org/mbostock/6909318"},
//       {title: "Bivariate Hexbin Map", url: "http://bl.ocks.org/mbostock/4330486"},
//       {title: "OMG Particles!", url: "http://bl.ocks.org/mbostock/1062544"},
//       {title: "Calendar View", url: "http://bl.ocks.org/mbostock/4063318"},
//       {title: "The Wealth & Health of Nations", url: "http://bost.ocks.org/mike/nations/"},
//       {title: "Collapsible Tree", url: "http://bl.ocks.org/mbostock/4339083"},
//       {title: "Hexagonal Binning", url: "http://bl.ocks.org/mbostock/4248145"},
//       {title: "Over the Decades, How States Have Shifted", url: "http://www.nytimes.com/interactive/2012/10/15/us/politics/swing-history.html"},
//       {title: "China Still Dominates, but Some Manufacturers Look Elsewhere", url: "http://www.nytimes.com/interactive/2013/04/08/business/global/asia-map.html"},
//       {title: "Strikeouts on the Rise", url: "http://www.nytimes.com/interactive/2013/03/29/sports/baseball/Strikeouts-Are-Still-Soaring.html?ref=baseball"},
//       {title: "Epicyclic Gearing", url: "http://bl.ocks.org/mbostock/1353700"},
//       {title: "Voronoi Tessellation", url: "http://bl.ocks.org/mbostock/4060366"},
//       {title: "The state of our union is … dumber", url: "http://www.guardian.co.uk/world/interactive/2013/feb/12/state-of-the-union-reading-level"},
//       {title: "Chord Diagram", url: "http://bl.ocks.org/mbostock/1046712"},
//       {title: "Floating Landmasses", url: "http://bl.ocks.org/mbostock/6738360"},
//       {title: "How the Tax Burden Has Changed", url: "http://www.nytimes.com/interactive/2012/11/30/us/tax-burden.html"},
//       {title: "Prime Number Patterns", url: "http://www.jasondavies.com/primos/"},
//       {title: "Koalas to the Max", url: "http://www.koalastothemax.com/"},
//       {title: "Constellations of Directors and Their Stars", url: "http://www.nytimes.com/newsgraphics/2013/09/07/director-star-chart/"},
//       {title: "Drought and Deluge in the Lower 48", url: "http://www.nytimes.com/interactive/2012/08/11/sunday-review/drought-history.html"},
//       {title: "Animated Bézier Curves", url: "http://www.jasondavies.com/animated-bezier/"},
//       {title: "Histogram", url: "http://bl.ocks.org/mbostock/3048450"},
//       {title: "Stacked-to-Grouped Bars", url: "http://bl.ocks.org/mbostock/3943967"},
//       {title: "Force-Directed States of America", url: "http://bl.ocks.org/mbostock/1073373"},
//       {title: "Faux-3D Arcs", url: "http://bl.ocks.org/dwtkns/4973620"},
//       {title: "512 Paths to the White House", url: "http://www.nytimes.com/interactive/2012/11/02/us/politics/paths-to-the-white-house.html"},
//       {title: "Polar Clock", url: "http://bl.ocks.org/mbostock/1096355"},
//       {title: "Population Pyramid", url: "http://bl.ocks.org/mbostock/4062085"},
//       {title: "The America’s Cup Finale: Oracle’s Path to Victory", url: "http://www.nytimes.com/interactive/2013/09/25/sports/americas-cup-course.html"},
//       {title: "Rainbow Worm", url: "http://bl.ocks.org/mbostock/4165404"},
//       {title: "Four Ways to Slice Obama’s 2013 Budget Proposal", url: "http://www.nytimes.com/interactive/2012/02/13/us/politics/2013-budget-proposal-graphic.html"},
//       {title: "Quadtree", url: "http://bl.ocks.org/mbostock/4343214"},
//       {title: "Bubble Chart", url: "http://bl.ocks.org/mbostock/4063269"},
//       {title: "Women as Academic Authors, 1665-2010", url: "http://chronicle.com/article/Woman-as-Academic-Authors/135192/"},
//       {title: "Choropleth", url: "http://bl.ocks.org/mbostock/4060606"},
//       {title: "Gilbert’s Two-World Perspective", url: "http://www.jasondavies.com/maps/gilbert/"},
//       {title: "For Eli Manning, 150 Games and Counting", url: "http://www.nytimes.com/newsgraphics/2013/09/28/eli-manning-milestone/"},
//       {title: "Word Tree", url: "http://www.jasondavies.com/wordtree/"},
//       {title: "Mobile Patent Suits", url: "http://bl.ocks.org/mbostock/1153292"},
//       {title: "Mitchell’s Best-Candidate", url: "http://bl.ocks.org/mbostock/1893974"},
//       {title: "Sankey Diagrams", url: "http://bost.ocks.org/mike/sankey/"},
//       {title: "van Wijk Smooth Zooming", url: "http://bl.ocks.org/mbostock/3828981"},
//       {title: "Bryce Harper: A swing of beauty", url: "http://www.washingtonpost.com/wp-srv/special/sports/bryce-harper-swing-of-beauty/"},
//       {title: "Dissecting a Trailer: The Parts of the Film That Make the Cut", url: "http://www.nytimes.com/interactive/2013/02/19/movies/awardsseason/oscar-trailers.html"},
//       {title: "Violence and guns in best-selling video games", url: "http://www.guardian.co.uk/world/interactive/2013/apr/30/violence-guns-best-selling-video-games"},
//       {title: "Hierarchical Edge Bundling", url: "http://bl.ocks.org/mbostock/1044242"},
//       {title: "Geographic Bounding Boxes", url: "http://www.jasondavies.com/maps/bounds/"},
//       {title: "Live Results: Massachusetts Senate Special Election", url: "http://elections.huffingtonpost.com/2013/massachusetts-senate-results"},
//       {title: "Zoomable Map Tiles", url: "http://bl.ocks.org/mbostock/4132797"},
//       {title: "D3 Show Reel", url: "http://bl.ocks.org/mbostock/1256572"},
//       {title: "Building Hamiltonian Graphs from LCF Notation", url: "http://christophermanning.org/projects/building-cubic-hamiltonian-graphs-from-lcf-notation/"},
//       {title: "Sequences sunburst", url: "http://bl.ocks.org/kerryrodden/7090426"},
//       {title: "Azimuth and Distance from London", url: "http://www.jasondavies.com/maps/azimuth-distance/"},
//       {title: "Parallel Sets", url: "http://www.jasondavies.com/parallel-sets/"}
//     ];