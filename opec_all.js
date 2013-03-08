{
   "id": "opec",
   "paths": [
      "html/static/js-libs/"
   ],
   "inputs": [
      "src/opec.js",
      "src/dialog.js",
      "src/opecportal.js",
      "src/gritter.js",
      "src/graphing.js",
      "src/util.js",
      "src/panel.js",
      "src/window.js",
      "src/contextMenu.js",
      "src/maplayers.js",     
      "src/timeline.js",
      "html/static/js-libs/jquery-gritter/js/jquery.gritter.js"
   ],
   
   "externs": [
      "externs/externs.js",
      "externs/jQuery-1.8.2.js",
      "externs/OpenLayers.js",
      "externs/d3.js",
      "externs/Cesium.js"
   ],
   
   "mode": "SIMPLE",
   "level": "VERBOSE",
   "checks": {
      // acceptable values are "ERROR", "WARNING", and "OFF" 
      "deprecated": "WARNING",
      "checkTypes": "WARNING",
      "nonStandardJsDocs": "WARNING",
      "internetExplorerChecks": "WARNING",
      "invalidCasts": "ERROR"
   }
}