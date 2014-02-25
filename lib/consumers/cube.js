var util = require("util"),
  Consumer = require('./consumer.js');

// cube
var Cube = function (options) {
  this.name = "cube";

  this.scheme = options.scheme || 'ws';
  this.host = options.host || 'localhost';
  this.port = options.port;
  this.path = options.path || '/1.0/event/put';
};

// custom consumer
util.inherits(Cube, Consumer);

Cube.prototype.ingest = function () {

};
