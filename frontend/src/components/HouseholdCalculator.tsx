import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { STATE_NAMES, SUPPORTED_YEARS, type SupportedYear } from "../types";
import {
  calculateHousehold,
  sweepEarnings,
  type CreditBreakdown,
  type FilingStatus,
  type HouseholdInput,
  type SweepPoint,
} from "../api/policyengine";
import Spinner from "./Spinner";

const CreditsChart = lazy(() => import("./CreditsChart"));

interface Props {
  year: SupportedYear;
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: "var(--white)",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    animation: "fadeInUp 0.5s ease-out both",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.2fr)",
    gap: 32,
  },
  section: { display: "flex", flexDirection: "column", gap: 20 },
  sectionTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--slate-800)",
    margin: 0,
  },
  label: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--slate-500)",
    marginBottom: 8,
    display: "block",
  },
  field: { display: "flex", flexDirection: "column" },
  input: {
    border: "1px solid var(--slate-200)",
    borderRadius: 8,
    padding: "10px 14px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "var(--slate-700)",
    background: "var(--white)",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    appearance: "none" as const,
    background:
      "var(--slate-50) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L2 4h8z'/%3E%3C/svg%3E\") no-repeat right 14px center",
    border: "1px solid var(--slate-200)",
    borderRadius: 8,
    padding: "10px 40px 10px 14px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "var(--slate-700)",
    width: "100%",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  childRow: { display: "flex", alignItems: "center", gap: 8 },
  childInput: { width: 80 },
  removeBtn: {
    border: "1px solid var(--slate-200)",
    background: "var(--white)",
    color: "var(--slate-500)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    cursor: "pointer",
  },
  addBtn: {
    border: "1px dashed var(--slate-300)",
    background: "transparent",
    color: "var(--slate-600)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  submit: {
    border: "none",
    background: "var(--teal-600)",
    color: "white",
    borderRadius: 8,
    padding: "12px 20px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(13, 148, 136, 0.3)",
    marginTop: 8,
  },
  results: {
    background: "var(--slate-50)",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  resultsTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--slate-600)",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "10px 0",
    borderBottom: "1px solid var(--slate-200)",
  },
  resultsLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "var(--slate-700)",
  },
  resultsValue: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 18,
    fontWeight: 600,
    color: "var(--slate-900)",
    fontVariantNumeric: "tabular-nums",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: 14,
    marginTop: 4,
    borderTop: "2px solid var(--slate-300)",
  },
  totalLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--slate-800)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    color: "var(--teal-700)",
    fontVariantNumeric: "tabular-nums",
  },
  placeholder: {
    color: "var(--slate-400)",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: "40px 20px",
  },
  error: {
    color: "var(--negative)",
    fontSize: 14,
    padding: "12px 16px",
    background: "#fef2f2",
    borderRadius: 8,
    border: "1px solid #fecaca",
  },
  helpText: {
    fontSize: 12,
    color: "var(--slate-500)",
    marginTop: 8,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    padding: "8px 0",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#0d9488",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--slate-700)",
  },
  pairRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  childGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  childCard: {
    border: "1px solid var(--slate-200)",
    borderRadius: 8,
    padding: 12,
    background: "var(--slate-50)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  childCardLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--slate-600)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  removeBtnSm: {
    border: "1px solid var(--slate-200)",
    background: "var(--white)",
    color: "var(--slate-500)",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  btnLoading: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  btnSpinner: {
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  chartCard: {
    background: "var(--white)",
    borderRadius: 12,
    padding: 20,
    border: "1px solid var(--slate-200)",
    marginTop: 16,
  },
  chartTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--slate-800)",
    margin: "0 0 8px 0",
  },
};

function deriveFilingStatus(
  hasSpouse: boolean,
  hasChildren: boolean,
): FilingStatus {
  if (hasSpouse) return "JOINT";
  if (hasChildren) return "HEAD_OF_HOUSEHOLD";
  return "SINGLE";
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export default function HouseholdCalculator({ year: initialYear }: Props) {
  const [state, setState] = useState("CA");
  const [year, setYear] = useState<SupportedYear>(initialYear);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [primaryAge, setPrimaryAge] = useState(40);
  const [spouseAge, setSpouseAge] = useState(40);
  const [employmentIncome, setEmploymentIncome] = useState(30000);
  const [spouseEmploymentIncome, setSpouseEmploymentIncome] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([5]);

  const [result, setResult] = useState<CreditBreakdown | null>(null);
  const [sweep, setSweep] = useState<SweepPoint[] | null>(null);
  const [submittedEarnings, setSubmittedEarnings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filingStatus = deriveFilingStatus(hasSpouse, childAges.length > 0);

  useEffect(() => {
    setResult(null);
    setSweep(null);
    setError(null);
  }, [
    state,
    year,
    hasSpouse,
    primaryAge,
    spouseAge,
    employmentIncome,
    spouseEmploymentIncome,
    childAges,
  ]);

  const addChild = () => setChildAges((c) => [...c, 5]);
  const removeChild = (i: number) =>
    setChildAges((c) => c.filter((_, idx) => idx !== i));
  const updateChildAge = (i: number, age: number) =>
    setChildAges((c) => c.map((a, idx) => (idx === i ? age : a)));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSweep(null);
    try {
      const input: HouseholdInput = {
        state,
        year,
        filingStatus,
        primaryAge,
        spouseAge: hasSpouse ? spouseAge : undefined,
        employmentIncome,
        spouseEmploymentIncome: hasSpouse ? spouseEmploymentIncome : undefined,
        childAges,
      };
      const [r, s] = await Promise.all([
        calculateHousehold(input),
        sweepEarnings(input),
      ]);
      setResult(r);
      setSweep(s);
      setSubmittedEarnings(employmentIncome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
      setResult(null);
      setSweep(null);
    } finally {
      setLoading(false);
    }
  };

  const total = result
    ? result.federalEitc + result.federalCtc + result.stateEitc + result.stateCtc
    : 0;

  return (
    <div style={styles.card}>
      <div style={styles.grid}>
        <form style={styles.section} onSubmit={onSubmit}>
          <h2 style={styles.sectionTitle}>Your household</h2>

          <div style={{ ...styles.pairRow, gridTemplateColumns: "2fr 1fr" }}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="hc-state">State</label>
              <select
                id="hc-state"
                style={styles.select}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {Object.entries(STATE_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="hc-year">Tax year</label>
              <select
                id="hc-year"
                style={styles.select}
                value={year}
                onChange={(e) =>
                  setYear(Number(e.target.value) as SupportedYear)
                }
              >
                {SUPPORTED_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={hasSpouse}
              onChange={(e) => setHasSpouse(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxLabel}>Are you married?</span>
          </label>

          <div style={{ ...styles.pairRow, gridTemplateColumns: hasSpouse ? "1fr 1fr" : "1fr" }}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="hc-age">Your age</label>
              <input
                id="hc-age"
                type="number"
                min={18}
                max={100}
                style={styles.input}
                value={primaryAge}
                onChange={(e) => setPrimaryAge(Number(e.target.value))}
              />
            </div>
            {hasSpouse && (
              <div style={styles.field}>
                <label style={styles.label} htmlFor="hc-spouse-age">
                  Spouse age
                </label>
                <input
                  id="hc-spouse-age"
                  type="number"
                  min={18}
                  max={100}
                  style={styles.input}
                  value={spouseAge}
                  onChange={(e) => setSpouseAge(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div style={{ ...styles.pairRow, gridTemplateColumns: hasSpouse ? "1fr 1fr" : "1fr" }}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="hc-income">
                Your earnings (annual)
              </label>
              <input
                id="hc-income"
                type="number"
                min={0}
                step={1000}
                style={styles.input}
                value={employmentIncome}
                onChange={(e) => setEmploymentIncome(Number(e.target.value))}
              />
            </div>
            {hasSpouse && (
              <div style={styles.field}>
                <label style={styles.label} htmlFor="hc-spouse-income">
                  Spouse earnings (annual)
                </label>
                <input
                  id="hc-spouse-income"
                  type="number"
                  min={0}
                  step={1000}
                  style={styles.input}
                  value={spouseEmploymentIncome}
                  onChange={(e) =>
                    setSpouseEmploymentIncome(Number(e.target.value))
                  }
                />
              </div>
            )}
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Children</span>
            <div style={styles.childGrid}>
              {childAges.map((age, i) => (
                <div key={i} style={styles.childCard}>
                  <label
                    style={styles.childCardLabel}
                    htmlFor={`hc-child-${i}`}
                  >
                    Child {i + 1} age
                  </label>
                  <input
                    id={`hc-child-${i}`}
                    type="number"
                    min={0}
                    max={18}
                    style={styles.input}
                    value={age}
                    onChange={(e) => updateChildAge(i, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    style={styles.removeBtnSm}
                    onClick={() => removeChild(i)}
                    aria-label={`Remove child ${i + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              style={{ ...styles.addBtn, marginTop: 12 }}
              onClick={addChild}
            >
              + Add child
            </button>
          </div>

          <button type="submit" style={styles.submit} disabled={loading}>
            {loading ? (
              <span style={styles.btnLoading}>
                <span style={styles.btnSpinner} aria-hidden="true" />
                Calculating…
              </span>
            ) : (
              "Calculate credits"
            )}
          </button>
          <p style={styles.helpText}>
            Calculated for tax year {year} using PolicyEngine US.
          </p>
        </form>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Refundable credits</h2>
          {error && <div style={styles.error}>{error}</div>}
          {loading && !error && (
            <div style={styles.results}>
              <Spinner size={36} label="Calculating credits…" />
            </div>
          )}
          {!loading && !result && !error && (
            <div style={styles.results}>
              <p style={styles.placeholder}>
                Enter your household details and click <strong>Calculate
                credits</strong> to see your federal and state EITC and CTC.
              </p>
            </div>
          )}
          {!loading && result && (
            <>
              <div style={styles.results}>
                <p style={styles.resultsTitle}>For {STATE_NAMES[state]}, {year}</p>
                <div style={styles.resultsRow}>
                  <span style={styles.resultsLabel}>Federal EITC</span>
                  <span style={styles.resultsValue}>
                    {formatCurrency(result.federalEitc)}
                  </span>
                </div>
                <div style={styles.resultsRow}>
                  <span style={styles.resultsLabel}>Federal CTC</span>
                  <span style={styles.resultsValue}>
                    {formatCurrency(result.federalCtc)}
                  </span>
                </div>
                <div style={styles.resultsRow}>
                  <span style={styles.resultsLabel}>State EITC</span>
                  <span style={styles.resultsValue}>
                    {formatCurrency(result.stateEitc)}
                  </span>
                </div>
                <div style={styles.resultsRow}>
                  <span style={styles.resultsLabel}>State CTC</span>
                  <span style={styles.resultsValue}>
                    {formatCurrency(result.stateCtc)}
                  </span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Total</span>
                  <span style={styles.totalValue}>{formatCurrency(total)}</span>
                </div>
              </div>
              {sweep && (
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>Credits by earnings</h3>
                  <Suspense fallback={<Spinner size={28} label="Loading chart…" />}>
                    <CreditsChart
                      data={sweep}
                      currentEarnings={submittedEarnings}
                    />
                  </Suspense>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
