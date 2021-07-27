let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let expenseSchema = new Schema(
  {
    category: String,
    amount: Number,
    date: Date,
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
);

let Expense = mongoose.model('expense', expenseSchema);

module.exports = Expense;