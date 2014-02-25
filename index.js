var tails = require('./lib/tails');
var consumers = require('./lib/consumers');

// expose internal consumers
tails.consumers = consumers;

module.exports = tails;
