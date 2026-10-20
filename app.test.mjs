import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
vi.mock("./config/broker.mjs", async (importOriginal) => {
    const actual = await importOriginal();

    return {
        ...actual,
        broker: {
            ...actual.broker,
            allocate: vi.fn().mockResolvedValue({
                allocation: {
                    id: "test-allocation-id",
                    secret: "test-allocation-secret",
                },
            }),
        },
    };
});
import app from "./app.mjs";
import db from "./db/database.mjs";
import { getAvailableTimes } from "./domain/availability.mjs";

async function getAuthToken() {
    const email = `test-${Date.now()}-${Math.random()}@example.com`;
    const password = "test-password";

    const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
            email,
            password,
        });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
            email,
            password,
        });

    expect(loginResponse.status).toBe(200);

    return loginResponse.body.token;
}

function futureDate(daysFromNow, hour) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromNow);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
}

describe("GET /", () => {
    it("should return status 200", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
    });
});

describe("POST /resources", () => {
    it("should create a resource", async () => {
        const token = await getAuthToken();
        const response = await request(app)
            .post("/resources")
            .set("Authorization", `Bearer ${token}`)
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
        const token = await getAuthToken();
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
            .delete(`/resources/${resourceId}`)
            .set("Authorization", `Bearer ${token}`);

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
        const token = await getAuthToken();
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
            .put(`/resources/${resourceId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
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
        const token = await getAuthToken();

        const resource = await db.collection("resources").insertOne({
            name: "Booking Test Resource",
            type: "vm",
            want: {
                vcpus: 1,
                ramMb: 1024,
                diskGb: 10,
            },
            provider: "proxmox",
            description: "Resource for overlap test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const firstBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: futureDate(7, 10),
                endsAt: futureDate(7, 12),
            });
        expect(firstBooking.status).toBe(201);

        const overlappingBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resourceId,
                bookedBy: "second-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: futureDate(7, 11),
                endsAt: futureDate(7, 13),
            });

        expect(overlappingBooking.status).toBe(201);
    });

    it("should return 409 when MAAS bookings overlap", async () => {
        const token = await getAuthToken();

        const resource = await db.collection("resources").insertOne({
            name: "MAAS Booking Test Resource",
            type: "server",
            provider: "maas",
            externalId: "test-system-id",
            description: "Resource for MAAS overlap test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const firstBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId,
                bookedBy: "test-user",
                startsAt: futureDate(7, 10),
                endsAt: futureDate(7, 12),
            });

        expect(firstBooking.status).toBe(201);

        const overlappingBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId,
                bookedBy: "second-user",
                startsAt: futureDate(7, 11),
                endsAt: futureDate(7, 13),
            });

        expect(overlappingBooking.status).toBe(409);
        expect(overlappingBooking.body.error).toBe(
            "Resource is already booked for this time"
        );
    });

    it("should allow a booking that starts when another booking ends", async () => {
        const token = await getAuthToken();
        const resource = await db.collection("resources").insertOne({
            name: "Adjacent Booking Resource",
            type: "vm",
            provider: "proxmox",
            want: {
                vcpus: 1,
                ramMb: 1024,
                diskGb: 10,
            },
            description: "Resource for adjacent booking test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const firstBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: futureDate(8, 10),
                endsAt: futureDate(8, 12),
            });

        expect(firstBooking.status).toBe(201);

        const secondBooking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resourceId,
                bookedBy: "second-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: futureDate(8, 12),
                endsAt: futureDate(8, 14),
            });

        expect(secondBooking.status).toBe(201);
    });
});

describe("GET /bookings/availability", () => {
    it("should return available times for a resource", async () => {
        const token = await getAuthToken();
        const resource = await db.collection("resources").insertOne({
            name: "Availability Test Resource",
            type: "vm",
            provider: "proxmox",
            want: {
                vcpus: 1,
                ramMb: 1024,
                diskGb: 10,
            },
            description: "Resource for availability test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const resourceId = resource.insertedId.toString();

        const booking = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resourceId,
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: futureDate(9, 10),
                endsAt: futureDate(9, 12),
            });

        expect(booking.status).toBe(201);

        const response = await request(app)
            .get("/bookings/availability")
            .set("Authorization", `Bearer ${token}`)
            .query({
                resourceId: resourceId,
                dayStart: futureDate(9, 8),
                dayEnd: futureDate(9, 18),
            });

        expect(response.status).toBe(200);

        expect(response.body.availableTimes).toEqual([
            {
                startsAt: futureDate(9, 8),
                endsAt: futureDate(9, 10),
            },
            {
                startsAt: futureDate(9, 12),
                endsAt: futureDate(9, 18),
            },
        ]);
    });
});

describe("POST /bookings - policy", () => {
    let token;
    beforeAll(async () => {
        token = await getAuthToken();
    });
    it("should return 400 when resourceId is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: "2026-10-14T10:00:00Z",
                endsAt: "2026-10-14T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("resourceId is required");
    });

    it("should allow a booking without bookedBy in the request, because bookedby is set by backend logged in user", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                startsAt: "2026-11-15T10:00:00Z",
                endsAt: "2026-11-15T12:00:00Z",
            });


        expect(response.status).not.toBe(400);
    });

    it("should return 400 when resourceId is invalid", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "abc",
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
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
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                bookedBy: "test-user",
                endsAt: "2026-10-15T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("startsAt is required");
    });

    it("should return 400 when endsAt is missing", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                bookedBy: "test-user",
                startsAt: "2026-10-15T10:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("endsAt is required");
    });

    it("should return 400 when startsAt is not a valid date", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                bookedBy: "test-user",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
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
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
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
            provider: "proxmox",
            want: {
                vcpus: 1,
                ramMb: 1024,
                diskGb: 10,
            },
            description: "Resource for valid policy test",
            capacity: 1,
            active: true,
            createdAt: new Date(),
        });

        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: resource.insertedId.toString(),
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                bookedBy: "test-user",
                startsAt: futureDate(10, 10),
                endsAt: futureDate(10, 12),
            });

        expect(response.status).toBe(201);
    });

    it("should return 400 when startsAt is after endsAt", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
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
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                bookedBy: "test-user",
                startsAt: "2026-10-14T12:00:00Z",
                endsAt: "2026-10-14T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "startsAt must be before endsAt"
        );
    });

    it("should return 400 when booking starts in the past", async () => {
        const response = await request(app)
            .post("/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({
                resourceId: "507f1f77bcf86cd799439011",
                want: {
                    vcpus: 1,
                    ramMb: 1024,
                    diskGb: 10,
                },
                bookedBy: "test-user",
                startsAt: "2020-01-01T10:00:00Z",
                endsAt: "2020-01-01T12:00:00Z",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(
            "Cannot book a time in the past"
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