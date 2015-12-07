var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.session.user)
        res.redirect("/car");
    else
        res.render('ind');
});

/* connect user DB. */
router.post('/', function(req, res, next) {
    var db = req.db, body = req.body;
    var collection = db.get('usercollection'),
        ccollection = db.get('casacollection');

    collection.find({ "username" : body.login, "pass" : body.pass },{},function(e,udoc){
        if (udoc.length)
            req.session.user = udoc[0];
        ccollection.find({users : udoc[0]}, {}, function(e,cdoc){
            if (udoc.length)
                req.session.casa = cdoc[0];
            res.redirect("/");
        });
    });
});

/* add user formpage. */
router.get('/useradd', function(req, res, next) {
    res.render('useradd');
});

/* add event DB. */
router.all('/events', function(req, res, next) {
    var result = "";
    var db = req.db, body = req.body;
    var ecollection = db.get('eventcollection'),
        ccollection = db.get('casacollection');

    if (req.session.user == undefined)
        res.redirect("/");
    ccollection.find({
        users : req.session.user._id
    },{},function(e,cdoc){
        if (body.event) {
            var event = { "event" : body.event, "date" : body.date, "casas" :  [cdoc[0]._id], "user" : req.session.user._id};
            ecollection.insert(event);
            result = "Events Added"
        }
        ecollection.find({$or : [{users : req.session.user._id}, {casa : req.session.casa._id}]}, {}, function(e, doc) {
            res.render('events', {events: doc, user: req.session.user, result : result});
        });
    });
});

/* add task DB. */
router.all('/tasks', function(req, res, next) {
    var result = "";
    var db = req.db, body = req.body;
    var tcollection = db.get('taskcollection');

    if (req.session.user == undefined)
        res.redirect("/");
    console.log(body);
    if (body.name) {
        var task = { "task" : body.name, "date" : body.date, "weight" :  body.weight, "user" : req.session.user._id};
        tcollection.insert(task);
        result = "Task Added"
    }
    tcollection.find({}, {}, function(e, doc) {
        res.render('tasks', {tasks: doc, user: req.session.user, result : result});
    });
});

/* add user DB. */
router.all('/adduser', function(req, res, next) {
    var db = req.db, body = req.body;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');
    var user = { "username" : body.textinput, "email" : body.mail, "pass" :  body.password};

    if (body.textinput) {
        ucollection.insert(user);
        console.log(user);
    } else
        user = req.session.user;
    ccollection.find({}, {}, function(e, cdoc) {
        res.render('adduser', {casas: cdoc, uid: user._id});
    });
});

/* add user to casa DB. */
router.post('/addusercasa', function(req, res, next) {
    var db = req.db,
        body = req.body;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');
    ucollection.find({ _id: body.uid}, {}, function(e, udoc) {
        ccollection.find({_id : body.casaselector}, {}, function(e, cdoc) {
            cdoc[0].users.push(req.session.user._id);
            var nvTab = cdoc[0].users;
            ccollection.update({_id : body.casaselector},
                {$set : {users : nvTab}}, function() {
                    res.redirect("/car");
                });
        });
    });
});

/* GET Home */
router.get('/car', function(req, res, next) {
    var db = req.db;
    var collection = db.get('casacollection');

    if (!req.session.user)
        res.redirect("/");
    collection.find({
        users : req.session.user._id
    },{},function(e,cdoc){
        console.log(cdoc);
        if (cdoc.length == 0)
            res.redirect("/adduser");
        else {
            var collection = db.get('taskcollection');
            collection.find({},{},function(e,tdoc) {
                res.render('car', {
                    "user": req.session.user,
                    "tasks": tdoc,
                    "casas": cdoc
                });
            });
        }
    });
});

/* GET test page. */
router.get('/tmp', function(req, res, next) {
    var db = req.db;
    var ucollection = db.get('taskcollection'),
        ccollection = db.get('casacollection');
        ucollection.remove();
    res.render('index', { title: 'test Page' });
});

module.exports = router;
