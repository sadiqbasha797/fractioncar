const mongoose = require('mongoose');

const SuperAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, default: 'superadmin' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SuperAdmin', SuperAdminSchema);
