import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/database.mjs";

const auth = {
    register: async function register(res, body) {
        const { email, password } = body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required",
            });
        }

        const existingUser = await db
            .collection("users")
            .findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                error: "User already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.collection("users").insertOne({
            email,
            password: passwordHash,
            createdAt: new Date(),
        });

        return res.status(201).json({
            message: "User created",
        });
    },

    login: async function login(res, body) {
        const { email, password } = body;

        const user = await db
            .collection("users")
            .findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                error: "Fel e-post eller lösenord",
            });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h",
            }
        );

        return res.json({ token });
    },
};

export default auth;