import express from "express";
import bookings from "../models/bookings.mjs";
import { requireAuth } from "../middleware/auth.mjs";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
    const created = await bookings.addOne(req.body, req.user);

    return res.status(201).json(created);
});

router.delete("/:id", requireAuth, async (req, res) => {
    const result = await bookings.deleteOne(req.params.id, req.user);

    return res.json(result);
});

router.get("/", requireAuth, async (req, res) => {
    const result = await bookings.getByUser(req.user);

    return res.json(result);
});


export default router;