import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;
let client;
let db;

if (process.env.NODE_ENV === "test") {
    mongoServer = await MongoMemoryServer.create();
    client = new MongoClient(mongoServer.getUri());
    await client.connect();

    db = client.db('test_database')

    console.log('Connected to test db')
} else {

    const client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    db = client.db('proxmox_booking');

    console.log('Connected to db Atlas');

}

export default db;