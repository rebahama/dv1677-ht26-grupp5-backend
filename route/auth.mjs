import express from "express";
import auth from "../models/auth.mjs";

const router = express.Router();

router.post("/login", (req, res) => auth.login(res, req.body));

router.post("/register", (req, res) => auth.register(res, req.body));

export default router;