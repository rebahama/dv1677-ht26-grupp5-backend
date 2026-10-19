import express from "express";
import resources from "../models/resources.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import bookings from "../models/bookings.mjs";

const router = express.Router();

router.get("/", async (req, res) => {
  return res.json(await resources.getAll());
});

router.post("/", requireAuth, async (req, res) => {
  const created = await resources.addOne(req.body);
  return res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const resource = await resources.getOne(req.params.id);
  const resourceBookings = await bookings.getByResource(req.params.id);

  return res.json({ resource, bookings: resourceBookings });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const result = await resources.deleteOne(req.params.id);
  return res.json(result);
});

router.put("/:id", requireAuth, async (req, res) => {
  const updated = await resources.updateOne(req.params.id, req.body);
  return res.json(updated);
});

router.post("/:id", requireAuth, async (req, res) => {
  const updated = await resources.updateOne(req.params.id, req.body);
  return res.json(updated);
});

export default router