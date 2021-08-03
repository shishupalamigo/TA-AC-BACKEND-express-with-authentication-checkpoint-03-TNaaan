var passport = require('passport');
var User = require('../models/User');

var GitHubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;


// Github Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
    // console.log(profile);
    var profileData = {
        name: profile.displayName,
        username: profile.username,
        email: profile._json.email,
        profilePic: profile._json.avatar_url
    }

    User.findOne({ email: profile._json.email }, (err, user) => {
        if(err) return done(err);
        // console.log(user);
        if(!user) {
            User.create(profileData, (err, addedUser) => {
                if(err) return done(err);
                return done(null, addedUser);
            })
        }
        else {
            done(null, user);
        }
    })
}));

// Google strategy

passport.use( new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    var profileData = {
        name: profile.displayName,
        username: profile._json.name,
        email: profile._json.email,
        profilePic: profile._json.picture,
    }

    User.findOne({ email: profile._json.email }, (err, user) => {
        if(err) return done(err);
        console.log(user, 'Existing User with same Email');
        if(!user) {
            User.create(profileData, (err, addedUser) => {
                if(err) return done(err);
                console.log(addedUser, 'User added Sucessfully');
                 return done(null, addedUser);
            })
        }
        else {
            done(null, user);
        }           
    })
}));



passport.serializeUser(function (user, done) {
    console.log(user);
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });


