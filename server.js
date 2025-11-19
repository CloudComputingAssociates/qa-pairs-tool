const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import services
const MongoService = require('./services/mongoservice');

// Initialize services
const mongoService = new MongoService(process.env.MONGODB_URI);

// ============================================================================
// ROUTES
// ============================================================================

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Batch insert QA pairs to MongoDB
app.post('/api/insert-qa-pairs', async (req, res) => {
    try {
        const { documents } = req.body;
        
        // Validation
        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return res.status(400).json({ 
                error: 'Missing or invalid documents array' 
            });
        }

        // Validate each document has required fields
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            if (!doc.prompt || !doc.response) {
                return res.status(400).json({ 
                    error: `Document ${i + 1} missing required fields: prompt and response` 
                });
            }
        }

        // Insert all documents
        const result = await mongoService.insertQAPairs(documents);
        
        console.log(`✅ Inserted ${result.insertedCount} QA pairs to collection`);
        
        res.json({ 
            success: true, 
            insertedCount: result.insertedCount,
            message: `Successfully inserted ${result.insertedCount} QA pairs`
        });
        
    } catch (error) {
        console.error('Error inserting QA pairs:', error);
        res.status(500).json({ 
            error: 'Failed to insert QA pairs: ' + error.message 
        });
    }
});

// Get collection statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await mongoService.getCollectionStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch collection statistics' });
    }
});

// Get recent QA pairs (optional endpoint for admin/debugging)
app.get('/api/qa-pairs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const qaPairs = await mongoService.findQAPairs({}, limit);
        res.json(qaPairs);
    } catch (error) {
        console.error('Error fetching QA pairs:', error);
        res.status(500).json({ error: 'Failed to fetch QA pairs' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await mongoService.connect();
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            collection: 'qa-pairs',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down server...');
    try {
        await mongoService.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 QA Pairs Corpus Tool running on http://localhost:${PORT}`);
    console.log(`🎯 Building training data for YouEatingHealthy LLM`);
    console.log(`📊 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/corpora'}`);
    console.log(`📁 Collection: qa-pairs`);
});