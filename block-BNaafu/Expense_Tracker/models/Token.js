var mongoose = require('mongoose');

var Schema = mongoose.Schema;


const tokenSchema = new mongoose.Schema({
    _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    expireAt: { type: Date, default: Date.now, index: { expires: 86400000 } }
});

var Token = mongoose.model('Token', tokenSchema);

module.exports = Token;