import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  payment_method: { type: String, required: true },
  amount_paid: { type: Number, required: true },
  payment_date: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
