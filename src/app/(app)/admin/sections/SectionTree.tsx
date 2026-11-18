'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import type { AdminSectionDto } from '@/application/admin/AdminSectionService';

type Node = AdminSectionDto & { children: Node[] };

function buildTree(rows: readonly AdminSectionDto[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  // Jo sections kisi root se nahi jure (cycle), unhein bhi dikhao
  const visited = new Set<string>();
  const mark = (n: Node): void => {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    n.children.forEach(mark);
  };
  roots.forEach(mark);
  map.forEach((node) => {
    if (!visited.has(node.id)) {
      const p = node.parentId ? map.get(node.parentId) : undefined;
      if (p) p.children = p.children.filter((c) => c.id !== node.id);
      roots.push(node);
      mark(node);
    }
  });
  return roots;
}

function Row({ node, depth }: { node: Node; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children.length > 0;
  return (
    <>
      <tr>
        <td className="mono" style={{ paddingLeft: 12 + depth * 24 }}>
          {hasKids ? (
            <button type="button" onClick={() => setOpen(!open)} style={{ marginRight: 6, cursor: 'pointer' }}>
              {open ? '▾' : '▸'}
            </button>
          ) : (
            <span style={{ display: 'inline-block', width: 22 }} />
          )}
          {node.code}
        </td>
        <td>{node.name}</td>
        <td className="muted">{node.kind}</td>
        <td className="right mono">{node.memberCount}</td>
        <td>{node.isActive ? <StatusPill tone="ok">Active</StatusPill> : <StatusPill tone="danger">Inactive</StatusPill>}</td>
        <td className="right"><Link className="btn" href={`/admin/sections/${node.id}`}>Edit →</Link></td>
      </tr>
      {open && node.children.map((c) => <Row key={c.id} node={c} depth={depth + 1} />)}
    </>
  );
}

export function SectionTree({ rows }: { rows: readonly AdminSectionDto[] }) {
  const roots = buildTree(rows);
  return (
    <>
      {roots.map((n) => <Row key={n.id} node={n} depth={0} />)}
    </>
  );
}