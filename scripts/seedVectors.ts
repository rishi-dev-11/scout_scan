import fs from 'fs/promises';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

const KB_ROOT = path.join(process.cwd(), 'knowledge-base');
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'security-knowledge';

// 1. Collect all markdown files
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getMarkdownFiles(full)));
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

// 2. Simple chunking by character length
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function main() {
  console.log('🔍 Seeding knowledge base into Chroma...');

  // Init Chroma client
  const chroma = new ChromaClient({ path: CHROMA_URL });
  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { description: 'Security KB: OWASP, API, CWE, cheat sheets, best practices' }
  });

  // Init embedding model (runs locally, downloads first time)
  console.log('📦 Loading embedding model (Xenova/all-MiniLM-L6-v2)...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Get all markdown files
  const files = await getMarkdownFiles(KB_ROOT);
  console.log(`📁 Found ${files.length} markdown files`);

  let globalCount = 0;

  for (const file of files) {
    const rel = path.relative(KB_ROOT, file);
    console.log(`\n📄 Processing: ${rel}`);

    const raw = await fs.readFile(file, 'utf-8');
    const chunks = chunkText(raw, 1200, 200);

    console.log(`   ➜ ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const emb = (await embedder(chunk, {
        pooling: 'mean',
        normalize: true
      })) as any;

      const vector = Array.from(emb.data as Float32Array);

      await collection.add({
        ids: [`${rel}::${i}`],
        documents: [chunk],
        metadatas: [
          {
            source: rel,
            chunkIndex: i
          }
        ],
        embeddings: [vector]
      });

      globalCount += 1;
      if (globalCount % 20 === 0) {
        console.log(`   ✅ Stored ${globalCount} chunks so far...`);
      }
    }
  }

  console.log(`\n🎉 Done seeding. Total chunks stored: ${globalCount}`);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
