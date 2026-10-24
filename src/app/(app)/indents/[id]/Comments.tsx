'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Comment {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly parentId: string | null;
  readonly createdAt: string;
}

/**
 * Threaded comment list on an indent. One-level threading (reply to a
 * top-level comment); deeper nesting isn't useful here and would clutter
 * the sidebar.
 */
export function Comments({
  indentId,
  comments,
  currentUserId,
}: {
  readonly indentId: string;
  readonly comments: readonly Comment[];
  readonly currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/indents/${indentId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, parentId: replyTo ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setBody('');
      setReplyTo(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this comment?')) return;
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else setErr(`Delete failed (${res.status})`);
  }

  // Group replies under their parent.
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments.filter((c) => c.parentId)) {
    const key = c.parentId!;
    (repliesByParent.get(key) ?? repliesByParent.set(key, []).get(key)!).push(c);
  }

  return (
    <>
      {err && <div className="err">{err}</div>}
      {topLevel.length === 0 && comments.length === 0 ? (
        <div className="muted" style={{ padding: '6px 0', fontSize: 13 }}>No comments yet. Be the first.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {topLevel.map((c) => (
            <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <CommentBody c={c} currentUserId={currentUserId} onReply={() => setReplyTo(c.id)} onDelete={() => remove(c.id)} />
              {repliesByParent.get(c.id)?.map((r) => (
                <div key={r.id} style={{ marginLeft: 18, marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--border-strong)' }}>
                  <CommentBody c={r} currentUserId={currentUserId} onDelete={() => remove(r.id)} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={post} style={{ marginTop: 12 }}>
        {replyTo && (
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            Replying to a comment · <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: 0 }} onClick={() => setReplyTo(null)}>cancel reply</button>
          </div>
        )}
        <textarea
          className="textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? 'Reply… (use @email-local to mention)' : 'Add a comment… (use @email-local to mention, e.g. @admin)'}
          rows={2}
        />
        <div className="row row-end" style={{ marginTop: 6, gap: 8 }}>
          <span className="muted" style={{ fontSize: 11 }}>Mentions: <code>@local-part</code> (e.g. <code>@dpn</code>, <code>@suptd</code>).</span>
          <button className="btn btn-primary" disabled={busy || !body.trim()}>{busy ? 'Posting…' : 'Post'}</button>
        </div>
      </form>
    </>
  );
}

function CommentBody({
  c, currentUserId, onReply, onDelete,
}: {
  readonly c: Comment;
  readonly currentUserId: string;
  readonly onReply?: () => void;
  readonly onDelete: () => void;
}) {
  const canDelete = c.authorId === currentUserId;
  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{c.authorName}</strong>
        <span className="muted mono" style={{ fontSize: 11 }}>{new Date(c.createdAt).toLocaleString()}</span>
        <div className="grow" />
        {onReply && <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={onReply}>Reply</button>}
        {canDelete && <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px', color: 'var(--danger)' }} onClick={onDelete}>Delete</button>}
      </div>
      <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
    </>
  );
}
