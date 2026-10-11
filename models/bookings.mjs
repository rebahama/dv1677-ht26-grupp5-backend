import db from "../db/database.mjs";
import { ObjectId } from "mongodb";
import { bookingsOverlap } from "../domain/overlap.mjs";

const bookings = {
  getByResource: async function getByResource(resourceId, user) {
    if (!ObjectId.isValid(resourceId) || !ObjectId.isValid(user.id))
      return [];

    return await db
      .collection("bookings")
      .find({
        resourceId: new ObjectId(resourceId),
        user: new ObjectId(user.id),
      })
      .sort({ startsAt: 1 })
      .toArray();
  },

  getAllByResource: async function getAllByResource(resourceId) {
    if (!ObjectId.isValid(resourceId)) {
        return [];
    }

    return await db
        .collection("bookings")
        .find({
            resourceId: new ObjectId(resourceId),
            status: "confirmed",
        })
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

  addOne: async function addOne(body, user) {
    const newBooking = {
      resourceId: new ObjectId(body.resourceId),
      user: new ObjectId(user.id),
      bookedBy: body.bookedBy,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(newBooking);

    return { lastID: result.insertedId };
  },

  deleteOne: async function deleteOne(id, user) {
    if (!ObjectId.isValid(id) || !ObjectId.isValid(user.id))
      return { changes: 0 };

    const result = await db.collection("bookings").deleteOne({
      _id: new ObjectId(id),
      user: new ObjectId(user.id),
    });

    return { changes: result.deletedCount };
  },

  getByUser: async function getByUser(user) {
    if (!ObjectId.isValid(user.id)) return [];

    return await db
      .collection("bookings")
      .find({
        user: new ObjectId(user.id),
      })
      .sort({ startsAt: 1 })
      .toArray();
  },
};

export default bookings;