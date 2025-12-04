import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },

  artist_name: { type: String, required: true },
  concert_title: { type: String, required: true },

  date: { type: Date, required: true, index: true },

  time_slot: {
    type: String,
    enum: ["Morning", "Afternoon", "Evening"],
    required: true,
  },

  amount_expected: { type: Number, required: true },

  status: {
    type: String,
    enum: ["Pending", "Paid", "Cancelled", "Refunded"],
    default: "Paid",
  },

  receipt_id: { type: String, unique: true, required: true },
}, {
  timestamps: true
});

// Composite unique index to prevent double booking
bookingSchema.index({ venue: 1, date: 1, time_slot: 1 }, { unique: true });

export default mongoose.model("Booking", bookingSchema);
