let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let incomeSchema = new Schema(
  {
    source: String,
    amount: Number,
    date: Date,
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true 
    },
  }, { timestamps: true }
);

incomeSchema.index({sources: 1});
incomeSchema.index({date: 1});

let Income = mongoose.model('income', incomeSchema);

module.exports = Income;