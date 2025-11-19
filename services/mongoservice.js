const { MongoClient } = require('mongodb');

class MongoService {
    constructor(connectionString) {
        this.connectionString = connectionString || 'mongodb://localhost:27017';
        this.client = null;
        this.db = null;
    }

    async connect() {
        if (!this.client) {
            this.client = new MongoClient(this.connectionString);
            await this.client.connect();
            this.db = this.client.db('corpora');
            console.log('✅ Connected to MongoDB - corpora database');
        }
        return this.db;
    }

    async insertQAPairs(documents) {
        const db = await this.connect();
        const collection = db.collection('qa-pairs');
        
        // Add timestamps to all documents
        const documentsWithTimestamps = documents.map(doc => ({
            ...doc,
            created_at: doc.created_at || new Date().toISOString()
        }));

        // Batch insert all documents
        return await collection.insertMany(documentsWithTimestamps);
    }

    async findQAPairs(query = {}, limit = 10) {
        const db = await this.connect();
        const collection = db.collection('qa-pairs');
        return await collection.find(query).limit(limit).toArray();
    }

    async getQAPairById(id) {
        const db = await this.connect();
        const collection = db.collection('qa-pairs');
        const { ObjectId } = require('mongodb');
        return await collection.findOne({ _id: new ObjectId(id) });
    }

    async deleteQAPair(id) {
        const db = await this.connect();
        const collection = db.collection('qa-pairs');
        const { ObjectId } = require('mongodb');
        return await collection.deleteOne({ _id: new ObjectId(id) });
    }

    async getCollectionStats() {
        const db = await this.connect();
        const collection = db.collection('qa-pairs');
        
        const stats = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    totalPairs: { $sum: 1 },
                    totalPromptTokens: { $sum: "$training_metadata.prompt_tokens" },
                    totalResponseTokens: { $sum: "$training_metadata.response_tokens" },
                    totalTokens: { $sum: "$training_metadata.total_tokens" },
                    averageWeight: { $avg: "$training_metadata.weighting" },
                    withSource: { 
                        $sum: { 
                            $cond: [{ $ne: ["$source", null] }, 1, 0] 
                        } 
                    },
                    withAttribution: { 
                        $sum: { 
                            $cond: [{ $ne: ["$attribution", null] }, 1, 0] 
                        } 
                    }
                }
            }
        ]).toArray();
        
        return stats[0] || {
            totalPairs: 0,
            totalPromptTokens: 0,
            totalResponseTokens: 0,
            totalTokens: 0,
            averageWeight: 0,
            withSource: 0,
            withAttribution: 0
        };
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('🔒 MongoDB connection closed');
        }
    }
}

module.exports = MongoService;