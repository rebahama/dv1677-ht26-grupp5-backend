import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

await client.connect();

const db = client.db('proxmox_booking');

console.log(' Testing connection to DB');

export default db;
