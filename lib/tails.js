var events = require("events"),
  util = require("util"),
  fs = require("fs"),
  _ = require('underscore'),
  consumers = require('./consumers');

// Tails constructor, extends EventEmitter
var Tails = exports.Tails = function (opts) {
  var stats,
    self = this;
  events.EventEmitter.call(this);

  this.filename = opts.filename;
  this.separator = opts.separator || '\n';
  this.fsWatchOptions = opts.fsWatchOptions || {};
  this.consumers = [];
  this.readBlock = _.bind(this.readBlock, this);
  this.buffer = '';
  this.internalDispatcher = new events.EventEmitter();
  this.queue = [];
  this.isWatching = false;
  stats = fs.statSync(this.filename);
  this.pos = stats.size;
  this.internalDispatcher.on('next', function() {
    return self.readBlock();
  });
};

// inherit the EventEmitter
util.inherits(Tails, events.EventEmitter);

// read block based on input file and separator
Tails.prototype.readBlock = function () {
  var block, stream,
    self = this;

  if (this.queue.length >= 1) {
    block = this.queue.shift();
    if (block.end > block.start) {
      stream = fs.createReadStream(this.filename, {
        start: block.start,
        end: block.end - 1,
        encoding: "utf-8"
      });
      stream.on('error', function(error) {
        return self.emit('error', error);
      });
      stream.on('end', function() {
        if (self.queue.length >= 1) {
          return self.internalDispatcher.emit("next");
        }
      });
      return stream.on('data', function(data) {
        var chunk, parts, _i, _results;

        self.buffer += data;
        parts = self.buffer.split(self.separator);
        self.buffer = parts.pop();
        _results = [];
        for (_i = 0; _i < parts.length; _i++) {
          chunk = parts[_i];
          _results.push(self.emit("line", chunk));
        }
        return _results;
      });
    }
  }
};

// watching the file
Tails.prototype.watch = function () {
  var self = this;
  if (this.isWatching) {
    return;
  }
  this.isWatching = true;
  if (fs.watch) {
    this.watcher = fs.watch(this.filename, this.fsWatchOptions, function(e) {
      return self.watchEvent(e);
    });
    return this.watcher;
  } else {
    return fs.watchFile(this.filename, this.fsWatchOptions, function(curr, prev) {
      return self.watchFileEvent(curr, prev);
    });
  }
};

// unwatching the file
Tails.prototype.unwatch = function () {
  if (fs.watch && this.watcher) {
    this.watcher.close();
    this.pos = 0;
  } else {
    fs.unwatchFile(this.filename);
  }
  this.isWatching = false;
  this.queue = [];

  return this;
};

//
// ### function addConsumer(consumer, options)
//
Tails.prototype.addConsumer = function (consumer, options) {
  var instance = new (consumer)(options);

  // validate the consumer
  if (!instance.name && !instance.consume) {
    throw new Error("");
  }

  this.consumers[instance.name] = instance;

  return this;
};

//
// ### function removeConsumer (consumer)
//
Tails.prototype.removeConsumer = function (consumer) {
  delete this.consumers[consumer.name];
  return this;
};

// emit event for watching
Tails.prototype.watchEvent = function (e) {
  var self = this;
  if (e === 'change') {
    return fs.stat(this.filename, function(err, stats) {
      if (err) {
        self.emit('error', err);
      }
      if (stats.size < self.pos) {
        self.pos = stats.size;
      }
      if (stats.size > self.pos) {
        self.queue.push({
          start: self.pos,
          end: stats.size
        });
        self.pos = stats.size;
        if (self.queue.length === 1) {
          return self.internalDispatcher.emit("next");
        }
      }
    });
  } else if (e === 'rename') {
    this.unwatch();
    return setTimeout(function() {
      return self.watch();
    }, 1000);
  }
};

// emit file watch events
Tails.prototype.watchFileEvent = function(curr, prev) {
  if (curr.size > prev.size) {
    this.queue.push({
      start: prev.size,
      end: curr.size
    });
    if (this.queue.length === 1) {
      return this.internalDispatcher.emit("next");
    }
  }
};
