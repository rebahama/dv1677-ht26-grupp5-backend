import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import resourcesRouter from "./route/resources.mjs";
import authRouter from "./route/auth.mjs";
import bookingsRouter from "./route/booking.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(cors());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}


// --- Alla routes ---
app.get("/", async (req, res) => {
  return res.json({
    name: "Booking api",
    resources: "/resources",
    bookings: "/bookings",
  });
});

// --- auth ---
app.use("/api/auth", authRouter);

// --- Resurser ---
app.use("/resources", resourcesRouter)

// --- Bokningar ---
app.use("/bookings", bookingsRouter);

export default app;