import express from "express";
import * as authCtrl from "../controllers/authController.js";
import * as venueCtrl from "../controllers/venueController.js";
import * as bookingCtrl from "../controllers/bookingController.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Auth
router.post("/api/auth/signup", authCtrl.signup);
router.post("/api/auth/login", authCtrl.login);
router.post("/api/auth/logout", authCtrl.logout);

// Public
router.get("/api/venues", venueCtrl.listVenues);
router.get("/api/home", bookingCtrl.home);

// Protected
router.get("/api/dashboard", authRequired, bookingCtrl.dashboard);
router.post("/api/book", authRequired, bookingCtrl.book);
router.post("/api/cancel_booking/:bookingId", authRequired, bookingCtrl.cancelBooking);
router.get("/api/view_receipt/:bookingId", authRequired, bookingCtrl.viewReceipt);
router.get("/api/profile", authRequired, bookingCtrl.profile);

export default router;
