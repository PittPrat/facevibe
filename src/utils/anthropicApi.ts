import { Anthropic } from '@anthropic-ai/sdk';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY || '',
});

export async function generateCode(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
    // Extract the text content from the response instead of the content type
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      return response.content[0].text;
    }
    return 'Error: No text content found in the response.';
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return 'Error generating code.';
  }
}