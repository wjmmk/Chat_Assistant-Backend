import 'dotenv/config'
import express, { Express, Request, Response } from "express"
import { MongoClient } from 'mongodb'
import { callAgent } from './agents'
import cors from 'cors'


const app: Express = express()

app.use(cors())
app.use(express.json())

// Create MongoDB client using connection string from environment variables
const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// Async function to initialize and start the server
async function startServer() {
    try {
        await client.connect()
        // Ping MongoDB to verify connection is working
        await client.db("admin").command({ ping: 1 })
        console.log("You successfully connected to MongoDB!")

        // Define root endpoint (GET /) - simple health check
        app.get('/', (req: Request, res: Response) => {
            // Send simple response to confirm server is running
            res.send('LangGraph Agent Server')
        })

        app.post('/chat', async (req: Request, res: Response) => {
            const initialMessage = req.body.message
            // Generate unique thread ID using current timestamp
            const threadId = Date.now().toString()
            console.log(initialMessage)
            try {
                // Call our AI agent with the message and new thread ID
                const response = await callAgent(client, initialMessage, threadId)
                // Send successful response with thread_Id and AI response
                res.json({ threadId, response })
            } catch (error) {
                console.error('Error starting conversation:', error)
                res.status(500).json({ error: 'Internal server error' })
            }
        })

        app.post('/chat/:threadId', async (req: Request, res: Response) => {
            const { threadId } = req.params
            const { message } = req.body
            try {
                const response = await callAgent(client, message, threadId)
                // Send AI response (no need to send threadId again since it's continuing)
                res.json({ response })
            } catch (error) {
                console.error('Error in chat:', error)
                res.status(500).json({ error: 'Internal server error' })
            }
        })

        const PORT = process.env.PORT || 8000
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error('Error connecting to MongoDB:', error)
        process.exit(1)
    }
}

startServer()