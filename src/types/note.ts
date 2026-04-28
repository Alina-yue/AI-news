export type Note = {
  id: string;
  newsId: string;
  newsTitle: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  newsId: string;
  newsTitle: string;
  content: string;
};
