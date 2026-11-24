let inMemoryToken: string | null = null;

export function setInMemoryAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getInMemoryAuthToken(): string | null {
  return inMemoryToken;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'SkillPath-Client');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function streamMentorChat(
  payload: { conversationId?: string; message: string; attachmentText?: string },
  callbacks: {
    onMeta: (conversationId: string) => void;
    onChunk: (text: string) => void;
    onDone: (messageId: string) => void;
    onError: (err: string) => void;
  }
): Promise<void> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Requested-With': 'SkillPath-Client',
  });
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch('/api/mentor/chat', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    let msg = 'Unable to reach AI Mentor right now.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // ignore
    }
    callbacks.onError(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const evt of events) {
      const line = evt.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        const data = JSON.parse(line.slice(6)) as {
          type: 'meta' | 'chunk' | 'done' | 'error';
          conversationId?: string;
          text?: string;
          message?: { id: string };
          error?: string;
        };
        if (data.type === 'meta' && data.conversationId) {
          callbacks.onMeta(data.conversationId);
        } else if (data.type === 'chunk' && data.text) {
          callbacks.onChunk(data.text);
        } else if (data.type === 'done' && data.message) {
          callbacks.onDone(data.message.id);
        } else if (data.type === 'error') {
          callbacks.onError(data.error ?? 'Stream interrupted.');
        }
      } catch {
        // skip malformed frame
      }
    }
  }
}
