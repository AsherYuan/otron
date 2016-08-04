var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');


/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'otron');

// 基础
app.configure('production|development', 'connector|user', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      heartbeat : 30,
      useDict : false,
      useProtobuf : false
    });
});

// 缓存连接池
app.configure('production|development', 'user', function() {
  app.loadConfig('memcached', app.getBase() + '/config/memcached.json');
  var memclient = require('./app/memcached/memcached').init(app);
  app.set('memclient', memclient);

  app.route('user', routeUtil.user);

  app.enable('systemMonitor');
  var curServer = app.getCurServer();
  var serverid = curServer.serverid;
  app.set('otron_Serverid', serverid);
  // TODO 过滤器拦截session是否合理，需要再考虑，然后过滤器写法有问题，再研究
  // app.filter(require("./app/domain/filter/authFilter"));
});

// start app
app.start();

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});