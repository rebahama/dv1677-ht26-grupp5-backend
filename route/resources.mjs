import express from "express";
import resources from "../models/resources.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import bookings from "../models/bookings.mjs";
import { broker, BrokerError } from "../config/broker.mjs";

const router = express.Router();

router.get("/broker", requireAuth, async (req, res) => {
  try {
    const allResources = await resources.syncAll();

    return res.status(200).json(allResources);
  } catch (error) {
    console.error("Resource sync failed:", error.message);

    return res.status(502).json({
      error: "Could not fetch resources from broker",
      code: error.code || "RESOURCE_SYNC_FAILED",
    });
  }
});

router.get("/broker/list", async (req, res) => {
  try {
    const allResources = await resources.getAll();
    const brokerResources = allResources.filter(
      (resource) => resource.provider
    );

    return res.status(200).json(brokerResources);
  } catch (error) {
    console.error("Could not fetch broker resources:", error.message);

    return res.status(500).json({
      error: "Could not fetch broker resources",
    });
  }
});

router.get("/", async (req, res) => {
  return res.json(await resources.getAll());
});

router.post("/", requireAuth, async (req, res) => {
  const created = await resources.addOne(req.body);
  return res.status(201).json(created);
});

router.get("/:id", requireAuth, async (req, res) => {
  const resource = await resources.getOne(req.params.id);

  if (!resource._id) {
    return res.status(404).json({
      error: "Resource not found",
    });
  }

  const resourceBookings = await bookings.getByResource(
    req.params.id,
    req.user
  );

  return res.json({
    resource,
    bookings: resourceBookings,
  });
});

router.get("/:type/availability", requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const allowedTypes = ["proxmox", "maas", "openstack"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Unsupported resource type",
      });
    }

    const data = await broker.availability(type);

    return res.json(data);
  } catch (error) {
    if (error instanceof BrokerError) {
      return res.status(502).json({
        error: "Could not fetch broker availability",
        code: error.code,
      });
    }

    console.error("Availability error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
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