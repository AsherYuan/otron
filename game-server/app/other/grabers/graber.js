"use strict";
var http = require('http');
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');

var graber = module.exports;

graber.grab = function(link, cb) {
  http.get(link, function(resp) {
    var bufferhelper = new BufferHelper(); // 解决中文编码问题
    resp.on("data", function(chunk) {
      bufferhelper.concat(chunk);
    });
    resp.on("end", function() {
      let val = iconv.decode(bufferhelper.toBuffer(), 'GBK');
      cb(val);
    });
  }).on("error", function() {
    cb(null);
  });
};
