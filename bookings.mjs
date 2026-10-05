import db from "./db/database.mjs";
import { ObjectId } from "mongodb";
import { bookingsOverlap } from "./domain/overlap.mjs";

const bookings = {
  getByResource: async function getByResource(resourceId) {
    if (!ObjectId.isValid(resourceId)) return [];

    return await db
      .collection("bookings")
      .find({ resourceId: new ObjectId(resourceId) })
      .sort({ startsAt: 1 })
      .toArray();
  },

  hasOverlap: async function hasOverlap(resourceId, startsAt, endsAt) {
    if (!ObjectId.isValid(resourceId)) {
      return false;
    }

    const existingBookings = await db
      .collection("bookings")
      .find({
        resourceId: new ObjectId(resourceId),
        status: "confirmed",
      })
      .toArray();

    return existingBookings.some((booking) =>
      bookingsOverlap(startsAt, endsAt, booking.startsAt, booking.endsAt)
    );
  },

  addOne: async function addOne(body) {
    const newBooking = {
      resourceId: new ObjectId(body.resourceId),
      bookedBy: body.bookedBy,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(newBooking);

    return { lastID: result.insertedId };
  },

  deleteOne: async function deleteOne(id) {
    if (!ObjectId.isValid(id)) return { changes: 0 };

    const result = await db.collection("bookings").deleteOne({
      _id: new ObjectId(id),
    });

    return { changes: result.deletedCount };
  },
};

export default bookings;
