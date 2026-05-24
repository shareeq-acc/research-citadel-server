export const sourceSelect = {
  id: true,
  vaultId: true,
  createdBy: true,
  title: true,
  authors: true,
  publication: true,
  year: true,
  externalUrl: true,
  sourceType: true,
  fileId: true,
  aiExtracted: true,
  abstract: true,
  keywords: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  file: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileSize: true,
      fileMimeType: true,
      fileType: true,
      pageCount: true,
    },
  },
} as const;

export type SourceSelect = {
  id: string;
  vaultId: string;
  createdBy: string;
  title: string;
  authors: string[];
  publication: string | null;
  year: number | null;
  externalUrl: string | null;
  sourceType: string;
  fileId: string | null;
  aiExtracted: boolean;
  abstract: string | null;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  creator: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  file: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileMimeType: string;
    fileType: string;
    pageCount: number | null;
  } | null;
};
