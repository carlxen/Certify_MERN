import mongoose from "mongoose";

const venueSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  morning_price: { type: Number, required: true },
  afternoon_price: { type: Number, required: true },
  evening_price: { type: Number, required: true },
});

export default mongoose.model("Venue", venueSchema);
