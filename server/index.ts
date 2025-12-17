// import express from 'express';
// import dotenv from 'dotenv';
// import mongoose from 'mongoose';
// import { createClient } from 'redis';
// import axios from 'axios';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// app.use(express.json());

// // ----- MongoDB -----
// let mongoStatus: 'up' | 'down' = 'down';

// async function connectMongo() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI || '');
//     console.log('✅ MongoDB connected');
//     mongoStatus = 'up';
//   } catch (err: any) {
//     console.error('❌ MongoDB error:', err.message);
//     mongoStatus = 'down';
//   }
// }

// // ----- Redis -----
// const redisClient = createClient({
//   url: process.env.REDIS_URL,
// });
// let redisStatus: 'up' | 'down' = 'down';

// redisClient.on('error', (err) => {
//   console.error('❌ Redis error:', err);
//   redisStatus = 'down';
// });

// async function connectRedis() {
//   try {
//     if (!redisClient.isOpen) {
//       await redisClient.connect();
//     }
//     console.log('✅ Redis connected');
//     redisStatus = 'up';
//   } catch (err: any) {
//     console.error('❌ Redis connection failed:', err.message);
//     redisStatus = 'down';
//   }
// }

// // ----- ChromaDB -----
// let chromaStatus: 'up' | 'down' = 'down';

// async function checkChroma() {
//   try {
//     const url = (process.env.CHROMA_URL || 'http://localhost:8000') + '/api/v1/heartbeat';
//     const res = await axios.get(url);
//     if (res.status === 200) {
//       console.log('✅ ChromaDB reachable');
//       chromaStatus = 'up';
//     } else {
//       chromaStatus = 'down';
//     }
//   } catch (err: any) {
//     console.error('❌ ChromaDB error:', err.message);
//     chromaStatus = 'down';
//   }
// }

// // ----- Health endpoint -----
// app.get('/health', async (_req, res) => {
//   // Optionally re-check services (cheap)
//   await Promise.all([
//     mongoose.connection.readyState === 1 ? Promise.resolve() : connectMongo(),
//     redisClient.isOpen ? Promise.resolve() : connectRedis(),
//     checkChroma(),
//   ]);

//   res.json({
//     status: mongoStatus === 'up' && redisStatus === 'up' && chromaStatus === 'up' ? 'ok' : 'degraded',
//     services: {
//       mongo: mongoStatus,
//       redis: redisStatus,
//       chroma: chromaStatus,
//     },
//   });
// });

// // ----- Start server -----
// async function start() {
//   await connectMongo();
//   await connectRedis();
//   await checkChroma();

//   app.listen(PORT, () => {
//     console.log(`🚀 Backend running at http://localhost:${PORT}`);
//   });
// }

// start().catch((err) => {
//   console.error('Failed to start server:', err);
// });



// import express from 'express';
// import dotenv from 'dotenv';
// import { searchKnowledge } from './services/rag/ragService';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// app.use(express.json());

// app.get('/health', (_req, res) => {
//   res.json({ status: 'ok' });
// });

// // RAG search endpoint
// app.post('/rag/search', async (req, res) => {
//   const { query, topK } = req.body || {};

//   if (!query || typeof query !== 'string') {
//     return res.status(400).json({ error: 'query (string) is required' });
//   }

//   try {
//     const result = await searchKnowledge(query, topK ?? 5);
//     res.json(result);
//   } catch (err: any) {
//     console.error('RAG search error:', err.message);
//     res.status(500).json({ error: 'RAG search failed' });
//   }
// });
// app.post('/rag/ask', async (req, res) => {
//   const { question, topK } = req.body || {};
//   if (!question || typeof question !== 'string') {
//     return res.status(400).json({ error: 'question (string) is required' });
//   }

//   try {
//     const { documents, metadatas } = await searchKnowledge(question, topK ?? 5);

//     const contextBlocks = documents.map((doc: string, i: number) => {
//       const meta = metadatas[i] || {};
//       const source = meta.source || 'unknown';
//       return `Source: ${source}\n${doc}`;
//     });

//     const context = contextBlocks.join('\n\n---\n\n');

//     const answer = await askWithContext(question, context);

//     res.json({
//       question,
//       answer,
//       contextSources: metadatas
//     });
//   } catch (err: any) {
//     console.error('RAG ask error:', err.message);
//     res.status(500).json({ error: 'RAG+LLM failed' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Prototype backend running at http://localhost:${PORT}`);
// });








import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { searchKnowledge } from './services/rag/ragService';
import { askWithContext } from './services/rag/llmService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for React dev server
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// RAG search endpoint (retrieval only)
app.post('/rag/search', async (req, res) => {
  const { query, topK } = req.body || {};

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query (string) is required' });
  }

  try {
    const result = await searchKnowledge(query, topK ?? 5);
    res.json(result);
  } catch (err: any) {
    console.error('RAG search error:', err.message);
    res.status(500).json({ error: 'RAG search failed' });
  }
});

// RAG + LLM endpoint
app.post('/rag/ask', async (req, res) => {
  const { question, topK } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question (string) is required' });
  }

  try {
    const { documents, metadatas } = await searchKnowledge(question, topK ?? 5);

    const contextBlocks = documents.map((doc: string | null, i: number) => {
      const meta = metadatas[i] || {};
      const source = meta.source || 'unknown';
      return `Source: ${source}\n${doc || ''}`;
    });

    const context = contextBlocks.join('\n\n---\n\n');

    const answer = await askWithContext(question, context);

    res.json({
      question,
      answer,
      contextSources: metadatas,
    });
  } catch (err: any) {
    console.error('RAG ask error:', err.message);
    res.status(500).json({ error: 'RAG+LLM failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Prototype backend running at http://localhost:${PORT}`);
});
