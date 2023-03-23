const express = require("express")
require("express-async-errors")
const sequalize = require("./database")
const isAuthenticated = require("./isAuthenticated")
const Product = require("./product.model")
const ampq = require("ampqlib")
const Sequalize = require("sequalize")

let channel;

async function connect() {
    const ampqServer = process.env.RABBITMQ_URL;
    const connection = await ampq.connect(ampqServer)
    channel = await connection.createChannel();
    channel.assertQueue('PRODUCT')   
}

connect();

const app = express();