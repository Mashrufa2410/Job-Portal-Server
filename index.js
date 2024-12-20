const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

if (!process.env.DB_USER || !process.env.DB_PASS) {
    console.error('Missing MongoDB credentials in environment variables.');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h6nxi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");

        const db = client.db('Job-Portal');
        const jobsCollection = db.collection('jobs');
        const jobApplicationsCollection = db.collection('job_applications');

        // Get all jobs
        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if(email){
                query = {hr_email: email}
            }

            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray(); 
            res.send(result);
        });

        // Add a new job
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;

            if (!newJob.title || !newJob.company || !newJob.location || !newJob.salaryRange) {
                return res.status(400).send({ message: "Missing required fields" });
            }

            const result = await jobsCollection.insertOne(newJob);
            res.status(201).send(result);
        });

        // Get job by ID
        app.get('/jobs/:id', async (req, res) => {
            const job = await jobsCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!job) return res.status(404).send({ message: "Job not found" });
            res.status(200).send(job);
        });

        // Apply for a job
        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            if (!application.job_id || !application.applicant_email) {
                return res.status(400).send({ message: "Missing required application fields" });
            }
            const result = await jobApplicationsCollection.insertOne(application);
            res.status(201).send(result);
        });

        // Get applications (with optional email filtering)
        app.get('/job-applications', async (req, res) => {
            const email = req.query.email;
            
            const query = email ? { applicant_email: email } : {};
            const applications = await jobApplicationsCollection.find(query).toArray();

            if (applications.length === 0) {
                return res.status(404).send({ message: "No applications found" });
            }

            res.status(200).send(applications);
        });

        app.get('/', (req, res) => {
            res.send('Job portal server is running!');
        });

    } catch (error) {
        console.error('Error in server:', error);
    }
}

run().catch(console.dir);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Something went wrong!', error: err.message });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
