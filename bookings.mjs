import db from "./db/database.mjs";

const bookings = {
  getByResource: async function getByResource(resourceId) {
    return await db
      .collection("bookings")
      .find({ resource_id: Number(resourceId) })
      .sort({ start_time: 1 })
      .toArray();
  },

  addOne: async function addOne(body) {
    const newBooking = {
      id: Date.now(),
      resource_id: Number(body.resource_id),
      user: body.user,
      start_time: body.start_time,
      end_time: body.end_time,
      status: "confirmed",
    };

    await db.collection("bookings").insertOne(newBooking);

    return { lastID: newBooking.id };
  },

  deleteOne: async function deleteOne(id) {
    const result = await db.collection("bookings").deleteOne({
      id: Number(id),
    });

    return { changes: result.deletedCount };
  },
};

export default bookings;