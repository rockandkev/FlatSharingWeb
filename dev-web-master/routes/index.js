var express = require('express');
var router = express.Router();

var formidable = require('formidable');
var fs = require('fs-extra');

router.post('/_editUser/:id', function(req, res, next) {
    var db = req.db,
        body = req.body,
        params = req.params,
        session = req.session;
    var ucollection = db.get('usercollection');
    var user = {
        "firstname" : body.firstname,
        "lastname" : body.lastname,
        "login" : body.login,
        "mail" : body.mail,
        "pass" :  body.pass
    };

    ucollection.update({_id : params.id}, {$set : user}, function(){
        session.user = user;
        return res.redirect("/")
    });
});

router.post('/_setuser', function(req, res, next) {
    var db = req.db,
        body = req.body,
        session = req.session;

    var ucollection = db.get('usercollection');
    var user = {
        "firstname" : body.firstname,
        "lastname" : body.lastname,
        "login" : body.login,
        "mail" : body.mail,
        "pass" :  body.pass
    };
    ucollection.insert(user, {}, function (err, user) {
        session.user = user;
        return res.redirect("/")
    });
});

router.post('/_setcasa', function(req, res, next) {
    var db = req.db,
        body = req.body,
        session = req.session;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');
    var form = new formidable.IncomingForm();
    var new_file = Math.floor(Math.random() * 100000) + ((new Date()).getTime()) + '.jpg';
    var new_location = 'C:\\Users\\kevin\\Downloads\\dev-web-master(1)\\dev-web-master\\public\\images\\casas\\' + new_file;

    if (typeof session.user === 'undefined')
        return res.redirect("/");

    form.parse(req, function(err, fields, files) {
        var casa = {
            admin : session.user._id,
            users : [session.user._id],
            adress : fields.adress,
            name : fields.name,
            pic : new_file
        };
        ccollection.insert(casa);
        session.casa = casa;
        res.redirect("/");
    });

    form.on('end', function(fields, files) {
        var temp_path = this.openedFiles[0].path;
        var is = fs.createReadStream(temp_path);
        var os = fs.createWriteStream(new_location);
        is.pipe(os);
        is.on('end',function() {
            fs.unlinkSync(temp_path);
        });
    });
});

router.post('/_setevent', function(req, res, next) {
    var db = req.db,
        body = req.body,
        session = req.session;
    var ucollection = db.get('usercollection'),
        ecollection = db.get('eventcollection'),
        acollection = db.get('acceptencecollection'),
        ccollection = db.get('casacollection');
    var event = {
        "name" : body.name,
        "adress" : body.adress,
        "description" : body.description,
        "need" : body.need,
        "date" : (new Date(body.year, body.month, body.day, body.hour)).getTime(),
        "casas" : [],
        "admin" : session.user._id
    };
    var userTab = [],
        casaTab = [],
        eventTab = [];
    var tabId = -1,
        acceptence;

    if (typeof session.casa == 'undefined')
        return res.redirect("/");

    for (i = 0; i < 100; i++) {
        if (typeof  body["casa" + i] !== "undefined") {
            casaTab[++tabId] = {_id : body["casa" + i]};
            event.casas[tabId] = body["casa" + i];
        }
    }
    casaTab[++tabId] = {_id : session.casa._id};
    event.casas[tabId] = session.casa._id;
    ecollection.insert(event, {}, function(err, event){
        ccollection.find({$or : casaTab}, {}, function(e, cdoc){
            if (cdoc.length) {
                var  acceptence = {
                    e_id : event._id.toString(),
                    acceptence : 0
                };
                for (ic = 0; ic < cdoc.length; ic++) {
                    for (iu = 0; iu < cdoc[ic].users.length; iu++) {
                        acceptence = {
                            e_id : event._id.toString(),
                            acceptence : 0,
                            u_id : cdoc[ic].users[iu]
                        };
                        acollection.insert(acceptence);
                    }
                }
                setTimeout(function () {
                    res.redirect("/event/" + event._id);
                }, 300);
            } else
                res.redirect("/event");
        });
    });
});

router.post('/_login', function(req, res, next) {
    var db = req.db,
        body = req.body,
        session = req.session;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');

    ucollection.find({ "login" : body.login, "pass" : body.pass },{},function(e,udoc){
        if (udoc.length) {
            session.user = udoc[0];
            ccollection.find({}, {}, function(e,cdoc){
                for	(cid = 0; cid < cdoc.length; cid++) {
                    for	(id = 0; id < cdoc[cid].users.length; id++) {
                        if (cdoc[cid].users[id] == udoc[0]._id)
                            session.casa = cdoc[cid];
                    }
                }
                res.redirect("/");
            });
        } else
            res.redirect("/");
    });
});

router.post('/_editCasa/:id', function(req, res, next){
    var db = req.db,
        body = req.body,
        session = req.session;

    var ccollection = db.get('casacollection');
    ccollection.update({_id : req.params.id }, {$set: {name : body.name, adress: body.adress}}, function(e, cdoc){

    });
    res.redirect("/");
});


router.get('/_login', function(req, res, next) {
    var session = req.session;

    session.user = undefined;
    session.casa = undefined;
    res.redirect("/");
});

router.get('/rmcasa/:id', function(req, res, next) {
    var db = req.db;
    var ccollection = db.get('casacollection');

    ccollection.remove({_id : req.params.id});
    res.redirect("/");
});

router.get('/rmevent/:eid', function(req, res, next) {
    var db = req.db;
    var ecollection = db.get('eventcollection');

    ecollection.remove({_id : req.params.eid});
    res.redirect("/event");
});

router.get('/_rmevent/:eid/:uid', function(req, res, next) {
    var db = req.db;
    var acollection = db.get('acceptencecollection');

    acollection.remove({e_id : req.params.eid, u_id : req.params.uid});
    res.redirect("/event/" + req.params.eid);
});

router.get('/_setcasa/:id', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');
    var tab;

    ccollection.find({_id : req.params.id}, {}, function(e, cdoc) {
        if (cdoc.length) {
            tab = cdoc[0].users;
            tab.push(session.user._id);
            cdoc[0].users = tab;
            ccollection.update({_id: cdoc[0]._id}, {$set: {users : tab}});
            session.casa = cdoc[0];
        }
        return res.redirect("/");
    });
});

router.get('/user', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var ucollection = db.get('usercollection'),
        ccollection = db.get('casacollection');

    if (typeof req.session.casa == 'undefined') {
        return res.redirect("/");
    }
    res.render("userEdit", {user : session.user })
});

router.get('/userCreate', function(req, res, next) {
    if (typeof req.session.user !== 'undefined')
        return res.redirect("/");
    res.render('register', {user : req.session.user });
});

router.get('/casaAdmin/:id', function(req, res, next) {
    var ccollection = db.get('casacollection'),
        ucollection = db.get('usercollection');

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({ "_id" : req.param.id },{},function(e,cdoc){
        if (cdoc.length) {
            res.render('casaAdmin', {
                user : req.session.user,
                "casa": cdoc[0]
            });
        } else
            return res.redirect("/");
    });
});

router.get('/casaCreate', function(req, res, next) {
    var db = req.db,
        body = req.body,
        session = req.session;

    var ccollection = db.get('casacollection');

    if (typeof req.session.user == 'undefined')
        return res.redirect("/");
    ccollection.find({ "mail" : body.mail, "pass" : body.pass },{},function(e,cdoc) {
        res.render('casaCreate', {
            user : req.session.user,
            casas : cdoc
        });
    });
});

router.get('/casa/:id', function(req, res, next) {
    var db = req.db,
        params = req.params,
        session = req.session;
    var ccollection = db.get('casacollection'),
        ucollection = db.get('usercollection');
    var uTab = [];


    if (typeof session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({_id : params.id}, {}, function(e,cdoc){
        for (i = 0; i < cdoc[0].users.length; i++)
            uTab.push({ _id : cdoc[0].users[i]});
        ucollection.find({$or : uTab}, {}, function(e,udoc){
            if (cdoc.length) {
                res.render("casa", {casa : cdoc[0], user : session.user, users : udoc })
            } else
                return res.redirect("/");
        });
    });
});

router.get('/casa', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var ccollection = db.get('casacollection'),
        ucollection = db.get('usercollection');
    var uTab = [];

    if (typeof session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({_id : session.casa._id}, {}, function(e,cdoc){
        for (i = 0; i < cdoc[0].users.length; i++)
            uTab.push({ _id : cdoc[0].users[i]});
        ucollection.find({$or : uTab}, {}, function(e,udoc){
            if (cdoc.length) {
                res.render("casa", {casa : cdoc[0], user : session.user, users : udoc })
            } else
                return res.redirect("/");
        });
    });
});

router.get('/casas', function(req, res, next) {
    var db = req.db;
    var ccollection = db.get('casacollection');

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({},{},function(e,cdoc){
        if (cdoc.length)
            res.render("casas", {casas : cdoc, user : req.session.user });
        else
            return res.redirect("/");
    });
});

router.get('/eventCreate', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var ccollection = db.get('casacollection');

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({},{},function(e,cdoc) {
        if (cdoc.length)
            res.render('eventCreate', {casas : cdoc, user : session.user, avoid : session.casa._id });
        else
            res.redirect("/");
    });

});

router.get('/accept/:id/:val', function(req, res, next) {
    var db = req.db,
        params = req.params,
        session = req.session;
    var acollection = db.get('acceptencecollection');

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    acollection.update({ "_id" : params.id }, { $set : { acceptence : parseInt(params.val) } });
    res.redirect("/");
});

router.get('/event/:id', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var acollection = db.get('acceptencecollection'),
        ucollection = db.get('usercollection'),
        ecollection = db.get('eventcollection');
    var userTab = [],
        acceptenceCounter = [0,0,0],
        id = -1,
        accept;

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    acollection.find({ "e_id" : req.params.id },{},function(e,adoc){
        if (adoc.length) {
            ecollection.find({ _id : req.params.id }, {}, function(e, edoc){
                if (edoc.length) {
                    for (i = 0; i < adoc.length; i++) {
                        userTab[++id] = { _id : adoc[i].u_id };
                        acceptenceCounter[parseInt(adoc[i].acceptence) + 1]++;
                        if (adoc[i].u_id == session.user._id)
                            accept = adoc[i];
                    }
                    ucollection.find({$or : userTab}, {}, function(e, udoc){
                        res.render('event', {event: edoc[0], user: req.session.user, users : udoc, acceTab : acceptenceCounter, accept : accept});
                    });
                } else
                    res.redirect("/");
            });
        } else
            res.redirect("/");
    });
});

router.get('/event', function(req, res, next) {
    var db = req.db,
        session = req.session;
    var acollection = db.get('acceptencecollection'),
        ecollection = db.get('eventcollection');
    var eventTab = [],
        futu = [],
        pass = [];

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    acollection.find({ "u_id" : session.user._id },{},function(e,adoc){
        for (i = 0; i < adoc.length; i++)
            eventTab[i] = { _id : adoc[i].e_id };
        ecollection.find({$or : eventTab}, {}, function(e, edoc){
            var date = (new Date()).getTime();

            if (typeof edoc === 'undefined')
                edoc = [];
            for (i = 0; edoc && i < edoc.length; i++) {
                if (date > edoc[i].date)
                    pass.push(edoc[i]);
                else
                    futu.push(edoc[i]);
            }
            res.render('eventList', {events: edoc, user : req.session.user, futu : futu, pass : pass});
        });
    });
});

router.get('/login', function(req, res, next)  {
    res.render('login', {user : req.session.user });
});

router.get('/', function(req, res, next) {
    if (typeof req.session.user !== 'undefined'
        && typeof req.session.casa === 'undefined')
        res.redirect("/casaCreate");
    else
        res.render('index', {user : req.session.user });
});

router.get('/_rmuser/:casa_id/:user_id', function(req, res, next){
    var db = req.db,
        session = req.session;
    var ccollection = db.get('casacollection');

    if (typeof req.session.casa == 'undefined')
        return res.redirect("/");
    ccollection.find({ "_id" : req.params.casa_id},{},function(e,adoc){
        if (adoc.length) {
            var usersCasa = adoc[0].users;
            usersCasa.remove(req.params.user_id);
            ccollection.update({_id: adoc[0]._id}, {$set : {users: usersCasa}});
        }
    });
    res.redirect("/");
});

module.exports = router;