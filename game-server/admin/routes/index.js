var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.post('/login', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  if(username === 'admin' && password === 'admin') {
    var user = { username:username, password:password };
    req.session.user = user;
    res.redirect('/index');
  } else {
    res.redirect('/');
  }
});

router.post("/index", function(req, res, next) {
  res.render('index', {user:req.session.user});
});

module.exports = router;
