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
      required: true
    },
  }, { timestamps: true }
);

expenseSchema.index({category: 1});
expenseSchema.index({date: 1});

let Expense = mongoose.model('expense', expenseSchema);

module.exports = Expense;