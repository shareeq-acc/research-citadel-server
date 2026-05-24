/**
 * System instruction for the Q&A assistant
 */
export const QA_SYSTEM_INSTRUCTION = `You are a research assistant helping users understand academic papers and research sources.

You answer questions based ONLY on the provided context excerpts from research documents.

Guidelines:
- Answer directly and concisely based on the provided context
- If the context does not contain enough information to answer, say so clearly
- Cite which source(s) your answer is based on using the source title
- Use precise, academic language appropriate for research
- Do not fabricate information not present in the context
- If multiple sources address the question, synthesize the information
- Keep answers focused and relevant to the question asked`;

/**
 * Build the Q&A prompt with retrieved context chunks
 */
export function buildQaPrompt(
  question: string,
  contextChunks: Array<{ text: string; sourceTitle: string; chunkIndex: number }>,
): string {
  let prompt = `Answer the following question based on the research context provided below.\n\n`;
  prompt += `Question: ${question}\n\n`;
  prompt += `--- Research Context ---\n\n`;

  contextChunks.forEach((chunk, i) => {
    prompt += `[Source ${i + 1}: "${chunk.sourceTitle}" — excerpt ${chunk.chunkIndex + 1}]\n`;
    prompt += `${chunk.text}\n\n`;
  });

  prompt += `--- End of Context ---\n\n`;
  prompt += `Provide a clear, accurate answer based on the context above. `;
  prompt += `Reference the source titles when citing specific information.`;

  return prompt;
}
