export const vaultSelect = {
  id: true,
  name: true,
  description: true,
  privacy: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  _count: {
    select: { members: true, files: true, sources: true },
  },
} as const;

export type VaultSelect = {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  _count: {
    members: number;
    files: number;
    sources: number;
  };
};

/** Vault with the current user's role (OWNER, CONTRIBUTOR, or VIEWER) */
export type VaultWithMyRole = VaultSelect & { myRole: string };

/** Member row with user details (for vault view) */
export const vaultMemberSelect = {
  id: true,
  role: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
} as const;

export type VaultMemberWithUser = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

/** Vault select including members list (for GET single vault) */
export const vaultSelectWithMembers = {
  ...vaultSelect,
  members: {
    select: vaultMemberSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export type VaultWithMembersSelect = Omit<VaultSelect, '_count'> & {
  _count: { members: number; files: number; sources: number };
  members: VaultMemberWithUser[];
};

/** Vault view response: vault + myRole + members list */
export type VaultWithMyRoleAndMembers = VaultWithMyRole & { members: VaultMemberWithUser[] };
