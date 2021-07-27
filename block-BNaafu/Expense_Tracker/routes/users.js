var express = require('express');
var User = require('../models/User');
var multer = require('multer');
var path = require('path');
var auth = require('../middlewares/auth');
let Income = require('../models/Income');
let Expense = require('../models/Expense');

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
// router.get('/dashboard', (req, res, next) => {
//   let userId = req.session.userId || req.session.passport.user;
//   User.findOne({_id: userId }, (err, user) => {
//     if(err) return next(err);
//     res.render('dashboard', { user });
//   });
// })


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
    req.flash('success', 'User registered successfully!');
    res.redirect('/users/login');
  });
});

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
      } else if(result) {
        if(user.isVerified) {
          req.session.userId = user.id;
          res.redirect(req.session.returnTo || '/users/dashboard');
          delete req.session.returnTo;
        } else {
          req.flash('error', 'Please verify your email before login!');
          return res.redirect('/users/login');
        }
      }

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

