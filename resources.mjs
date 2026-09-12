import db from "./db/database.mjs";

const resources = {
  getAll: async function getAll() {
    return db.prepare("SELECT * FROM resources").all();
  },
  getOne: async function getOne(id) {
    return db.prepare("SELECT * FROM resources WHERE id = ?").get(id) || {};
  },
  addOne: async function addOne(body) {
    const result = db
      .prepare(
        "INSERT INTO resources (name, type, description, capacity) VALUES (?, ?, ?, ?)"
      )
      .run(body.name, body.type, body.description, body.capacity || 1);
    return { lastID: result.lastInsertRowid };
  },
  deleteOne: async function deleteOne(id) {
    const result = db.prepare("DELETE FROM resources WHERE id = ?").run(id);
    return { changes: result.changes };
  },
  updateOne: async function updateOne(id, body) {
    const result = db
      .prepare(
        "UPDATE resources SET name = ?, type = ?, description = ?, capacity = ? WHERE id = ?"
      )
      .run(body.name, body.type, body.description, body.capacity || 1, id);
    return { changes: result.changes };
  },
};

export default resources;
