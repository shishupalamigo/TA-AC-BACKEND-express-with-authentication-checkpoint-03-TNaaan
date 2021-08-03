var express = require('express');
var passport = require('passport');
let User = require('../models/User');
let Income = require('../models/Income');
let Expense = require('../models/Expense');
var Token = require('../models/Token');
var nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.user);
  res.render('index', { title: 'Express' });
});

// Github Authentication Routes

router.get('/auth/github', passport.authenticate('github'));

router.get('/auth/github/callback', passport.authenticate('github', 
  { failureRedirect: '/users/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/users/dashboard');
    delete req.session.returnTo;
    // res.redirect('/users/dashboard');
  });


 //Google Authentication Routes 

router.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

router.get('/auth/google/callback', passport.authenticate('google', 
    { failureRedirect: '/users/login' }), (req, res) => {

      res.redirect(req.session.returnTo || '/users/dashboard');
      delete req.session.returnTo;
      // res.redirect('/users/dashboard');
    });

// Email confirmation

router.get('/confirmation/:email/:token', function (req, res, next) {
  Token.findOne({ token: req.params.token }, function (err, token) {
      // token is not found into database i.e. token may have expired 
      if (!token){
          return res.status(400).send({msg:'Your verification link may have expired. Please click on resend for verify your Email.'});
      }
      // if token is found then check valid user 
      else{
          User.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
              // not valid user
              if (!user){
                  return res.status(401).send({msg:'We were unable to find a user for this verification. Please SignUp!'});
              } 
              // user is already verified
              else if (user.isVerified){
                  return res.status(200).send('User has been already verified. Please Login');
              }
              // verify user
              else{
                  // change isVerified to true
                  user.isVerified = true;
                  user.save(function (err) {
                      // error occur
                      if(err){
                          return res.status(500).send({msg: err.message});
                      }
                      // account successfully verified
                      else{
                        return res.status(200).send('Your account has been successfully verified');
                      }
                  });
              }
          });
      }
      
  });
});    



module.exports = router;
