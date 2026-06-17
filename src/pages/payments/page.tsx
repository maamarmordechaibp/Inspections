import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import IField, { CARD_TYPE, CVV_TYPE } from '@cardknox/react-ifields';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/base/Logo';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  total: number;
  status: string;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
}

const IFIELDS_KEY = (import.meta.env.VITE_SOLA_IFIELDS_KEY as string) || '';

const ifieldsAccount = {
  xKey: IFIELDS_KEY,
  xSoftwareName: 'DouseFire',
  xSoftwareVersion: '1.0.0',
};

const ifieldStyle = {
  width: '100%',
  height: '44px',
  border: 'none',
  outline: 'none',
  'font-size': '14px',
  'box-sizing': 'border-box',
  padding: '0 12px',
  color: '#1f2937',
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const customerId = searchParams.get('customer');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'loading' | 'form' | 'processing' | 'success'>('loading');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [billingName, setBillingName] = useState('');
  const [exp, setExp] = useState('');
  const [zip, setZip] = useState('');

  const cardRef = useRef<any>(null);
  const cvvRef = useRef<any>(null);
  const pendingRef = useRef(false);
  const [cardToken, setCardToken] = useState('');
  const [cvvToken, setCvvToken] = useState('');

  // Load customer and invoice data
  useEffect(() => {
    if (!customerId && !invoiceId) {
      setStep('form');
      return;
    }
    const load = async () => {
      try {
        if (customerId) {
          const { data: cust } = await supabase
            .from('customers')
            .select('id, name, email')
            .eq('id', customerId)
            .maybeSingle();
          if (cust) {
            setCustomer(cust);
            setBillingName(cust.name || '');
          }
        }
        if (invoiceId) {
          const { data: inv } = await supabase
            .from('invoices')
            .select('id, invoice_number, title, total, status, line_items')
            .eq('id', invoiceId)
            .maybeSingle();
          if (inv) {
            setInvoice(inv);
            setAmount(inv.total.toString());
            setDescription(`Payment for ${inv.invoice_number} — ${inv.title}`);
          }
        }
      } catch {
        setError('Failed to load payment details.');
      } finally {
        setStep('form');
      }
    };
    load();
  }, [customerId, invoiceId]);

  const expDigits = exp.replace(/\D/g, '').slice(0, 4); // MMYY

  const resetTokens = () => {
    pendingRef.current = false;
    setCardToken('');
    setCvvToken('');
  };

  const processSale = useCallback(
    async (cardSut: string, cvvSut: string) => {
      const payAmount = parseFloat(amount);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('sola-payments', {
          body: {
            action: 'sale',
            amount: payAmount,
            invoice_id: invoiceId || '',
            invoice_number: invoice?.invoice_number || '',
            customer_id: customer?.id || '',
            card_token: cardSut,
            cvv_token: cvvSut,
            exp: expDigits,
            name: billingName || customer?.name || '',
            email: customer?.email || '',
            zip: zip || '',
            description: description || 'Payment',
          },
        });

        if (fnError) {
          throw new Error(fnError.message || 'Payment could not be processed.');
        }
        if (data?.approved) {
          setStep('success');
        } else {
          throw new Error(data?.error || 'Payment was declined. Please check your details and try again.');
        }
      } catch (err: any) {
        setError(err?.message || 'Payment failed. Please try again.');
        setStep('form');
      } finally {
        resetTokens();
      }
    },
    [amount, invoiceId, invoice, customer, expDigits, billingName, zip, description]
  );

  // Fire the sale once both single-use tokens have been collected.
  useEffect(() => {
    if (pendingRef.current && cardToken && cvvToken) {
      pendingRef.current = false;
      processSale(cardToken, cvvToken);
    }
  }, [cardToken, cvvToken, processSale]);

  const handlePayment = () => {
    setError('');

    if (!IFIELDS_KEY) {
      setError('Payments are not configured yet. Please set VITE_SOLA_IFIELDS_KEY.');
      return;
    }
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (expDigits.length !== 4) {
      setError('Please enter the card expiry as MM/YY.');
      return;
    }
    const mm = parseInt(expDigits.slice(0, 2), 10);
    if (mm < 1 || mm > 12) {
      setError('Please enter a valid expiry month (01–12).');
      return;
    }

    setStep('processing');
    setCardToken('');
    setCvvToken('');
    pendingRef.current = true;
    // Trigger tokenization on both iFields; tokens arrive via onToken callbacks.
    cardRef.current?.getToken();
    cvvRef.current?.getToken();
  };

  const handleIFieldError = (data: { errorMessage?: string }) => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    setError(data?.errorMessage || 'Could not read card details. Please re-enter your card.');
    setStep('form');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-brand-gold"></i>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <i className="ri-check-line text-3xl text-emerald-600 w-8 h-8 flex items-center justify-center"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-sm text-gray-500 mb-1">
              {invoice
                ? `Thank you for your payment of $${invoice.total.toLocaleString()} for ${invoice.invoice_number}.`
                : `Thank you for your payment of $${parseFloat(amount).toLocaleString()}.`}
            </p>
            <p className="text-sm text-gray-500 mb-6">A receipt has been sent to {customer?.email || 'your email'}.</p>
            <div className="flex flex-col gap-2">
              {invoiceId && (
                <Link
                  to={`/portal?tab=invoices`}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-navy text-white font-semibold text-sm transition-all hover:bg-brand-navy/90 cursor-pointer whitespace-nowrap"
                >
                  Back to Invoices
                </Link>
              )}
              <Link
                to="/portal"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm transition-all hover:bg-gray-50 cursor-pointer whitespace-nowrap"
              >
                Back to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo variant="icon" className="h-8" />
          <span className="text-sm font-semibold text-gray-900">Secure Payment</span>
          <button onClick={() => navigate('/portal')} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer whitespace-nowrap">
            Cancel
          </button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line"></i>
            </span>
            {error}
          </div>
        )}

        {/* Invoice Summary */}
        {invoice && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Invoice</p>
                <p className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-cyan/10 text-brand-cyan">
                {invoice.status}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">{invoice.title}</h3>
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="border-t border-gray-50 pt-3 mb-3">
                <div className="space-y-1.5">
                  {invoice.line_items.map((li, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{li.description}</span>
                      <span className="text-gray-900 font-medium">${li.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Due</span>
              <span className="text-xl font-bold text-gray-900">${invoice.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Custom Payment Form */}
        {!invoice && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment for..."
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Customer Info */}
        {customer && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Billing To</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-bold text-sm">
                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-400">{customer.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Card Details</h3>
            <div className="flex items-center gap-2">
              <i className="ri-lock-line text-xs text-gray-400"></i>
              <span className="text-xs text-gray-400">SSL Encrypted</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Name on Card</label>
              <input
                type="text"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Card Number</label>
              <div className="w-full rounded-lg border border-gray-200 overflow-hidden focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/20 transition-all">
                <IField
                  type={CARD_TYPE}
                  account={ifieldsAccount}
                  options={{ placeholder: '0000 0000 0000 0000', autoFormat: true, iFieldstyle: ifieldStyle }}
                  onToken={(d) => setCardToken(d.xToken)}
                  onError={handleIFieldError}
                  ref={cardRef}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Expiry (MM/YY)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={exp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setExp(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                  }}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">CVV</label>
                <div className="w-full rounded-lg border border-gray-200 overflow-hidden focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/20 transition-all">
                  <IField
                    type={CVV_TYPE}
                    account={ifieldsAccount}
                    options={{ placeholder: 'CVV', iFieldstyle: ifieldStyle }}
                    onToken={(d) => setCvvToken(d.xToken)}
                    onError={handleIFieldError}
                    ref={cvvRef}
                  />
                </div>
              </div>
              <div className="col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">ZIP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/[^0-9-]/g, '').slice(0, 10))}
                  placeholder="ZIP"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">Your card information is encrypted and never stored on our servers.</p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handlePayment}
          disabled={step === 'processing'}
          className="w-full py-3 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
        >
          {step === 'processing' ? (
            <>
              <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
              Processing...
            </>
          ) : (
            <>
              <i className="ri-secure-payment-line w-5 h-5 flex items-center justify-center"></i>
              {invoice ? `Pay $${invoice.total.toLocaleString()}` : `Pay $${parseFloat(amount || '0').toLocaleString()}`}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Payments are processed securely by Sola Payments. DouseFire does not store your card details.
        </p>
      </main>
    </div>
  );
}
