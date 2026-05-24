import { SummaryLength } from '../dto/summarization.dto';

/**
 * System instruction for summarization
 */
export const SUMMARIZATION_SYSTEM_INSTRUCTION = `You are an expert research paper summarizer. Your task is to create clear, accurate, and concise summaries of academic papers.

Guidelines:
- Focus on the main contributions, methodology, and key findings
- Use clear, accessible language while maintaining technical accuracy
- Preserve important technical terms and concepts
- Structure the summary logically (context → methods → results → implications)
- Avoid unnecessary jargon or overly complex sentences
- Do not include citations or references in the summary
- Write in present tense for describing the paper's content`;

/**
 * Get word count target based on summary length
 */
export function getWordCountTarget(length: SummaryLength): { min: number; max: number } {
  switch (length) {
    case SummaryLength.SHORT:
      return { min: 100, max: 150 };
    case SummaryLength.MEDIUM:
      return { min: 250, max: 350 };
    case SummaryLength.LONG:
      return { min: 500, max: 700 };
  }
}

/**
 * Generate summarization prompt for full text
 */
export function generateFullTextSummaryPrompt(
  text: string,
  length: SummaryLength,
  metadata?: { title?: string; authors?: string[]; year?: number },
): string {
  const { min, max } = getWordCountTarget(length);
  
  let prompt = `Summarize the following research paper in ${min}-${max} words.\n\n`;
  
  if (metadata?.title) {
    prompt += `Title: ${metadata.title}\n`;
  }
  if (metadata?.authors && metadata.authors.length > 0) {
    prompt += `Authors: ${metadata.authors.join(', ')}\n`;
  }
  if (metadata?.year) {
    prompt += `Year: ${metadata.year}\n`;
  }
  
  prompt += `\n---\n\n${text}\n\n---\n\n`;
  prompt += `Provide a ${length} summary (${min}-${max} words) that covers:\n`;
  prompt += `1. Research context and motivation\n`;
  prompt += `2. Main methodology or approach\n`;
  prompt += `3. Key findings and results\n`;
  prompt += `4. Significance and implications\n\n`;
  prompt += `Write the summary as a single cohesive paragraph or multiple paragraphs as appropriate.`;
  
  return prompt;
}

/**
 * Generate summarization prompt for section-based approach
 * This provides better accuracy by identifying key sections
 */
export function generateSectionBasedSummaryPrompt(
  text: string,
  length: SummaryLength,
  metadata?: { title?: string; authors?: string[]; year?: number },
): string {
  const { min, max } = getWordCountTarget(length);
  
  let prompt = `Analyze and summarize the following research paper in ${min}-${max} words.\n\n`;
  
  if (metadata?.title) {
    prompt += `Title: ${metadata.title}\n`;
  }
  if (metadata?.authors && metadata.authors.length > 0) {
    prompt += `Authors: ${metadata.authors.join(', ')}\n`;
  }
  if (metadata?.year) {
    prompt += `Year: ${metadata.year}\n`;
  }
  
  prompt += `\n---\n\n${text}\n\n---\n\n`;
  prompt += `Instructions:\n`;
  prompt += `1. Identify the key sections (abstract, introduction, methodology, results, conclusion)\n`;
  prompt += `2. Extract the most important information from each section\n`;
  prompt += `3. Synthesize this into a ${length} summary (${min}-${max} words)\n\n`;
  prompt += `The summary should cover:\n`;
  prompt += `- Research problem and objectives\n`;
  prompt += `- Methodology and approach\n`;
  prompt += `- Main findings and contributions\n`;
  prompt += `- Implications and significance\n\n`;
  prompt += `Write a clear, well-structured summary that captures the essence of the paper.`;
  
  return prompt;
}

/**
 * Generate prompt for chunked summarization (for very large documents)
 */
export function generateChunkSummaryPrompt(chunk: string, chunkIndex: number, totalChunks: number): string {
  return `This is part ${chunkIndex + 1} of ${totalChunks} from a research paper.

Summarize the key points from this section in 100-150 words:

---

${chunk}

---

Focus on extracting the most important information, findings, or methodological details from this section.`;
}

/**
 * Generate prompt to combine chunk summaries into final summary
 */
export function generateCombineSummariesPrompt(
  chunkSummaries: string[],
  length: SummaryLength,
  metadata?: { title?: string; authors?: string[]; year?: number },
): string {
  const { min, max } = getWordCountTarget(length);
  
  let prompt = `The following are summaries of different sections from a research paper:\n\n`;
  
  chunkSummaries.forEach((summary, index) => {
    prompt += `Section ${index + 1}:\n${summary}\n\n`;
  });
  
  prompt += `---\n\n`;
  
  if (metadata?.title) {
    prompt += `Paper Title: ${metadata.title}\n`;
  }
  
  prompt += `\nCombine these section summaries into a single, cohesive ${length} summary (${min}-${max} words) that:\n`;
  prompt += `1. Eliminates redundancy\n`;
  prompt += `2. Maintains logical flow\n`;
  prompt += `3. Captures all key points\n`;
  prompt += `4. Reads as a unified narrative\n\n`;
  prompt += `Provide the final summary:`;
  
  return prompt;
}
