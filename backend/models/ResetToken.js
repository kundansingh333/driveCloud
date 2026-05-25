const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Token automatically expires and document is removed after 1 hour (3600s)
  },
});

module.exports = mongoose.model('ResetToken', resetTokenSchema);
