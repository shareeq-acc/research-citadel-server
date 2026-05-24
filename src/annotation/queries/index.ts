export const annotationSelect = {
  id: true,
  sourceId: true,
  vaultId: true,
  userId: true,
  contentMarkdown: true,
  contentHtml: true,
  pageReference: true,
  sectionReference: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  source: {
    select: {
      id: true,
      title: true,
      sourceType: true,
    },
  },
} as const;

export type AnnotationSelect = {
  id: string;
  sourceId: string;
  vaultId: string;
  userId: string;
  contentMarkdown: string;
  contentHtml: string;
  pageReference: number | null;
  sectionReference: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  source: {
    id: string;
    title: string;
    sourceType: string;
  };
};
