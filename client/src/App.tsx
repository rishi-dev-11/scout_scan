import { useState } from 'react';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer('');

    try {
      const res = await fetch('http://localhost:3001/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, topK: 5 })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnswer(data.answer || JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>SecureScout RAG Demo</h1>
      <p>Ask a security question grounded on OWASP/CWE/cheat sheets.</p>

      <textarea
        rows={4}
        style={{ width: '100%', padding: 8 }}
        placeholder="e.g. How to prevent SQL injection in a Node.js API?"
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />

      <button
        onClick={ask}
        disabled={loading}
        style={{ marginTop: 12, padding: '8px 16px' }}
      >
        {loading ? 'Thinking…' : 'Ask'}
      </button>

      {error && (
        <p style={{ color: 'red', marginTop: 12 }}>Error: {error}</p>
      )}

      {answer && (
        <div style={{ marginTop: 24, whiteSpace: 'pre-wrap' }}>
          <h2>Answer</h2>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
