import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  agency_name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // hashed
  created_at: { type: Date, default: Date.now },
});

// auto-hash password on save if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
