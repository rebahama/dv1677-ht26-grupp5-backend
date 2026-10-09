import express from "express";
import bookings from "../models/bookings.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import { validateBooking } from "../domain/policy.mjs";
import { getAvailableTimes } from "../domain/availability.mjs";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
    const validation = validateBooking(req.body);

    if (!validation.valid) {
        return res.status(400).json({
            error: validation.error,
        });
    }

    const { resourceId, startsAt, endsAt } = req.body;

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

    const created = await bookings.addOne(req.body, req.user);

    return res.status(201).json(created);
});

router.delete("/:id", requireAuth, async (req, res) => {
    const result = await bookings.deleteOne(req.params.id, req.user);

    return res.json(result);
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

    return res.json(result);
});


export default router;