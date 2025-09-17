// server.js - Backend API service for OpenAI integration
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Knowledge base for your enterprise chatbot
const COMPLIANCE_KNOWLEDGE = `
You are an expert Enterprise Compliance and AFS Payment Gateway Assistant. You have comprehensive knowledge in:

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

Always provide detailed, accurate responses based on current regulatory requirements and best practices.
`;

// Chat endpoint with streaming support
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare conversation context
    const messages = [
      {
        role: 'system',
        content: COMPLIANCE_KNOWLEDGE
      },
      // Add conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(content);
      }
    }

    res.end();
    
    // Log the conversation (optional)
    console.log('User:', message);
    console.log('Assistant:', fullResponse);

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid OpenAI API key. Please check your configuration.' 
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process request. Please try again.' 
    });
  }
});

// Non-streaming chat endpoint (alternative)
app.post('/api/chat/simple', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [
      {
        role: 'system',
        content: COMPLIANCE_KNOWLEDGE
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    res.json({
      response: response,
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process request. Please try again.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API key validation endpoint
app.get('/api/validate-key', async (req, res) => {
  try {
    const models = await openai.models.list();
    res.json({ valid: true, modelCount: models.data.length });
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'}`);
  console.log(`🔑 API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});

module.exports = app;
