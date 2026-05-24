import { ApiProperty } from '@nestjs/swagger';

/**
 * A single key finding extracted from the paper
 */
export class FindingDto {
  @ApiProperty({ example: 'The Transformer outperforms RNNs on translation tasks' })
  finding: string;

  @ApiProperty({ example: 'High', enum: ['High', 'Medium', 'Low'] })
  significance: 'High' | 'Medium' | 'Low';
}

/**
 * Structured insights extracted from a research paper
 */
export class InsightsDto {
  @ApiProperty({
    description: 'Research problem or question the paper addresses',
    example: 'How can sequence transduction be performed without recurrence?',
  })
  researchProblem: string;

  @ApiProperty({
    description: 'Methodology and approach used',
    example: 'The authors propose a novel architecture based entirely on attention mechanisms.',
  })
  methodology: string;

  @ApiProperty({
    description: 'Key findings from the research',
    type: [FindingDto],
  })
  keyFindings: FindingDto[];

  @ApiProperty({
    description: 'Limitations acknowledged by the authors or apparent from the work',
    type: [String],
    example: ['Limited evaluation on non-translation tasks', 'High memory requirements'],
  })
  limitations: string[];

  @ApiProperty({
    description: 'Future work directions suggested',
    type: [String],
    example: ['Extend to other modalities', 'Investigate local attention mechanisms'],
  })
  futureWork: string[];

  @ApiProperty({
    description: 'Main contributions of the paper',
    type: [String],
    example: ['Introduced the Transformer architecture', 'Achieved state-of-the-art BLEU scores'],
  })
  contributions: string[];

  @ApiProperty({
    description: 'Datasets or benchmarks used for evaluation',
    type: [String],
    example: ['WMT 2014 English-German', 'WMT 2014 English-French'],
  })
  datasets: string[];
}
