import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(routes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Server error" });
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/booking";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    const port = process.env.PORT || 5000;
    app.listen(port, ()=> console.log(`Server listening on ${port}`));
  })
  .catch(err => {
    console.error("Mongo connection error", err);
  });
