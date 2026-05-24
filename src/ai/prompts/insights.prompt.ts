/**
 * System instruction for insights extraction
 */
export const INSIGHTS_SYSTEM_INSTRUCTION = `You are an expert research analyst specializing in extracting structured insights from academic papers.

Your task is to analyze research papers and extract key structured information in valid JSON format.

Guidelines:
- Be precise and factual — only extract what is explicitly stated or clearly implied in the paper
- Use concise language for each field
- For arrays, extract the most important items (3-7 items per array is ideal)
- Significance levels: "High" = core finding, "Medium" = supporting finding, "Low" = minor observation
- If a section is not present or unclear, use an empty array [] or a brief "Not specified" string
- Always return valid JSON — no markdown code blocks, no extra text, just the JSON object`;

/**
 * Generate the insights extraction prompt
 */
export function generateInsightsPrompt(
  text: string,
  metadata?: { title?: string; authors?: string[]; year?: number },
): string {
  let prompt = `Extract structured insights from the following research paper.\n\n`;

  if (metadata?.title) prompt += `Title: ${metadata.title}\n`;
  if (metadata?.authors?.length) prompt += `Authors: ${metadata.authors.join(', ')}\n`;
  if (metadata?.year) prompt += `Year: ${metadata.year}\n`;

  prompt += `\n---\n\n${text}\n\n---\n\n`;

  prompt += `Return ONLY a valid JSON object with exactly this structure (no markdown, no extra text):

{
  "researchProblem": "The specific research problem or question this paper addresses",
  "methodology": "A concise description of the methods, techniques, or approach used",
  "keyFindings": [
    { "finding": "Description of finding", "significance": "High" | "Medium" | "Low" }
  ],
  "limitations": [
    "Limitation 1",
    "Limitation 2"
  ],
  "futureWork": [
    "Future direction 1",
    "Future direction 2"
  ],
  "contributions": [
    "Main contribution 1",
    "Main contribution 2"
  ],
  "datasets": [
    "Dataset or benchmark name 1"
  ]
}`;

  return prompt;
}

/**
 * Generate prompt for chunked text — extract partial insights per chunk
 */
export function generateChunkInsightsPrompt(
  chunk: string,
  chunkIndex: number,
  totalChunks: number,
): string {
  return `This is part ${chunkIndex + 1} of ${totalChunks} from a research paper.

Extract any of the following that appear in this section:
- Research problem or objective
- Methodology or approach
- Key findings or results
- Limitations
- Future work suggestions
- Main contributions
- Datasets or benchmarks used

Return ONLY a valid JSON object (no markdown, no extra text):

{
  "researchProblem": "string or empty string if not found",
  "methodology": "string or empty string if not found",
  "keyFindings": [{ "finding": "string", "significance": "High" | "Medium" | "Low" }],
  "limitations": ["string"],
  "futureWork": ["string"],
  "contributions": ["string"],
  "datasets": ["string"]
}

Section content:
---
${chunk}
---`;
}

/**
 * Generate prompt to merge partial insights from multiple chunks into final insights
 */
export function generateMergeInsightsPrompt(
  partialInsights: string[],
  metadata?: { title?: string; authors?: string[]; year?: number },
): string {
  let prompt = `The following are partial insights extracted from different sections of a research paper.\n\n`;

  if (metadata?.title) prompt += `Paper Title: ${metadata.title}\n`;
  if (metadata?.authors?.length) prompt += `Authors: ${metadata.authors.join(', ')}\n\n`;

  partialInsights.forEach((insight, i) => {
    prompt += `--- Section ${i + 1} insights ---\n${insight}\n\n`;
  });

  prompt += `Merge and deduplicate these partial insights into a single comprehensive JSON object.
Remove duplicates, keep the most informative version of each item, and ensure all arrays have 3-7 items max.

Return ONLY a valid JSON object with exactly this structure (no markdown, no extra text):

{
  "researchProblem": "The specific research problem or question this paper addresses",
  "methodology": "A concise description of the methods, techniques, or approach used",
  "keyFindings": [
    { "finding": "Description of finding", "significance": "High" | "Medium" | "Low" }
  ],
  "limitations": ["string"],
  "futureWork": ["string"],
  "contributions": ["string"],
  "datasets": ["string"]
}`;

  return prompt;
}
