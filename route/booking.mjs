import express from "express";
import db from "../db/database.mjs";
import bookings from "../models/bookings.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import { ObjectId } from "mongodb";
import { validateBooking } from "../domain/policy.mjs";
import { getAvailableTimes } from "../domain/availability.mjs";
import { broker, BrokerError } from "../config/broker.mjs";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const validation = validateBooking(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const { resourceId, startsAt, endsAt, want } = req.body;

    if (!ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        error: "Invalid resourceId",
      });
    }

    const resource = await db.collection("resources").findOne({
      _id: new ObjectId(resourceId),
      active: true,
    });

    if (!resource) {
      return res.status(404).json({
        error: "Resource not found",
      });
    }

    const overlap = await bookings.hasOverlap(
      resourceId,
      startsAt,
      endsAt
    );

    if (overlap) {
      return res.status(409).json({
        error: "Resource is already booked for this time",
      });
    }

    const user = String(req.user.id);

    let payload;

    if (resource.provider === "maas") {
      payload = {
        systemId: resource.externalId,
        user,
        endsAt: new Date(endsAt).toISOString(),
      };
    } else if (
      resource.provider === "proxmox" ||
      resource.provider === "openstack"
    ) {
      if (!want || typeof want !== "object") {
        return res.status(400).json({
          error: "want is required for this resource",
        });
      }

      payload = {
        want,
        user,
        endsAt: new Date(endsAt).toISOString(),
      };
    } else {
      return res.status(400).json({
        error: "Unsupported resource provider",
      });
    }

    const { allocation } = await broker.allocate(
      resource.provider,
      payload
    );

    const created = await bookings.addOne(
      req.body,
      req.user,
      allocation
    );

    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof BrokerError) {
      if (err.status === 409) {
        return res.status(409).json({
          error: "Booking denied",
          code: err.code,
        });
      }

      return res.status(503).json({
        error: "Booking service unavailable",
        code: err.code,
      });
    }

    console.error(err);

    return res.status(500).json({
      error: "Could not create booking",
    });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const booking = await bookings.getByIdForUser(
      req.params.id,
      req.user
    );

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    if (booking.broker?.allocationId && booking.broker?.secret) {
      const resource = await db.collection("resources").findOne({
        _id: booking.resourceId,
      });
      console.log("Resource found:", resource);
      if (!resource) {
        return res.status(404).json({
          error: "Resource not found",
        });
      }

      const result = await broker.withdraw(
        resource.provider,
        booking.broker.allocationId,
        booking.broker.secret
      );

      if (result.allocation?.status !== "released") {
        return res.status(502).json({
          error: "Broker did not confirm release",
        });
      }
    }

    const deleted = await bookings.deleteOne(
      req.params.id,
      req.user
    );

    return res.json({
      changes: deleted.changes,
      status: "cancelled",
    });
  } catch (err) {
    if (err instanceof BrokerError) {
      return res.status(503).json({
        error: "Could not release broker",
        code: err.code,
      });
    }

    console.error(err);

    return res.status(500).json({
      error: "Could not cancel",
    });
  }
});

router.get("/availability", requireAuth, async (req, res) => {
  const { resourceId, dayStart, dayEnd } = req.query;

  const resourceBookings = await bookings.getAllByResource(
    resourceId
  );

  const availableTimes = getAvailableTimes(
    resourceBookings,
    dayStart,
    dayEnd
  );

  return res.json({
    availableTimes,
  });
});

router.get("/", requireAuth, async (req, res) => {
  const result = await bookings.getByUser(req.user);

  const safeBookings = result.map(({ broker, ...booking }) => ({
    ...booking,
    broker: broker
      ? { allocationId: broker.allocationId }
      : undefined,
  }));

  return res.json(safeBookings);
});


router.put("/:id/end-time", requireAuth, async (req, res) => {
  try {
    const { endsAt } = req.body;

    const newEndTime = new Date(endsAt);

    if (!endsAt || Number.isNaN(newEndTime.getTime())) {
      return res.status(400).json({
        error: "A valid endsAt date is required",
      });
    }

    const booking = await bookings.getByIdForUser(
      req.params.id,
      req.user
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!booking.broker?.allocationId || !booking.broker?.secret) {
      return res.status(400).json({
        error: "Booking has no broker allocation",
      });
    }

    const resource = await db.collection("resources").findOne({
      _id: booking.resourceId,
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const result = await broker.extend(
      resource.provider,
      booking.broker.allocationId,
      booking.broker.secret,
      newEndTime.toISOString()
    );

    const updated = await bookings.updateEndTime(
      req.params.id,
      req.user,
      newEndTime.toISOString()
    );

    if (updated.changes !== 1 && booking.endsAt.getTime() !== newEndTime.getTime()) {
      return res.status(500).json({
        error: "Broker updated, but the local booking could not be updated",
      });
    }

    return res.json({
      message: "Booking end time updated",
      endsAt: newEndTime.toISOString(),
      allocation: result.allocation,
    });
  } catch (error) {
    if (error instanceof BrokerError) {
      return res.status(503).json({
        error: "Could not update broker allocation",
        code: error.code,
      });
    }

    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;