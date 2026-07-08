export type CircleRole = 'member' | 'admin';

export type Circle = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
};

export type Membership = {
  circleId: string;
  role: CircleRole;
};

export type Post = {
  id: string;
  circleId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAtMillis: number | null;
};
