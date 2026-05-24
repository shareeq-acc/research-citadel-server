export const citationSelect = {
  id: true,
  sourceId: true,
  format: true,
  citation: true,
  generatedAt: true,
  updatedAt: true,
  source: {
    select: {
      id: true,
      title: true,
      sourceType: true,
    },
  },
} as const;

export type CitationSelect = {
  id: string;
  sourceId: string;
  format: string;
  citation: string;
  generatedAt: Date;
  updatedAt: Date;
  source: {
    id: string;
    title: string;
    sourceType: string;
  };
};
