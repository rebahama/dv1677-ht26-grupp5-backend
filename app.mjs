import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import resources from "./resources.mjs";
import bookings from "./bookings.mjs";

const port = process.env.PORT;
const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(cors());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// --- Resurser ---

app.get("/", async (req, res) => {
  return res.json({
    name: "Booking api",
    resources: "/resources",
    bookings: "/bookings",
  });
});

app.get("/resources", async (req, res) => {
  return res.json(await resources.getAll());
});

app.post("/resources", async (req, res) => {
  const created = await resources.addOne(req.body);
  return res.status(201).json(created);
});

app.get("/resources/:id", async (req, res) => {
  const resource = await resources.getOne(req.params.id);
  const resourceBookings = await bookings.getByResource(req.params.id);

  return res.json({ resource, bookings: resourceBookings });
});

app.delete("/resources/:id", async (req, res) => {
  const result = await resources.deleteOne(req.params.id);
  return res.json(result);
});

app.put("/resources/:id", async (req, res) => {
  const updated = await resources.updateOne(req.params.id, req.body);
  return res.json(updated);
});

app.post("/resources/:id", async (req, res) => {
  const updated = await resources.updateOne(req.params.id, req.body);
  return res.json(updated);
});

// --- Bokningar ---

app.post("/bookings", async (req, res) => {
  const created = await bookings.addOne(req.body);
  return res.status(201).json(created);
});

app.delete("/bookings/:id", async (req, res) => {
  const result = await bookings.deleteOne(req.params.id);
  return res.json(result);
});

app.listen(port, () => {
  console.log(`Proxmox Booking app listening on port ${port}`);
});
