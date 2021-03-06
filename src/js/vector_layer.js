
gisportal.vectorLayerCount = 0;



/**
 * vector_layer.js
 * The is the base object for all vector based layers. This includes WFS
 * and SOS for now
 *
 *
 *
 *
 **/

gisportal.Vector = function(options) {
    var vector = this;

    var defaults = {
        serviceType: null, // currently either SOS or WFS
        endpoint: null, // service enpoint URL
        dataType: null, // one of (point|polygon|line)
        exBoundingBox: null,
        providerTag: null, //short provider name
        serviceVersion: null, // version of OGC service
        variableName: null, // the WFS variable name
        srsName: 'EPSG:4326', // SRS for the vector layer
        defaultProperty: null,
        defaultProperties : [],
        unit : null
    };


    $.extend(true, this, defaults, options);

    this.selected = false;

    //this.styles = [];

    this.openlayers = {};
    this.name = this.tags.niceName;
    this.visibleTab = "details";
    this.currentColour = '';
    


    /**
     * By default the layer is visible, to hide it
     * just call layer.setVisibility(false);
     *
     * @param {boolean} visibility - True if visible, false if hidden
     */
    this.isVisible = true;
    this.setVisibility = function(visibility) {
        if (this.openlayers.anID) this.openlayers.anID.setVisible(visibility);
        this.isVisible = visibility;
    };

    this.init = function(options, layer) {
        map.addLayer(layer.OLLayer);
        this.select();
        this.getMetadata();
        this.openlayers.anID = layer.OLLayer;

        //gisportal.indicatorsPanel.selectTab( this.id, 'details' );

    };

    this.select = function() {
        // Just in case it tries to add a duplicate
        if (_.indexOf(gisportal.selectedLayers, this.id) > -1) return false;
        var layer = this;

        layer.selected = true;

        // Adds the layer ID to the beginning of the gisportal.selectedLayers array
        gisportal.selectedLayers.unshift(layer.id);

        // If the layer has date-time data, use special select routine
        // that checks for valid data on the current date to decide if to show data
        if (!layer.temporal){
          layer.setVisibility(true);
        }
        if (typeof(layer.preventAutoZoom) == 'undefined' || !layer.preventAutoZoom) {
            //gisportal.zoomOverall();   
        }
        
        var index = _.findIndex(gisportal.selectedLayers, function(d) {
            return d === layer.id;
        });
        gisportal.setLayerIndex(layer, gisportal.selectedLayers.length - index);

    };

    this.unselect = function() {
        var layer = this;
        $('#scalebar-' + layer.id).remove();
        layer.selected = false;
        layer.setVisibility(false);
        gisportal.selectedLayers = _.pull(gisportal.selectedLayers, layer.id);
        if (layer.temporal) {
            if (gisportal.timeline.timebars.filter(function(l) {
                return l.name === layer.name;
            }).length > 0) {
                gisportal.timeline.removeTimeBarByName(layer.name);
            }

            gisportal.refreshDateCache();
            gisportal.zoomOverall();
        }
    };

    this.getMetadata = function() {
        var layer = this;

        gisportal.layers[layer.id].metadataComplete = true;
        layer.metadataComplete = true;
        gisportal.events.trigger('layer.metadataLoaded', layer.id);

    };

  this.styleUIBuilt = false;
  
  this.setStyleUI = function(source,prop)  {
      if(!prop){

      }else {
         var _colour;
         if(this.currentColour.length>0){
           _colour = this.currentColour;
         }
         
         else{
            for(var colour in gisportal.vectorStyles.startingColours) {
               if(gisportal.vectorStyles.coloursInUse.indexOf(colour)==-1){
                  _colour = colour;
                  this.currentColour = colour;
                  gisportal.vectorStyles.coloursInUse.push(colour);
                  break;
               }
            }
         } 
         var opts = this.createStyleFromProp(source,prop,_colour);
         if ("unit" in this) {
           opts.unit = this.unit;
         }
         if(this.defaultProperties.length > 0){
           opts.defaultProps = true;
           opts.defaultProperties = this.defaultProperties;
         }
         gisportal.vectorStyles.cache[this.id+"__"+prop] = opts;
         opts.zoomable = true;
         if(gisportal.current_view && gisportal.current_view.noPan){
            opts.zoomable = false;
         }
         var renderedStyleUI = gisportal.templates['vector-style-ui'](opts);
         $('[data-id="' + this.id + '"] .dimensions-tab .vector-style-container').html(renderedStyleUI);
         this.styleUIBuilt = true;
      }
   }; 
  
   this.createStyleFromNumericalProp = function(source,prop,colour) {

   };


  this.createStyleFromProp = function(source,prop,colour){
      var features = source.getFeatures();
      var possibleOptions = [];
      var x = 0, y = 0;
      var bins, style_colour;
      var featureCount = features.length;
      var isNumberProperty = false;
      for(x;x<=featureCount-1;x++) {
        var props = features[x].getProperties();

        if(!_.includes(possibleOptions, props[prop])){
            possibleOptions.push( props[prop]);
        }
      }
      var isAllNumeric = function(x) {
        return !isNaN(x);
      };
      isNumberProperty = possibleOptions.every(isAllNumeric);

      var colorPalette, legend, legend_obj;
      if(isNumberProperty) {

        var options_number = possibleOptions.map(function(x) {
            return (Number(x));//.toFixed(4);
        });
        var min = Math.min.apply(Math, options_number);
        var max = Math.max.apply(Math, options_number);
        var diff = max - min;
        var bin = Number((diff / (gisportal.vectorStyles.binSize )).toFixed(4));
        bins = [];
        for (b = 0; b <= gisportal.vectorStyles.binSize; b++) {
            bins.push((min + (bin*b)).toFixed(4));
        }
        colorPalette = gisportal.vectorStyles.createPalette(colour, bins.length);
        isNumberProperty = true;

        legend = [];
      legend_obj = {};
      for(y, x=bins.length -1; y<bins.length -1  , x> 0; y++, x--){
        var option = bins[y]+'-'+bins[y+1];
        legend.push({'option':option,'colour':colorPalette[x]});
        legend_obj[option] = colorPalette[x];
      }
      }
      else{
          if (this.defaultColour !== false){
              legend = [];
            legend_obj = {};
            legend_obj[this.name] = this.defaultColour;
            legend.push({'option':this.name,'colour':this.defaultColour});
          }
          else{
            colorPalette = gisportal.vectorStyles.createPalette(colour, possibleOptions.length);
            legend = [];
            legend_obj = {};
            for(y = possibleOptions.length, x = 0; y >= 0 , x <= possibleOptions.length  ; y--, x++){
                legend.push({'option':possibleOptions[y],'colour':colorPalette[y]});
                legend_obj[possibleOptions[y]] = colorPalette[y];
            }
          }
     }
      x = 0;
         for (x; x < featureCount; x++) {
            if (isNumberProperty) {
               var p = 0;
               var binsLength = bins.length;
               for (p; p < binsLength - 1; p++) {
                  var curVal = (Number(features[x].getProperties()[prop]));

                  if (bins[p] <= curVal && bins[p + 1] >= curVal) {
                     style_colour = legend_obj[bins[p] + '-' + bins[p + 1]];
                     style_colour = ol.color.asArray(style_colour);
                     if (this.vectorType == "POINT") {
                        features[x].setStyle(
                        new ol.style.Style({
                           image: new ol.style.Circle({
                              radius: 5,
                              fill: new ol.style.Fill({
                                 color: style_colour
                              }),
                              stroke: new ol.style.Stroke({
                                 width: 0.5,
                                 color: 'rgba(255,0,0,1)'
                              })
                           })
                        }));
                     }
                     if (this.vectorType == "POLYGON") {
                        features[x].setStyle(
                           new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                    color: 'rgba(255,0,0,1)',
                                    width: 20
                              }),
                              fill: new ol.style.Fill({
                                 color: style_colour
                              })
                           }));
                     }
                  }
               }
            }else {
               if(this.defaultColour !== false){
                   style_colour = this.defaultColour;
               }
               else {
                  style_colour = legend_obj[features[x].getProperties()[prop]];
                  style_colour = ol.color.asArray(style_colour);
               }
               if(gisportal.methodThatSelectedCurrentRegion.method == "selectExistingPolygon" && features[x].getId() == gisportal.methodThatSelectedCurrentRegion.value){
               }
               if (this.vectorType == "POINT") {
                  features[x].setStyle(
                     new ol.style.Style({
                        image: new ol.style.Circle({
                           radius: 5,
                           fill: new ol.style.Fill({
                              color:style_colour
                           }),
                           stroke: new ol.style.Stroke({
                              width: 0.5,
                              color: style_colour
                           })
                        })
                     })
                  );

               }
               if (this.vectorType == "POLYGON") {
                  features[x].setStyle(
                     new ol.style.Style({
                        stroke: new ol.style.Stroke({
                                    color: style_colour,
                                    width: 5
                        }), 
                        fill: new ol.style.Fill({
                           color: style_colour
                        })
                     })
                  );
               }
            }
        }

      this.currentProperty = prop;
      opts = {};
      opts.currentProperty = prop ;
      opts.possibleOptions = possibleOptions;
      opts.legend = legend;
      opts.id = this.id;

      return opts;
  };

    /**
     * This function creates an Open Layers layer, such as a WMS Layer.
     * These are stored in layer.openlayers. Currently the implementation
     * only allows a single OL layer per gisportal.layer known as 'anID'
     * but in the future this should change to allow multiple OL layers.
     *
     * opLayers refer to operational layers, generally temporal WMS layers
     * refLayers refer to reference layers, generally WFS or KML.
     *
     * History:
     * The previous implementation had the idea of microlayers but over time
     * they grew into a confusing mess than has now been removed and merged
     * with gisportal.layer.
     */
    this.createOLLayer = function() {
        createStyle = function(vec,source) {
            var styleType = vec.vectorType;
            return styles[styleType];
        };

        var maxFeatures = function(vec) {
            return vec.maxFeatures !== 'ALL' ? '%26maxFeatures%3D' + vec.maxFeatures : '';
        };

        var vec = this;

        var loadFeatures = function(response) {
            var wfsFormat = new ol.format.WFS();
            // This converts the features to the correct projection
            var feature, this_feature;
            var features = wfsFormat.readFeatures(response);
            for(feature in features){
               this_feature = features[feature];
               features[feature] = gisportal.geoJSONToFeature(gisportal.featureToGeoJSON(this_feature, "EPSG:4326", gisportal.projection));
            }
            sourceVector.addFeatures(features);
            if(!this.styleUIBuilt){
                setup_style_ui(sourceVector,vec);
            }
        };

        var setup_style_ui = function(source) {
          var prop = 'currentProperty' in vec ? vec.currentProperty : vec.defaultProperty;
          
          vec.setStyleUI(source,prop);
        };
        var buildLoader = function($vector, $source) {
            return function(extent, resolution, projection) {
                vectorSource = $source;
                var url = $vector.endpoint +
                    '%3Fservice%3DWFS' +
                    maxFeatures($vector) +
                    '%26version%3D1.1.0' +
                    '%26request%3DGetFeature' +
                    '%26typename%3D' + $vector.variableName +
                    '%26srs%3D' + $vector.srsName +
                    '%26bbox%3D' + extent + ',' + gisportal.projection;

                $.ajax({
                    url: url
                })
                    .done(loadFeatures);
            };
        };


        if (this.serviceType === 'WFS') {
            var sourceVector = new ol.source.Vector({
                loader: buildLoader(vec, sourceVector),
                strategy: ol.loadingstrategy.bbox,
            });
            var layerVector = new ol.layer.Vector({
                source: sourceVector
            });
            vector.OLLayer = layerVector;
            return layerVector;
        }

        if (this.serviceType === 'SOS') {
            // TODO custom support for rendering SOS
        }
    };

    this.addOLLayer = function(layer, id) {
        map.addLayer(layer);
        if(!this.styleUIBuilt){
            this.setStyleUI(layer.getSource(),layer.defaultProperty);

        }
        gisportal.vectorLayerCount++;
    };

    this.removeOLLayer = function(layer, id) {
        map.removeLayer(layer);
        this.styleUIBuilt = false;

        gisportal.vectorLayerCount--;
        gisportal.vectorStyles.coloursInUse = _.without(gisportal.vectorStyles.coloursInUse,this.currentColour);

    };

    return this;

};

gisportal.getVectorLayerData = function(layer) {
    gisportal.layers[id].init(options, layer);

};

gisportal.vectorSelectionTest = function(id, tabname){

  var layers = map.getLayers();
      var found = false;

  layers.forEach(function(f){
      if(f instanceof ol.layer.Vector){
         if (f.getSource().getFeatures().length > 0) {
            found = true;
         }
      }
      
  });

  if(found){
      $('.draw-select-polygon-div').removeClass('hidden');
   }else {
      $('.draw-select-polygon-div').addClass('hidden');
   }

};
