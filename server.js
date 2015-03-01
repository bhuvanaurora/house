var config = require('./config.prod.json');           // General config file
var s3_config = require('./s3_config.json');          // AWS S3 config file

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var gm = require('gm');                               // npm install gm

var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var mongoose = require('mongoose');
var jwt = require('jwt-simple');
var moment = require('moment');
var session = require('cookie-session');              // npm install cookie-session
var cookieParser = require('cookie-parser');          // npm install cookie-parser

var async = require('async');
var request = require('request');
var xml2js = require('xml2js');
var mime = require('mime');                          // sudo npm install mime
var multipart = require('connect-multiparty');       // npm install connect-multiparty

var agenda = require('agenda')({ db: { address: 'localhost:27017/test' } });
var sugar = require('sugar');
var nodemailer = require('nodemailer');
var _ = require('lodash');

var fs = require('fs');
var AWS = require('aws-sdk');                        // npm install aws-sdk
AWS.config = s3_config;
var s3 = new AWS.S3();
var buf = new Buffer('');

var tokenSecret = 'your unique secret';


// -------------------------------------- Schemas --------------------------------------- //

var houseSchema = new mongoose.Schema({
  _id: String,
  address: String,
  neighborhood: String,
  neighPictures: [String],
  city: String,
  pictures: [String],
  amenities: [String],
  rating: { type: Number, default: 2.5 },
  reviews: [String],
  status: String,
  addedBy: [{
      type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
  owner: [{
      type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }]
});

/*var showSchema = new mongoose.Schema({
  _id: Number,
  name: String,
  airsDayOfWeek: String,
  airsTime: String,
  firstAired: Date,
  genre: [String],
  network: String,
  overview: String,
  rating: Number,
  ratingCount: Number,
  status: String,
  poster: String,
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
  episodes: [{
      season: Number,
      episodeNumber: Number,
      episodeName: String,
      firstAired: Date,
      overview: String
  }]
});*/

var userSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  facebook: {
    id: String,
    email: String
  },
  google: {
    id: String,
    email: String
  },
  reviews: [String],
  rating: Number,
  pic: String,
  houseOwned: {
      type: mongoose.Schema.Types.ObjectId, ref: 'House'
  },
  isActive: { type: Boolean, default: true }
});

userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

var User = mongoose.model('User', userSchema);
//var Show = mongoose.model('Show', showSchema);
var House = mongoose.model('House', houseSchema);

mongoose.connect('localhost');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multipart({
  uploadDir: './tmp'
}));

app.use(cookieParser('!^&secretKey-for_house)(_'));
app.use(session({secret:'&^*^asldh#$9234('}));


// ----------------------------------- Authentication -------------------------------------- //


function ensureAuthenticated(req, res, next) {
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(' ')[1];
    try {
      var decoded = jwt.decode(token, tokenSecret);
      if (decoded.exp <= Date.now()) {
        res.send(400, 'Access token has expired');
      } else {
        req.user = decoded.user;
        return next();
      }
    } catch (err) {
      return res.send(500, 'Error parsing token');
    }
  } else {
    return res.send(401);
  }
}

function createJwtToken(user) {
  var payload = {
    user: user,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

app.post('/auth/signup', function(req, res, next) {
  var user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  });
  user.save(function(err) {
    if (err) return next(err);
    res.send(200);
  });
});

app.post('/auth/login', function(req, res, next) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) return res.send(401, 'User does not exist');
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) return res.send(401, 'Invalid email and/or password');
      var token = createJwtToken(user);
      req.session.loginTime = Date.now();
      req.session.city = 'Bangalore';
      res.send({ token: token });
    });
  });
});

app.post('/auth/facebook', function(req, res, next) {
  var profile = req.body.profile;
  var signedRequest = req.body.signedRequest;
  var encodedSignature = signedRequest.split('.')[0];
  var payload = signedRequest.split('.')[1];

  var appSecret = '298fb6c080fda239b809ae418bf49700';

  var expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('base64');
  expectedSignature = expectedSignature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  if (encodedSignature !== expectedSignature) {
    return res.send(400, 'Invalid Request Signature');
  }

  User.findOne({ facebook: profile.id }, function(err, existingUser) {
    if (existingUser) {
      var token = createJwtToken(existingUser);
      req.session.loginTime = Date.now();
      req.session.city = 'Bangalore';
      return res.send(token);
    }
    var user = new User({
      name: profile.name,
      facebook: {
        id: profile.id,
        email: profile.email
      }
    });
    user.save(function(err) {
      if (err) return next(err);
      var token = createJwtToken(user);
      req.session.loginTime = Date.now();
      req.session.city = 'Bangalore';
      res.send(token);
    });
  });
});

app.post('/auth/google', function(req, res, next) {
  var profile = req.body.profile;
  User.findOne({ google: profile.id }, function(err, existingUser) {
    if (existingUser) {
      var token = createJwtToken(existingUser);
      req.session.loginTime = Date.now();
      req.session.city = 'Bangalore';
      return res.send(token);
    }
    var user = new User({
      name: profile.displayName,
      google: {
        id: profile.id,
        email: profile.emails[0].value
      }
    });
    user.save(function(err) {
      if (err) return next(err);
      var token = createJwtToken(user);
      req.session.loginTime = Date.now();
      req.session.city = 'Bangalore';
      res.send(token);
    });
  });
});


// -------------------------------------------- APIs ----------------------------------------- //

app.post('/api/session', ensureAuthenticated, function(req, res, next) {

  if (Date.now() - req.session.loginTime > 72000000) {               // Session expires in 20 hours
    return res.status(200).json({
      'session': 'expired',
      'city': req.session.city,
    });
  } else {
    return res.status(200).json({
      'session': 'OK',
      'city': req.session.city,
    });
  }

});


app.get('/api/users', ensureAuthenticated, function(req, res, next) {

  if (!req.query.email) {
    return res.send(400, { message: 'Email parameter is required.' });
  }

  User.findOne({ email: req.query.email }, function(err, user) {
    if (err) return next(err);
    res.send({ available: !user });
  });
});


app.get('/api/profile/:id', ensureAuthenticated, function(req, res, next) {
  user_details = {};
  User.findById(req.params.id, function(err, user) {
    if (err) return next (err);
    user_details._id = user._id;
    user_details.email = user.email;
    user_details.name = user.name;
    user_details.houseOwned = user.houseOwned;
    user_details.isActive = user.isActive;
    user_details.pic = user.pic;
    res.send(user_details);
  })
})


app.get('/api/editprofile/:id', ensureAuthenticated, function(req, res, next) {
  User.findById(req.params.id, function (err, user) {
    if (err) return next(err);
    res.send(user);
  })
});


app.put('/api/editprofile', ensureAuthenticated, function(req, res, next) {
  console.log
  User.findById(req.body.id, function(err, user) {
    if (err) return next (err);
    user.houseOwned = req.body.houseOwned;

    user.save(function(err) {
      if (err) return next(err);
      res.status(200).end();
    });
  });
});


app.get('/api/houses', function(req, res, next) {
  var query = House.find();

  function sort_by_neighborhood () {
    query.where({ neighborhood: req.query.neighborhood });
  }

  function sort_by_alphabet () {
    query.where({ neighborhood: new RegExp('^' + '[' + req.query.alphabet + ']', 'i') });
  }

  function sort_by_city () {
    query.where({ city: req.query.city });
  }

  if (req.query.neighborhood) {
    sort_by_neighborhood();
  } else if (req.query.alphabet) {
    sort_by_alphabet();
  } else if (req.query.city && req.query.neighborhood) {
    sort_by_city();
    sort_by_neighborhood();
  } else if (req.query.city) {
    sort_by_city();
  }

  query.exec(function(err, houses) {
    if (err) return next(err);
    res.send(houses);
  });

});


app.get('/api/houses/:id', ensureAuthenticated, function(req, res, next) {
  House.findById(req.params.id, function(err, house) {
    if (err) return next(err);
    res.send(house);
  })
});


app.post('/api/houses', ensureAuthenticated, function(req, res, next) {
  var house = new House({
    _id: req.body.id,
    city: req.body.city,
    neighborhood: req.body.neighborhood,
    address: req.body.address,
    amenities: req.body.amenities,
    pictures: req.body.pictures,
    status: req.body.status,
    addedBy: req.body.addedBy,
    owner: req.body.owner
  });

  house.save(function(err) {
    if (err) return next(err);
    res.send(200).end();
  });
});


app.get('/api/addOwner/:id', ensureAuthenticated, function(req, res, next) {
  User.findById(req.params.id, function(err, user) {
    if (err) return next(err);
    console.log(user);
    res.send(user);
  })
});


app.post('/api/addOwner', ensureAuthenticated, function(req, res, next) {
  var owner = new User({
    name: req.body.name,
    pic: req.body.pic,
    isActive: req.body.isActive
  });

  owner.save(function(err) {
    if (err) return next(err);
    res.send(owner);
  });
});


app.post('/upload', ensureAuthenticated, function(req, res, next) {
  
  var filePath = path.join(__dirname, req.files.file.path);
  
  gm(filePath)
      .resize(600, 400)
      .stream(function(err, stdout, stderr) {
        var buf = new Buffer('');
        var imageName = Date.now() + req.files.file.name;
        stdout.on('data', function(data) {
          buf = Buffer.concat([buf, data]);
        });
        stdout.on('end', function(data) {
          var data = {
            Bucket: "house-image",
            Key: imageName,
            Body: buf,
            ContentType: mime.lookup(req.files.file.name)
          };
          s3.putObject(data, function(err, res) {
            if (err) throw(err);
          });
          res.status(200).json({
            imageurl: imageName
          });
          console.log('Image uploaded');
        });
      });

});


app.post('/uploadProfilePic', ensureAuthenticated, function(req, res, next) {
  
  var filePath = path.join(__dirname, req.files.file.path);
  
  gm(filePath)
      .resize(400, 400)
      .stream(function(err, stdout, stderr) {
        var buf = new Buffer('');
        var imageName = 'Profile' + Date.now() + req.files.file.name;
        stdout.on('data', function(data) {
          buf = Buffer.concat([buf, data]);
        });
        stdout.on('end', function(data) {
          var data = {
            Bucket: "house-image",
            Key: imageName,
            Body: buf,
            ContentType: mime.lookup(req.files.file.name)
          };
          s3.putObject(data, function(err, res) {
            if (err) throw(err);
          });
          res.status(200).json({
            imageurl: imageName
          });
          console.log('Profile pic uploaded');
        });
      });

});


/*app.get('/api/shows', function(req, res, next) {
  var query = Show.find();
  if (req.query.genre) {
    query.where({ genre: req.query.genre });
  } else if (req.query.alphabet) {
    query.where({ name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i') });
  } else {
    query.limit(12);
  }
  query.exec(function(err, shows) {
    if (err) return next(err);
    res.send(shows);
  });
});

app.get('/api/shows/:id', function(req, res, next) {
  Show.findById(req.params.id, function(err, show) {
    if (err) return next(err);
    res.send(show);
  });
});

app.post('/api/shows', function (req, res, next) {
  var seriesName = req.body.showName
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '9EF1D1E7D28FDA0B';
  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });

  async.waterfall([
    function (callback) {
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function (error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function (err, result) {
          if (!result.data.series) {
            return res.send(400, { message: req.body.showName + ' was not found.' });
          }
          var seriesId = result.data.series.seriesid || result.data.series[0].seriesid;
          callback(err, seriesId);
        });
      });
    },
    function (seriesId, callback) {
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + seriesId + '/all/en.xml', function (error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function (err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;
          var show = new Show({
            _id: series.id,
            name: series.seriesname,
            airsDayOfWeek: series.airs_dayofweek,
            airsTime: series.airs_time,
            firstAired: series.firstaired,
            genre: series.genre.split('|').filter(Boolean),
            network: series.network,
            overview: series.overview,
            rating: series.rating,
            ratingCount: series.ratingcount,
            runtime: series.runtime,
            status: series.status,
            poster: series.poster,
            episodes: []
          });
          _.each(episodes, function (episode) {
            show.episodes.push({
              season: episode.seasonnumber,
              episodeNumber: episode.episodenumber,
              episodeName: episode.episodename,
              firstAired: episode.firstaired,
              overview: episode.overview
            });
          });
          callback(err, show);
        });
      });
    },
    function (show, callback) {
      var url = 'http://thetvdb.com/banners/' + show.poster;
      request({ url: url, encoding: null }, function (error, response, body) {
        show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, show);
      });
    }
  ], function (err, show) {
    if (err) return next(err);
    show.save(function (err) {
      if (err) {
        if (err.code == 11000) {
          return res.send(409, { message: show.name + ' already exists.' });
        }
        return next(err);
      }
      var alertDate = Date.create('Next ' + show.airsDayOfWeek + ' at ' + show.airsTime).rewind({ hour: 2});
      agenda.schedule(alertDate, 'send email alert', show.name).repeatEvery('1 week');
      res.send(200);
    });
  });
});*/

app.post('/api/subscribe', ensureAuthenticated, function(req, res, next) {
  Show.findById(req.body.showId, function(err, show) {
    if (err) return next(err);
    show.subscribers.push(req.user._id);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    });
  });
});

app.post('/api/unsubscribe', ensureAuthenticated, function(req, res, next) {
  Show.findById(req.body.showId, function(err, show) {
    if (err) return next(err);
    var index = show.subscribers.indexOf(req.user._id);
    show.subscribers.splice(index, 1);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    });
  });
});

app.get('*', function(req, res) {
  res.redirect('/#' + req.originalUrl);
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, { message: err.message });
});

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

agenda.define('send email alert', function(job, done) {
  Show.findOne({ name: job.attrs.data }).populate('subscribers').exec(function(err, show) {
    var emails = show.subscribers.map(function(user) {
      if (user.facebook) {
        return user.facebook.email;
      } else if (user.google) {
        return user.google.email
      } else {
        return user.email
      }
    });

    var upcomingEpisode = show.episodes.filter(function(episode) {
      return new Date(episode.firstAired) > new Date();
    })[0];

    var smtpTransport = nodemailer.createTransport('SMTP', {
      service: 'SendGrid',
      auth: { user: 'hslogin', pass: 'hspassword00' }
    });

    var mailOptions = {
      from: 'Fred Foo ✔ <foo@blurdybloop.com>',
      to: emails.join(','),
      subject: show.name + ' is starting soon!',
      text: show.name + ' starts in less than 2 hours on ' + show.network + '.\n\n' +
        'Episode ' + upcomingEpisode.episodeNumber + ' Overview\n\n' + upcomingEpisode.overview
    };

    smtpTransport.sendMail(mailOptions, function(error, response) {
      console.log('Message sent: ' + response.message);
      smtpTransport.close();
      done();
    });
  });
});

//agenda.start();

agenda.on('start', function(job) {
  console.log("Job %s starting", job.attrs.name);
});

agenda.on('complete', function(job) {
  console.log("Job %s finished", job.attrs.name);
});