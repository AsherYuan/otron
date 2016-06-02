var exp = module.exports;
var utils = require('./utils');
var dispatcher = require('./dispatcher');

exp.user = function(session, msg, app, cb){
    var servers = app.getServersByType('user');

    if(!servers || servers.length === 0) {
        cb(new Error('can not find main servers.'));
        return;
    }

    var serverid = session.get('serverid');
    if (!serverid){
        serverid = utils.getServerId();
    }
    if (!serverid){
        serverid = 1;
    }

    var res = dispatcher.findByServerid(serverid, servers);

    cb(null, res.id);
};