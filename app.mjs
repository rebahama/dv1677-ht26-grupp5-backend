import "dotenv/config";
import express from "express";
import path from "path";
import morgan from "morgan";
import cors from "cors";
import resources from "./resources.mjs";
import bookings from "./bookings.mjs";

const port = process.env.PORT;
const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// --- Resurser ---

app.get("/", async (req, res) => {
  return res.render("index", { resources: await resources.getAll() });
});

app.get("/resources/new", async (req, res) => {
  return res.render("resource-form", { resource: {} });
});

app.post("/resources", async (req, res) => {
  await resources.addOne(req.body);
  return res.redirect("/");
});

app.get("/resources/:id", async (req, res) => {
  const resource = await resources.getOne(req.params.id);
  const resourceBookings = await bookings.getByResource(req.params.id);

  return res.render("resource", { resource, bookings: resourceBookings });
});

app.get("/resources/:id/edit", async (req, res) => {
  return res.render("resource-form", {
    resource: await resources.getOne(req.params.id),
  });
});

app.delete("/resources/:id", async (req, res) => {
  const result = await resources.deleteOne(req.params.id);
  return res.json(result);
});

app.put("/resources/:id", async (req, res) => {
  await resources.updateOne(req.params.id, req.body);
  return res.redirect(`/resources/${req.params.id}`);
});

app.post("/resources/:id", async (req, res) => {
  await resources.updateOne(req.params.id, req.body);
  return res.redirect(`/resources/${req.params.id}`);
});

// --- Bokningar ---

app.post("/bookings", async (req, res) => {
  await bookings.addOne(req.body);
  return res.redirect(`/resources/${req.body.resource_id}`);
});

app.delete("/bookings/:id", async (req, res) => {
  const result = await bookings.deleteOne(req.params.id);
  return res.json(result);
});

app.listen(port, () => {
  console.log(`Proxmox Booking app listening on port ${port}`);
});
