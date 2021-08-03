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
var sendgridTransport = require('nodemailer-sendgrid-transport');
var bcrypt = require('bcrypt');

var router = express.Router();

function randomNumber() {
  let str = "0123456789", str2 = "";
 for(let i = 0; i <= 5; i++) {
    str2 += str[Math.floor(Math.random() * 9)];
}
  return str2;
}

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
          if (err) { 
          return res.status(500).send({msg:'Technical Issue!, Please click on resend to verify your Email.'});
        } else {
          req.flash('success', 'A verification email has been sent to ' + user.email + '. It will expire after one day. If you not get verification Email click on resend token.');
          res.redirect('/users/login');
        }
      });
    });
  });
})



// Login
router.get('/login', (req,res, next) =>  {
  var error = req.flash('error')[0];
  var success = req.flash('success')[0];
  let info = req.flash('info')[0];
  res.render('login', { error, success, info });
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

//render forgot password page
router.get('/login/forgotpassword', (req, res, next) => {
  let error = req.flash('error')[0];
  let info = req.flash('info')[0];
  res.render('forgotPassword', {error, info});
});

let code = randomNumber();
//process forgot password
router.post('/login/forgotpassword', (req, res, next) => {
  let {email} = req.body;
  req.body.random = code;
  console.log(req.body.random);
  User.findOneAndUpdate({email}, req.body, (err, user) => {
    if(err) return next(err);
    console.log(user);
    if(!user) {
      req.flash('error', 'The Email entered is not Registered, Please register!');
      return res.redirect('/users/login/forgotpassword');
    }
    const transporter = nodemailer.createTransport({
      service: 'Sendgrid', 
      auth: { 
        user: 'apikey', 
        pass: process.env.SENDGRID_APIKEY,
      }
    });
    
    const mailOptions = {
      from: 'shisgupal.bhu@gmail.com',
      to: email,
      subject: 'Verification Email',
      html: `<h1>${req.body.random}</h1>
              <h2>Please Copy above 6 digit number and visit this link http://localhost:3000/users/login/resetpassword/verify </h2>`

    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if(err) return next(err);
      req.flash("info", "A verification code has been sent to your email");
      req.session.email = email;
      res.redirect('/users/login/resetpassword/verify');
    })
  })
});

//render reset password verification code page
router.get('/login/resetpassword/verify', (req, res, next) => {
  let error = req.flash('error')[0];
  let info = req.flash('info')[0];
  res.render('resetPasswordVerificationCode', {error, info});
});


//process verification code
router.post('/login/resetpassword/verify', (req, res, next) => {
  let email = req.session.email;
  let {passcode} = req.body;
  User.findOne({email}, (err, user) => {
    if(err) return next(err);
    if(passcode == code) {
      return res.redirect('/users/login/resetpassword');
    } else {
      req.flash('error', "Invalid verification code");
      res.redirect('/users/login/resetpassword/verify');
    }
  })
});

//render reset password page
router.get('/login/resetpassword', (req, res, next) => {
  let error = req.flash("error")[0];
  res.render('resetPassword', {error});
});

//reset password
router.post('/login/resetpassword', (req, res, next) => {
  let {newPasswd1, newPasswd2} = req.body;
  let email = req.session.email;
  if(newPasswd1 === newPasswd2) {
    User.findOne({email}, (err, user) => {
      if(err) return next(user);
      bcrypt.hash(newPasswd1, 10, (err, hashed) => {
        if(err) return next(err);
        req.body.password = hashed;
        User.findOneAndUpdate({email}, req.body, (err, user) => {
          if(err) return next(err);
          req.flash("info", ("Password has been changed Successfully"))
          return res.redirect('/users/login');
        })
        
      })
    })
  } else {
    req.flash("error", ("Password does not match"));
    res.redirect('/users/login/resetpassword');
  }
});

router.use(auth.loggedInUser);

router.get('/dashboard', (req, res, next) => {
  let userId = req.session.userId || req.session.passport.user;
  User.findOne({_id: userId }, (err, user) => {
    if(err) return next(err);
          res.render('dashboard', { user: user });
        })
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
