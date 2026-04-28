import { NextResponse } from 'next/server';
import { readNotes, writeNote } from '@/lib/storage';
import { NoteInput } from '@/types/note';

// 获取所有笔记
export async function GET() {
  try {
    const notes = await readNotes();
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error reading notes:', error);
    return NextResponse.json(
      { error: 'Failed to read notes' },
      { status: 500 }
    );
  }
}

// 创建新笔记
export async function POST(request: Request) {
  try {
    const body: NoteInput = await request.json();
    
    if (!body.newsId || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const note = await writeNote(body);
    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
