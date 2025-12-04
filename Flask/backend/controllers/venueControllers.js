import User from "../models/User.js";
import { signToken } from "../middleware/auth.js";

// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { agency_name, username, password, confirm_password } = req.body;
    if (!agency_name || !username || !password) return res.status(400).json({ message: "Missing fields" });
    if (password !== confirm_password) return res.status(400).json({ message: "Passwords do not match" });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already exists" });

    const user = new User({ agency_name, username, password });
    await user.save();

    return res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);

    // send as httpOnly cookie & also return user summary
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ message: "Login successful", user: { id: user._id, agency_name: user.agency_name, username: user.username }});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie("token");
  return res.json({ message: "Logged out" });
};
