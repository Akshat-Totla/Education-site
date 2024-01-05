require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch(error => {
        console.error("Error connecting to MongoDB:", error);
    });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

console.log('Google Client ID:', process.env.CLIENT_ID);
console.log('Google Client Secret:', process.env.CLIENT_SECRET);

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
    });
}));

// Set the correct strategy name 'google' for passport.authenticate
app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/callback",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    });

app.get("/", function (req, res) {
    res.render("home");
});


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get('/home', function(req, res) {
  res.render('secrets');
});
app.get('/contact', function(req, res) {
    res.render('contact');
  });

  app.get('/test', function(req, res) {
    res.render('test');
  });
  app.get('/quiz1', function(req, res) {
    res.render('quiz1');
  });
  app.get('/goback', function(req, res) {
    res.render('test');
  });
  app.get('/reset', function(req, res) {
    res.render('quiz1');
  });
app.get("/logout", function (req, res) {
    req.session.destroy(function (err) {
        res.redirect("/");  // Redirect after session is destroyed
    });
});



app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.logIn(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.listen(3000, function () {
    console.log("Server started on port 3000.");
});
