import { NextResponse } from 'next/server';
import { getVacanciesCount } from '@/lib/api';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const count = await getVacanciesCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get vacancies count:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
