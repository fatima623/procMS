'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InternalProcurementStatus } from '@prisma/client';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';

interface FirmRef {
  id: string;
  code: string;
  name: string;
}

interface ProcurementItem {
  id: string;
  itemName: string;
  quantity: string | number;
  uom: string;
}

interface Quotation {
  id: string;
  firmId: string;
  itemId: string;
  quotedPriceMinor: string | bigint;
  currency: string;
  firm: FirmRef;
  item: { id: string; itemName: string };
}

interface SupplyOrder {
  id: string;
  firmId: string;
  orderedOn: string | Date;
  totalValueMinor: string | bigint;
  currency: string;
  documentKey?: string | null;
  firm: FirmRef;
}

interface SanctionCertificate {
  id: string;
  certificateNumber: string;
  issuedOn: string | Date;
  authority: string;
  documentKey?: string | null;
}

interface DebitableVoucher {
  id: string;
  voucherNumber: string;
  amountMinor: string | bigint;
  currency: string;
  issuedOn: string | Date;
}

interface ContingentBill {
  id: string;
  firmId: string;
  billNumber: string;
  amountMinor: string | bigint;
  currency: string;
  submittedOn: string | Date;
  paidOn?: string | Date | null;
  firm: FirmRef;
}

interface ProcurementData {
  id: string;
  reference: string;
  status: InternalProcurementStatus;
  raisedOn: string | Date;
  notes?: string | null;
  raisedBy: { displayName: string };
  items: ProcurementItem[];
  invitedFirms: { id: string; firm: FirmRef }[];
  quotations: Quotation[];
  supplyOrder?: SupplyOrder | null;
  sanctionCertificate?: SanctionCertificate | null;
  debitableVoucher?: DebitableVoucher | null;
  contingentBills: ContingentBill[];
}

export function ProcurementDetailClient({
  procurement,
  availableFirms,
}: {
  procurement: ProcurementData;
  availableFirms: FirmRef[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'items' | 'firms' | 'quotes' | 'order' | 'sanction' | 'voucher' | 'bills'>('items');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite Firm form
  const [inviteFirmId, setInviteFirmId] = useState(availableFirms[0]?.id ?? '');

  // Enter Quotation form
  const [quoteFirmId, setQuoteFirmId] = useState(procurement.invitedFirms[0]?.firm.id ?? '');
  const [quoteItemId, setQuoteItemId] = useState(procurement.items[0]?.id ?? '');
  const [quotePrice, setQuotePrice] = useState('');

  // Supply order form
  // Calculate lowest quote firm
  const quotesByFirm = procurement.quotations.reduce<Record<string, bigint>>((acc, q) => {
    acc[q.firmId] = (acc[q.firmId] || 0n) + BigInt(q.quotedPriceMinor);
    return acc;
  }, {});
  const lowestFirmEntry = Object.entries(quotesByFirm).sort((a, b) => (a[1] < b[1] ? -1 : 1))[0];
  const suggestedFirmId = lowestFirmEntry ? lowestFirmEntry[0] : (procurement.invitedFirms[0]?.firm.id ?? '');
  const suggestedTotal = lowestFirmEntry ? lowestFirmEntry[1].toString() : '0';

  const [orderFirmId, setOrderFirmId] = useState(suggestedFirmId);
  const [orderTotal, setOrderTotal] = useState(suggestedTotal);

  // Sanction cert form
  const [certNum, setCertNum] = useState('');
  const [authority, setAuthority] = useState('');

  // Debitable voucher form
  const [voucherNum, setVoucherNum] = useState('');
  const [voucherAmount, setVoucherAmount] = useState(suggestedTotal);

  // Contingent bill form
  const [billNum, setBillNum] = useState('');
  const [billFirmId, setBillFirmId] = useState(procurement.supplyOrder?.firmId ?? suggestedFirmId);
  const [billAmount, setBillAmount] = useState(suggestedTotal);

  const isClosed = procurement.status === 'CLOSED' || procurement.status === 'CANCELLED';

  const handleInviteFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFirmId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmId: inviteFirmId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to invite firm.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inviting firm.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteFirmId || !quoteItemId || !quotePrice) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmId: quoteFirmId,
          itemId: quoteItemId,
          quotedPriceMinor: quotePrice,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to enter quotation.');
      setQuotePrice('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error entering quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderFirmId || !orderTotal) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/supply-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmId: orderFirmId,
          totalValueMinor: orderTotal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to place supply order.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error placing supply order.');
    } finally {
      setLoading(false);
    }
  };

  const handleSanctionCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certNum || !authority) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/sanction-cert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateNumber: certNum,
          authority,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record sanction certificate.');
      setCertNum('');
      setAuthority('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording sanction certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleDebitableVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherNum || !voucherAmount) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/debitable-voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherNumber: voucherNum,
          amountMinor: voucherAmount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record debitable voucher.');
      setVoucherNum('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording debitable voucher.');
    } finally {
      setLoading(false);
    }
  };

  const handleContingentBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNum || !billFirmId || !billAmount) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/contingent-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNumber: billNum,
          firmId: billFirmId,
          amountMinor: billAmount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record contingent bill.');
      setBillNum('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error recording contingent bill.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this procurement?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/stores/procurement/${procurement.id}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to close procurement.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error closing procurement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 18px', margin: 0 }}>
            <dt className="muted">Reference</dt>
            <dd className="mono font-semibold">{procurement.reference}</dd>
            <dt className="muted">Raised By</dt>
            <dd>{procurement.raisedBy.displayName}</dd>
            <dt className="muted">Raised On</dt>
            <dd><DateLabel iso={procurement.raisedOn} /></dd>
            <dt className="muted">Description</dt>
            <dd>{procurement.notes || <span className="muted">—</span>}</dd>
          </dl>
          <div className="grow" />
          <div style={{ textAlign: 'right' }}>
            <StatusPill tone={procurement.status === 'ORDERED' ? 'ok' : 'info'}>
              {procurement.status}
            </StatusPill>
            {!isClosed && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleClose}
                  disabled={loading}
                  style={{ color: 'var(--danger)', fontSize: 13 }}
                >
                  Close Procurement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="row" style={{ gap: 6, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[
          { key: 'items', label: `Items (${procurement.items.length})` },
          { key: 'firms', label: `Invited Firms (${procurement.invitedFirms.length})` },
          { key: 'quotes', label: `Quotations (${procurement.quotations.length})` },
          { key: 'order', label: procurement.supplyOrder ? 'Supply Order ✓' : 'Supply Order' },
          { key: 'sanction', label: procurement.sanctionCertificate ? 'Sanction Cert ✓' : 'Sanction Cert' },
          { key: 'voucher', label: procurement.debitableVoucher ? 'Debitable Voucher ✓' : 'Debitable Voucher' },
          { key: 'bills', label: `Contingent Bills (${procurement.contingentBills.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${activeTab === t.key ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab(t.key as any)}
            style={{ fontSize: 13, padding: '6px 12px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Items */}
      {activeTab === 'items' && (
        <div className="card" style={{ padding: 18 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th className="right">Quantity</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              {procurement.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="mono muted">{idx + 1}</td>
                  <td className="font-semibold">{item.itemName}</td>
                  <td className="right mono">{String(item.quantity)}</td>
                  <td>{item.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Invited Firms */}
      {activeTab === 'firms' && (
        <div className="stack-md">
          {!isClosed && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>+ Invite Firm</h3>
              <form onSubmit={handleInviteFirm} className="row" style={{ gap: 10 }}>
                <select
                  className="input"
                  style={{ flex: 1 }}
                  value={inviteFirmId}
                  onChange={(e) => setInviteFirmId(e.target.value)}
                >
                  {availableFirms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} — {f.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Invite
                </button>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Invited Firms List</h3>
            {procurement.invitedFirms.length === 0 ? (
              <p className="muted">No firms invited yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Firm Code</th>
                    <th>Firm Name</th>
                  </tr>
                </thead>
                <tbody>
                  {procurement.invitedFirms.map((i) => (
                    <tr key={i.id}>
                      <td className="mono font-semibold">{i.firm.code}</td>
                      <td>{i.firm.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Quotations */}
      {activeTab === 'quotes' && (
        <div className="stack-md">
          {lowestFirmEntry && (
            <div className="card" style={{ padding: 14, background: 'var(--subtle)' }}>
              <strong>Lowest Total Quote: </strong>
              <span>
                {procurement.invitedFirms.find((f) => f.firm.id === lowestFirmEntry[0])?.firm.name ?? lowestFirmEntry[0]}
                {' — '}
                <MoneyLabel amountMinor={lowestFirmEntry[1]} currency="PKR" />
              </span>
            </div>
          )}

          {!isClosed && procurement.invitedFirms.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>+ Enter Quotation</h3>
              <form onSubmit={handleEnterQuote} className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="input"
                  value={quoteFirmId}
                  onChange={(e) => setQuoteFirmId(e.target.value)}
                >
                  {procurement.invitedFirms.map((f) => (
                    <option key={f.firm.id} value={f.firm.id}>
                      {f.firm.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={quoteItemId}
                  onChange={(e) => setQuoteItemId(e.target.value)}
                >
                  {procurement.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemName}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input"
                  placeholder="Price Minor (cents/paisa)"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Quote
                </button>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Received Quotations</h3>
            {procurement.quotations.length === 0 ? (
              <p className="muted">No quotations recorded.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Firm</th>
                    <th>Item</th>
                    <th className="right">Quoted Price</th>
                  </tr>
                </thead>
                <tbody>
                  {procurement.quotations.map((q) => (
                    <tr key={q.id}>
                      <td className="font-semibold">{q.firm.name}</td>
                      <td>{q.item.itemName}</td>
                      <td className="right mono">
                        <MoneyLabel amountMinor={q.quotedPriceMinor} currency={q.currency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Supply Order */}
      {activeTab === 'order' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>Supply Order</h3>
          {procurement.supplyOrder ? (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', margin: 0 }}>
              <dt className="muted">Awarded Firm</dt>
              <dd className="font-semibold">{procurement.supplyOrder.firm.name} ({procurement.supplyOrder.firm.code})</dd>
              <dt className="muted">Ordered On</dt>
              <dd><DateLabel iso={procurement.supplyOrder.orderedOn} /></dd>
              <dt className="muted">Total Order Value</dt>
              <dd className="mono font-semibold">
                <MoneyLabel amountMinor={procurement.supplyOrder.totalValueMinor} currency={procurement.supplyOrder.currency} />
              </dd>
            </dl>
          ) : !isClosed ? (
            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Auto-suggested lowest bidder is preselected below.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Select Awardee Firm *</label>
                <select
                  className="input"
                  value={orderFirmId}
                  onChange={(e) => setOrderFirmId(e.target.value)}
                  required
                >
                  {procurement.invitedFirms.map((f) => (
                    <option key={f.firm.id} value={f.firm.id}>
                      {f.firm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Total Order Value (Minor) *</label>
                <input
                  type="number"
                  className="input"
                  value={orderTotal}
                  onChange={(e) => setOrderTotal(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Place Supply Order
              </button>
            </form>
          ) : (
            <p className="muted">No supply order was placed.</p>
          )}
        </div>
      )}

      {/* Tab 5: Sanction Cert */}
      {activeTab === 'sanction' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>Sanction Certificate</h3>
          {procurement.sanctionCertificate ? (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', margin: 0 }}>
              <dt className="muted">Certificate #</dt>
              <dd className="mono font-semibold">{procurement.sanctionCertificate.certificateNumber}</dd>
              <dt className="muted">Issued On</dt>
              <dd><DateLabel iso={procurement.sanctionCertificate.issuedOn} /></dd>
              <dt className="muted">Authority</dt>
              <dd>{procurement.sanctionCertificate.authority}</dd>
            </dl>
          ) : !isClosed ? (
            <form onSubmit={handleSanctionCert} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Certificate Number *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. SC-2026-089"
                  value={certNum}
                  onChange={(e) => setCertNum(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Approving Authority *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Commanding Officer / Store Incharge"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Record Sanction Certificate
              </button>
            </form>
          ) : (
            <p className="muted">No sanction certificate recorded.</p>
          )}
        </div>
      )}

      {/* Tab 6: Debitable Voucher */}
      {activeTab === 'voucher' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>Debitable Voucher</h3>
          {procurement.debitableVoucher ? (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', margin: 0 }}>
              <dt className="muted">Voucher Number</dt>
              <dd className="mono font-semibold">{procurement.debitableVoucher.voucherNumber}</dd>
              <dt className="muted">Amount</dt>
              <dd className="mono font-semibold">
                <MoneyLabel amountMinor={procurement.debitableVoucher.amountMinor} currency={procurement.debitableVoucher.currency} />
              </dd>
              <dt className="muted">Issued On</dt>
              <dd><DateLabel iso={procurement.debitableVoucher.issuedOn} /></dd>
            </dl>
          ) : !isClosed ? (
            <form onSubmit={handleDebitableVoucher} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 500 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Voucher Number *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. DV-1029"
                  value={voucherNum}
                  onChange={(e) => setVoucherNum(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Amount Minor *</label>
                <input
                  type="number"
                  className="input"
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Record Debitable Voucher
              </button>
            </form>
          ) : (
            <p className="muted">No debitable voucher recorded.</p>
          )}
        </div>
      )}

      {/* Tab 7: Contingent Bills */}
      {activeTab === 'bills' && (
        <div className="stack-md">
          {!isClosed && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>+ Record Contingent Bill</h3>
              <form onSubmit={handleContingentBill} className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Bill Number"
                  value={billNum}
                  onChange={(e) => setBillNum(e.target.value)}
                  required
                />
                <select
                  className="input"
                  value={billFirmId}
                  onChange={(e) => setBillFirmId(e.target.value)}
                >
                  {procurement.invitedFirms.map((f) => (
                    <option key={f.firm.id} value={f.firm.id}>
                      {f.firm.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input"
                  placeholder="Amount Minor"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Bill
                </button>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Recorded Contingent Bills</h3>
            {procurement.contingentBills.length === 0 ? (
              <p className="muted">No contingent bills recorded.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Firm</th>
                    <th>Submitted On</th>
                    <th className="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {procurement.contingentBills.map((b) => (
                    <tr key={b.id}>
                      <td className="mono font-semibold">{b.billNumber}</td>
                      <td>{b.firm.name}</td>
                      <td><DateLabel iso={b.submittedOn} /></td>
                      <td className="right mono">
                        <MoneyLabel amountMinor={b.amountMinor} currency={b.currency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
