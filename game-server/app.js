var pomelo = require('pomelo');
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

// start app
app.start();

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});