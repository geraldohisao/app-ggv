interface Props { params: { id: string } }

async function fetchCall(id: string) {
  const res = await fetch(process.env.NEXT_PUBLIC_API_BASE + `/calls/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function CallPage({ params }: Props) {
  const call = await fetchCall(params.id);
  if (!call) return <div>Not found</div>;
  return (
    <main style={{ padding: 24 }}>
      <a href="/">Voltar</a>
      <h1>Call {call.providerCallId}</h1>
      {call.recording?.storageKey && (
        <audio controls src={`/api/recordings/${call.recording.storageKey}`} />
      )}
      <section>
        <h2>Transcrição</h2>
        <pre>{call.transcript?.text}</pre>
      </section>
      <section>
        <h2>Resumo</h2>
        <p>{call.insights?.summary}</p>
      </section>
      <section>
        <h2>Scorecard</h2>
        <pre>{JSON.stringify(call.scorecard, null, 2)}</pre>
      </section>
      <form action={`/api/calls/${call.id}/push-crm`} method="post">
        <button type="submit">Enviar para CRM</button>
      </form>
    </main>
  );
}
