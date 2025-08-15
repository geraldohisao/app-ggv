async function fetchCalls() {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
  try {
    const res = await fetch(base + '/calls', { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function Page() {
  const data = await fetchCalls();
  return (
    <main style={{ padding: 24 }}>
      <h1>Chamadas</h1>
      <ul>
        {data.items?.map((c: any) => (
          <li key={c.id}>
            <a href={`/calls/${c.id}`}>{c.providerCallId} - {c.status}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
