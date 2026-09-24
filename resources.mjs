import { ObjectId } from "mongodb";
import db from "./db/database.mjs";


const resources = {
  getAll: async function getAll() {
    return await db.collection("resources").find({}).toArray();
  },

  getOne: async function getOne(id) {
    if (!ObjectId.isValid(id)) {
      return {};
    }

    return (
      (await db.collection("resources").findOne({
        _id: new ObjectId(id),
      })) || {}
    );
  },

  addOne: async function addOne(body) {
    const newResource = {
      name: body.name,
      type: body.type,
      description: body.description,
      capacity: body.capacity || 1,
      active: true,
      createdAt: new Date(),
    };

    await db.collection("resources").insertOne(newResource);

    return { lastID: newResource.id };
  },

  deleteOne: async function deleteOne(id) {
    if (!ObjectId.isValid(id)) {
      return { changes: 0 };
    }
    const result = await db.collection("resources").deleteOne({
      _id: new ObjectId(id),
    });

    return { changes: result.deletedCount };
  },

  updateOne: async function updateOne(id, body) {
    if (!ObjectId.isValid(id)) {
      return { changes: 0 };
    }
    const result = await db.collection("resources").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: body.name,
          type: body.type,
          description: body.description,
          capacity: body.capacity || 1,
        },
      }
    );

    return { changes: result.modifiedCount };
  },
};

export default resources;