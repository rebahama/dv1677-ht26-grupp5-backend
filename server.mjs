import app from "./app.mjs";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Proxmox Booking app listening on port ${port}`);
});
