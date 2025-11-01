import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type AIProvider = 'gemini' | 'openai'

export async function askLLM(question: string, context: string[], aiProvider: AIProvider = 'gemini') {
  const prompt = `Answer the question based only on the following course content:\n\n${context.join('\n\n')}\n\nQuestion: ${question}`

  try {
    if (aiProvider === 'openai') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that answers questions based on the provided course content. Only use information from the provided content to answer questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })

      return completion.choices[0]?.message?.content || 'No response generated'
    } else {
      // Default to Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })

      return result.response.text()
    }
  } catch (error) {
    console.error(`Error with ${aiProvider}:`, error)
    throw new Error(`Failed to get response from ${aiProvider}`)
  }
}

export type PDFFile = {
  fileName: string
  mimeType: string
  base64Data: string
  aiProvider: AIProvider
  uploadedAt: string
}

export async function askLLMWithPDFs(question: string, pdfFiles: PDFFile[], aiProvider: AIProvider = 'gemini') {
  try {
    if (aiProvider === 'openai') {
      // OpenAI PDF processing - Use Assistants API with file search
      console.log(`Processing ${pdfFiles.length} PDF(s) with OpenAI...`)
      
      try {
        // Create a file from the PDF base64 data
        const pdfFile = pdfFiles[0] // Use the first PDF
        const pdfBuffer = Buffer.from(pdfFile.base64Data, 'base64')
        
        console.log(`PDF file size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`)
        
        // Create a File-like object for OpenAI
        const file = new File([pdfBuffer], pdfFile.fileName, { type: pdfFile.mimeType })
        
        // Upload the file to OpenAI
        const uploadedFile = await openai.files.create({
          file: file,
          purpose: 'assistants'
        })
        
        console.log(`File uploaded to OpenAI: ${uploadedFile.id}`)
        
        // Create an assistant with file search
        const assistant = await openai.beta.assistants.create({
          name: "PDF Assistant",
          instructions: "You are a helpful assistant that answers questions based on the provided PDF document. Only use information from the PDF to answer questions.",
          model: "gpt-4o",
          tools: [{ type: "file_search" }]
        })
        
        // Create a thread with the file
        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: "user",
              content: question,
              attachments: [
                { file_id: uploadedFile.id, tools: [{ type: "file_search" }] }
              ]
            }
          ]
        })
        
        // Run the assistant and wait for completion
        await openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistant.id
        })
        
        // Get the response
        const messages = await openai.beta.threads.messages.list(thread.id)
        const response = messages.data[0].content[0]
        
        // Cleanup
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})
        
        if (response.type === 'text') {
          return response.text.value
        }
        
        return 'No response generated'
      } catch (openaiError) {
        console.error('OpenAI Assistant API error:', openaiError)
        // Fallback to simple completion without file
        console.log('Falling back to simple completion without file...')
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. The user has uploaded a PDF but we could not process it. Please let them know that PDF processing encountered an issue.'
            },
            {
              role: 'user',
              content: `I have a question about a PDF document, but there was an issue processing it. The question is: ${question}\n\nPlease apologize and ask the user to try again or use a different AI provider (Gemini).`
            }
          ],
          max_tokens: 500
        })
        
        return completion.choices[0]?.message?.content || 'Failed to process PDF with OpenAI. Please try using Gemini instead.'
      }
    } else {
      // Gemini PDF processing
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      // Prepare the parts array with PDF data first, then the question
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

      // Add each PDF file to the parts FIRST
      for (const pdfFile of pdfFiles) {
        console.log(`Adding PDF to Gemini: ${pdfFile.fileName}, size: ${(pdfFile.base64Data.length / 1024).toFixed(2)}KB`)
        parts.push({
          inlineData: {
            mimeType: pdfFile.mimeType,
            data: pdfFile.base64Data
          }
        })
      }
      
      // Then add the prompt/question AFTER the PDF
      const prompt = `I have uploaded a PDF document above. Please read and analyze it carefully.

Now answer the following question based ONLY on the content from the PDF document:

Question: ${question}

Provide a detailed answer using specific information from the document. If the answer is not in the document, say so.`

      parts.push({ text: prompt })

      console.log(`Sending ${pdfFiles.length} PDF(s) to Gemini with question: ${question.substring(0, 50)}...`)

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: parts
          }
        ]
      })

      const response = result.response.text()
      console.log(`Gemini response received: ${response.substring(0, 100)}...`)
      
      return response
    }
  } catch (error) {
    console.error(`Error processing PDFs with ${aiProvider}:`, error)
    
    // Log more details about the error
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        statusText: err.statusText,
        name: err.name
      })
    }
    
    // Check error type and provide helpful messages
    const errorMessage = (error as Error).message || ''
    
    // API Key issues
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('403')) {
      const otherProvider = aiProvider === 'gemini' ? 'OpenAI' : 'Gemini'
      throw new Error(`${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is invalid or missing. Please check your API key in environment variables or switch to ${otherProvider}.`)
    }
    
    // Size issues
    if (errorMessage.includes('too large') || errorMessage.includes('size') || errorMessage.includes('limit')) {
      throw new Error(`PDF file is too large for ${aiProvider} to process. Please upload a smaller PDF (max 10MB recommended).`)
    }
    
    throw new Error(`Failed to process PDF documents with ${aiProvider}: ${errorMessage}`)
  }
}
