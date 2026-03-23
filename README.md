<h1 align="center">🧠 DocuMind AI</h1>

<p align="center">
  <b>Agentic RAG System for Intelligent Document Conversations</b><br/>
  Transform static documents into interactive knowledge systems using Retrieval-Augmented Generation
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Backend-green"/>
  <img src="https://img.shields.io/badge/React-Frontend-blue"/>
  <img src="https://img.shields.io/badge/FAISS-Vector%20Search-orange"/>
  <img src="https://img.shields.io/badge/Gemini-LLM-purple"/>
</p>

<br/>

<p align="center">
  <i>A full-stack production-oriented AI system that enables contextual Q&A over documents with real-time streaming and secure authentication.</i>
</p>

<br/>

<h2 align="center">🖥️ Application Preview</h2>


<p align="center">
  <img src="./assets/auth.png" width="45%" />
</p>

<p align="center">
  <i>Secure authentication with email/password and Google login</i>
</p>

<p align="center">
  <img src="./assets/dashboard.png" width="85%" />
</p>

<p align="center">
  <i>Main dashboard with chat interface and streaming responses</i>
</p>

<br/>

<br/>

<h2 align="center">⚡ Core Concept</h2>

<p align="center">
Instead of directly querying an LLM, the system retrieves relevant document context first and then generates answers grounded in that data.
</p>

<p align="center">
<b>Query → Retrieval → Context Injection → LLM → Streaming Response</b>
</p>

<br/>

<h2 align="center">🧱 System Architecture</h2>

<p align="center">
  <img src="https://raw.githubusercontent.com/ashishps1/awesome-low-level-design/master/images/system-design.png" width="70%" />
</p>

<pre>
┌──────────────────────────┐
│        React UI          │
│  (Chat + Streaming UX)   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Authentication Layer     │
│ JWT + HTTP-only Cookies  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│     FastAPI Backend      │
│  API + Business Logic    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       RAG Pipeline       │
│                          │
│  • Document Ingestion    │
│  • Chunking              │
│  • Embeddings            │
│  • FAISS Vector Store    │
│  • Retrieval + Rerank    │
│  • Prompt Builder        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Gemini LLM API      │
│  Response Generation     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Streaming Response SSE  │
│   (Token-by-token UI)    │
└──────────────────────────┘
</pre>

<br/>

<h2 align="center">🚀 Capabilities</h2>

<p>
• Upload documents (PDF, TXT, DOCX)<br/>
• Perform semantic search using embeddings<br/>
• Retrieve context-aware answers<br/>
• Real-time streaming responses (ChatGPT-like UX)<br/>
• Multi-session chat system<br/>
• Secure authentication with cookies + CSRF protection
</p>

<br/>

<h2 align="center">🧠 Engineering Depth</h2>

<p>
<b>Retrieval-Augmented Generation</b><br/>
Transforms documents into embeddings and retrieves top-k relevant chunks using FAISS for efficient semantic similarity search.
</p>

<p>
<b>Context-Aware Prompt Engineering</b><br/>
Constructs dynamic prompts using retrieved chunks to reduce hallucination and improve accuracy.
</p>

<p>
<b>Streaming Architecture (SSE)</b><br/>
Implements server-sent events to stream tokens progressively, improving perceived latency.
</p>

<p>
<b>Secure Authentication</b><br/>
JWT-based authentication using HTTP-only cookies with CSRF protection for secure cross-origin access.
</p>

<p>
<b>Fault-Tolerant LLM Integration</b><br/>
Handles rate limits using retry logic, exponential backoff, and graceful fallback messaging.
</p>

<p>
<b>Modular Backend Design</b><br/>
Decoupled services: ingestion, retrieval, LLM, and auth → scalable and maintainable.
</p>

<br/>

<h2 align="center">🧪 Tech Stack</h2>

<pre>
Frontend   : React (Vite), TypeScript
Backend    : FastAPI, Python
Database   : PostgreSQL / Supabase
Vector DB  : FAISS
Embeddings : Sentence Transformers
LLM        : Google Gemini API
Deployment : Render + Vercel
</pre>

<br/>

<h2 align="center">🔍 Execution Flow</h2>

<p>
1. User uploads document<br/>
2. Backend chunks and embeds content<br/>
3. Stores embeddings in FAISS<br/>
4. User asks query<br/>
5. System retrieves relevant chunks<br/>
6. Builds structured prompt<br/>
7. Sends to LLM<br/>
8. Streams response back to UI
</p>

<br/>

<h2 align="center">🛠️ Local Setup</h2>

<pre>
Backend:
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

.env:
DATABASE_URL=your_db_url
SECRET_KEY=your_secret
GEMINI_API_KEY=your_api_key
GOOGLE_CLIENT_ID=your_google_client_id

Frontend:
cd frontend
npm install
npm run dev
</pre>

<br/>

<h2 align="center">🌐 Deployment</h2>

<p align="center">
Backend → Render<br/>
Frontend → Vercel
</p>

<br/>

<h2 align="center">⚠️ Real-World Problems Solved</h2>

<p>
• LLM API rate limits and quota handling<br/>
• Streaming failures and fallback responses<br/>
• Secure cookie-based auth across domains<br/>
• Retrieval vs latency trade-offs
</p>

<br/>

<h2 align="center">🎯 Why This Project Stands Out</h2>

<p>
This is not just a chatbot. It demonstrates:<br/>
• End-to-end system design<br/>
• Production-ready backend architecture<br/>
• Real-world LLM integration challenges<br/>
• Scalable AI application patterns
</p>

<br/>

<h2 align="center">👨‍💻 Author</h2>

<p align="center">
Kumar Purushotham
</p>

<br/>

<p align="center">
⭐ Star this repository if you found it useful!
</p>
