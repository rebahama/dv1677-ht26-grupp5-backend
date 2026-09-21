import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.mjs";
import db from "./db/database.mjs";

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