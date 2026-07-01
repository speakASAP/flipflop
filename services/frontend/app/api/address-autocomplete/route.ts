import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, max-age=300' } });
}

export async function GET(request: NextRequest) {
  const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!apiBase) {
    return json({ success: true, configured: false, suggestions: [] });
  }

  const searchParams = request.nextUrl.searchParams;
  const proxyParams = new URLSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const placeId = (searchParams.get('placeId') || '').trim();

  if (placeId) {
    proxyParams.set('placeId', placeId);
  } else if (query.length >= 3) {
    proxyParams.set('q', query.slice(0, 120));
  } else {
    return json({ success: true, configured: true, suggestions: [] });
  }

  try {
    const response = await fetch(`${apiBase}/address-autocomplete?${proxyParams.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await response.json();
    return json(data, response.ok ? 200 : 502);
  } catch {
    return json({ success: false, configured: true, suggestions: [] }, 502);
  }
}
