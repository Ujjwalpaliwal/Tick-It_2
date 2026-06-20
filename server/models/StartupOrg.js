const mongoose = require('mongoose');

const MemberSubSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'typing'],
    default: 'offline'
  },
  avatar: {
    type: String,
    default: '👤'
  }
}, { _id: false });

const StartupOrgSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  members: [MemberSubSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('StartupOrg', StartupOrgSchema);
