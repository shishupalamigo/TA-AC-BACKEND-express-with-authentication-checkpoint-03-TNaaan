var express = require('express');
var User = require('../models/User');
var multer = require('multer');
var path = require('path');
var auth = require('../middlewares/auth');
var Income = require('../models/Income');
var Expense = require('../models/Expense');
var crypto =  require('crypto');
var Token = require('../models/Token');
var nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

var router = express.Router();


var uploadPath = path.join(__dirname, '../', 'public/uploads');
// Strorage for Uploaded Files

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null,  Date.now() + '-' + file.originalname );
  }
})
 
var upload = multer({ storage: storage })


/* GET users listing. */
router.get('/', (req, res, next) => {
  User.find({}, (err, users) => {
    if(err) return next(err);
    res.render('users', { users });
    });
});

// User Registration 

router.get('/register', function(req, res, next) {
    var error = req.flash('error')[0];
    res.render('registration', { error });
});

router.post('/register', upload.single('profilePic') ,(req, res, next) => {
  if (req.file) {
    req.body.profilePic = req.file.filename;
  }
  User.create(req.body, (err, user) => {
    if(err) {
      if(err.name === 'MongoError') {
        req.flash('error', 'This email is already in use');
        return res.redirect('/users/register');
      }
      if(err.name === 'ValidationError') {
        req.flash('error', err.message);
        return res.redirect('/users/register');
      }
    }
        // generate token and save
        var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
        token.save(function (err) {
          if(err){
            return res.status(500).send({msg:err.message});
          }
        // Send email (use credintials of SendGrid)
        var transporter = nodemailer.createTransport({ 
          service: 'Sendgrid', 
          auth: { 
            user: 'apikey', 
            pass: process.env.SENDGRID_APIKEY,
          } 
        });
        var mailOptions = { 
                  from: 'shisgupal.bhu@gmail.com', 
                  to: user.email, 
                  subject: 'Account Verification Link', 
                  text: 'Hello '+ req.body.name +',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' 
        };
        transporter.sendMail(mailOptions, function (err) {
          console.log(mailOptions);
          if (err) { 
          return res.status(500).send({msg:'Technical Issue!, Please click on resend to verify your Email.'});
        } else {
          req.flash('success', 'A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
          res.redirect('/users/login');
        }
      });
    });
  });
})

// // Email confirmation

// router.get('/confirmation/:email/:token', function (req, res, next) {
//   Token.findOne({ token: req.params.token }, function (err, token) {
//       // token is not found into database i.e. token may have expired 
//       if (!token){
//           return res.status(400).send({msg:'Your verification link may have expired. Please click on resend for verify your Email.'});
//       }
//       // if token is found then check valid user 
//       else{
//           User.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
//               // not valid user
//               if (!user){
//                   return res.status(401).send({msg:'We were unable to find a user for this verification. Please SignUp!'});
//               } 
//               // user is already verified
//               else if (user.isVerified){
//                   return res.status(200).send('User has been already verified. Please Login');
//               }
//               // verify user
//               else{
//                   // change isVerified to true
//                   user.isVerified = true;
//                   user.save(function (err) {
//                       // error occur
//                       if(err){
//                           return res.status(500).send({msg: err.message});
//                       }
//                       // account successfully verified
//                       else{
//                         return res.status(200).send('Your account has been successfully verified');
//                       }
//                   });
//               }
//           });
//       }
      
//   });
// });


// Login
router.get('/login', (req,res, next) =>  {
  var error = req.flash('error')[0];
  var success = req.flash('success')[0];
  res.render('login', { error, success });
});

router.post('/login', (req, res, next) => {
  var { email, password } = req.body;
  if(!email || !password) {
    req.flash('error', 'Email/Password required!');
    return res.redirect('/users/login');
  }
  User.findOne({ email }, (err, user) => {
  if(err) return next(err);
    if(!user) {
      req.flash('error', 'This email is not registered');
      return res.redirect('/users/login');
    }
    user.verifyPassword(password, (err, result) => {
      if(err) return next(err);
      if(!result) {
        req.flash('error', 'Incorrect password! Try Again!');
        return res.redirect('/users/login');
      }
       if(!user.isVerified) { 
        req.flash('error', 'Please verify your email before login!');
        return res.redirect('/users/login');
        } 
        req.session.userId = user.id;
        res.redirect(req.session.returnTo || '/users/dashboard');
        delete req.session.returnTo;
    });
  });
});

router.use(auth.loggedInUser);

router.get('/dashboard', (req, res, next) => {
  let userId = req.session.userId || req.session.passport.user;
  User.findOne({_id: userId }, (err, user) => {
    if(err) return next(err);

  Income.find({ userId: userId }, (error, income) => {
    if (error) {
      next(error);
    } else {
      Expense.find({ userId: userId }, (error, expense) => {
        if (error) {
          next(error);
        } else {
          res.render('dashboard', { income: income, expense: expense, user: user });
        }
      });
    }
  });
});
});

router.get('/income', (req, res) => {
  res.render('income');
});

router.post('/income', (req, res) => {
  let userId = req.session.userId || req.session.passport.user;
  req.body.userId = userId;
  Income.create(req.body, (error, income) => {
    if (error) {
      next(error);
    } else {
      res.redirect('/users/dashboard');
    }
  });
});

router.get('/expense', (req, res, next) => {
  res.render('expense');
});

router.post('/expense', (req, res, next) => {
  let userId = req.session.userId || req.session.passport.user;
  req.body.userId = userId;
  Expense.create(req.body, (error, expense) => {
    if (error) {
      next(error);
    } else {
      res.redirect('/users/dashboard');
    }
  });
});

// Logout
router.get('/logout', (req, res, next) => {
  console.log(req.session);
  if(!req.session) {
    req.flash('error', 'You must login first');
    res.redirect('/users/login');  
  }
  else {
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.redirect('/users/login');
  }
}); 

module.exports = router;
