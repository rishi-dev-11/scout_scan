import { ChromaClient } from 'chromadb';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'security-knowledge';

const chroma = new ChromaClient({ path: CHROMA_URL });
let collectionPromise = chroma.getOrCreateCollection({ name: COLLECTION_NAME });

export async function searchKnowledge(query: string, topK = 5) {
  const collection = await collectionPromise;

  const result = await collection.query({
    queryTexts: [query],
    nResults: topK
  });

  return {
    documents: result.documents?.[0] || [],
    metadatas: result.metadatas?.[0] || [],
    ids: result.ids?.[0] || []
  };
}
