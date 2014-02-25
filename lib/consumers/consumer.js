/**
 * consumer.js, base consumer for tails
 */
var events = require('events'),
  util = require('util');

var Consumer = exports.Consumer = function (opts) {
  events.EventEmitter.call(this);

  opts = opts || {};
};

util.inherits(Consumer, events.EventEmitter);
