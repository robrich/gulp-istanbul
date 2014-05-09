"use strict";
var through = require('through2').obj;
var path = require("path");
var istanbul = require("istanbul");
var hook = istanbul.hook;
var Report = istanbul.Report;
var Collector = istanbul.Collector;
var instrumenter = new istanbul.Instrumenter();

var plugin  = module.exports = function () {
  var fileMap = {};

  hook.hookRequire(function (path) {
    return !!fileMap[path];
  }, function (code, path) {
    return fileMap[path];
  });

  return through(function (file, enc, cb) {
    if (!file.contents instanceof Buffer) {
      return cb(new Error("gulp-istanbul: streams not supported"), undefined);
    }

    instrumenter.instrument(file.contents.toString(), file.path, function (err, code) {
      if (!err) file.contents = new Buffer(code);

      fileMap[file.path] = file.contents.toString();

      return cb(err, file);
    });
  });
};

plugin.writeReports = function (opts) {
  if (!opts) opts = {};
  if (typeof opts === 'string') opts = { dir: opts };
  if (!opts.dir) opts.dir = path.join(process.cwd(), "coverage");
  if (!opts.reporters) opts.reporters = [ "lcov", "json", "text", "text-summary" ];
  if (!opts.reportOpts) opts.reportOpts = { dir: opts.dir };

  var reporters = opts.reporters.map(function (type) {
    return Report.create(type, opts.reportOpts);
  });

  var cover = through();

  cover.on('end', function() {

    var collector = new Collector();
    collector.add(global.__coverage__);
    reporters.forEach(function (report) {
      report.writeReport(collector, true);
    });

  }).resume();

  return cover;

};
