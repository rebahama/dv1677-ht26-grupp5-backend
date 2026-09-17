import db from "./db/database.mjs";

const bookings = {
  getByResource: async function getByResource(resourceId) {
    return db
      .prepare(
        "SELECT * FROM bookings WHERE resource_id = ? ORDER BY start_time"
      )
      .all(resourceId);
  },
  addOne: async function addOne(body) {
    const result = db
      .prepare(
        "INSERT INTO bookings (resource_id, user, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        body.resource_id,
        body.user,
        body.start_time,
        body.end_time,
        "confirmed"
      );
    return { lastID: result.lastInsertRowid };
  },
  deleteOne: async function deleteOne(id) {
    const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
    return { changes: result.changes };
  },
};

export default bookings;
