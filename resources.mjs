import db from "./db/database.mjs";

const resources = {
  getAll: async function getAll() {
    return await db.collection("resources").find({}).toArray();
  },

  getOne: async function getOne(id) {
    return (
      (await db.collection("resources").findOne({ id: Number(id) })) || {}
    );
  },

  addOne: async function addOne(body) {
    const newResource = {
      id: Date.now(),
      name: body.name,
      type: body.type,
      description: body.description,
      capacity: body.capacity || 1,
    };

    await db.collection("resources").insertOne(newResource);

    return { lastID: newResource.id };
  },

  deleteOne: async function deleteOne(id) {
    const result = await db.collection("resources").deleteOne({
      id: Number(id),
    });

    return { changes: result.deletedCount };
  },

  updateOne: async function updateOne(id, body) {
    const result = await db.collection("resources").updateOne(
      { id: Number(id) },
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