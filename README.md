# QA Pairs Corpus Tool

Training data builder for **YouEatingHealthy (YEH)** LLM - Phase 1

## Purpose

Build high-quality Q&A training pairs for fine-tuning your nutrition LLM with:
- Human questions in conversational format
- YEH responses (your AI assistant's voice)
- Optional source attribution
- Automatic token counting
- Batch MongoDB insertion

## Schema

```javascript
{
  "_id": ObjectId("..."),
  "prompt": "How much protein should I eat on carnivore?",
  "response": "Target 0.8-1.2g per pound of body weight...",
  "source": "The Carnivore Code",  // optional
  "attribution": "Paul Saladino",  // optional
  "training_metadata": {
    "prompt_tokens": 12,
    "response_tokens": 45,
    "total_tokens": 57,
    "weighting": 5  // hardcoded for Q&A pairs
  },
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Collection:** `corpora.qa-pairs`

## Setup

### 1. Install Dependencies

```bash
cd qa-pairs-tool
npm install
```

### 2. Configure MongoDB

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection:

```bash
MONGODB_URI=mongodb://your-mongo-host:27017/corpora
PORT=3001
```

### 3. Start Server

```bash
npm start
```

Or with auto-restart during development:

```bash
npm run dev
```

### 4. Open Browser

Navigate to: `http://localhost:3001`

## Usage

### Adding Q&A Pairs

1. **Enter Prompt** - Human's question (e.g., "How much protein on carnivore?")
2. **Enter Response** - YEH's answer (your AI's voice)
3. **Add Optional Fields**:
   - Source: Where this knowledge came from (book title, video, etc.)
   - Attribution: Expert/author name
4. **Click "Add to List"** - Form clears, item appears in queue below
5. **Repeat** - Build up your batch (1 to n items)

### Editing Items

- **Click any item in the list** - Removes from list, loads into form
- **Edit** the text as needed
- **Click "Add"** - Re-adds the edited version
- **Click "Clear"** - Deletes it forever (two-step delete)

### Inserting to MongoDB

1. Build your list with multiple Q&A pairs
2. **Click "Insert into MongoDB"** - Batch inserts all items
3. List clears automatically after successful insert

## Token Counting

- **Prompt tokens** - Estimated at 4 chars per token
- **Response tokens** - Estimated at 4 chars per token
- **Total tokens** - Sum of prompt + response
- Updates live as you type

## Training Weight

All Q&A pairs automatically get `weighting: 5`, meaning they'll be seen **5x more** during training compared to your books (weight: 1).

This prioritizes conversational Q&A format learning.

## API Endpoints

### POST `/api/insert-qa-pairs`

Batch insert Q&A pairs.

**Request:**
```json
{
  "documents": [
    {
      "prompt": "...",
      "response": "...",
      "source": "...",
      "attribution": "..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "insertedCount": 10,
  "message": "Successfully inserted 10 QA pairs"
}
```

### GET `/api/stats`

Get collection statistics.

**Response:**
```json
{
  "totalPairs": 500,
  "totalTokens": 28500,
  "averageWeight": 5,
  "withSource": 450,
  "withAttribution": 450
}
```

### GET `/api/qa-pairs?limit=10`

Get recent Q&A pairs (for debugging).

### GET `/api/health`

Health check endpoint.

## Phase 2 (Coming Tomorrow)

GPT-4 book extraction feature:
- Paste book text
- GPT-4 generates Q&A pairs automatically
- Review/edit generated pairs
- Add to list for insertion

## MongoDB Collection

- **Database:** `corpora`
- **Collection:** `qa-pairs`
- **Indexes:** Add if needed for performance:
  ```javascript
  db.getCollection('qa-pairs').createIndex({ "created_at": -1 })
  db.getCollection('qa-pairs').createIndex({ "source": 1 })
  db.getCollection('qa-pairs').createIndex({ "attribution": 1 })
  ```

## Export to JSONL (for training)

Use your Go API or Node script to export:

```javascript
// Example export query
db.getCollection('qa-pairs').find({}).forEach(doc => {
  const trainingText = `Human: ${doc.prompt}\n\nYEH: ${doc.response}`;
  const jsonl = { text: trainingText, weight: doc.training_metadata.weighting };
  printjson(jsonl);
});
```

## Notes

- **Required fields:** `prompt` and `response` only
- **Optional fields:** `source` and `attribution` can be null
- **Token counting:** Approximate (4 chars/token)
- **Weighting:** Always 5 for Q&A pairs
- **Timestamps:** Auto-generated on insert
- **Validation:** Client-side and server-side

## Next Steps

1. Build 500+ Q&A pairs manually
2. Tomorrow: Add GPT-4 extraction feature
3. Export to JSONL format
4. Combine with book corpus
5. Train Falcon Mamba on your workstation

---

**Author:** Marty Mazurik  
**Project:** YouEatingHealthy (YEH)  
**Target:** April 15, 2025 MVP