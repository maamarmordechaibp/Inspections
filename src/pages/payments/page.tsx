import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/base/Logo';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  stripe_customer_id: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  total: number;
  status: string;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
}

declare global {
  interface Window {
    Stripe: any;
  }
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const customerId = searchParams.get('customer');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'loading' | 'form' | 'processing' | 'success' | 'save-card'>('loading');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [paymentMethodId, setPaymentMethodId] = useState('');

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<any>(null);
  const stripeRef = useRef<any>(null);

  // Load Stripe.js dynamically
  useEffect(() => {
    if (window.Stripe) {
      setStripeLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => setStripeLoaded(true);
    script.onerror = () => setError('Failed to load Stripe.js. Please check your connection and try again.');
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load customer and invoice data
  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      setStep('form');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('id, name, email, stripe_customer_id')
          .eq('id', customerId)
          .maybeSingle();
        if (cust) {
          setCustomer(cust);
          if (cust.stripe_customer_id) {
            await loadSavedCards(cust.stripe_customer_id);
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
        setLoading(false);
        setStep('form');
      }
    };
    load();
  }, [customerId, invoiceId]);

  // Initialize card element when Stripe loads and form is ready
  useEffect(() => {
    if (!stripeLoaded || step !== 'form' || !cardContainerRef.current || !window.Stripe) return;

    const stripe = window.Stripe('pk_test_placeholder');
    stripeRef.current = stripe;
    const elements = stripe.elements({
      appearance: { theme: 'stripe', variables: { colorPrimary: '#F5C518' } },
    });
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '14px',
          color: '#1f2937',
          '::placeholder': { color: '#9ca3af' },
        },
      },
    });
    card.mount(cardContainerRef.current);
    cardElementRef.current = card;

    return () => {
      card.unmount();
    };
  }, [stripeLoaded, step]);

  const loadSavedCards = async (stripeCustomerId: string) => {
    try {
      const { data } = await supabase.functions.invoke('stripe-payments', {
        body: { action: 'list-saved-cards', stripe_customer_id: stripeCustomerId },
      });
      if (data?.cards) {
        setSavedCards(data.cards);
        if (data.cards.length > 0) {
          setSelectedCardId(data.cards[0].id);
          setUseSavedCard(true);
        }
      }
    } catch {
      // silent
    }
  };

  const createStripeCustomer = async () => {
    if (!customer) return null;
    if (customer.stripe_customer_id) return customer.stripe_customer_id;

    try {
      const { data } = await supabase.functions.invoke('stripe-payments', {
        body: {
          action: 'create-customer',
          email: customer.email,
          name: customer.name,
          customer_id: customer.id,
        },
      });
      if (data?.stripe_customer_id) {
        await supabase
          .from('customers')
          .update({ stripe_customer_id: data.stripe_customer_id })
          .eq('id', customer.id);
        setCustomer((c) => (c ? { ...c, stripe_customer_id: data.stripe_customer_id } : c));
        return data.stripe_customer_id;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create Stripe customer.');
    }
    return null;
  };

  const handlePayment = async () => {
    setError('');
    setStep('processing');

    const stripeCustomerId = await createStripeCustomer();
    if (!stripeCustomerId) {
      setStep('form');
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError('Please enter a valid amount.');
      setStep('form');
      return;
    }

    try {
      if (useSavedCard && selectedCardId) {
        // Charge saved card
        const { data } = await supabase.functions.invoke('stripe-payments', {
          body: {
            action: 'charge-saved-card',
            stripe_customer_id: stripeCustomerId,
            payment_method_id: selectedCardId,
            amount: payAmount,
            description: description || 'Payment',
            metadata: {
              invoice_id: invoiceId || '',
              customer_id: customer?.id || '',
            },
          },
        });
        if (data?.status === 'succeeded') {
          await recordPayment(data.payment_intent_id, selectedCardId);
          setStep('success');
        } else {
          throw new Error('Payment was not successful. Please try again.');
        }
      } else {
        // Pay with new card
        const stripe = stripeRef.current;
        const cardElement = cardElementRef.current;
        if (!stripe || !cardElement) {
          throw new Error('Payment form not ready. Please refresh and try again.');
        }

        if (saveForFuture) {
          // Create setup intent, confirm it, then charge
          const { data: setupData } = await supabase.functions.invoke('stripe-payments', {
            body: { action: 'create-setup-intent', stripe_customer_id: stripeCustomerId },
          });
          if (!setupData?.client_secret) {
            throw new Error('Failed to initialize card saving.');
          }

          const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
            setupData.client_secret,
            {
              payment_method: {
                card: cardElement,
                billing_details: {
                  name: customer?.name || '',
                  email: customer?.email || '',
                },
              },
            }
          );

          if (confirmError) {
            throw new Error(confirmError.message);
          }

          if (setupIntent?.payment_method) {
            setPaymentMethodId(setupIntent.payment_method);
            // Now charge the newly saved card
            const { data: chargeData } = await supabase.functions.invoke('stripe-payments', {
              body: {
                action: 'charge-saved-card',
                stripe_customer_id: stripeCustomerId,
                payment_method_id: setupIntent.payment_method,
                amount: payAmount,
                description: description || 'Payment',
                metadata: {
                  invoice_id: invoiceId || '',
                  customer_id: customer?.id || '',
                },
              },
            });
            if (chargeData?.status === 'succeeded') {
              await recordPayment(chargeData.payment_intent_id, setupIntent.payment_method);
              setSavedCards((prev) => [
                ...prev,
                {
                  id: setupIntent.payment_method,
                  brand: 'card',
                  last4: '****',
                  exp_month: 0,
                  exp_year: 0,
                },
              ]);
              setStep('success');
            } else {
              throw new Error('Payment was not successful. Please try again.');
            }
          }
        } else {
          // One-time payment without saving
          const { data: piData } = await supabase.functions.invoke('stripe-payments', {
            body: {
              action: 'create-payment-intent',
              amount: payAmount,
              description: description || 'Payment',
              metadata: {
                invoice_id: invoiceId || '',
                customer_id: customer?.id || '',
              },
            },
          });
          if (!piData?.client_secret) {
            throw new Error('Failed to initialize payment.');
          }

          const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
            piData.client_secret,
            {
              payment_method: {
                card: cardElement,
                billing_details: {
                  name: customer?.name || '',
                  email: customer?.email || '',
                },
              },
            }
          );

          if (confirmError) {
            throw new Error(confirmError.message);
          }

          if (paymentIntent?.status === 'succeeded') {
            await recordPayment(paymentIntent.id, paymentIntent.payment_method);
            setStep('success');
          } else {
            throw new Error('Payment was not successful. Please try again.');
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
      setStep('form');
    }
  };

  const recordPayment = async (stripePaymentIntentId: string, stripePaymentMethodId: string) => {
    try {
      await supabase.from('payments').insert({
        customer_id: customer?.id || null,
        invoice_id: invoiceId || null,
        amount: parseFloat(amount),
        status: 'succeeded',
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_payment_method_id: stripePaymentMethodId,
        description: description || 'Payment',
        metadata: { invoice_id: invoiceId, customer_id: customer?.id },
      });
      if (invoiceId) {
        await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoiceId);
      }
    } catch {
      // silent
    }
  };

  const handleSaveCardOnly = async () => {
    setError('');
    setStep('processing');

    const stripeCustomerId = await createStripeCustomer();
    if (!stripeCustomerId) {
      setStep('form');
      return;
    }

    const stripe = stripeRef.current;
    const cardElement = cardElementRef.current;
    if (!stripe || !cardElement) {
      setError('Payment form not ready. Please refresh and try again.');
      setStep('form');
      return;
    }

    try {
      const { data } = await supabase.functions.invoke('stripe-payments', {
        body: { action: 'create-setup-intent', stripe_customer_id: stripeCustomerId },
      });
      if (!data?.client_secret) {
        throw new Error('Failed to initialize card saving.');
      }

      const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
        data.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customer?.name || '',
              email: customer?.email || '',
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent?.payment_method) {
        await loadSavedCards(stripeCustomerId);
        setStep('form');
        setUseSavedCard(true);
        setSelectedCardId(setupIntent.payment_method);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save card. Please try again.');
      setStep('form');
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!customer?.stripe_customer_id) return;
    try {
      await supabase.functions.invoke('stripe-payments', {
        body: { action: 'detach-payment-method', payment_method_id: cardId },
      });
      setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
      if (selectedCardId === cardId) {
        setSelectedCardId(savedCards.find((c) => c.id !== cardId)?.id || '');
      }
    } catch {
      setError('Failed to remove card. Please try again.');
    }
  };

  const cardBrandIcon = (brand: string) => {
    switch (brand) {
      case 'visa': return 'ri-visa-fill';
      case 'mastercard': return 'ri-mastercard-fill';
      case 'amex': return 'ri-bank-card-fill';
      case 'discover': return 'ri-bank-card-fill';
      default: return 'ri-bank-card-line';
    }
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

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Payment Method</h3>
            <div className="flex items-center gap-2">
              <i className="ri-lock-line text-xs text-gray-400"></i>
              <span className="text-xs text-gray-400">SSL Encrypted</span>
            </div>
          </div>

          {/* Saved Cards */}
          {savedCards.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="use-saved"
                  name="payment-method"
                  checked={useSavedCard}
                  onChange={() => setUseSavedCard(true)}
                  className="w-4 h-4 text-brand-gold focus:ring-brand-gold"
                />
                <label htmlFor="use-saved" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Use saved card
                </label>
              </div>
              {useSavedCard && (
                <div className="ml-6 space-y-2">
                  {savedCards.map((card) => (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCardId === card.id
                          ? 'border-brand-gold bg-brand-gold/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedCardId(card.id)}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${cardBrandIcon(card.brand)} text-lg text-gray-400 w-5 h-5 flex items-center justify-center`}></i>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending in {card.last4}
                          </p>
                          <p className="text-xs text-gray-400">
                            Expires {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCardId === card.id && (
                          <span className="w-5 h-5 rounded-full bg-brand-gold text-white flex items-center justify-center text-xs">
                            <i className="ri-check-line"></i>
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                          className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove card"
                        >
                          <span className="w-5 h-5 flex items-center justify-center">
                            <i className="ri-delete-bin-line text-sm"></i>
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Card */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="radio"
              id="use-new"
              name="payment-method"
              checked={!useSavedCard}
              onChange={() => setUseSavedCard(false)}
              className="w-4 h-4 text-brand-gold focus:ring-brand-gold"
            />
            <label htmlFor="use-new" className="text-sm font-medium text-gray-700 cursor-pointer">
              {savedCards.length > 0 ? 'Use a new card' : 'Credit or debit card'}
            </label>
          </div>

          {!useSavedCard && (
            <div className="ml-6">
              <div
                ref={cardContainerRef}
                className="w-full px-3 py-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                {!stripeLoaded && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Loading secure payment form...
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Your card information is encrypted and never stored on our servers.</p>

              {(!invoice || !invoiceId) && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveForFuture}
                    onChange={(e) => setSaveForFuture(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />
                  <span className="text-xs text-gray-600">Save this card for future payments</span>
                </label>
              )}
              {invoice && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveForFuture}
                    onChange={(e) => setSaveForFuture(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />
                  <span className="text-xs text-gray-600">Save this card for future payments</span>
                </label>
              )}
            </div>
          )}
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
          Payments are processed securely by Stripe. DouseFire does not store your card details.
        </p>
      </main>
    </div>
  );
}