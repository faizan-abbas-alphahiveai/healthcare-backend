const mongoose = require('mongoose');

const infoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  picture: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },

  // Main type of entry (doctor, pharmacy, imageCenter)
  type: {
    type: String,
    enum: ["doctor", "pharmacy", "imageCenter","driverLicense","insuranceCard"],
    required: true,
  },

  // For doctors only: primary or specialist
  doctorType: {
    type: String,
    enum: ["primary", "specialist"],
    required: function () {
      return this.type === "doctor";
    },
  },

  // Specialty (only required for specialist doctors)
  speciality: {
    type: String,
    trim: true,
    required: function () {
      return this.type === "doctor" && this.doctorType === "specialist";
    },
  },
}, { timestamps: true });


// ---------------------------------
// INDEXES FOR FAST QUERIES
// ---------------------------------

// Fast lookup by user
infoSchema.index({ userId: 1 });

// Fast filtering by type (doctor/pharmacy/etc.)
infoSchema.index({ type: 1 });

// Most common query: get all documents of a specific type for a user
infoSchema.index({ userId: 1, type: 1 });

// Fast text search on name
infoSchema.index({ name: "text" });

// Useful when filtering doctors
infoSchema.index({ doctorType: 1 });
infoSchema.index({ speciality: 1 });

const Info = mongoose.model('Info', infoSchema);
module.exports = Info;
