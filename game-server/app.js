var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var authFilter = require('./app/domain/filter/authFilter');
var errorHandler = require('./app/util/errorHandler');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'otron');

// app configuration
app.configure('production|development', 'connector|user', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      heartbeat : 3,
      useDict : false,
      useProtobuf : true
    });
});

app.configure('production|development', 'connector|user', function(){
  app.set('serverConfig',
      {
        reloadHandlers: true
      });
});

app.configure('production|development', function() {
  app.loadConfig('memcached', app.getBase() + '/config/memcached.json');
  var memclient = require('./app/memcached/memcached').init(app);
  app.set('memclient', memclient);

  app.route('user', routeUtil.user);
});


// app configure
app.configure('production|development', 'user', function() {
  app.enable('systemMonitor');
  var curServer = app.getCurServer();
  var serverid = curServer.serverid;
  app.set('otron_Serverid', serverid);

  app.filter(authFilter());
  app.set('errorHandler', errorHandler);
});

// start app
app.start();

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});