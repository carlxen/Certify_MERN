import Booking from "../models/Booking.js";
import Venue from "../models/Venue.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Helper to sort time_slot like Morning(1), Afternoon(2), Evening(3)
const timeSlotOrder = (slot) => {
  if (slot === "Morning") return 1;
  if (slot === "Afternoon") return 2;
  if (slot === "Evening") return 3;
  return 99;
};

// GET /api/home?sort=date or ?sort=all or ?sort=venue,agency,time_slot
export const home = async (req, res) => {
  try {
    const sortBy = req.query.sort || "date";
    const today = new Date(); today.setHours(0,0,0,0);

    // build base query
    let baseQuery = { status: "Paid" };
    if (sortBy !== "all") baseQuery.date = { $gte: today };

    // populate user and venue
    let query = Booking.find(baseQuery).populate("venue").populate("user", "agency_name username");

    // apply sorting
    if (sortBy === "date") query = query.sort({ date: 1 });
    else if (sortBy === "venue") query = query.sort({ "venue.name": 1 });
    else if (sortBy === "agency") query = query.sort({ "user.agency_name": 1 });
    else if (sortBy === "time_slot") {
      // because Mongo can't sort by custom order easily across documents, fetch & sort in JS
      const items = await query.exec();
      items.sort((a,b) => timeSlotOrder(a.time_slot) - timeSlotOrder(b.time_slot));
      return res.json({ events: items, today });
    } else {
      query = query.sort({ date: 1 });
    }

    const events = await query.exec();
    return res.json({ events, today });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/dashboard?sort=date|artist|venue|time_slot|agency
export const dashboard = async (req, res) => {
  try {
    const sortBy = req.query.sort || "date";
    const userId = req.user._id;

    let query = Booking.find({ user: userId }).populate("venue").populate("user", "agency_name username");

    if (sortBy === "date") query = query.sort({ date: 1 });
    else if (sortBy === "artist") query = query.sort({ artist_name: 1 });
    else if (sortBy === "venue") query = query.sort({ "venue.name": 1 });
    else if (sortBy === "agency") query = query.sort({ "user.agency_name": 1 });
    else if (sortBy === "time_slot") {
      const items = await query.exec();
      items.sort((a,b) => timeSlotOrder(a.time_slot) - timeSlotOrder(b.time_slot));
      return res.json({ bookings: items });
    }

    const bookings = await query.exec();
    return res.json({ bookings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/book
export const book = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { artist_name, concert_title, venue_name, date: dateStr, time_slot, payment_method } = req.body;
    if (!artist_name || !concert_title || !venue_name || !dateStr || !time_slot || !payment_method) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Missing fields" });
    }

    const dateObj = new Date(dateStr);
    dateObj.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    if (dateObj < today) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Cannot book past dates" });
    }

    const venue = await Venue.findOne({ name: venue_name }).session(session);
    if (!venue) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Invalid venue" });
    }

    const priceMapping = {
      Morning: venue.morning_price,
      Afternoon: venue.afternoon_price,
      Evening: venue.evening_price,
    };
    const expected_price = priceMapping[time_slot];
    if (expected_price === undefined) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Invalid time slot" });
    }

    // Check existing paid booking for same venue/date/time_slot
    const existing = await Booking.findOne({ venue: venue._id, date: dateObj, time_slot, status: "Paid" }).session(session);
    if (existing) {
      await session.abortTransaction(); session.endSession();
      return res.status(409).json({ message: `${venue_name} is already booked for ${time_slot} on ${dateObj.toISOString().slice(0,10)}` });
    }

    const receipt_id = uuidv4().slice(0,8).toUpperCase();

    const newBooking = await Booking.create([{
      user: req.user._id,
      venue: venue._id,
      artist_name,
      concert_title,
      date: dateObj,
      time_slot,
      amount_expected: expected_price,
      status: "Paid",
      receipt_id
    }], { session });

    const bookingDoc = newBooking[0];

    await Transaction.create([{
      booking: bookingDoc._id,
      payment_method,
      amount_paid: expected_price,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: "Booking confirmed", receipt_id, booking: bookingDoc });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    // if index unique triggered (double book race), send conflict
    if (err.code === 11000) return res.status(409).json({ message: "Double booking conflict" });
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/cancel_booking/:bookingId
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!booking.user.equals(req.user._id)) return res.status(403).json({ message: "Unauthorized" });

    booking.status = "Cancelled";
    await booking.save();
    return res.json({ message: "Booking has been cancelled" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/view_receipt/:bookingId
export const viewReceipt = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("venue").populate("user", "agency_name username");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!booking.user._id.equals(req.user._id)) return res.status(403).json({ message: "Unauthorized" });

    const transaction = await Transaction.findOne({ booking: booking._id });
    return res.json({ booking, transaction });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/profile
export const profile = async (req, res) => {
  return res.json({ user: req.user });
};
