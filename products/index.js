const express = require("express")
require("express-async-errors")
const sequelize = require("./database")
const isAuthenticated = require("./isAuthenticated")
const Product = require("./product.model")
const ampq = require("ampqlib")
const Sequelize = require("sequelize")

let channel;

async function connect() {
    const ampqServer = process.env.RABBITMQ_URL;
    const connection = await ampq.connect(ampqServer)
    channel = await connection.createChannel();
    channel.assertQueue('PRODUCT')   
}

connect();

const app = express();

app.use(express.json())

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
    console.log(`Products Service at ${port}`);
})

app.get('/products', async (req, res) => {
    const results = await Product.findAll();

    res.status(200).json(results)
})

app.post('/products', isAuthenticated, async (req, res) => {
    const { name, price, description, imageURL } = req.body

    const product = await Product.create({
        name,
        price,
        description,
        imageURL,
        creator: req.user.email,
    })

    res.status(200).json(product)
})

app.post('/products/buy', isAuthenticated, async (req, res) => {
    const { ids } = req.body
    
    const products = await Product.findAll({
        where: {
            id: {
                [Sequelize.Op.In]: ids,
            }
        }
    })
    let order

    channel.sentToQueue(
        'ORDER',
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    )

    await channel.consume('PRODUCT', data => {
        order = JSON.parse(data.content)
    })

    res.json(order)
})

sequelize.sync()