require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3001;

// Fixed CORS configuration for Codespaces
app.use(cors({
  origin: [
    'https://ideal-space-sniffle-w4g6r7v7r7phg467-3000.app.github.dev',
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check called from:', req.headers.origin);
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend server is running!'
  });
});

// API key validation endpoint
app.get('/api/validate-key', async (req, res) => {
  try {
    console.log('Validate key called from:', req.headers.origin);
    const models = await openai.models.list();
    res.json({ valid: true, modelCount: models.data.length });
  } catch (error) {
    console.error('API key validation failed:', error.message);
    res.json({ valid: false, error: error.message });
  }
});

// Simple chat endpoint
app.post('/api/chat/simple', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Chat request from:', req.headers.origin, 'Message:', message);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert Enterprise Compliance and AFS Payment Gateway Assistant. You have comprehensive knowledge in:

1. COMPLIANCE AREAS:
- Anti-Money Laundering (AML) regulations
- Know Your Customer (KYC) requirements  
- Payment Card Industry Data Security Standard (PCI DSS)
- General Data Protection Regulation (GDPR)
- SOX compliance requirements
- Financial services regulations

2. AFS APEX V2 PAYMENT GATEWAY:
- Payment processing workflows
- API integration methods
- Security protocols and encryption
- Transaction monitoring and reporting
- Error handling and troubleshooting
- Merchant onboarding procedures

Always provide detailed, accurate responses based on current regulatory requirements and best practices.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
    });

    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Streaming chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Streaming chat request from:', req.headers.origin, 'Message:', message);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert Enterprise Compliance and AFS Payment Gateway Assistant. You have comprehensive knowledge in compliance regulations and payment processing. Provide clear, concise responses.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }

    res.end();
    console.log('Streaming response completed');

  } catch (error) {
    console.error('Streaming chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Enterprise Chatbot Backend API',
    endpoints: ['/api/health', '/api/validate-key', '/api/chat/simple'],
    origin: req.headers.origin
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 OpenAI Model: gpt-3.5-turbo`);
  console.log(`🔑 API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🌐 CORS enabled for Codespaces`);
});

module.exports = app;
