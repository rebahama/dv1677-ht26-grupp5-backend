import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.mjs";
import db from "./db/database.mjs";
import { getAvailableTimes } from "./domain/availability.mjs";
describe("GET /", () => {
    it("should return status 200", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
    });
});

describe("POST /resources", () => {
    it("should create a resource", async () => {
        const response = await request(app)
            .post("/resources")
            .send({
                name: "Test Resource",
                type: "ubuntu-test",
                description: "Test a description",
                capacity: 2,
            });

        const resources = await db.collection("resources").find({}).toArray();
        console.log(`Post succesfully added: ${resources}`);
        console.log(resources)
        expect(response.status).toBe(201);

    });
});

describe("DELETE /resources:id", () => {
    it("should delete a resource", async () => {
        const result = await db.collection("resources").insertOne({
            name: "Delete resources",
            type: "Delete type",
            description: "Delete description",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = result.insertedId.toString();

        const response = await request(app)
            .delete(`/resources/${resourceId}`);

        const deletedResource = await db
            .collection("resources")
            .findOne({ _id: result.insertedId });

        expect(response.status).toBe(200);
        expect(deletedResource).toBeNull();
        if (deletedResource === null) {
            console.log("Resource was successfully deleted");
        }

    });

});

describe("PUT /resource:id", () => {
    it("should update a resource", async () => {
        const result = await db.collection("resources").insertOne({
            name: "First resources",
            type: "First type",
            description: "First description",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = result.insertedId.toString();

        const response = await request(app)
            .put(`/resources/${resourceId}`).send({
                name: "Updated Resource",
                type: "updated",
                description: "Updated description",
                capacity: 5,
            });

        expect(response.status).toBe(200);

        const updatedResource = await db
            .collection("resources")
            .findOne({ _id: result.insertedId });

        expect(updatedResource.name).toBe("Updated Resource");
        expect(updatedResource.type).toBe("updated");
        expect(updatedResource.description).toBe("Updated description");
        expect(updatedResource.capacity).toBe(5);

    });
})

describe("POST /bookings - overlap", () => {
    it("should return 409 when bookings overlap", async () => {
        const resource = await db.collection("resources").insertOne({
            name: "Booking Test Resource",
            type: "vm",
            description: "Resource for overlap test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const firstBooking = await request(app)
            .post("/bookings")
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                startsAt: "2026-10-10T10:00:00Z",
                endsAt: "2026-10-10T12:00:00Z",
            });

        expect(firstBooking.status).toBe(201);

        const overlappingBooking = await request(app)
            .post("/bookings")
            .send({
                resourceId: resourceId,
                bookedBy: "second-user",
                startsAt: "2026-10-10T11:00:00Z",
                endsAt: "2026-10-10T13:00:00Z",
            });

        expect(overlappingBooking.status).toBe(409);
        expect(overlappingBooking.body.error).toBe(
            "Resource is already booked for this time"
        );
    });

    it("should allow a booking that starts when another booking ends", async () => {
        const resource = await db.collection("resources").insertOne({
            name: "Adjacent Booking Resource",
            type: "vm",
            description: "Resource for adjacent booking test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const firstBooking = await request(app)
            .post("/bookings")
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                startsAt: "2026-10-11T10:00:00Z",
                endsAt: "2026-10-11T12:00:00Z",
            });

        expect(firstBooking.status).toBe(201);

        const secondBooking = await request(app)
            .post("/bookings")
            .send({
                resourceId: resourceId,
                bookedBy: "second-user",
                startsAt: "2026-10-11T12:00:00Z",
                endsAt: "2026-10-11T14:00:00Z",
            });

        expect(secondBooking.status).toBe(201);
    });
});

describe("GET /bookings/availability", () => {
    it("should return available times for a resource", async () => {
        const resource = await db.collection("resources").insertOne({
            name: "Availability Test Resource",
            type: "vm",
            description: "Resource for availability test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const booking = await request(app)
            .post("/bookings")
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                startsAt: "2026-10-12T10:00:00Z",
                endsAt: "2026-10-12T12:00:00Z",
            });

        expect(booking.status).toBe(201);

        const response = await request(app)
            .get("/bookings/availability")
            .query({
                resourceId: resourceId,
                dayStart: "2026-10-12T08:00:00Z",
                dayEnd: "2026-10-12T18:00:00Z",
            });

        expect(response.status).toBe(200);

        expect(response.body.availableTimes).toEqual([
            {
                startsAt: "2026-10-12T08:00:00.000Z",
                endsAt: "2026-10-12T10:00:00.000Z",
            },
            {
                startsAt: "2026-10-12T12:00:00.000Z",
                endsAt: "2026-10-12T18:00:00.000Z",
            },
        ]);
    });
});

describe("POST /bookings - policy", () => {
    it("should return 400 when resourceId is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                bookedBy: "test-user",
                startsAt: "2026-10-14T10:00:00Z",
                endsAt: "2026-10-14T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("resourceId is required");
    });

    it("should return 400 when bookedBy is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                startsAt: "2026-10-15T10:00:00Z",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("bookedBy is required");
    });

    it("should return 400 when resourceId is invalid", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "abc",
                bookedBy: "test-user",
                startsAt: "2026-10-15T10:00:00Z",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "resourceId must be a valid id"
        );
    });

    it("should return 400 when startsAt is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("startsAt is required");
    });

    it("should return 400 when endsAt is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                startsAt: "2026-10-15T10:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("endsAt is required");
    });

    it("should return 400 when startsAt is not a valid date", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                startsAt: "not-a-date",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "startsAt must be a valid date"
        );
    });

    it("should return 400 when endsAt is not a valid date", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                startsAt: "2026-10-15T10:00:00Z",
                endsAt: "not-a-date",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "endsAt must be a valid date"
        );
    });

    it("should create a booking when the booking is valid", async () => {
        const resource = await db.collection("resources").insertOne({
            name: "Policy Test Resource",
            type: "vm",
            description: "Resource for valid policy test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: resource.insertedId.toString(),
                bookedBy: "test-user",
                startsAt: "2026-10-15T10:00:00Z",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(201);
    });

    it("should return 400 when startsAt is after endsAt", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                startsAt: "2026-10-14T15:00:00Z",
                endsAt: "2026-10-14T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "startsAt must be before endsAt"
        );
    });

    it("should return 400 when startsAt equals endsAt", async () => {
        const response = await request(app)
            .post("/bookings")
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                startsAt: "2026-10-14T12:00:00Z",
                endsAt: "2026-10-14T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "startsAt must be before endsAt"
        );
    });
});

describe("getAvailableTimes", () => {
    it("should return the whole day when there are no bookings", () => {
        const result = getAvailableTimes(
            [],
            "2026-10-16T08:00:00Z",
            "2026-10-16T18:00:00Z"
        );

        expect(result).toEqual([
            {
                startsAt: new Date("2026-10-16T08:00:00Z"),
                endsAt: new Date("2026-10-16T18:00:00Z"),
            },
        ]);
    });

    it("should return no available times when a booking covers the whole day", () => {
        const bookings = [
            {
                startsAt: "2026-10-16T08:00:00Z",
                endsAt: "2026-10-16T18:00:00Z",
            },
        ];

        const result = getAvailableTimes(
            bookings,
            "2026-10-16T08:00:00Z",
            "2026-10-16T18:00:00Z"
        );

        expect(result).toEqual([]);
    });

    it("should handle bookings that are directly next to each other", () => {
        const bookings = [
            {
                startsAt: "2026-10-16T10:00:00Z",
                endsAt: "2026-10-16T12:00:00Z",
            },
            {
                startsAt: "2026-10-16T12:00:00Z",
                endsAt: "2026-10-16T14:00:00Z",
            },
        ];

        const result = getAvailableTimes(
            bookings,
            "2026-10-16T08:00:00Z",
            "2026-10-16T18:00:00Z"
        );

        expect(result).toEqual([
            {
                startsAt: new Date("2026-10-16T08:00:00Z"),
                endsAt: new Date("2026-10-16T10:00:00Z"),
            },
            {
                startsAt: new Date("2026-10-16T14:00:00Z"),
                endsAt: new Date("2026-10-16T18:00:00Z"),
            },
        ]);
    });

    it("should handle overlapping bookings", () => {
        const bookings = [
            {
                startsAt: "2026-10-16T10:00:00Z",
                endsAt: "2026-10-16T14:00:00Z",
            },
            {
                startsAt: "2026-10-16T12:00:00Z",
                endsAt: "2026-10-16T16:00:00Z",
            },
        ];

        const result = getAvailableTimes(
            bookings,
            "2026-10-16T08:00:00Z",
            "2026-10-16T18:00:00Z"
        );

        expect(result).toEqual([
            {
                startsAt: new Date("2026-10-16T08:00:00Z"),
                endsAt: new Date("2026-10-16T10:00:00Z"),
            },
            {
                startsAt: new Date("2026-10-16T16:00:00Z"),
                endsAt: new Date("2026-10-16T18:00:00Z"),
            },
        ]);
    });

    it("should return available times between bookings", () => {
        const bookings = [
            {
                startsAt: "2026-10-16T10:00:00Z",
                endsAt: "2026-10-16T12:00:00Z",
            },
            {
                startsAt: "2026-10-16T14:00:00Z",
                endsAt: "2026-10-16T16:00:00Z",
            },
        ];

        const result = getAvailableTimes(
            bookings,
            "2026-10-16T08:00:00Z",
            "2026-10-16T18:00:00Z"
        );

        expect(result).toEqual([
            {
                startsAt: new Date("2026-10-16T08:00:00Z"),
                endsAt: new Date("2026-10-16T10:00:00Z"),
            },
            {
                startsAt: new Date("2026-10-16T12:00:00Z"),
                endsAt: new Date("2026-10-16T14:00:00Z"),
            },
            {
                startsAt: new Date("2026-10-16T16:00:00Z"),
                endsAt: new Date("2026-10-16T18:00:00Z"),
            },
        ]);
    });
});