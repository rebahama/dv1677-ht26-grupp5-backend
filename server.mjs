import app from "./app.mjs";

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Proxmox Booking app listening on port ${port}`);
});