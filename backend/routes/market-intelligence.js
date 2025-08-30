import express from 'express';
import { OpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI with your API key
const llm = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo-instruct", // Cheaper for prototyping
  temperature: 0.3,
  maxTokens: 300,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Text splitter for chunking documents
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Document ingestion endpoint
router.post('/ingest', async (req, res) => {
  try {
    const documentsPath = path.join(__dirname, '..', 'data', 'documents');
    const vectorStorePath = path.join(__dirname, '..', 'data', 'vector-store');
    
    // Create directories if they don't exist
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
    }
    if (!fs.existsSync(vectorStorePath)) {
      fs.mkdirSync(vectorStorePath, { recursive: true });
    }

    // Load all PDF documents
    const documents = [];
    const files = fs.readdirSync(documentsPath);
    
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(documentsPath, file);
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();
        
        // Add metadata
        docs.forEach(doc => {
          doc.metadata.source = file;
          doc.metadata.type = 'market_intelligence';
        });
        
        documents.push(...docs);
      }
    }

    if (documents.length === 0) {
      return res.status(400).json({ error: 'No PDF documents found in data/documents folder' });
    }

    // Split documents into chunks
    const splitDocs = await textSplitter.splitDocuments(documents);
    console.log(`Processing ${splitDocs.length} document chunks`);

    // Create embeddings and vector store
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    
    // Save vector store
    await vectorStore.save(vectorStorePath);
    
    res.json({ 
      message: 'Documents processed successfully',
      documentsProcessed: documents.length,
      chunksCreated: splitDocs.length
    });
  } catch (error) {
    console.error('Error ingesting documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint with enhanced responses
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const vectorStorePath = path.join(__dirname, '..', 'data', 'vector-store');
    
    if (!fs.existsSync(vectorStorePath)) {
      return res.status(400).json({ 
        error: 'No knowledge base found. Please ingest documents first.' 
      });
    }

    // Load vector store
    const vectorStore = await FaissStore.load(vectorStorePath, embeddings);
    
    // Get more relevant documents for richer context
    const relevantDocs = await vectorStore.similaritySearch(query, 5); // Increased from 3 to 5
    
    if (relevantDocs.length === 0) {
      return res.json({
        answer: "I couldn't find relevant information in the knowledge base to answer your question comprehensively.",
        sources: []
      });
    }

    // Prepare richer context
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
    
    // Enhanced prompt for detailed responses
    const prompt = `You are a professional market intelligence analyst providing comprehensive insights based on curated industry documents. 

INSTRUCTIONS:
- Provide detailed, thorough responses (aim for 50-100 words unless specifically requested otherwise)
- Use specific data, numbers, and facts from the provided documents
- Structure your response with clear sections or bullet points when appropriate
- Include market trends, implications, and analytical insights
- If the user requests a specific length (like "300 words"), honor that request
- Always be comprehensive while staying factual and grounded in the source material

CONTEXT FROM MARKET INTELLIGENCE DOCUMENTS:
${context}

USER QUESTION: ${query}

COMPREHENSIVE ANALYSIS:`;

    // Generate response with updated settings
    const response = await llm.invoke(prompt);
    
    // Prepare sources
    const sources = relevantDocs.map(doc => ({
      source: doc.metadata.source || 'Unknown',
      content: doc.pageContent.substring(0, 200) + '...'
    }));

    res.json({
      answer: response,
      sources: sources,
      query: query
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});


// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'Market Intelligence API is running' });
});

export default router;
